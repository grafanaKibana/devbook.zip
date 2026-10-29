"""Pure, deterministic policy core for recurring DevBook improvements.

The runtime owns Git, GitHub, Claude and persistence.  This module accepts and
returns JSON-compatible dictionaries so every orchestration decision can be
tested without credentials or a checkout mutation.
"""

from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Mapping, Sequence


DEFAULT_CONFIG = {
    "max_notes_per_run": 4,
    "max_pr_notes": 16,
    "max_pr_lines": 1200,
    "max_open_prs": 3,
}
STATE_VERSION = 1
PROPOSAL_VERSION = 1
SPECIAL_NOTES = {"Vault/Home/index.md", "Vault/Home/Questions.md", "Vault/Home/About.md", "Vault/Home/Changelog.md"}
CONTENT_AUTHORITIES = (
    "AGENTS.md",
    ".codex/agents/note-reviewer.toml",
    ".codex/agents/note-writer.toml",
    ".codex/skills/obsidian-markdown/SKILL.md",
    "Vault/Templates/Pages/Template - Concept Page.md",
    "Vault/Templates/Pages/Template - Index.md",
    "Vault/Templates/Blocks/Template - Callout.md",
)
EDIT_KEYS = {
    "path", "expected_hash", "before", "after", "reason", "kind",
    "learning_target", "essential_meanings", "sources", "feedback_keys",
}
PROPOSAL_REQUIRED_KEYS = {"version", "edits", "dispositions", "feedback"}
PROPOSAL_OPTIONAL_KEYS = {"decisions"}
KINDS = {"note", "rewrite", "add", "replace", "split", "remove"}
TARGETS = {"same", "new", "retired"}
QARD_KINDS = KINDS - {"note"}
QARD_HEADER = re.compile(r"^[ \t]{0,3}>[ \t]*\[!qard\](?P<fold>[+-]?)(?:[ \t]+(?P<title>.*))?$", re.IGNORECASE)
QARD_QUOTE = re.compile(r"^[ \t]{0,3}>[ \t]?(?P<body>.*)$")
QARD_META = re.compile(r"^[ \t]*<!--[ \t]*(?P<key>qard-[A-Za-z0-9_-]+):[ \t]*(?P<value>.*?)[ \t]*-->[ \t]*$")
QARD_ID = re.compile(r"^[ \t]*<!--[ \t]*qard-id:[ \t]*([A-Za-z0-9_-]+)[ \t]*-->[ \t]*$")
URL_RE = re.compile(r"https://[^\s)>\]]+")
WIKILINK_RE = re.compile(r"\[\[[^\]]+\]\]")
BLOCK_ID_RE = re.compile(r"(?m)(?<!\S)\^[A-Za-z0-9_-]+[ \t]*$")
HIDDEN_QARD_RE = re.compile(r"<!--[ \t]*qard-[A-Za-z0-9_-]+:[\s\S]*?-->")
MANAGED_START_TOKEN = "<!-- devbook-improvement:start"
MANAGED_END_PREFIX = "<!-- devbook-improvement:end"
MANAGED_END_TOKEN = "<!-- devbook-improvement:end -->"
MANAGED_RE = re.compile(
    r"^<!-- devbook-improvement:start topic=(?P<topic>[a-z0-9-]+) -->\n.*?"
    r"^<!-- devbook-improvement:end -->[ \t]*$",
    re.DOTALL | re.MULTILINE,
)


class ProposalError(ValueError):
    """Proposal is ambiguous or would violate a protected content contract."""


def digest(text: str) -> str:
    if not isinstance(text, str):
        raise TypeError("digest input must be text")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def topic_for(path: str | PurePosixPath) -> str:
    value = PurePosixPath(str(path))
    parts = value.parts
    if len(parts) < 4 or parts[:2] != ("Vault", "Home") or value.suffix != ".md":
        raise ValueError(f"not an authorable Vault/Home note: {value}")
    parent = PurePosixPath(*parts[2:-1]).as_posix()
    return parent


def topic_id(topic: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", topic.casefold()).strip("-") or "topic"
    return f"{slug}-{digest(topic)[:8]}"


def branch_for(topic: str, generation: int) -> str:
    if not isinstance(generation, int) or generation < 1:
        raise ValueError("generation must be a positive integer")
    return f"notes/automated-{topic_id(topic)}-g{generation}"


def _load_script(root: Path, filename: str, module_name: str) -> Any:
    path = root / ".scripts" / filename
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def rules_version(root: str | Path) -> str:
    """Hash prose-authoring authorities only; runtime deployments are separate."""
    base = Path(root)
    records: list[tuple[str, str]] = []
    for relative in CONTENT_AUTHORITIES:
        path = base / relative
        records.append((relative, digest(path.read_text(encoding="utf-8")) if path.is_file() else "missing"))
    return digest(json.dumps(records, separators=(",", ":"), ensure_ascii=False))


def inventory(root: str | Path) -> list[dict[str, Any]]:
    """Inventory authorable notes and attach repository-validator findings."""
    base = Path(root).resolve()
    home = base / "Vault" / "Home"
    validator = _load_script(base, "validate-vault.py", "_devbook_improvement_validator")
    notes = [validator.load_note(path, base) for path in sorted(home.rglob("*.md"))]
    issues: list[Any] = []
    for note in notes:
        issues.extend(validator.validate_frontmatter(note))
        issues.extend(validator.validate_folder_note(note, home))
        issues.extend(validator.validate_published(note))
        issues.extend(validator.validate_references(note))
        issues.extend(validator.validate_residue(note))
        issues.extend(validator.validate_code_fences(note))
        issues.extend(validator.validate_qard_interviews(note))
    issues.extend(validator.validate_global_qard_ids(notes))
    by_path: dict[str, list[dict[str, Any]]] = {}
    for issue in issues:
        by_path.setdefault(issue.path, []).append(
            {"code": issue.code, "line": issue.line, "message": issue.message}
        )
    result = []
    for note in notes:
        if note.rel in SPECIAL_NOTES:
            continue
        result.append(
            {
                "path": note.rel,
                "content": note.content,
                "hash": digest(note.content),
                "topic": topic_for(note.rel),
                "violations": by_path.get(note.rel, []),
            }
        )
    return result


def new_state() -> dict[str, Any]:
    return {
        "version": STATE_VERSION,
        "runtime_version": None,
        "notes": {},
        "topics": {},
        "prs": {},
        "feedback": {},
        "rejections": [],
        "retired_ids": {},
        "cooldown": None,
    }


def _copy_state(state: Mapping[str, Any]) -> dict[str, Any]:
    result = copy.deepcopy(dict(state))
    if result.get("version") != STATE_VERSION:
        raise ValueError("unsupported state version")
    for key, default in new_state().items():
        result.setdefault(key, copy.deepcopy(default))
    return result


def _pr_topic(pr: Mapping[str, Any]) -> str | None:
    return pr.get("topic_id") or pr.get("topic")


def _stable_object_hash(value: Any) -> str:
    return digest(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False))


