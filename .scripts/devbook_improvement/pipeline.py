"""Scheduled maintenance orchestration. Default CLI operation is a local dry run."""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import difflib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
from typing import Any, Callable, Mapping
from urllib.parse import quote

from . import core, provider, runtime


def save(store: Any, state: dict[str, Any], reason: str) -> None:
    snapshot = getattr(store, "_pipeline_expected_snapshot", None) or store.read()
    # Preserve the active lease and publication journal owned by the runtime.
    for key in ("lease", "pending_operation", "completed_operations"):
        if key in snapshot.state:
            state[key] = copy.deepcopy(snapshot.state[key])
    store._pipeline_expected_snapshot = store.write(state, snapshot, f"maintenance: {reason}")


def initial_state(store: Any) -> dict[str, Any]:
    snapshot = store.read()
    store._pipeline_expected_snapshot = snapshot
    state = copy.deepcopy(snapshot.state)
    for key, value in core.new_state().items():
        state.setdefault(key, copy.deepcopy(value))
    if state["version"] != core.STATE_VERSION:
        raise runtime.Conflict("unsupported state schema; migrate explicitly")
    return state


def changed_lines(before: Mapping[str, str], after: Mapping[str, str]) -> int:
    total = 0
    for path in before.keys() | after.keys():
        matcher = difflib.SequenceMatcher(None, before.get(path, "").splitlines(), after.get(path, "").splitlines())
        total += sum((j - i) + (b - a) for kind, i, j, a, b in matcher.get_opcodes() if kind != "equal")
    return total


def clean_review(review: Mapping[str, Any], candidates: Mapping[str, str], proposal: Mapping[str, Any], rejected: list[dict[str, Any]], feedback: list[dict[str, Any]] = ()) -> bool:
    """Require current-text semantic evidence, not just a CLEAN label."""
    if review.get("verdict") != "CLEAN":
        return False
    reports = {item.get("path"): item for item in review.get("notes", [])}
    if set(reports) != set(candidates):
        return False
    for path, text in candidates.items():
        item = reports[path]
        if item.get("verdict") != "CLEAN" or item.get("findings") or not item.get("summary"):
            return False
        evidence = item.get("current_text_evidence")
        if not isinstance(evidence, list) or not evidence:
            return False
        for citation in evidence:
            if not isinstance(citation, dict) or not isinstance(citation.get("quote"), str) or not citation["quote"].strip() or not citation.get("reason"):
                return False
            line = citation.get("line_start")
            if not isinstance(line, int) or isinstance(line, bool) or line < 1:
                return False
            quoted_lines = citation["quote"].count("\n") + 1
            excerpt = "\n".join(text.splitlines()[line - 1:line - 1 + quoted_lines])
            if citation["quote"] not in excerpt:
                return False
        target = str(item.get("target_resolution", ""))
        if not target.startswith(("RESOLVED", "JUSTIFIED UNCHANGED")):
            return False
        if not item.get("page_type") or not item.get("split_suggestion"):
            return False
        quality = item.get("quality", {})
        if any(quality.get(key) != "PASS" for key in ("accuracy", "clarity", "rules_compliance")):
            return False
        if any(quality.get(key) not in {"PASS", "NOT APPLICABLE"} for key in ("question_quality", "identity_safety")):
            return False
        checks = {(row.get("url"), row.get("claim")): row for row in item.get("source_checks", [])}
        for edit in proposal["edits"]:
            if edit["path"] != path:
                continue
            for source in edit["sources"]:
                check = checks.get((source["url"], source["claim"]), {})
                if check.get("result") != "SUPPORTED" or not check.get("reason"):
                    return False
        equivalents = {row.get("fingerprint"): row for row in item.get("rejection_equivalence", [])}
        for rejection in rejected:
            if rejection.get("path") == path:
                check = equivalents.get(rejection.get("fingerprint"), {})
                reconsidered = any(decision["decision"] == "reconsider" and decision["fingerprint"] == rejection["fingerprint"] for decision in proposal.get("decisions", []))
                if check.get("equivalent") not in ([False, True] if reconsidered else [False]) or not check.get("reason"):
                    return False
    requests = {item["key"]: item for item in feedback}
    verified = {(item.get("feedback_key"), item.get("fingerprint"), item.get("decision")): item for item in review.get("decision_checks", [])}
    for decision in proposal.get("decisions", []):
        check = verified.get((decision["feedback_key"], decision["fingerprint"], decision["decision"]), {})
        quote = check.get("request_quote")
        if check.get("verdict") != "SUPPORTED" or not check.get("reason") or not quote or quote not in requests.get(decision["feedback_key"], {}).get("body", ""):
            return False
    return True


