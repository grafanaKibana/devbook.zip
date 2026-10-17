"""Credential-free end-to-end demonstration for the maintenance pipeline."""

from __future__ import annotations

import copy
import datetime as dt
import difflib
import json
import tempfile
from pathlib import Path
from typing import Any, Mapping

from . import core, pipeline, provider, runtime


PRIMARY_URL = "https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task"
OWNER_ID = 45916288
OWNER_LOGIN = "grafanaKibana"


def _note(name: str, card_id: str, focus: str) -> str:
    return f'''---
topic: [Programming]
subtopic: [NET]
level: ["2"]
priority: Medium
status: Creation
publish: false
qard-deck: "Programming"
qard-topic: "NET/{name}"
---

# {name}

{focus} needs a concrete explanation in the owning note.

# Questions

<!-- qard-location: {{"deck":"Programming","topic":"NET/{name}"}} -->
<!-- qard-id: {card_id} -->
> [!qard]- What is {focus}?
> {focus} is useful.
'''


class FakeProvider:
    """Deterministic author/reviewer with opt-in weekly quota episodes."""

    timeout_seconds = provider.DEFAULT_TIMEOUT_SECONDS
    is_fixture = True

    def __init__(self, now: Any) -> None:
        self.now = now
        self.author_calls = 0
        self.review_calls = 0
        self.author_quota_remaining = 0
        self.review_quota_remaining = 0

    def _quota(self) -> provider.ClaudeQuotaError:
        reset = self.now() + dt.timedelta(hours=1)
        reset_at = reset.isoformat().replace("+00:00", "Z")
        return provider.ClaudeQuotaError(
            kind="weekly",
            reset_at=reset_at,
            next_check_at=reset_at,
            evidence="fixture weekly usage limit",
        )

    def author(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.author_calls += 1
        if self.author_quota_remaining:
            self.author_quota_remaining -= 1
            raise self._quota()
        path, text = next(iter(payload["notes"].items()))
        card = core._qard_spans(text)[0][2]
        focus = {
            "Demo Tasks": "Task",
            "Demo ValueTask": "ValueTask",
            "Demo Async": "Async operation",
        }[Path(path).stem]
        feedback_keys = sorted(item["key"] for item in payload.get("feedback", []))
        if feedback_keys:
            before_prose = next(
                line for line in text.splitlines()
                if not line.startswith(">") and (line.endswith("owning note.") or "represents asynchronous work" in line)
            )
            feedback_text = " ".join(item.get("body", "") for item in payload["feedback"])
            if "completion semantics" in feedback_text:
                after_prose = f"{focus} represents asynchronous work; completion may occur without a dedicated thread, while the scheduler controls executable work."
                question = f"How do scheduling and completion affect the thread behavior of {focus}?"
            else:
                after_prose = f"{focus} represents asynchronous work; scheduler and completion semantics determine whether execution occupies a thread."
                question = f"What does {focus} represent, and what does it not guarantee?"
            reason = "Implement verified owner feedback with a sharper boundary."
        else:
            before_prose = f"{focus} needs a concrete explanation in the owning note."
            after_prose = f"{focus} represents asynchronous work rather than a dedicated thread, with behavior determined by scheduler and completion semantics."
            question = f"What does {focus} represent, and what thread behavior does it not guarantee?"
            reason = "Coordinate the owning explanation and a self-contained overview card."
        metadata = "\n".join(line for line in card.splitlines() if line.startswith("<!-- qard-"))
        after_card = (
            metadata
            + f"\n> [!qard]- {question}\n"
            + f"> {focus} represents asynchronous work; it does not guarantee a dedicated thread. "
            + f"[Microsoft Task documentation]({PRIMARY_URL})\n"
        )
        edits = [
            {
                "path": path,
                "expected_hash": core.digest(text),
                "before": before_prose,
                "after": after_prose,
                "reason": reason,
                "kind": "note",
                "learning_target": "same",
                "essential_meanings": [],
                "sources": [],
                "feedback_keys": feedback_keys,
            },
            {
                "path": path,
                "expected_hash": core.digest(text),
                "before": card,
                "after": after_card,
                "reason": reason,
                "kind": "rewrite",
                "learning_target": "same",
                "essential_meanings": [
                    f"{focus} represents asynchronous work.",
                    "A task does not imply a dedicated thread.",
                    "Scheduling and completion semantics affect execution.",
                ],
                "sources": [
                    {
                        "url": PRIMARY_URL,
                        "claim": "Task represents asynchronous operation semantics",
                        "version": ".NET 10",
                    }
                ],
                "feedback_keys": feedback_keys,
            },
        ]
        result = {
            "version": 1,
            "edits": edits,
            "dispositions": [{"path": path, "outcome": "changed", "reason": reason}],
            "feedback": [
                {"key": key, "outcome": "implemented", "reason": "Applied to prose and the owning card."}
                for key in feedback_keys
            ],
        }
        provider._validate_schema(result, provider.PROPOSAL_SCHEMA)
        return result

    def review(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.review_calls += 1
        if self.review_quota_remaining:
            self.review_quota_remaining -= 1
            raise self._quota()
        proposal = payload["proposal"]
        reports = []
        for path, text in payload["current"].items():
            sources = [source for edit in proposal["edits"] if edit["path"] == path for source in edit["sources"]]
            lines = text.splitlines()
            prose_line = next(index for index, line in enumerate(lines, 1) if "represents asynchronous work" in line)
            question_line = next(index for index, line in enumerate(lines, 1) if line.startswith("> [!qard]-"))
            reports.append(
                {
                    "path": path,
                    "verdict": "CLEAN",
                    "summary": "Owning prose and the complete card now explain the same bounded learning target.",
                    "page_type": "Concept",
                    "target_resolution": "RESOLVED",
                    "current_text_evidence": [
                        {
                            "quote": lines[prose_line - 1],
                            "line_start": prose_line,
                            "reason": "This sentence states the operating idea and thread boundary in the owning note.",
                        },
                        {
                            "quote": lines[question_line - 1],
                            "line_start": question_line,
                            "reason": "This exact card prompt is self-contained and asks for the coordinated learning target.",
                        },
                    ],
                    "quality": {
                        "accuracy": "PASS",
                        "clarity": "PASS",
                        "rules_compliance": "PASS",
                        "question_quality": "PASS",
                        "identity_safety": "PASS",
                    },
                    "split_suggestion": "No split: one cohesive task concept.",
                    "findings": [],
                    "source_checks": [
                        {
                            "url": source["url"],
                            "claim": source["claim"],
                            "result": "SUPPORTED",
                            "reason": "The supplied primary documentation directly describes Task semantics.",
                        }
                        for source in sources
                    ],
                    "rejection_equivalence": [
                        {
                            "fingerprint": rejection["fingerprint"],
                            "equivalent": False,
                            "reason": "The fixture proposal addresses a different source span and learning target.",
                        }
                        for rejection in payload.get("rejected_proposals", [])
                        if rejection.get("path") == path
                    ],
                }
            )
        result = {
            "verdict": "CLEAN",
            "notes": reports,
            "overall_reason": "Every fixture note has schema-valid current-text evidence and passes the reviewer contract.",
            "decision_checks": [],
        }
        provider._validate_schema(result, provider.REVIEW_SCHEMA)
        provider._validate_review_consistency(result)
        return result


class FakeApi:
    def __init__(self) -> None:
        self.prs: list[dict[str, Any]] = []
        self.files: dict[int, list[dict[str, Any]]] = {}
        self.comments: dict[int, list[dict[str, Any]]] = {}
        self.inline: dict[int, list[dict[str, Any]]] = {}
        self.reviews: dict[int, list[dict[str, Any]]] = {}
        self.calls: list[tuple[str, str]] = []
        self.receipts: list[dict[str, Any]] = []
        self.merge_bases: dict[str, str] = {}

    def request(self, method: str, path: str, payload: Mapping[str, Any] | None = None, *, paginate: bool = False) -> Any:
        del paginate
        self.calls.append((method, path))
        if method == "GET" and path.startswith("/compare/"):
            return {"merge_base_commit": {"sha": self.merge_bases.get(path, "base-0001")}}
        if method == "GET" and path == "/pulls?state=all&per_page=100":
            return copy.deepcopy(self.prs)
        if method == "GET" and path.startswith("/pulls/") and path.endswith("/files?per_page=100"):
            return copy.deepcopy(self.files.get(int(path.split("/")[2]), []))
        if method == "GET" and path.startswith("/issues/") and path.endswith("/comments?per_page=100"):
            return copy.deepcopy(self.comments.get(int(path.split("/")[2]), []))
        if method == "GET" and path.startswith("/pulls/") and path.endswith("/comments?per_page=100"):
            return copy.deepcopy(self.inline.get(int(path.split("/")[2]), []))
        if method == "GET" and path.startswith("/pulls/") and path.endswith("/reviews?per_page=100"):
            return copy.deepcopy(self.reviews.get(int(path.split("/")[2]), []))
        if method == "GET" and path.startswith("/pulls/"):
            number = int(path.split("/")[2])
            return copy.deepcopy(next(pr for pr in self.prs if pr["number"] == number))
        if method == "POST" and path.startswith("/issues/") and path.endswith("/comments"):
            number = int(path.split("/")[2])
            item = {
                "id": 10_000 + len(self.receipts),
                "body": str((payload or {})["body"]),
                "user": {"id": 0, "login": "devbook-improvement"},
                "updated_at": "2026-10-13T00:00:00Z",
            }
            self.comments.setdefault(number, []).append(item)
            self.receipts.append(item)
            return copy.deepcopy(item)
        raise AssertionError(f"unexpected fake API request: {method} {path}")

    def graphql(self, query: str, variables: Mapping[str, Any]) -> Any:
        self.calls.append(("GRAPHQL", query))
        return {"data": {"id": variables.get("id")}}

    def add_owner_comment(self, number: int, body: str, *, item_id: int = 700, updated_at: str) -> None:
        rows = self.comments.setdefault(number, [])
        rows[:] = [row for row in rows if row.get("id") != item_id]
        rows.append(
            {
                "id": item_id,
                "body": body,
                "html_url": f"https://example.test/pull/{number}#issuecomment-{item_id}",
                "user": {"id": OWNER_ID, "login": OWNER_LOGIN},
                "updated_at": updated_at,
            }
        )


class FakePublisher:
    def __init__(self, store: runtime.MemoryStateStore, api: FakeApi, base: Mapping[str, str]) -> None:
        self.store, self.api = store, api
        self.base = dict(base)
        self.branches: dict[str, dict[str, str]] = {}
        self.heads = {"main": "base-0001"}
        self.publish_count = 0
        self.pr_create_count = 0
        self.pr_update_count = 0
        self.creates_by_topic: dict[str, int] = {}
        self.updates_by_topic: dict[str, int] = {}

    def add_base_note(self, path: str, text: str) -> None:
        self.base[path] = text

    def ref_sha(self, branch: str) -> str:
        return self.heads[branch]

    def read_note(self, path: str, branch: str) -> str:
        return self.branches.get(branch, self.base).get(path, self.base[path])

    def recover_pending(self) -> dict[str, Any] | None:
        return None

    def publish(self, **kwargs: Any) -> dict[str, Any]:
        self.publish_count += 1
        branch = kwargs["branch"]
        snapshot = self.branches.setdefault(branch, dict(self.base))
        for path, expected in kwargs["expected_sources"].items():
            if snapshot.get(path, self.base.get(path)) != expected:
                raise runtime.Conflict(f"demo branch CAS conflict: {path}")
        if kwargs.get("freeze"):
            runtime.validate_frozen_edits(kwargs["edits"], kwargs["pending_feedback"])
        snapshot.update(kwargs["candidate"])
        head = f"demo-{self.publish_count:04d}"
        self.heads[branch] = head
        number = kwargs.get("expected_pr_number")
        pr = next((row for row in self.api.prs if row["number"] == number), None) if number else None
        if pr is None:
            number = len(self.api.prs) + 1
            pr = {
                "number": number,
                "node_id": f"PR_{number}",
                "state": "open",
                "draft": True,
                "merged_at": None,
                "head": {"ref": branch, "sha": head, "repo": {"full_name": "grafanaKibana/devbook.zip"}},
                "base": {"ref": "main", "repo": {"full_name": "grafanaKibana/devbook.zip"}},
                "body": kwargs["body"] + "\n\n" + runtime.marker(kwargs["topic"], kwargs["generation"]),
                "title": kwargs["title"],
            }
            self.api.prs.append(pr)
            self.pr_create_count += 1
            self.creates_by_topic[kwargs["topic"]] = self.creates_by_topic.get(kwargs["topic"], 0) + 1
        else:
            pr.update(draft=True, body=kwargs["body"] + "\n\n" + runtime.marker(kwargs["topic"], kwargs["generation"]), title=kwargs["title"])
            pr["head"] = {"ref": branch, "sha": head, "repo": {"full_name": "grafanaKibana/devbook.zip"}}
            self.pr_update_count += 1
            self.updates_by_topic[kwargs["topic"]] = self.updates_by_topic.get(kwargs["topic"], 0) + 1
        files = []
        for path, text in sorted(snapshot.items()):
            if self.base.get(path) == text:
                continue
            before = self.base.get(path, "")
            additions = deletions = 0
            for line in difflib.ndiff(before.splitlines(), text.splitlines()):
                additions += line.startswith("+ ")
                deletions += line.startswith("- ")
            files.append({"filename": path, "additions": additions, "deletions": deletions})
        self.api.files[number] = files
        op_id = f"demo-op-{self.publish_count:04d}"
        operation = {
            "op_id": op_id,
            "phase": "committed",
            "receipts": copy.deepcopy(kwargs["operation_receipts"]),
            "evidence": {
                "head_sha": head,
                "pr_number": number,
                "checks": {"pr-title": "success", "major-approval": "success"},
                "vault_validation": "success",
            },
        }
        current = self.store.read()
        state = current.state
        state.setdefault("completed_operations", {})[op_id] = operation
        self.store.write(state, current, f"maintenance: complete {op_id}")
        return {"status": "committed", "op_id": op_id, "commit_sha": head, "pr": copy.deepcopy(pr)}


def _structural_validator(root: Path):
    validator = core._load_script(root, "validate-vault.py", "_devbook_demo_validator")

    def validate(expected: dict[str, str], candidate: dict[str, str]) -> list[dict[str, str]]:
        del expected
        issues = []
        with tempfile.TemporaryDirectory() as temporary:
            fixture = Path(temporary)
            for relative, text in candidate.items():
                path = fixture / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding="utf-8")
                note = validator.load_note(path, fixture)
                issues.extend(validator.validate_frontmatter(note))
                issues.extend(validator.validate_code_fences(note))
                issues.extend(validator.validate_qard_interviews(note))
        if issues:
            raise runtime.RuntimeFailure("demo structural fixture failed: " + issues[0].render())
        return [{"check": "synthetic note structural validation", "result": "PASS"}]

    return validate


def demonstrate(root: Path, config: Mapping[str, Any]) -> dict[str, Any]:
    """Run real Engine decisions with deterministic in-memory collaborators."""
    clock = [dt.datetime(2026, 10, 13, 12, 0, tzinfo=dt.timezone.utc)]
    now = lambda: clock[0]
    path_a = "Vault/Home/Programming/NET/Demo Tasks.md"
    path_b = "Vault/Home/Programming/NET/Demo ValueTask.md"
    path_quota = "Vault/Home/Programming/CSharp/Demo Async.md"
    base = {
        path_a: _note("Demo Tasks", "demo_task_id", "Task"),
        path_b: _note("Demo ValueTask", "demo_value_task_id", "ValueTask"),
    }
    active = dict(base)
    store = runtime.MemoryStateStore(core.new_state())
    api = FakeApi()
    publisher = FakePublisher(store, api, base)
    model = FakeProvider(now)
    demo_config = {
        **dict(config),
        "max_notes_per_run": 1,
        "owner_allowlist": [{"id": OWNER_ID, "login": OWNER_LOGIN}],
    }

    def notes_loader(_: Path) -> list[dict[str, Any]]:
        return [
            {
                "path": path,
                "content": text,
                "hash": core.digest(text),
                "topic": core.topic_for(path),
                "violations": [],
            }
            for path, text in sorted(active.items())
        ]

    def engine() -> pipeline.Engine:
        return pipeline.Engine(
            root,
            demo_config,
            store,
            model=model,
            api=api,
            publisher=publisher,
            notes_loader=notes_loader,
            validator=_structural_validator(root),
            source_fetcher=lambda url: f"Primary fixture for {url}: Task represents an asynchronous operation.",
            now=now,
            snapshot_sha_loader=lambda: publisher.ref_sha("main"),
        )

    steps: list[dict[str, Any]] = []
    first = engine().run(apply=True, with_model=True)
    steps.append({"name": "first_topic_note", **first})
    second = engine().run(apply=True, with_model=True)
    steps.append({"name": "same_pr_second_note", **second})
    pr_number = api.prs[0]["number"]

    api.add_owner_comment(pr_number, "Make the Task boundary explicit.", updated_at="2026-10-13T12:10:00Z")
    feedback = engine().run(apply=True, with_model=True)
    steps.append({"name": "owner_feedback", **feedback})
    duplicate = engine().run(apply=True, with_model=True)
    steps.append({"name": "duplicate_feedback_skip", **duplicate})
    api.add_owner_comment(pr_number, "Make the Task boundary explicit and mention completion semantics.", updated_at="2026-10-13T12:20:00Z")
    edited = engine().run(apply=True, with_model=True)
    steps.append({"name": "edited_feedback", **edited})

    quota_text = _note("Demo Async", "demo_async_id", "Async operation")
    active[path_quota] = quota_text
    publisher.add_base_note(path_quota, quota_text)
    model.author_quota_remaining = 1
    author_cooldown = engine().run(apply=True, with_model=True)
    steps.append({"name": "author_weekly_cooldown", **author_cooldown})
    quiet_author = engine().run(apply=True, with_model=True)
    steps.append({"name": "author_cooldown_quiet_skip", **quiet_author})
    clock[0] += dt.timedelta(hours=2)
    model.review_quota_remaining = 1
    reviewer_cooldown = engine().run(apply=True, with_model=True)
    steps.append({"name": "reviewer_weekly_cooldown", **reviewer_cooldown})
    quiet_reviewer = engine().run(apply=True, with_model=True)
    steps.append({"name": "reviewer_cooldown_quiet_skip", **quiet_reviewer})
    clock[0] += dt.timedelta(hours=2)
    resumed = engine().run(apply=True, with_model=True)
    steps.append({"name": "quota_resumed_saved_proposal", **resumed})

    cumulative = edited
    state = store.read().state
    main_topic_id = core.topic_id(core.topic_for(path_a))
    return {
        "status": "demo_complete",
        "topic": cumulative.get("topic"),
        "diff": cumulative.get("diff", ""),
        "summary": cumulative.get("summary", ""),
        "question_changes": cumulative.get("question_changes", []),
        "demo_steps": steps,
        "counts": {
            "model_author_calls": model.author_calls,
            "model_review_calls": model.review_calls,
            "publications": publisher.publish_count,
            "pr_creates": publisher.pr_create_count,
            "pr_updates": publisher.pr_update_count,
            "main_topic_pr_creates": publisher.creates_by_topic.get(main_topic_id, 0),
            "main_topic_pr_updates": publisher.updates_by_topic.get(main_topic_id, 0),
            "feedback_receipts": len(api.receipts),
            "completed_operations": len(state.get("completed_operations", {})),
            "finalized_operations": len(state.get("finalized_operations", {})),
            "api_calls": len(api.calls),
        },
        "evidence": {
            "rules_version": core.rules_version(root),
            "single_draft_pr_reused": publisher.creates_by_topic.get(main_topic_id, 0) == 1 and publisher.updates_by_topic.get(main_topic_id, 0) >= 1,
            "duplicate_feedback_model_calls": duplicate.get("model_calls"),
            "quiet_cooldown_notices": [quiet_author.get("notice"), quiet_reviewer.get("notice")],
            "resumed_from_saved_author_proposal": resumed.get("model_calls") == 1,
            "source_branch_paths": sorted(publisher.branches[next(iter(publisher.branches))]),
        },
    }