def _rejection_tombstone(edit: Mapping[str, Any], result: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "fingerprint": _fingerprint(edit),
        "semantic_fingerprint": _fingerprint(edit, semantic=True),
        "path": edit["path"],
        "kind": edit["kind"],
        "learning_target": edit["learning_target"],
        "before": edit["before"],
        "after": edit["after"],
        "lineage": [value for value in result.get("lineage", []) if value.get("path") == edit["path"]],
        "reconsidered_by": [],
    }


def _prune_terminal_records(state: dict[str, Any], entry: dict[str, Any]) -> None:
    if entry.get("status") == "open":
        return
    records = list(entry.pop("proposal_records", []))
    if not records:
        return
    entry["terminal_audit"] = {
        "status": entry["status"],
        "record_count": len(records),
        "records": [
            {
                "batch_hash": _stable_object_hash(record.get("batch")),
                "proposal_hash": _stable_object_hash(record.get("proposal")),
                "result_hash": _stable_object_hash(record.get("result")),
            }
            for record in records
        ],
    }
    if entry["status"] != "closed":
        return
    known = {item.get("fingerprint") for item in state["rejections"]}
    for record in records:
        proposal, result = record.get("proposal", {}), record.get("result", {})
        for edit in proposal.get("edits", []):
            tombstone = _rejection_tombstone(edit, result)
            if tombstone["fingerprint"] not in known:
                state["rejections"].append(tombstone)
                known.add(tombstone["fingerprint"])