def proposal_decisions(proposal: Mapping[str, Any], history: list[dict[str, Any]], rejected: list[dict[str, Any]], feedback: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Bind model judgments to verified comment revisions and recorded proposals."""
    known = {core._fingerprint(edit): (edit, record) for record in history for edit in record["proposal"]["edits"]}
    rejections = copy.deepcopy(rejected)
    lookup = {entry["fingerprint"]: entry for entry in rejections}
    keys = {item["key"] for item in feedback}
    actions = []
    seen = set()
    for decision in proposal.get("decisions", []):
        fingerprint = decision["fingerprint"]
        if decision["feedback_key"] not in keys or fingerprint in seen:
            raise runtime.Conflict("proposal decision lacks a unique verified pending feedback revision")
        seen.add(fingerprint)
        if decision["decision"] == "reject":
            if fingerprint not in known:
                raise runtime.Conflict("rejection does not reference a recorded open-PR proposal")
            edit, record = known[fingerprint]
            source = next(note["content"] for note in record["batch"]["notes"] if note["path"] == edit["path"])
            actions.append({**decision, "edit": copy.deepcopy(edit), "original_source": source})
        else:
            if fingerprint not in lookup:
                raise runtime.Conflict("reconsideration does not reference a rejected proposal")
            lookup[fingerprint].setdefault("reconsidered_by", []).append(decision["feedback_key"])
            actions.append(dict(decision))
    return rejections, actions


def persist_decisions(state: dict[str, Any], actions: list[dict[str, Any]]) -> None:
    for action in actions:
        if action["decision"] == "reconsider":
            entry = next(item for item in state["rejections"] if item["fingerprint"] == action["fingerprint"])
            entry.setdefault("reconsidered_by", []).append(action["feedback_key"])
        elif not any(item["fingerprint"] == action["fingerprint"] for item in state["rejections"]):
            edit = action["edit"]
            state["rejections"].append({"fingerprint": action["fingerprint"],
                "semantic_fingerprint": core._fingerprint(edit, semantic=True),
                **{key: edit[key] for key in ("path", "kind", "learning_target", "before", "after")},
                "feedback_key": action["feedback_key"], "reason": action["reason"], "reconsidered_by": []})
            for card_id in core._ids(edit["before"]):
                state["retired_ids"].pop(card_id, None)


def restore_rejected(proposal: dict[str, Any], result: dict[str, Any], actions: list[dict[str, Any]], sources: Mapping[str, str]) -> None:
    """Restore exact saved source for a rejected bot edit, never synthesize identity."""
    for action in actions:
        if action["decision"] != "reject":
            continue
        edit = action["edit"]
        path = edit["path"]
        if path not in sources:
            raise runtime.Conflict("rejection target is outside this bounded feedback batch")
        source = sources[path]
        text = result["sources"][path]
        before, after = edit["after"], edit["before"]
        if not before:
            original = action["original_source"]
            offset = original.index(after)
            left, right = original[max(0, offset - 80):offset], original[offset + len(after):offset + len(after) + 80]
            before, after = left + right, left + after + right
        if not before or source.count(before) != 1:
            if edit["before"] and source.count(edit["before"]) == 1 and not any(item["path"] == path for item in proposal["edits"]):
                continue  # The original was already restored; only record the rejection.
            raise runtime.Conflict("rejected replacement is absent or ambiguous in the selected source")
        start, end = source.index(before), source.index(before) + len(before)
        if edit["kind"] != "note":
            spans = [(left, right) for left, right, _ in core._qard_spans(source) if left < end and right > start]
            if edit["after"] and (not spans or any(left < start or right > end for left, right in spans)):
                raise runtime.Conflict("rejection must restore complete current Qard blocks and adjacent metadata")
        for current_edit in proposal["edits"]:
            if current_edit["path"] != path:
                continue
            anchor = current_edit["before"]
            if source.count(anchor) != 1:
                raise runtime.Conflict("rejection overlaps an edit without a unique selected-source anchor")
            edit_start = source.index(anchor)
            if edit_start < end and edit_start + len(anchor) > start:
                raise runtime.Conflict("rejected block is touched by another current edit; split the feedback batch")
        if text.count(before) == 1:
            result["sources"][path] = text.replace(before, after, 1)
            restoration = {"path": path, "expected_hash": core.digest(sources[path]), "before": before,
                "after": after, "reason": f"Restore exact original source after owner rejection: {action['reason']}",
                "kind": "note" if edit["kind"] == "note" else "rewrite", "learning_target": "same",
                "essential_meanings": edit["essential_meanings"], "sources": [], "feedback_keys": [action["feedback_key"]]}
            proposal["edits"].append(restoration)
            for disposition in proposal["dispositions"]:
                if disposition["path"] == path:
                    disposition.update(outcome="changed", reason=restoration["reason"])
            result["edits"].append(copy.deepcopy(restoration))
            result["lineage"].append({"path": path, "kind": "restore-rejected", "old_ids": [],
                "restored_ids": core._ids(edit["before"]), "original_fingerprint": action["fingerprint"]})
        else:
            raise runtime.Conflict("rejected bot block became ambiguous; original source retained for reconciliation")


class Engine:
    """One bounded execution opportunity; dependencies are injectable for fixtures."""

    def __init__(self, root: Path, config: Mapping[str, Any], store: Any, *, model: Any = None,
                 api: Any = None, publisher: Any = None, notes_loader: Callable = core.inventory,
                 validator: Callable | None = None, source_fetcher: Callable | None = None,
                 now: Callable | None = None, snapshot_sha_loader: Callable[[], str] | None = None) -> None:
        self.root, self.config, self.store = root.resolve(), dict(config), store
        self.model, self.api, self.publisher = model, api, publisher
        self.notes_loader = notes_loader
        self.validator = validator or self.validate
        self.source_fetcher = source_fetcher or self.fetch_source
        self.now = now or (lambda: dt.datetime.now(dt.timezone.utc))
        self.snapshot_sha_loader = snapshot_sha_loader or self.checkout_snapshot_sha
        self.deadline = time.monotonic() + 60 * int(config.get("max_run_minutes", 35))
        self.model_calls = 0

    def checkout_snapshot_sha(self) -> str:
        changed = subprocess.run(["git", "status", "--porcelain", "--", "Vault/Home"], cwd=self.root,
                                 capture_output=True, text=True, check=True).stdout
        if changed:
            raise runtime.Conflict("live maintenance needs a clean Vault/Home snapshot; user edits were preserved")
        return subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.root,
                              capture_output=True, text=True, check=True).stdout.strip()

    def call(self, role: str, payload: dict[str, Any]) -> dict[str, Any]:
        remaining = self.deadline - time.monotonic()
        if remaining < 30:
            raise runtime.RuntimeFailure("run deadline reached; saved proposal can resume")
        if hasattr(self.model, "timeout_seconds"):
            self.model.timeout_seconds = min(int(self.config.get("model_timeout_seconds", 900)), int(remaining) - 10)
        self.model_calls += 1
        return getattr(self.model, role)(payload)

    def fetch_source(self, url: str) -> str:
        data = runtime.fetch_primary_source(url, self.config.get("allowed_source_hosts", []), max_bytes=180_000)
        if data.startswith(b"%PDF"):
            raise runtime.UnsafeInput("PDF evidence needs a readable primary HTML/text source")
        # Full fetched evidence is supplied as data. No scripts or page tools execute.
        return data.decode("utf-8", errors="replace")

    def validate(self, expected: dict[str, str], candidate: dict[str, str]) -> list[dict[str, str]]:
        with runtime.IsolatedRepository(self.root, self.config.get("base_branch", "main")) as repo:
            assert repo.path
            base_sources = {path: runtime.validate_note_path(repo.path, path).read_text() for path in expected}
            runtime.apply_guarded_sources(repo.path, base_sources, expected)
            runtime.apply_guarded_sources(repo.path, expected, candidate)
            commands = self.config.get("validator_commands", [])
            if not commands:
                raise runtime.RuntimeFailure("validation commands missing")
            return runtime.run_validations(repo.path, commands)

    def remote_view(self, state: dict[str, Any], notes: list[dict[str, Any]], base_sha: str | None = None) -> tuple[dict[str, Any], dict[int, dict[str, Any]], list[dict[str, Any]]]:
        if not self.api:
            return state, {}, []
        prs = self.api.request("GET", "/pulls?state=all&per_page=100", paginate=True)
        topics = {core.topic_id(note["topic"]): note["topic"] for note in notes}
        by_path = {note["path"]: note for note in notes}
        all_feedback: list[dict[str, Any]] = []
        managed, rows = {}, []
        polled_prs: set[int] = set()
        allowlist = [(int(row["id"]), row["login"]) for row in self.config["owner_allowlist"]]
        for pr in prs:
            marker = runtime.parse_marker(pr.get("body", ""))
            if not marker:
                continue
            topic_key, generation = marker
            if not runtime.valid_pr_identity(pr, self.config["repo"], self.config.get("base_branch", "main"), topic_key, generation):
                continue
            topic = topics.get(topic_key)
            if not topic:
                raise runtime.Conflict("managed PR topic no longer exists; reconcile manually")
            status = runtime.lifecycle(pr)
            prior = state["prs"].get(f"{topic_key}:{generation}", {})
            if status == "closed" and prior.get("status") == "open":
                records = prior.get("proposal_records", [])
                for record in records:
                    state = core.record_outcome(state, record["batch"], record["proposal"], {**record["result"], "outcome": "closed_without_merge"})
                for path in {edit["path"] for record in records for edit in record["proposal"]["edits"]}:
                    if path in by_path and path in state["notes"]:
                        # The unchanged base was considered and rejected; don't regenerate it merely because the PR closed.
                        state["notes"][path]["content_hash"] = by_path[path]["hash"]
                        state["notes"][path]["outcome"] = "keep"
            if status != "open":
                for item in state["feedback"].values():
                    if item.get("pr_number") == pr["number"] and item["status"] == "pending":
                        item["status"] = "terminal"
            row = {**pr, "topic_id": topic_key, "generation": generation, "status": status,
                   "branch": pr["head"]["ref"], "head_sha": pr["head"]["sha"], "frozen": prior.get("frozen", False)}
            if status == "open":
                files = self.api.request("GET", f"/pulls/{pr['number']}/files?per_page=100", paginate=True)
                paths = [file["filename"] for file in files]
                main_hashes = {note["path"]: note["hash"] for note in notes if note["topic"] == topic}
                baseline = prior.get("base_note_hashes")
                if baseline != main_hashes:
                    if base_sha is None:
                        raise runtime.Conflict("managed branch reconciliation needs a verified base snapshot")
                    comparison = self.api.request("GET", f"/compare/{base_sha}...{pr['head']['sha']}")
                    includes_main = comparison.get("merge_base_commit", {}).get("sha") == base_sha
                    row["base_conflict"] = not includes_main
                    if includes_main:
                        row["base_note_hashes"] = main_hashes
                    else:
                        row["base_note_hashes"] = baseline
                        row["pause_reason"] = "authoritative topic notes changed on main; update the PR branch to include current main"
                        rows.append(row)
                        continue
                else:
                    row["base_conflict"] = False
                    row["base_note_hashes"] = main_hashes
                row["pause_reason"] = None
                for path in paths:
                    runtime.validate_note_path(self.root, path)
                    if path not in by_path or core.topic_for(path) != topic:
                        raise runtime.Conflict("managed branch has changes outside its topic")
                    text = self.publisher.read_note(path, pr["head"]["ref"])
                    by_path[path].update(content=text, hash=core.digest(text))
                feedback = runtime.poll_feedback(self.api, pr["number"], allowlist)
                polled_prs.add(pr["number"])
                for item in feedback:
                    all_feedback.append({**item, "author": item["user"], "topic": topic,
                                         "pr_number": pr["number"], "paths": item.get("paths") or paths})
                row["frozen"] = bool(row["frozen"] or feedback or not pr.get("draft", True)
                                      or len(paths) >= self.config.get("max_pr_notes", 16)
                                      or sum(file.get("additions", 0) + file.get("deletions", 0) for file in files) >= self.config.get("max_pr_lines", 1200))
                row["changed_paths"] = paths
                row["review_started_head_sha"] = prior.get("review_started_head_sha") or (pr["head"]["sha"] if feedback else None)
                managed[pr["number"]] = {**pr, "changed_paths": paths}
            rows.append(row)
        state = core.sync_prs(state, rows)
        owner = {"ids": [pair[0] for pair in allowlist], "logins": [pair[1] for pair in allowlist]}
        actionable = [item for item in all_feedback if item.get("body", "").strip()]
        for item in core.ingest_feedback(state, rows, actionable, owner):
            # An edited revision supersedes the pending version of that same comment.
            for old in state["feedback"].values():
                if old["kind"] == item["kind"] and old["id"] == item["id"] and old["status"] == "pending":
                    old["status"] = "superseded"
            state["feedback"][item["key"]] = item
        present_keys = {core._feedback_key(item)[0] for item in actionable}
        for item in state["feedback"].values():
            if (item.get("pr_number") in polled_prs and item.get("status") == "pending"
                    and item["key"] not in present_keys):
                item["status"] = "withdrawn"
        return state, managed, all_feedback

    def _cooldown(self, error: provider.ClaudeQuotaError, stage: str) -> dict[str, Any]:
        state = initial_state(self.store)
        state = core.set_cooldown(state, error.kind, error.reset_at, self.now(),
                                  recheck_hours=int(self.config.get("unknown_reset_recheck_hours", 24)))
        cooldown = state["cooldown"]
        notify = bool(cooldown.get("notice_pending") and not cooldown.get("notice_sent"))
        cooldown.update(notice_pending=False, notice_sent=True)
        save(self.store, state, "persist subscription cooldown")
        return {"status": "cooldown", "stage": stage, "notice": notify, "cooldown": cooldown, "model_calls": self.model_calls}

    def run(self, *, apply: bool = False, with_model: bool = False) -> dict[str, Any]:
        state = initial_state(self.store)
        if apply and self.publisher and any(
            op_id not in state.get("finalized_operations", {}) or not op.get("compacted")
            for op_id, op in state.get("completed_operations", {}).items()
        ):
            self.finalize_completed()
            state = initial_state(self.store)
        if self.publisher and state.get("pending_operation"):
            if not apply:
                return {"status": "pending_publication", "model_calls": 0}
            recovery = self.publisher.recover_pending()
            if recovery and recovery.get("status") != "recovered":
                return recovery
            self.finalize_completed()
            state = initial_state(self.store)
        if core.cooldown_active(state, self.now()):
            return {"status": "cooldown", "notice": False, "model_calls": 0, "cooldown": state["cooldown"]}
        snapshot_sha = self.snapshot_sha_loader() if self.publisher else None
        notes = self.notes_loader(self.root)
        base_sha = self.publisher.ref_sha(self.config.get("base_branch", "main")) if self.publisher else None
        if self.publisher and (snapshot_sha != base_sha or self.snapshot_sha_loader() != snapshot_sha):
            raise runtime.Conflict("checkout snapshot and remote base differ; retry from current main before model work")
        # Keep the current base independently from topic-branch overlays.
        base = {note["path"]: note["content"] for note in notes}
        state, prs, feedback = self.remote_view(state, notes, base_sha)
        all_notes = list(notes)
        rules = core.rules_version(self.root)
        paused = {row["topic_id"] for row in state["prs"].values() if row.get("status") == "open" and row.get("base_conflict")}
        notes = [note for note in notes if core.topic_id(note["topic"]) not in paused]
        held = state.get("held_proposals", {})
        notes = [note for note in notes if not any(
            hold.get("source_hashes", {}).get(note["path"]) == note["hash"]
            and hold.get("rules_hash") == rules
            and sorted(item["key"] for item in state["feedback"].values() if item["status"] == "pending" and item["topic"] == note["topic"]) == hold.get("feedback_keys", [])
            for hold in held.values())]
        selection_state = copy.deepcopy(state)
        for item in selection_state["feedback"].values():
            if core.topic_id(item["topic"]) in paused and item["status"] == "pending":
                item["status"] = "paused"
        batch = core.select_batch(selection_state, notes, rules, self.config)
        save(self.store, state, "reconcile maintenance queue")
        if batch is None:
            return {"status": "topics_paused" if paused else "no_changes", "paused_topics": sorted(paused), "model_calls": 0}
        if not batch["notes"] and batch["feedback"]:
            return {"status": "feedback_needs_scope", "batch": batch,
                    "feedback": batch["feedback"], "model_calls": 0}
        if not with_model:
            return {"status": "selected", "batch": batch, "model_calls": 0, "mutated": False}
        if self.model is None:
            raise runtime.RuntimeFailure("model provider missing")
        selected = {note["path"]: note["content"] for note in batch["notes"]}
        pr = batch.get("pr") or {}
        history = list(pr.pop("proposal_records", []))
        raw_pr = prs.get(pr.get("number"), {})
        hashes = {path: core.digest(text) for path, text in selected.items()}
        feedback_keys = sorted(item["key"] for item in batch["feedback"])
        pending = state.get("pending_author_proposal") or {}
        compatible = pending.get("source_hashes") == hashes and pending.get("feedback_keys") == feedback_keys and pending.get("rules_hash") == rules
        if compatible:
            proposal = pending["proposal"]
        else:
            payload = {"topic": batch["topic"], "notes": selected, "feedback": batch["feedback"],
                       "rules": {path: (self.root / path).read_text() for path in core.CONTENT_AUTHORITIES if (self.root / path).is_file()},
                       "rejected_proposals": state["rejections"],
                       "open_proposals": [{"fingerprint": core._fingerprint(edit), **edit} for record in history for edit in record["proposal"]["edits"]],
                       "previous_review": held.get(batch["topic_id"], {}).get("blocked_review"),
                       "nearby_questions": [{"path": note["path"], "cards": [span[2] for span in core._qard_spans(note["content"])]}
                                            for note in notes if note["topic"] == batch["topic"] and note["path"] not in selected]}
            try:
                proposal = self.call("author", payload)
            except provider.ClaudeQuotaError as error:
                return self._cooldown(error, "author")
            pending = {"topic_id": batch["topic_id"], "batch": batch, "proposal": proposal,
                       "source_hashes": hashes, "feedback_keys": feedback_keys, "rules_hash": rules}
            state["pending_author_proposal"] = pending
            save(self.store, state, "save source-matched author proposal")
        core._validate_proposal(proposal)
        effective_rejections, decisions = proposal_decisions(proposal, history, state["rejections"], batch["feedback"])
        result = core.apply_proposal(selected, proposal, effective_rejections, expected_feedback_keys=feedback_keys,
                                     required_feedback_keys=feedback_keys if pr.get("frozen") else ())
        restore_rejected(proposal, result, decisions, selected)
        if not proposal["edits"] and not decisions:
            state = core.record_outcome(state, batch, proposal, result)
            state.pop("pending_author_proposal", None)
            state["cooldown"] = None
            save(self.store, state, "record successful keep or feedback clarification")
            self.feedback_receipt(proposal, batch, None, apply)
            return {"status": "no_worthwhile_changes", "proposal": proposal, "model_calls": self.model_calls}
        current = {**{note["path"]: note["content"] for note in all_notes}, **result["sources"]}
        paths = set(raw_pr.get("changed_paths", [])) | {edit["path"] for edit in proposal["edits"]}
        cumulative_base = {path: base[path] for path in paths}
        cumulative_current = {path: current[path] for path in paths}
        if not batch["feedback"] and (len(paths) > self.config.get("max_pr_notes", 16)
                                         or changed_lines(cumulative_base, cumulative_current) > self.config.get("max_pr_lines", 1200)):
            state["pending_author_proposal"]["blocked_review"] = {"reason": "PR size limit reached"}
            if pr:
                state["prs"][f"{batch['topic_id']}:{pr['generation']}"]["frozen"] = True
            save(self.store, state, "freeze at review size limit")
            return {"status": "size_limit", "model_calls": self.model_calls}
        fetched = {}
        for edit in proposal["edits"]:
            for source in edit["sources"]:
                if source["url"] not in fetched:
                    if len(fetched) >= self.config.get("max_sources_per_run", 12) or time.monotonic() >= self.deadline - 60:
                        raise runtime.RuntimeFailure("source workload exceeds this run; proposal preserved")
                    fetched[source["url"]] = self.source_fetcher(source["url"])
        review_payload = {"rules": (self.root / ".codex/agents/note-reviewer.toml").read_text(),
                          "before": selected, "current": result["sources"], "proposal": proposal,
                          "primary_sources": fetched, "rejected_proposals": state["rejections"],
                          "feedback": batch["feedback"], "recorded_decisions": decisions}
        try:
            review = self.call("review", review_payload)
        except provider.ClaudeQuotaError as error:
            return self._cooldown(error, "review")
        if not clean_review(review, result["sources"], proposal, state["rejections"], batch["feedback"]):
            state["pending_author_proposal"]["blocked_review"] = review
            state.setdefault("held_proposals", {})[batch["topic_id"]] = state.pop("pending_author_proposal")
            save(self.store, state, "preserve blocked semantic review")
            return {"status": "review_blocked", "proposal": proposal, "review": review, "model_calls": self.model_calls}
        if not proposal["edits"]:
            if apply:
                state = core.record_outcome(state, batch, proposal, result)
                persist_decisions(state, decisions)
                state.pop("pending_author_proposal", None)
                state["cooldown"] = None
                save(self.store, state, "record independently verified feedback decision")
                self.feedback_receipt(proposal, batch, None, True)
            return {"status": "no_worthwhile_changes" if apply else "proposed", "proposal": proposal,
                    "review": review, "model_calls": self.model_calls}
        validation = self.validator({**cumulative_base, **selected}, {**cumulative_current, **result["sources"]})
        records = history
        records.append({"batch": batch, "proposal": proposal, "result": result, "review": review})
        changes = [edit for record in records for edit in record["proposal"]["edits"]]
        cumulative_feedback = [{**item, "url": state["feedback"].get(item["key"], {}).get("url", item["key"])}
                               for record in records for item in record["proposal"]["feedback"]]
        generation = int(pr.get("generation") or state["topics"].get(batch["topic_id"], {}).get("generation", 1))
        branch = pr.get("branch") or core.branch_for(batch["topic"], generation)
        links = {path: f"https://github.com/{self.config['repo']}/blob/{quote(branch, safe='/')}/{quote(path, safe='/')}"
                 for path in paths}
        summary = core.render_summary(batch["topic"], cumulative_base, cumulative_current, changes,
                                      cumulative_feedback, validation, {entry["claim"]: entry["url"] for edit in changes for entry in edit["sources"]}, note_links=links)
        if getattr(self.model, "is_fixture", False):
            summary += "\nIndependent review adapter: CLEAN fixture result. No Claude request was made; live semantic quality remains unverified.\n"
        else:
            summary += "\nIndependent Claude note review: CLEAN; full candidate notes and fetched source text inspected.\n"
        if pr.get("review_started_head_sha"):
            summary += "\nChanges after review require renewed review of this head. PR remains draft.\n"
        response = {"status": "proposed", "topic": batch["topic"], "proposal": proposal, "review": review,
                    "candidate": result["sources"], "summary": summary, "validation": validation,
                    "question_changes": [edit for edit in changes if edit["kind"] != "note"],
                    "diff": "".join(line for path in sorted(paths) for line in difflib.unified_diff(
                        base[path].splitlines(True), current[path].splitlines(True), fromfile=f"a/{path}", tofile=f"b/{path}")),
                    "model_calls": self.model_calls}
        if not apply:
            return response
        body = core.update_managed_body(raw_pr.get("body", ""), summary, batch["topic"])
        receipts = {"batch": batch, "proposal": proposal, "result": result, "review": review,
                    "records": records, "topic_id": batch["topic_id"], "generation": generation, "decisions": decisions,
                    "base_note_hashes": {note["path"]: core.digest(base[note["path"]]) for note in all_notes if note["topic"] == batch["topic"]}}
        publication = self.publisher.publish(topic=batch["topic_id"], generation=generation,
            branch=branch,
            expected_sources=selected, candidate={edit["path"]: result["sources"][edit["path"]] for edit in proposal["edits"]},
            title=f"notes: improve {batch['topic']}", body=body,
            feedback_revision={"allowlist": [f"{row['id']}:{row['login']}" for row in self.config["owner_allowlist"]],
                               "processed": {f"{item['kind']}:{item['id']}": item["revision"] for item in feedback if item["pr_number"] == pr.get("number")}},
            expected_base_sha=base_sha,
            expected_branch_sha=pr.get("head_sha"), expected_pr_number=pr.get("number"),
            freeze=pr.get("frozen", False), pending_feedback=batch["feedback"], edits=proposal["edits"], operation_receipts=receipts)
        response.update(status=publication.get("status", "published"), publication=publication)
        if response["status"] != "awaiting_checks":
            self.finalize_completed()
        return response

    def finalize_completed(self) -> None:
        state = initial_state(self.store)
        for op_id, op in state.get("completed_operations", {}).items():
            if state.setdefault("finalized_operations", {}).get(op_id):
                continue
            receipt = op.get("receipts", {})
            if not receipt:
                raise runtime.Conflict("completed operation lacks source/review receipts")
            state = core.record_outcome(state, receipt["batch"], receipt["proposal"], receipt["result"])
            persist_decisions(state, receipt.get("decisions", []))
            key = f"{receipt['topic_id']}:{receipt['generation']}"
            row = state["prs"].setdefault(key, {})
            row.update(proposal_records=receipt["records"], head_sha=op.get("evidence", {}).get("head_sha"),
                       base_note_hashes=receipt["base_note_hashes"])
            self.feedback_receipt(receipt["proposal"], receipt["batch"], op.get("evidence", {}).get("head_sha"), True)
            state["finalized_operations"][op_id] = True
            state.pop("pending_author_proposal", None)
            state.setdefault("held_proposals", {}).pop(receipt["topic_id"], None)
            state["cooldown"] = None
        save(self.store, state, "finalize verified publication receipts")
        for op_id in state.get("completed_operations", {}):
            if state["finalized_operations"].get(op_id):
                runtime.compact_finalized_operation(self.store, op_id)

    def feedback_receipt(self, proposal: Mapping[str, Any], batch: Mapping[str, Any], sha: str | None, apply: bool) -> None:
        if not apply or not self.api or not batch.get("pr") or not proposal["feedback"]:
            return
        key = core.digest(json.dumps(proposal["feedback"], sort_keys=True))[:20]
        marker = f"<!-- devbook-feedback-result:{key} -->"
        number = batch["pr"]["number"]
        if runtime.lifecycle(self.api.request("GET", f"/pulls/{number}")) != "open":
            return
        comments = self.api.request("GET", f"/issues/{number}/comments?per_page=100", paginate=True)
        if any(marker in item.get("body", "") for item in comments):
            return
        lines = [marker, f"Maintenance feedback result{f' in commit `{sha}`' if sha else ''}:"]
        source = {item["key"]: item for item in batch["feedback"]}
        for item in proposal["feedback"]:
            if item["key"] not in source:
                raise runtime.Conflict("feedback receipt references unqueued comment")
            lines.append(f"- {source[item['key']].get('url', item['key'])}: {item['outcome']} — {item['reason']}")
        self.api.request("POST", f"/issues/{number}/comments", {"body": "\n".join(lines)})


def write_artifacts(directory: Path, result: dict[str, Any]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "result.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    for key, filename in (("summary", "pr-summary.md"), ("diff", "proposed.patch")):
        if key in result:
            (directory / filename).write_text(result[key])
    if "question_changes" in result:
        (directory / "question-changes.json").write_text(json.dumps(result["question_changes"], indent=2) + "\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=Path(".github/devbook-improvement.json"))
    parser.add_argument("--model")
    parser.add_argument("--output-dir", type=Path, default=Path(".omx/execution/devbook-improvement-output"))
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--demo", action="store_true")
    group.add_argument("--dry-run", action="store_true")
    group.add_argument("--apply", action="store_true")
    parser.add_argument("--with-model", action="store_true")
    args = parser.parse_args(argv)
    root = Path(__file__).resolve().parents[2]
    config = json.loads((root / args.config).read_text())
    if args.model:
        config["model"] = args.model
    try:
        if args.demo:
            from .demo import demonstrate
            result = demonstrate(root, config)
        elif not args.apply and not args.with_model:
            result = Engine(root, config, runtime.MemoryStateStore(core.new_state())).run()
        else:
            if args.apply:
                runtime.require_apply_activation()
            elif any(os.environ.get(key) != "true" for key in (
                "DEVBOOK_IMPROVEMENT_ACTIVATED", "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED",
                "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED")):
                raise runtime.ProductionGate("live dry-run needs confirmed state writes, subscription-only access and disabled usage credits")
            if os.environ.get("GITHUB_REF") != f"refs/heads/{config['base_branch']}":
                raise runtime.ProductionGate("apply is restricted to the configured base-branch workflow")
            api = runtime.GhApi(config["repo"])
            store = runtime.StateBranchStore(api, branch=config["state_branch"])
            if store.read().ref_sha is None:
                base_sha = api.request("GET", f"/git/ref/heads/{config['base_branch']}")["object"]["sha"]
                store.provision(core.new_state(), base_sha)
            owner = os.environ.get("GITHUB_RUN_ID", "") + ":" + os.environ.get("GITHUB_RUN_ATTEMPT", "1")
            lease = runtime.DurableLease(store, owner, ttl_seconds=60 * config["max_run_minutes"] + 120)
            with runtime.local_lock(Path(tempfile.gettempdir()) / "devbook-improvement.lock"):
                lease.acquire()
                try:
                    publisher = runtime.GitHubRuntime(api, store, base_branch=config["base_branch"],
                        required_checks=config["required_check_contexts"], lease_owner=owner)
                    local_sha = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, capture_output=True, text=True, check=True).stdout.strip()
                    if local_sha != publisher.ref_sha(config["base_branch"]):
                        raise runtime.Conflict("checkout is stale; retry next opportunity from current base")
                    result = Engine(root, config, store, api=api, publisher=publisher,
                                    model=provider.create_provider(config, root)).run(apply=args.apply, with_model=True)
                finally:
                    lease.release()
        write_artifacts(args.output_dir.resolve(), result)
        if result.get("status") != "cooldown" or result.get("notice"):
            print(json.dumps({key: value for key, value in result.items() if key in {"status", "topic", "model_calls", "notice"}}, sort_keys=True))
        return 0
    except (ValueError, OSError, subprocess.SubprocessError, runtime.RuntimeFailure, provider.ClaudeProviderError) as error:
        print(f"devbook-improvement: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