def sync_prs(state: Mapping[str, Any], prs: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Reconcile managed PRs by machine topic/generation markers, never titles."""
    result = _copy_state(state)
    seen: set[str] = set()
    for raw in prs:
        topic = _pr_topic(raw)
        generation = raw.get("generation")
        number = raw.get("number")
        status = raw.get("status") or raw.get("state")
        if not isinstance(topic, str) or not topic or not isinstance(generation, int) or not isinstance(number, int):
            raise ValueError("managed PR needs topic_id/topic, generation, and number")
        if status not in {"open", "closed", "merged"}:
            raise ValueError("invalid PR status")
        key = f"{topic}:{generation}"
        if key in seen:
            raise ValueError(f"duplicate managed PR marker {key}")
        seen.add(key)
        prior = result["prs"].get(key, {})
        size_frozen = int(raw.get("note_count", 0)) >= DEFAULT_CONFIG["max_pr_notes"] or int(raw.get("changed_lines", 0)) >= DEFAULT_CONFIG["max_pr_lines"]
        review_frozen = bool(raw.get("review_activity")) or bool(raw.get("has_reviews")) or int(raw.get("review_count", 0)) > 0
        inherited_frozen = bool(prior.get("frozen")) and not raw.get("clear_export_freeze", False)
        frozen = inherited_frozen or bool(raw.get("frozen")) or review_frozen or size_frozen or raw.get("draft") is False
        entry = {**prior, **dict(raw), "topic_id": topic, "generation": generation, "number": number, "status": status, "frozen": frozen}
        entry.pop("clear_export_freeze", None)
        if status == "open" and any(
            other_key != key and other.get("status") == "open" and other.get("topic_id") == topic
            for other_key, other in result["prs"].items()
        ):
            raise ValueError(f"multiple open managed PRs for topic {topic}")
        _prune_terminal_records(result, entry)
        result["prs"][key] = entry
        topic_state = result["topics"].setdefault(topic, {"generation": generation})
        topic_state["generation"] = max(int(topic_state.get("generation", 1)), generation)
        if status == "open":
            topic_state["open_pr_key"] = key
        else:
            if topic_state.get("open_pr_key") == key:
                topic_state.pop("open_pr_key", None)
            topic_state["generation"] = max(topic_state["generation"], generation + 1)
            topic_state["last_terminal_status"] = status
    for entry in result["prs"].values():
        _prune_terminal_records(result, entry)
    return result


def _actor_allowed(item: Mapping[str, Any], allowlist: Mapping[str, Any] | Sequence[Any]) -> bool:
    actor = next(
        (item[key] for key in ("author", "user") if isinstance(item.get(key), Mapping)),
        item,
    )
    actor_id = actor.get("id") or actor.get("database_id") or actor.get("databaseId") or actor.get("author_id")
    login = actor.get("login") or actor.get("author_login")
    if isinstance(allowlist, Mapping):
        ids = {str(value) for value in allowlist.get("ids", [])}
        logins = {str(value).casefold() for value in allowlist.get("logins", [])}
    else:
        ids = {str(value) for value in allowlist if isinstance(value, int)}
        logins = {str(value).casefold() for value in allowlist if isinstance(value, str)}
    return actor_id is not None and login is not None and str(actor_id) in ids and str(login).casefold() in logins


def _feedback_key(item: Mapping[str, Any]) -> tuple[str, str]:
    item_id = item.get("id")
    body = item.get("body", "")
    state = item.get("state", "")
    if not isinstance(item_id, (int, str)) or not isinstance(body, str) or not isinstance(state, str):
        raise ValueError("feedback needs id and textual body/state")
    revision = digest(json.dumps({"body": body, "state": state, "updated_at": item.get("updated_at")}, sort_keys=True, separators=(",", ":")))
    return f"{item.get('kind', 'comment')}:{item_id}:{revision[:16]}", revision


def ingest_feedback(
    state: Mapping[str, Any],
    prs: Sequence[Mapping[str, Any]],
    comments: Sequence[Mapping[str, Any]],
    allowlist: Mapping[str, Any] | Sequence[Any],
) -> list[dict[str, Any]]:
    """Return newly queued verified-owner feedback, including edited revisions."""
    current = _copy_state(state)
    reconciled = sync_prs(current, prs)
    open_numbers = {entry["number"] for entry in reconciled["prs"].values() if entry["status"] == "open"}
    queued = []
    for item in comments:
        pr_number = item.get("pr_number", item.get("pull_request_number"))
        if pr_number not in open_numbers or not _actor_allowed(item, allowlist):
            continue
        key, revision = _feedback_key(item)
        if key in current["feedback"]:
            continue
        queued.append({**dict(item), "key": key, "revision": revision, "status": "pending"})
    return sorted(queued, key=lambda value: (str(value.get("updated_at", "")), value["key"]))


def _open_pr_for_topic(state: Mapping[str, Any], topic: str) -> Mapping[str, Any] | None:
    topic_key = topic_id(topic)
    for pr in state.get("prs", {}).values():
        if pr.get("status") == "open" and pr.get("topic_id") in {topic, topic_key}:
            return pr
    return None


def select_batch(
    state: Mapping[str, Any],
    notes: Sequence[Mapping[str, Any]],
    rules_hash: str,
    config: Mapping[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Choose one topic, prioritizing feedback then new/changed/unchecked/violations."""
    cfg = {**DEFAULT_CONFIG, **dict(config or {})}
    current = _copy_state(state)
    pending_feedback = [dict(value) for value in current["feedback"].values() if value.get("status") == "pending"]
    open_pr_count = sum(pr.get("status") == "open" for pr in current["prs"].values())
    candidates: dict[str, list[tuple[int, str, Mapping[str, Any], str]]] = {}
    feedback_by_topic: dict[str, list[dict[str, Any]]] = {}
    for item in pending_feedback:
        topic = item.get("topic")
        if isinstance(topic, str):
            feedback_by_topic.setdefault(topic, []).append(item)
    for note in notes:
        path = str(note["path"])
        topic = str(note.get("topic") or topic_for(path))
        note_hash = str(note.get("hash") or digest(str(note["content"])))
        prior = current["notes"].get(path)
        reason = ""
        priority = 99
        if feedback_by_topic.get(topic):
            priority, reason = 0, "feedback"
        elif prior is None:
            priority, reason = 1, "new"
        elif prior.get("content_hash") != note_hash:
            priority, reason = 2, "changed"
        elif prior.get("outcome") not in {"keep", "changed"}:
            priority, reason = 3, "unchecked"
        elif note.get("violations") and prior.get("violation_hash") != digest(json.dumps(note["violations"], sort_keys=True)):
            priority, reason = 4, "violations"
        elif prior.get("rules_hash") != rules_hash:
            priority, reason = 5, "rules_changed"
        if reason:
            candidates.setdefault(topic, []).append((priority, path.casefold(), note, reason))
    if not candidates:
        return None
    ranked_topics = sorted(candidates, key=lambda topic: (0 if feedback_by_topic.get(topic) else 1, min(row[0] for row in candidates[topic]), topic.casefold()))
    scope_batch = None
    for topic in ranked_topics:
        pr = _open_pr_for_topic(current, topic)
        feedback = feedback_by_topic.get(topic, [])
        if scope_batch and not feedback:
            return scope_batch
        if pr is None and open_pr_count >= int(cfg["max_open_prs"]) and not feedback:
            continue
        rows = sorted(candidates[topic])
        if pr and pr.get("frozen"):
            if not feedback:
                continue
            allowed_paths = {path for item in feedback for path in item.get("paths", [])}
            rows = [row for row in rows if row[2]["path"] in allowed_paths]
        limit = int(cfg["max_notes_per_run"])
        available = {row[2]["path"] for row in rows}
        requested_paths: set[str] = set()
        # Pack complete requests first: a disposition must never claim that a
        # cross-note request was handled after reviewing only one of its notes.
        for item in feedback:
            paths = set(item.get("paths") or [])
            if paths <= available and len(requested_paths | paths) <= limit:
                requested_paths.update(paths)
        rows.sort(key=lambda row: (row[2]["path"] not in requested_paths, row[0], row[1]))
        selected = rows[:limit]
        selected_paths = {row[2]["path"] for row in selected}
        scoped_feedback = [item for item in feedback if set(item.get("paths") or []) <= selected_paths]
        if feedback and not scoped_feedback:
            # Keep indivisible oversized/missing-path requests visible without
            # sending a partial request to the author or silently starving it.
            scope_batch = scope_batch or {
                "topic": topic, "topic_id": topic_id(topic), "notes": [],
                "feedback": feedback, "rules_hash": rules_hash, "pr": copy.deepcopy(pr),
            }
            continue
        feedback = scoped_feedback
        if selected or feedback:
            return {
                "topic": topic,
                "topic_id": topic_id(topic),
                "notes": [{**dict(row[2]), "selection_reason": row[3]} for row in selected],
                "feedback": feedback,
                "rules_hash": rules_hash,
                "pr": copy.deepcopy(pr),
            }
    return scope_batch


def _validate_path(path: str, sources: Mapping[str, str]) -> None:
    pure = PurePosixPath(path)
    if pure.is_absolute() or ".." in pure.parts or len(pure.parts) < 4 or pure.parts[:2] != ("Vault", "Home") or pure.suffix != ".md":
        raise ProposalError(f"unsafe proposal path: {path}")
    if path not in sources:
        raise ProposalError(f"proposal path missing from guarded sources: {path}")


def _qard_spans(text: str) -> list[tuple[int, int, str]]:
    """Return byte-character spans for active Qard cards plus adjacent metadata."""
    root = Path(__file__).resolve().parents[2]
    migration = _load_script(root, "migrate-question-callouts-to-qard.py", "_devbook_improvement_qard_scan")
    lines = text.splitlines(keepends=True)
    active = migration.scan_active_lines(lines)
    offsets = [0]
    for line in lines:
        offsets.append(offsets[-1] + len(line))
    spans = []
    covered: set[int] = set()
    for index, line in enumerate(lines):
        raw = line.rstrip("\r\n")
        if index in covered or not active[index] or not QARD_HEADER.match(raw):
            continue
        start = index
        metadata_end = start - 1
        if metadata_end >= 0 and not lines[metadata_end].strip():
            metadata_end -= 1
        if metadata_end >= 0 and QARD_META.match(lines[metadata_end].rstrip("\r\n")):
            start = metadata_end
        while start > 0 and QARD_META.match(lines[start - 1].rstrip("\r\n")):
            start -= 1
        end = index + 1
        quote_fence = ""
        while end < len(lines):
            quoted = QARD_QUOTE.match(lines[end].rstrip("\r\n"))
            if quoted is None:
                break
            body = quoted.group("body")
            if not quote_fence and QARD_HEADER.match(lines[end].rstrip("\r\n")):
                break
            if quote_fence:
                closing = re.match(r"^[ \t]{0,3}(`+|~+)[ \t]*$", body)
                if closing and closing.group(1)[0] == quote_fence[0] and len(closing.group(1)) >= len(quote_fence):
                    quote_fence = ""
            else:
                fence_match = migration.FENCE_RE.match(body)
                if fence_match:
                    quote_fence = fence_match.group("fence")
            end += 1
        covered.update(range(index + 1, end))
        spans.append((offsets[start], offsets[end], text[offsets[start]:offsets[end]]))
    return spans


def _metadata(block: str) -> list[str]:
    return [line for line in block.splitlines() if QARD_META.match(line)]


def _frontmatter(text: str) -> str:
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].lstrip("\ufeff").rstrip("\r\n") != "---":
        return ""
    for index in range(1, len(lines)):
        if lines[index].rstrip("\r\n").strip() in {"---", "..."}:
            return "".join(lines[: index + 1])
    raise ProposalError("unterminated frontmatter")


def _removed_wikilinks(before: str, after: str) -> list[str]:
    remaining = list(WIKILINK_RE.findall(after))
    removed = []
    for link in WIKILINK_RE.findall(before):
        if link in remaining:
            remaining.remove(link)
        else:
            removed.append(link)
    return removed


def _ids(block: str) -> list[str]:
    return [match.group(1) for line in block.splitlines() if (match := QARD_ID.match(line))]


def _cards(block: str) -> list[str]:
    return [card for _, _, card in _qard_spans(block)]


def _card_header(block: str) -> re.Match[str]:
    match = next((QARD_HEADER.match(line) for line in block.splitlines() if QARD_HEADER.match(line)), None)
    if match is None:
        raise ProposalError("Qard block is missing its active header")
    return match


def _validate_source_placement(path: str, after: str, source_entries: Sequence[Mapping[str, Any]]) -> None:
    circular = re.search(r"(?:\]\(#Questions\)|\[\[[^\]]*#Questions(?:\|[^\]]*)?\]\])", after, re.IGNORECASE)
    if circular:
        raise ProposalError(f"circular Questions link in {path}")
    if not source_entries:
        return
    for entry in source_entries:
        if set(entry) != {"url", "claim", "version"} or not all(isinstance(entry[key], str) and entry[key].strip() for key in entry):
            raise ProposalError("source entries require nonempty url, claim, and version")
        url = entry["url"]
        if not url.startswith("https://") or url not in after:
            raise ProposalError(f"source URL missing from changed answer: {url}")
    for _, _, block in _qard_spans(after):
        lines = block.splitlines()
        header_index = next((i for i, line in enumerate(lines) if QARD_HEADER.match(line)), None)
        if header_index is None:
            continue
        title = QARD_HEADER.match(lines[header_index]).group("title") or ""
        body = [QARD_QUOTE.match(line).group("body") for line in lines[header_index + 1:] if QARD_QUOTE.match(line)]
        marker = next((i for i, line in enumerate(body) if line.strip() == "<!-- qard-answer -->"), None)
        front = "\n".join([title, *(body[:marker] if marker is not None else [])])
        for entry in source_entries:
            if entry["url"] in front:
                raise ProposalError("sources must be on the answer side")


def _fingerprint(edit: Mapping[str, Any], *, semantic: bool = False) -> str:
    before = edit["before"]
    after = edit["after"]
    if semantic:
        before = " ".join(before.split()).casefold()
        after = " ".join(after.split()).casefold()
    payload = {"path": edit["path"], "kind": edit["kind"], "learning_target": edit["learning_target"], "before": before, "after": after}
    return digest(json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False))


def _validate_proposal(proposal: Mapping[str, Any]) -> None:
    keys = set(proposal)
    if (
        not PROPOSAL_REQUIRED_KEYS.issubset(keys)
        or not keys.issubset(PROPOSAL_REQUIRED_KEYS | PROPOSAL_OPTIONAL_KEYS)
        or proposal.get("version") != PROPOSAL_VERSION
    ):
        raise ProposalError("proposal must use the exact version 1 schema")
    for field in ("edits", "dispositions", "feedback"):
        if not isinstance(proposal[field], list):
            raise ProposalError(f"proposal {field} must be a list")
    for edit in proposal["edits"]:
        if not isinstance(edit, Mapping) or set(edit) != EDIT_KEYS:
            raise ProposalError("edit has missing or unknown fields")
        if edit["kind"] not in KINDS or edit["learning_target"] not in TARGETS:
            raise ProposalError("invalid edit kind or learning target")
        if not all(isinstance(edit[key], str) and edit[key] for key in ("path", "expected_hash", "before", "reason")) or not isinstance(edit["after"], str):
            raise ProposalError("edit string fields are invalid")
        if not isinstance(edit["essential_meanings"], list) or not all(isinstance(value, str) and value.strip() for value in edit["essential_meanings"]):
            raise ProposalError("essential_meanings must contain nonempty strings")
        if edit["kind"] in QARD_KINDS and not edit["essential_meanings"]:
            raise ProposalError("question edits require a finite nonempty essential-meanings set")
        if not isinstance(edit["sources"], list) or not isinstance(edit["feedback_keys"], list) or not all(isinstance(key, str) for key in edit["feedback_keys"]):
            raise ProposalError("sources and feedback_keys must be lists")
    for disposition in proposal["dispositions"]:
        if not isinstance(disposition, Mapping) or set(disposition) != {"path", "outcome", "reason"} or disposition["outcome"] not in {"keep", "changed", "blocked"}:
            raise ProposalError("invalid disposition")
    for feedback in proposal["feedback"]:
        if (
            not isinstance(feedback, Mapping)
            or set(feedback) != {"key", "outcome", "reason"}
            or feedback.get("outcome") not in {"implemented", "keep", "awaiting-clarification", "blocked"}
            or not all(isinstance(feedback.get(field), str) and feedback[field].strip() for field in ("key", "reason"))
        ):
            raise ProposalError("invalid feedback disposition")
    decisions = proposal.get("decisions", [])
    if not isinstance(decisions, list):
        raise ProposalError("proposal decisions must be a list")
    for decision in decisions:
        if (
            not isinstance(decision, Mapping)
            or set(decision) != {"feedback_key", "fingerprint", "decision", "reason"}
            or decision.get("decision") not in {"reject", "reconsider"}
            or not all(
                isinstance(decision.get(field), str) and decision[field].strip()
                for field in ("feedback_key", "fingerprint", "reason")
            )
        ):
            raise ProposalError("invalid owner proposal decision")
    disposition_paths = [item["path"] for item in proposal["dispositions"]]
    feedback_keys = [item["key"] for item in proposal["feedback"]]
    if len(disposition_paths) != len(set(disposition_paths)) or len(feedback_keys) != len(set(feedback_keys)):
        raise ProposalError("duplicate disposition or feedback key")
    edited_paths = {item["path"] for item in proposal["edits"]}
    if not edited_paths.issubset(disposition_paths):
        raise ProposalError("every edited note requires one disposition")


def apply_proposal(
    sources: Mapping[str, str],
    proposal: Mapping[str, Any],
    rejected: Sequence[Mapping[str, Any] | str] = (),
    *,
    expected_feedback_keys: Sequence[str] = (),
    required_feedback_keys: Sequence[str] = (),
) -> dict[str, Any]:
    """Apply guarded replacements in memory, enforcing Qard identity semantics."""
    _validate_proposal(proposal)
    disposition_paths = {item["path"] for item in proposal["dispositions"]}
    guarded_paths = set(sources)
    if disposition_paths != guarded_paths:
        missing = sorted(guarded_paths - disposition_paths)
        extra = sorted(disposition_paths - guarded_paths)
        raise ProposalError(f"dispositions must exactly cover guarded notes; missing={missing}, extra={extra}")
    proposed_feedback_keys = [item["key"] for item in proposal["feedback"]]
    expected = set(expected_feedback_keys)
    if len(expected) != len(expected_feedback_keys):
        raise ProposalError("expected owner feedback keys must be unique")
    if set(proposed_feedback_keys) != expected:
        missing = sorted(expected - set(proposed_feedback_keys))
        extra = sorted(set(proposed_feedback_keys) - expected)
        raise ProposalError(f"feedback dispositions must exactly cover queued owner feedback; missing={missing}, extra={extra}")
    candidates = dict(sources)
    retired_ids: list[str] = []
    lineage: list[dict[str, Any]] = []
    fingerprints: list[str] = []
    grouped: dict[str, list[tuple[int, int, Mapping[str, Any]]]] = {}
    for edit in proposal["edits"]:
        path = edit["path"]
        _validate_path(path, candidates)
        source = sources[path]
        if digest(source) != edit["expected_hash"]:
            raise ProposalError(f"whole-note CAS conflict: {path}")
        if source.count(edit["before"]) != 1:
            raise ProposalError(f"replacement anchor must be unique: {path}")
        exact = _fingerprint(edit)
        semantic = _fingerprint(edit, semantic=True)
        matching_rejections = [
            value
            for value in rejected
            if (isinstance(value, str) and value == exact)
            or (
                isinstance(value, Mapping)
                and (value.get("fingerprint") == exact or value.get("semantic_fingerprint") == semantic)
            )
        ]
        if any(
            not isinstance(value, Mapping)
            or not set(value.get("reconsidered_by", [])).intersection(edit["feedback_keys"])
            for value in matching_rejections
        ):
            raise ProposalError("proposal repeats a rejected edit without fingerprint-specific reconsideration")
        required = set(required_feedback_keys)
        if required and not required.intersection(edit["feedback_keys"]):
            raise ProposalError("frozen edits require explicit owner-feedback causality")
        if edit["kind"] in QARD_KINDS:
            matching = [block for _, _, block in _qard_spans(source) if block == edit["before"]]
            if edit["kind"] != "add" and len(matching) != 1:
                raise ProposalError("card edit must replace one complete active Qard block including adjacent metadata")
            before_ids = _ids(edit["before"])
            after_ids = _ids(edit["after"])
            before_meta = _metadata(edit["before"])
            after_meta = _metadata(edit["after"])
            before_non_id = [line for line in before_meta if not QARD_ID.match(line)]
            after_non_id = [line for line in after_meta if not QARD_ID.match(line)]
            after_cards = _cards(edit["after"])
            card_count = len(after_cards)
            if edit["kind"] != "remove" and any(_card_header(block).group("fold") != "-" for block in after_cards):
                raise ProposalError("authored Qard cards must be collapsed")
            if re.search(r"(?im)^>[ \t]*(?:essential meanings|grading (?:criteria|rubric))\s*:", edit["after"]):
                raise ProposalError("internal grading guidance cannot be rendered into a visible card")
            target = edit["learning_target"]
            if target == "same":
                if edit["kind"] != "rewrite" or card_count != 1 or before_meta != after_meta:
                    raise ProposalError("same-target rewrite must preserve all adjacent Qard metadata exactly")
            else:
                if any(QARD_META.match(line).group("key").casefold() == "qard-reverse" for line in before_meta):
                    raise ProposalError("reverse-linked cards require a coordinated native metadata transformation")
                if edit["kind"] == "add":
                    if edit["before"] not in edit["after"] or card_count < 1:
                        raise ProposalError("add must retain its insertion anchor and add a complete Qard card")
                    if matching:
                        raise ProposalError("add must use a non-card insertion anchor")
                    anchor_start = source.index(edit["before"])
                    anchor_end = anchor_start + len(edit["before"])
                    if HIDDEN_QARD_RE.search(edit["before"]) or any(
                        anchor_start < card_end and anchor_end > card_start
                        for card_start, card_end, _ in _qard_spans(source)
                    ):
                        raise ProposalError("add anchor cannot contain or overlap Qard metadata")
                    if after_ids:
                        raise ProposalError("new cards must be ID-less")
                    added_blocks = _qard_spans(edit["after"])
                    if not added_blocks:
                        raise ProposalError("add must contain a complete Qard card")
                    if any(_card_header(block).group("fold") != "-" for _, _, block in added_blocks):
                        raise ProposalError("new Qard cards must be collapsed")
                elif after_ids:
                    raise ProposalError("replacement and split targets must be ID-less")
                if edit["kind"] == "split":
                    child_metadata = [
                        [line for line in _metadata(block) if not QARD_ID.match(line)]
                        for block in after_cards
                    ]
                    if any(metadata != before_non_id for metadata in child_metadata):
                        raise ProposalError("every split child must preserve the parent's non-identity Qard metadata exactly")
                elif edit["kind"] not in {"add", "remove"} and before_non_id != after_non_id:
                    raise ProposalError("sensitive non-identity Qard metadata must be preserved exactly")
                if target == "new" and edit["kind"] not in {"add", "replace", "split"}:
                    raise ProposalError("new learning targets require add, replace, or split")
                if target == "retired" and edit["kind"] != "remove":
                    raise ProposalError("retired learning targets require remove")
                if edit["kind"] == "split" and card_count < 2:
                    raise ProposalError("split must create at least two ID-less cards")
                if edit["kind"] == "replace" and card_count != 1:
                    raise ProposalError("replacement must create one ID-less card")
                if edit["kind"] == "remove" and edit["after"].strip():
                    raise ProposalError("removed target must have an empty replacement")
                if edit["kind"] != "add":
                    retired_ids.extend(before_ids)
                lineage.append({
                    "path": path,
                    "kind": edit["kind"],
                    "old_ids": before_ids,
                    "new_ids": [],
                    "learning_target": target,
                    "rationale": edit["reason"],
                    "before": edit["before"],
                    "after": edit["after"],
                })
        elif edit["learning_target"] != "same":
            raise ProposalError("note prose edits cannot transform Qard identity")
        else:
            start = source.index(edit["before"])
            end = start + len(edit["before"])
            if any(start < card_end and end > card_start for card_start, card_end, _ in _qard_spans(source)):
                raise ProposalError("note edits cannot overlap Qard cards or adjacent metadata")
            if HIDDEN_QARD_RE.findall(edit["before"]) != HIDDEN_QARD_RE.findall(edit["after"]):
                raise ProposalError("note edits cannot transform Qard metadata")
        removed_links = _removed_wikilinks(edit["before"], edit["after"])
        reason_folded = edit["reason"].casefold()
        if removed_links and (
            "wikilink" not in reason_folded
            or any(link[2:-2].split("|", 1)[0].casefold() not in reason_folded for link in removed_links)
        ):
            raise ProposalError("wikilink removal requires explicit target-specific semantic rationale")
        _validate_source_placement(path, edit["after"], edit["sources"])
        start = source.index(edit["before"])
        end = start + len(edit["before"])
        for prior_start, prior_end, _ in grouped.get(path, []):
            if start < prior_end and end > prior_start:
                raise ProposalError("proposal edits overlap in the original note")
        grouped.setdefault(path, []).append((start, end, edit))
        fingerprints.append(exact)
    for path, edits in grouped.items():
        candidate = sources[path]
        for start, end, edit in sorted(edits, key=lambda item: item[0], reverse=True):
            candidate = candidate[:start] + edit["after"] + candidate[end:]
        if _frontmatter(candidate) != _frontmatter(sources[path]):
            raise ProposalError("proposal must preserve frontmatter exactly")
        if sorted(BLOCK_ID_RE.findall(candidate)) != sorted(BLOCK_ID_RE.findall(sources[path])):
            raise ProposalError("proposal must preserve block IDs exactly")
        candidates[path] = candidate
    return {"sources": candidates, "edits": copy.deepcopy(proposal["edits"]), "retired_ids": retired_ids, "lineage": lineage, "fingerprints": fingerprints}


def record_outcome(
    state: Mapping[str, Any],
    batch: Mapping[str, Any],
    proposal: Mapping[str, Any],
    result: Mapping[str, Any],
) -> dict[str, Any]:
    current = _copy_state(state)
    rules_hash = batch.get("rules_hash")
    dispositions = {item["path"]: item for item in proposal.get("dispositions", [])}
    batch_notes = list(batch.get("notes", []))
    batch_paths = {note["path"] for note in batch_notes}
    if set(dispositions) != batch_paths:
        missing = sorted(batch_paths - set(dispositions))
        extra = sorted(set(dispositions) - batch_paths)
        raise ProposalError(f"outcome dispositions must exactly cover batch notes; missing={missing}, extra={extra}")
    for note in batch_notes:
        path = note["path"]
        disposition = dispositions[path]
        current["notes"][path] = {
            "content_hash": digest(result["sources"][path]) if path in result.get("sources", {}) else note.get("hash") or digest(note["content"]),
            "rules_hash": rules_hash,
            "outcome": disposition["outcome"],
            "violation_hash": digest(json.dumps(note.get("violations", []), sort_keys=True)),
        }
    for item in proposal.get("feedback", []):
        if item["key"] in current["feedback"]:
            current["feedback"][item["key"]].update({"status": item["outcome"], "reason": item["reason"]})
    for lineage in result.get("lineage", []):
        for card_id in lineage.get("old_ids", []):
            current["retired_ids"][card_id] = copy.deepcopy(lineage)
    if result.get("outcome") in {"rejected", "closed_without_merge"}:
        known = {item.get("fingerprint") for item in current["rejections"]}
        for edit in proposal.get("edits", []):
            tombstone = _rejection_tombstone(edit, result)
            if tombstone["fingerprint"] not in known:
                current["rejections"].append(tombstone)
                known.add(tombstone["fingerprint"])
    return current


def _parse_time(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        raise ValueError("time must be ISO text or datetime")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _format_time(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def set_cooldown(
    state: Mapping[str, Any],
    kind: str,
    reported_reset_at: str | datetime | None,
    now: str | datetime,
    recheck_hours: int = 24,
) -> dict[str, Any]:
    if kind not in {"five_hour", "weekly", "unknown"}:
        raise ValueError("invalid cooldown kind")
    current = _copy_state(state)
    moment = _parse_time(now)
    reset = _parse_time(reported_reset_at)
    assert moment is not None
    next_check = reset if reset and reset > moment else moment + timedelta(hours=recheck_hours)
    prior = current.get("cooldown") or {}
    episode_key = digest(f"{kind}|{_format_time(reset) if reset else 'unknown'}")[:16]
    current["cooldown"] = {
        "kind": kind,
        "reported_reset_at": _format_time(reset) if reset else None,
        "next_check_at": _format_time(next_check),
        "episode_key": episode_key,
        "notice_pending": prior.get("episode_key") != episode_key,
        "notice_sent": prior.get("episode_key") == episode_key and bool(prior.get("notice_sent")),
    }
    return current


def cooldown_active(state: Mapping[str, Any], now: str | datetime) -> bool:
    cooldown = state.get("cooldown")
    if not cooldown:
        return False
    next_check = _parse_time(cooldown.get("next_check_at"))
    moment = _parse_time(now)
    return bool(next_check and moment and moment < next_check)


def _coalesce_changes(
    base: Mapping[str, str], current: Mapping[str, str], changes: Sequence[Mapping[str, Any]]
) -> list[dict[str, Any]]:
    """Collapse edit history into the observable base-to-current transformations."""
    coalesced: list[dict[str, Any] | None] = []
    identities: dict[tuple[str, str], int] = {}
    for raw in changes:
        item = copy.deepcopy(dict(raw))
        path = str(item.get("path", ""))
        if path not in base or path not in current or base[path] == current[path]:
            continue
        before_ids = _ids(str(item.get("before", "")))
        identity = (path, before_ids[0]) if before_ids else None
        target_index = identities.get(identity) if identity else None
        if target_index is None:
            target_index = next(
                (
                    index
                    for index in range(len(coalesced) - 1, -1, -1)
                    if coalesced[index]
                    and coalesced[index]["path"] == path
                    and coalesced[index]["after"] == item.get("before")
                ),
                None,
            )
        if target_index is None:
            item["_reasons"] = [str(item.get("reason", ""))]
            coalesced.append(item)
            if identity:
                identities[identity] = len(coalesced) - 1
            continue
        prior = coalesced[target_index]
        assert prior is not None
        prior["after"] = item.get("after", "")
        prior["_reasons"].append(str(item.get("reason", "")))
        prior["reason"] = "; ".join(dict.fromkeys(reason for reason in prior["_reasons"] if reason))
        combined_sources = []
        for source in [*prior.get("sources", []), *item.get("sources", [])]:
            if source not in combined_sources:
                combined_sources.append(source)
        prior["sources"] = combined_sources
        if prior.get("kind") == "rewrite":
            prior["kind"] = item.get("kind", prior["kind"])
        if prior.get("learning_target") == "same":
            prior["learning_target"] = item.get("learning_target", "same")

    result: list[dict[str, Any]] = []
    for item in (value for value in coalesced if value is not None):
        path = item["path"]
        before, after = str(item.get("before", "")), str(item.get("after", ""))
        before_ids = _ids(before)
        if before_ids:
            base_block = next((block for _, _, block in _qard_spans(base[path]) if before_ids[0] in _ids(block)), None)
            current_block = next((block for _, _, block in _qard_spans(current[path]) if before_ids[0] in _ids(block)), None)
            if base_block:
                before = base_block
            if current_block:
                after = current_block
        if before == after:
            continue
        if before and before not in base[path]:
            continue
        if after and after not in current[path]:
            continue
        item["before"], item["after"] = before, after
        item.pop("_reasons", None)
        result.append(item)
    return result


def _visible_qards(block: str) -> list[tuple[str, str]]:
    visible = []
    for _, _, card in _qard_spans(block):
        lines = card.splitlines()
        header_index = next((index for index, line in enumerate(lines) if QARD_HEADER.match(line)), None)
        if header_index is None:
            continue
        header = QARD_HEADER.match(lines[header_index])
        body = [
            match.group("body")
            for line in lines[header_index + 1 :]
            if (match := QARD_QUOTE.match(line))
        ]
        marker = next((index for index, line in enumerate(body) if line.strip() == "<!-- qard-answer -->"), None)
        question_parts = [header.group("title") or "", *(body[:marker] if marker is not None else [])]
        answer_parts = body[marker + 1 :] if marker is not None else body
        question = " ".join(part.strip() for part in question_parts if part.strip())
        answer = " ".join(part.strip() for part in answer_parts if part.strip())
        answer = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", answer)
        visible.append((question, answer))
    return visible


def _note_reference(path: str, note_links: Mapping[str, str]) -> str:
    return f"[`{path}`]({note_links[path]})" if note_links.get(path) else f"`{path}`"


def _identity_summary(change: Mapping[str, Any]) -> str:
    before_ids, after_ids = _ids(str(change.get("before", ""))), _ids(str(change.get("after", "")))
    if before_ids and before_ids == after_ids:
        return f"Qard ID `{before_ids[0]}` preserved; existing review history remains attached."
    if before_ids and change.get("kind") in {"replace", "split"}:
        return f"Qard ID `{before_ids[0]}` retired; replacement target(s) remain ID-less, so review history is not transferred."
    if before_ids and change.get("kind") == "remove":
        return f"Qard ID `{before_ids[0]}` retired; its review history is no longer attached to an active target."
    if change.get("kind") == "add":
        return "New learning target remains ID-less; no review history is attached."
    return "Learning target remains ID-less; no review history is transferred."


def _escape_managed_tokens(value: str) -> str:
    return value.replace(MANAGED_START_TOKEN, "&lt;!-- devbook-improvement:start").replace(
        MANAGED_END_PREFIX, "&lt;!-- devbook-improvement:end"
    )


def render_summary(
    topic: str,
    base: Mapping[str, str],
    current: Mapping[str, str],
    changes: Sequence[Mapping[str, Any]],
    feedback: Sequence[Mapping[str, Any]],
    validation: Sequence[Mapping[str, Any] | str],
    sources: Mapping[str, str],
    note_links: Mapping[str, str] | None = None,
) -> str:
    """Render all six required sections from the cumulative base/current diff."""
    links = note_links or {}
    affected = sorted(path for path in set(base) | set(current) if base.get(path) != current.get(path))
    final_changes = _coalesce_changes(base, current, changes)
    counts = {kind: 0 for kind in ("add", "rewrite", "split", "remove", "replace")}
    for change in final_changes:
        if change.get("kind") in counts:
            counts[change["kind"]] += 1
    lines = [
        "## 1. Scope and purpose", "",
        f"Topic: **{topic}**", "",
        "Affected notes:" if affected else "Affected notes: none.",
        *([f"- {_note_reference(path, links)}" for path in affected] if affected else []), "",
        "## 2. Note improvements", "",
    ]
    note_changes = [item for item in final_changes if item.get("kind") == "note"]
    lines.extend([f"- {_note_reference(item['path'], links)} — {item['reason']}" for item in note_changes] or ["- No prose-only note changes."])
    lines.extend(["", "## 3. Questions and answers", "", f"- Added: {counts['add']}", f"- Rewritten: {counts['rewrite']}", f"- Split: {counts['split']}", f"- Proposed for removal: {counts['remove']}", f"- Replaced: {counts['replace']}", "", "## 4. Significant question changes", ""])
    question_changes = [item for item in final_changes if item.get("kind") != "note"]
    for item in question_changes:
        before_cards, after_cards = _visible_qards(str(item.get("before", ""))), _visible_qards(str(item.get("after", "")))
        before_text = " / ".join(f"“{question}” — {answer[:180]}" for question, answer in before_cards) or "None"
        after_text = " / ".join(f"“{question}” — {answer[:180]}" for question, answer in after_cards) or "None"
        lines.extend(
            [
                f"- {_note_reference(item['path'], links)}",
                f"  - Before: {before_text}",
                f"  - After: {after_text}",
                f"  - Coverage rationale: {item['reason']}",
                f"  - Identity: {_identity_summary(item)}",
            ]
        )
    if not question_changes:
        lines.append("- No significant question changes.")
    lines.extend(["", "## 5. User feedback", ""])
    lines.extend([f"- {item.get('url', item.get('key', 'feedback'))}: {item.get('outcome', 'pending')} — {item.get('reason', '')}" for item in feedback] or ["- No owner feedback in this batch."])
    lines.extend(["", "## 6. Validation", ""])
    for item in validation:
        lines.append(f"- {item}" if isinstance(item, str) else f"- {item.get('check')}: {item.get('result')}")
    if not validation:
        lines.append("- No validation results recorded.")
    final_source_urls = {
        source.get("url")
        for change in final_changes
        for source in change.get("sources", [])
        if isinstance(source, Mapping)
    }
    visible_sources = {label: url for label, url in sources.items() if url in final_source_urls}
    if visible_sources:
        lines.append("- Factual sources:")
        lines.extend(f"  - [{label}]({url})" for label, url in sorted(visible_sources.items()))
    return _escape_managed_tokens("\n".join(lines).rstrip() + "\n")


def _managed_sections(body: str) -> list[re.Match[str]]:
    matches = list(MANAGED_RE.finditer(body))
    starts = body.count(MANAGED_START_TOKEN)
    ends = body.count(MANAGED_END_PREFIX)
    if starts != ends or starts > 1 or (starts and len(matches) != 1):
        raise ValueError("malformed or duplicate managed PR body markers")
    return matches


def update_managed_body(body: str, summary: str, topic: str) -> str:
    if MANAGED_START_TOKEN in summary or MANAGED_END_PREFIX in summary:
        raise ValueError("generated summary contains a managed PR body delimiter")
    marker_topic = topic_id(topic)
    managed = f"<!-- devbook-improvement:start topic={marker_topic} -->\n{summary.rstrip()}\n{MANAGED_END_TOKEN}"
    matches = _managed_sections(body)
    if matches:
        if matches[0].group("topic") != marker_topic:
            raise ValueError("managed PR body belongs to another topic")
        updated = body[: matches[0].start()] + managed + body[matches[0].end() :]
    else:
        separator = "" if not body or body.endswith("\n\n") else "\n" if body.endswith("\n") else "\n\n"
        updated = body + separator + managed + "\n"
    if len(_managed_sections(updated)) != 1:
        raise ValueError("managed PR body update did not produce exactly one valid section")
    return updated
