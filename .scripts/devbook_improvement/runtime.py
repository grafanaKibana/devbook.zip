"""Deterministic GitHub and Git runtime for recurring DevBook maintenance.

The runtime is deliberately transport-driven.  Tests and ``--demo`` inject a
fake transport; production uses :class:`GhApi`, which only invokes ``gh api``
with JSON on stdin.  Model calls are supplied by ``provider.py`` and never gain
filesystem or Git tools through this module.
"""

from __future__ import annotations

import base64
import contextlib
import datetime as dt
import hashlib
import ipaddress
import json
import os
import re
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, Mapping, Protocol, Sequence

from . import core


UTC = dt.timezone.utc
STATE_BRANCH = "maintenance/devbook-improvement-state"
STATE_PATH = ".devbook-improvement/state.json"
JOURNAL_PHASES = (
    "prepared",
    "commit_created",
    "branch_updated",
    "pr_updated",
    "checks_verified",
    "committed",
)
MARKER_RE = re.compile(
    r"<!-- devbook-improvement:topic=(?P<topic>[a-z0-9-]+);generation=(?P<generation>\d+) -->"
)
FEEDBACK_RECEIPT_MARKER = "<!-- devbook-feedback-result:"
ALLOWED_NOTE_PREFIX = "Vault/Home/"
DEFAULT_REQUIRED_CHECKS = ("pr-title", "major-approval")


class RuntimeFailure(RuntimeError):
    """Base class for fail-closed runtime errors."""


class Conflict(RuntimeFailure):
    """A source, state, or Git ref changed since it was inspected."""


class UnsafeInput(RuntimeFailure):
    """Untrusted data violates an explicit runtime boundary."""


class ProductionGate(RuntimeFailure):
    """Apply mode is not explicitly and safely enabled."""


class ApiTransport(Protocol):
    def request(
        self,
        method: str,
        path: str,
        payload: Mapping[str, Any] | None = None,
        *,
        paginate: bool = False,
    ) -> Any: ...

    def graphql(self, query: str, variables: Mapping[str, Any]) -> Any: ...


def utcnow() -> dt.datetime:
    return dt.datetime.now(UTC)


def iso(value: dt.datetime | None = None) -> str:
    return (value or utcnow()).astimezone(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def fingerprint(value: Any) -> str:
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def marker(topic: str, generation: int) -> str:
    if not re.fullmatch(r"[a-z0-9-]+", topic) or generation < 1:
        raise UnsafeInput("invalid topic marker")
    return f"<!-- devbook-improvement:topic={topic};generation={generation} -->"


def parse_marker(body: str) -> tuple[str, int] | None:
    found = MARKER_RE.search(body or "")
    return (found.group("topic"), int(found.group("generation"))) if found else None


class GhApi:
    """Bounded ``gh api`` transport using argv and stdin, never shell text."""

    def __init__(
        self,
        repo: str,
        *,
        token_env: str = "DEVBOOK_GITHUB_TOKEN",
        runner: Callable[..., subprocess.CompletedProcess[str]] = subprocess.run,
        timeout: int = 60,
        max_pages: int = 10,
    ) -> None:
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
            raise UnsafeInput("invalid GitHub repository")
        self.repo = repo
        self.token_env = token_env
        self.runner = runner
        self.timeout = timeout
        self.max_pages = max(1, max_pages)

    def request(
        self,
        method: str,
        path: str,
        payload: Mapping[str, Any] | None = None,
        *,
        paginate: bool = False,
    ) -> Any:
        parsed = urllib.parse.urlsplit(path)
        if not path.startswith("/") or parsed.scheme or parsed.netloc or parsed.fragment:
            raise UnsafeInput("invalid GitHub API path")
        decoded_path = parsed.path
        while True:
            decoded = urllib.parse.unquote(decoded_path)
            if decoded == decoded_path:
                break
            decoded_path = decoded
        if (
            "\\" in decoded_path
            or any(ord(char) < 32 or ord(char) == 127 for char in decoded_path)
            or any(part in {".", ".."} for part in decoded_path.split("/"))
        ):
            raise UnsafeInput("invalid GitHub API path")
        if paginate:
            rows: list[Any] = []
            for page in range(1, self.max_pages + 1):
                separator = "&" if "?" in path else "?"
                result = self.request(method, f"{path}{separator}page={page}", payload)
                if not isinstance(result, list):
                    raise RuntimeFailure("paginated GitHub response is not a list")
                rows.extend(result)
                if len(result) < 100:
                    return rows
            raise RuntimeFailure("bounded GitHub pagination limit exceeded")
        argv = ["gh", "api", "--method", method.upper(), f"repos/{self.repo}{path}"]
        if payload is not None:
            argv.extend(("--input", "-"))
        env = _production_git_env(self.token_env)
        completed = self.runner(
            argv,
            input=canonical_json(payload or {}) if payload is not None else None,
            text=True,
            capture_output=True,
            timeout=self.timeout,
            check=False,
            env=env,
        )
        if completed.returncode:
            raise RuntimeFailure(f"gh api failed ({completed.returncode}): {completed.stderr.strip()[:400]}")
        try:
            parsed = json.loads(completed.stdout or "null")
        except json.JSONDecodeError as exc:
            raise RuntimeFailure("gh api returned malformed JSON") from exc
        return parsed

    def graphql(self, query: str, variables: Mapping[str, Any]) -> Any:
        completed = self.runner(
            ["gh", "api", "graphql", "--input", "-"],
            input=canonical_json({"query": query, "variables": dict(variables)}),
            text=True,
            capture_output=True,
            timeout=self.timeout,
            check=False,
            env=_production_git_env(self.token_env),
        )
        if completed.returncode:
            raise RuntimeFailure(f"gh api graphql failed ({completed.returncode}): {completed.stderr.strip()[:400]}")
        try:
            result = json.loads(completed.stdout or "null")
        except json.JSONDecodeError as exc:
            raise RuntimeFailure("gh api graphql returned malformed JSON") from exc
        if result.get("errors"):
            raise RuntimeFailure("GitHub GraphQL mutation failed")
        return result


def _production_git_env(token_env: str) -> dict[str, str]:
    token = os.environ.get(token_env)
    if not token:
        raise ProductionGate(f"{token_env} is required")
    if token_env == "GITHUB_TOKEN" or token == os.environ.get("GITHUB_TOKEN"):
        raise ProductionGate("default GITHUB_TOKEN is forbidden for apply mode")
    env = dict(os.environ)
    env["GH_TOKEN"] = token
    return env


def require_apply_activation(env: Mapping[str, str] | None = None) -> None:
    values = env or os.environ
    required = {
        "DEVBOOK_IMPROVEMENT_MODE": "apply",
        "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
        "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
        "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
    }
    missing = [key for key, expected in required.items() if values.get(key, "").lower() != expected]
    if missing:
        raise ProductionGate("apply mode gate missing: " + ", ".join(missing))
    token = values.get("DEVBOOK_GITHUB_TOKEN")
    if not token or token == values.get("GITHUB_TOKEN"):
        raise ProductionGate("a separate App or fine-grained automation token is required")


@dataclass(frozen=True)
class StateSnapshot:
    state: dict[str, Any]
    ref_sha: str | None
    tree_sha: str | None
    blob_sha: str | None


class StateBranchStore:
    """State branch JSON store with blob/tree/commit/ref optimistic CAS."""

    def __init__(self, api: ApiTransport, branch: str = STATE_BRANCH, path: str = STATE_PATH) -> None:
        self.api = api
        self.branch = branch
        self.path = path

    @property
    def ref_path(self) -> str:
        return "/git/ref/heads/" + urllib.parse.quote(self.branch, safe="")

    @property
    def update_ref_path(self) -> str:
        return "/git/refs/heads/" + urllib.parse.quote(self.branch, safe="")

    def provision(self, state: Mapping[str, Any], base_sha: str) -> StateSnapshot:
        """Create the dedicated state branch once during confirmed activation."""
        existing = self.read()
        if existing.ref_sha is not None:
            return existing
        base = self.api.request("GET", f"/git/commits/{base_sha}")
        encoded = base64.b64encode((json.dumps(state, indent=2, sort_keys=True) + "\n").encode()).decode()
        blob = self.api.request("POST", "/git/blobs", {"content": encoded, "encoding": "base64"})
        tree = self.api.request(
            "POST",
            "/git/trees",
            {
                "base_tree": base["tree"]["sha"],
                "tree": [{"path": self.path, "mode": "100644", "type": "blob", "sha": blob["sha"]}],
            },
        )
        commit = self.api.request(
            "POST",
            "/git/commits",
            {"message": "maintenance: initialize improvement state", "tree": tree["sha"], "parents": [base_sha]},
        )
        self.api.request("POST", "/git/refs", {"ref": f"refs/heads/{self.branch}", "sha": commit["sha"]})
        return self.read()

    def read(self) -> StateSnapshot:
        try:
            ref = self.api.request("GET", self.ref_path)
        except RuntimeFailure as exc:
            if "404" in str(exc):
                return StateSnapshot({}, None, None, None)
            raise
        head = ref["object"]["sha"]
        commit = self.api.request("GET", f"/git/commits/{head}")
        tree_sha = commit["tree"]["sha"]
        tree = self.api.request("GET", f"/git/trees/{tree_sha}?recursive=1")
        entry = next((item for item in tree.get("tree", []) if item.get("path") == self.path), None)
        if not entry:
            return StateSnapshot({}, head, tree_sha, None)
        blob = self.api.request("GET", f"/git/blobs/{entry['sha']}")
        if blob.get("encoding") != "base64":
            raise RuntimeFailure("state blob encoding is not base64")
        try:
            data = json.loads(base64.b64decode(blob["content"]).decode())
        except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise RuntimeFailure("state branch contains invalid JSON") from exc
        return StateSnapshot(data, head, tree_sha, entry["sha"])

    def write(self, state: Mapping[str, Any], expected: StateSnapshot, message: str) -> StateSnapshot:
        if expected.ref_sha is None or expected.tree_sha is None:
            raise Conflict("state branch must be provisioned during the confirmed activation phase")
        current = self.api.request("GET", self.ref_path)["object"]["sha"]
        if current != expected.ref_sha:
            raise Conflict("state ref changed before write")
        encoded = base64.b64encode((json.dumps(state, indent=2, sort_keys=True) + "\n").encode()).decode()
        blob = self.api.request("POST", "/git/blobs", {"content": encoded, "encoding": "base64"})
        tree = self.api.request(
            "POST",
            "/git/trees",
            {
                "base_tree": expected.tree_sha,
                "tree": [{"path": self.path, "mode": "100644", "type": "blob", "sha": blob["sha"]}],
            },
        )
        commit = self.api.request(
            "POST",
            "/git/commits",
            {"message": message, "tree": tree["sha"], "parents": [expected.ref_sha]},
        )
        self.api.request("PATCH", self.update_ref_path, {"sha": commit["sha"], "force": False})
        return StateSnapshot(dict(state), commit["sha"], tree["sha"], blob["sha"])


class MemoryStateStore:
    """CAS store for fixtures and demo mode."""

    def __init__(self, state: Mapping[str, Any] | None = None) -> None:
        self.state = dict(state or {})
        self.revision = 1

    def read(self) -> StateSnapshot:
        return StateSnapshot(json.loads(json.dumps(self.state)), str(self.revision), str(self.revision), None)

    def write(self, state: Mapping[str, Any], expected: StateSnapshot, message: str) -> StateSnapshot:
        del message
        if expected.ref_sha != str(self.revision):
            raise Conflict("state CAS conflict")
        self.state = json.loads(json.dumps(state))
        self.revision += 1
        return self.read()


class DurableLease:
    def __init__(self, store: Any, owner: str, ttl_seconds: int = 1200) -> None:
        self.store, self.owner, self.ttl_seconds = store, owner, ttl_seconds

    def acquire(self, now: dt.datetime | None = None) -> StateSnapshot:
        current_time = now or utcnow()
        snapshot = self.store.read()
        lease = snapshot.state.get("lease") or {}
        expires = _parse_time(lease.get("expires_at"))
        if lease.get("owner") != self.owner and expires and expires > current_time:
            raise Conflict("another worker holds the durable lease")
        state = dict(snapshot.state)
        state["lease"] = {
            "owner": self.owner,
            "acquired_at": iso(current_time),
            "expires_at": iso(current_time + dt.timedelta(seconds=self.ttl_seconds)),
        }
        return self.store.write(state, snapshot, "maintenance: acquire improvement lease")

    def release(self) -> StateSnapshot:
        snapshot = self.store.read()
        lease = snapshot.state.get("lease") or {}
        if lease.get("owner") != self.owner:
            raise Conflict("lease owner changed")
        state = dict(snapshot.state)
        state["lease"] = None
        return self.store.write(state, snapshot, "maintenance: release improvement lease")


def _parse_time(value: Any) -> dt.datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
    except ValueError:
        return None


@contextlib.contextmanager
def local_lock(path: Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise Conflict("local worker lock is already held") from exc
    try:
        os.write(fd, f"{os.getpid()}\n".encode())
        os.close(fd)
        yield
    finally:
        path.unlink(missing_ok=True)


class OperationJournal:
    """Persist each Git/GitHub side effect before proceeding to the next one."""

    def __init__(self, store: Any) -> None:
        self.store = store

    def prepare(self, operation: Mapping[str, Any]) -> dict[str, Any]:
        snapshot = self.store.read()
        if snapshot.state.get("pending_operation"):
            raise Conflict("pending operation must be reconciled first")
        op = dict(operation)
        op.setdefault("op_id", uuid.uuid4().hex[:16])
        op.update({"phase": "prepared", "updated_at": iso()})
        state = dict(snapshot.state)
        state["pending_operation"] = op
        self.store.write(state, snapshot, f"maintenance: prepare {op['op_id']}")
        return op

    def advance(self, op_id: str, phase: str, evidence: Mapping[str, Any] | None = None) -> dict[str, Any]:
        if phase not in JOURNAL_PHASES:
            raise UnsafeInput("invalid journal phase")
        snapshot = self.store.read()
        op = dict(snapshot.state.get("pending_operation") or {})
        if op.get("op_id") != op_id:
            raise Conflict("journal operation changed")
        old_index = JOURNAL_PHASES.index(op["phase"])
        new_index = JOURNAL_PHASES.index(phase)
        if new_index not in (old_index, old_index + 1):
            raise Conflict("journal phases must advance exactly once")
        op["phase"] = phase
        op["updated_at"] = iso()
        if evidence:
            op.setdefault("evidence", {}).update(dict(evidence))
        state = dict(snapshot.state)
        if phase == "committed":
            state.setdefault("completed_operations", {})[op_id] = op
            state["pending_operation"] = None
        else:
            state["pending_operation"] = op
        self.store.write(state, snapshot, f"maintenance: journal {op_id} {phase}")
        return op


def compact_finalized_operation(store: Any, op_id: str) -> dict[str, Any]:
    """Discard large WAL payloads only after pipeline receipt finalization."""
    snapshot = store.read()
    if not snapshot.state.get("finalized_operations", {}).get(op_id):
        raise Conflict("operation receipts cannot be compacted before pipeline finalization")
    operation = dict(snapshot.state.get("completed_operations", {}).get(op_id) or {})
    if not operation:
        raise Conflict("completed operation is missing")
    if operation.get("compacted") is True:
        return operation
    evidence = dict(operation.get("evidence") or {})
    compact = {
        "op_id": op_id,
        "topic": operation.get("topic"),
        "generation": operation.get("generation"),
        "head_sha": evidence.get("head_sha") or evidence.get("commit_sha"),
        "checks": evidence.get("checks", {}),
        "vault_validation": evidence.get("vault_validation"),
        "updated_at": operation.get("updated_at"),
        "compacted": True,
    }
    state = dict(snapshot.state)
    completed = dict(state.get("completed_operations", {}))
    completed[op_id] = compact
    state["completed_operations"] = completed
    store.write(state, snapshot, f"maintenance: compact journal {op_id}")
    return compact


def expected_managed_branch(topic_id: str, generation: int) -> str:
    if not topic_id or not isinstance(generation, int) or generation < 1:
        raise UnsafeInput("invalid managed topic generation")
    return f"notes/automated-{topic_id}-g{generation}"


def valid_pr_identity(
    pr: Mapping[str, Any], repo: str, base_branch: str, topic_id: str, generation: int,
) -> bool:
    branch = expected_managed_branch(topic_id, generation)
    head = pr.get("head") or {}
    base = pr.get("base") or {}
    return (
        head.get("ref") == branch
        and (head.get("repo") or {}).get("full_name") == repo
        and base.get("ref") == base_branch
        and (base.get("repo") or {}).get("full_name") == repo
        and parse_marker(str(pr.get("body") or "")) == (topic_id, generation)
    )




def managed_pr(
    prs: Iterable[Mapping[str, Any]], topic: str, generation: int, branch: str, *, repo: str, base_branch: str,
) -> dict[str, Any] | None:
    if branch != expected_managed_branch(topic, generation):
        raise UnsafeInput("managed branch does not match topic generation")
    matches = [
        dict(pr)
        for pr in prs
        if pr.get("state") == "open"
        and valid_pr_identity(pr, repo, base_branch, topic, generation)
    ]
    if len(matches) > 1:
        raise Conflict("duplicate open managed PRs")
    return matches[0] if matches else None


def lifecycle(pr: Mapping[str, Any]) -> str:
    if pr.get("merged_at"):
        return "merged"
    return "open" if pr.get("state") == "open" else "closed"




def normalize_feedback(
    ordinary: Iterable[Mapping[str, Any]],
    inline: Iterable[Mapping[str, Any]],
    reviews: Iterable[Mapping[str, Any]],
    allowlist: Iterable[tuple[int, str]],
    scoped_paths: Iterable[str] = (),
) -> list[dict[str, Any]]:
    trusted = {(int(user_id), login.casefold()) for user_id, login in allowlist}
    existing_paths = sorted({str(path) for path in scoped_paths if path})
    result: list[dict[str, Any]] = []
    for kind, items in (("comment", ordinary), ("inline", inline), ("review", reviews)):
        for item in items:
            user = item.get("user") or {}
            identity = (int(user.get("id", -1)), str(user.get("login", "")).casefold())
            if identity not in trusted:
                continue
            body = str(item.get("body") or "")
            if kind == "comment" and FEEDBACK_RECEIPT_MARKER in body:
                continue
            updated = str(item.get("updated_at") or item.get("submitted_at") or item.get("created_at") or "")
            revision = fingerprint(
                {
                    "id": item.get("id"),
                    "kind": kind,
                    "body": body,
                    "updated_at": updated,
                    "state": item.get("state"),
                    "commit_id": item.get("commit_id"),
                    "path": item.get("path"),
                    "line": item.get("line"),
                }
            )
            path = str(item.get("path") or "")
            if kind == "inline":
                paths = [path] if path else []
            else:
                paths = sorted({str(value) for value in (item.get("paths") or existing_paths) if value})
            result.append(
                {
                    "key": f"{kind}:{item.get('id')}:{revision[:12]}",
                    "id": item.get("id"),
                    "kind": kind,
                    "body": body,
                    "updated_at": updated,
                    "revision": revision,
                    "url": item.get("html_url"),
                    "user": {"id": identity[0], "login": user.get("login")},
                    "path": path or None,
                    "paths": paths,
                    "line": item.get("line"),
                    "commit_id": item.get("commit_id"),
                }
            )
    return sorted(result, key=lambda row: (row["updated_at"], row["kind"], str(row["id"])))


def poll_feedback(api: ApiTransport, pr_number: int, allowlist: Iterable[tuple[int, str]]) -> list[dict[str, Any]]:
    ordinary = api.request("GET", f"/issues/{pr_number}/comments?per_page=100", paginate=True)
    inline = api.request("GET", f"/pulls/{pr_number}/comments?per_page=100", paginate=True)
    reviews = api.request("GET", f"/pulls/{pr_number}/reviews?per_page=100", paginate=True)
    files = api.request("GET", f"/pulls/{pr_number}/files?per_page=100", paginate=True)
    return normalize_feedback(
        ordinary, inline, reviews, allowlist,
        (str(item.get("filename") or "") for item in files),
    )




def should_freeze(pr: Mapping[str, Any], feedback: Iterable[Mapping[str, Any]], *, notes: int, lines: int) -> bool:
    if pr.get("draft") is False or pr.get("reviewDecision") or notes >= 16 or lines >= 1200:
        return True
    return any(item.get("kind") in {"comment", "inline", "review"} for item in feedback)


def validate_frozen_edits(edits: Iterable[Mapping[str, Any]], pending_feedback: Iterable[Mapping[str, Any]]) -> None:
    feedback = {str(item["key"]): item for item in pending_feedback}
    for edit in edits:
        causes = set(map(str, edit.get("feedback_keys") or ()))
        path = str(edit.get("path") or "")
        if not path or not causes or not causes <= feedback.keys():
            raise UnsafeInput("frozen PR edits require pending owner feedback causality")
        if any(path not in set(map(str, feedback[key].get("paths") or ())) for key in causes):
            raise UnsafeInput("frozen PR feedback does not authorize the edited path")


def required_checks_for_sha(api: ApiTransport, sha: str, required: Sequence[str] = DEFAULT_REQUIRED_CHECKS) -> dict[str, str]:
    result = api.request("GET", f"/commits/{sha}/check-runs?per_page=100")
    combined = api.request("GET", f"/commits/{sha}/status")
    if int(result.get("total_count") or 0) > len(result.get("check_runs", [])):
        raise RuntimeFailure("check-run response exceeds the supported 100-run bound")

    def latest(items: Iterable[Mapping[str, Any]], name_key: str, state_key: str) -> dict[str, str]:
        selected: dict[str, tuple[tuple[int, str], str]] = {}
        for item in items:
            name = str(item.get(name_key) or "")
            if not name:
                continue
            stamp = str(item.get("created_at") or item.get("started_at") or "")
            order = (int(item.get("id") or 0), stamp)
            state = str(item.get(state_key) or item.get("status") or "unknown")
            if name not in selected or order > selected[name][0]:
                selected[name] = (order, state)
        return {name: value[1] for name, value in selected.items()}

    check_runs = latest(
        (run for run in result.get("check_runs", []) if run.get("head_sha") == sha),
        "name", "conclusion",
    )
    status_rows = combined.get("statuses", []) if combined.get("sha") in {None, sha} else []
    statuses = latest(
        (status for status in status_rows if status.get("sha") in {None, sha}),
        "context", "state",
    )
    checks: dict[str, str] = {}
    for name in set(check_runs) | set(statuses):
        values = {value for value in (check_runs.get(name), statuses.get(name)) if value is not None}
        checks[name] = next(iter(sorted(values - {"success"})), "success")
    missing = [name for name in required if name not in checks]
    if missing:
        raise Conflict("required checks missing on exact head: " + ", ".join(missing))
    return {name: checks[name] for name in required}


def dispatch_vault_validation(api: ApiTransport, branch: str) -> None:
    api.request("POST", "/actions/workflows/vault-validation.yml/dispatches", {"ref": branch})


def vault_validation_for_sha(api: ApiTransport, branch: str, sha: str) -> str:
    runs = api.request(
        "GET",
        "/actions/workflows/vault-validation.yml/runs?event=workflow_dispatch&per_page=20",
    )
    matching = [
        run
        for run in runs.get("workflow_runs", [])
        if run.get("head_branch") == branch and run.get("head_sha") == sha
    ]
    if not matching:
        raise Conflict("vault validation run missing on exact head")
    run = max(matching, key=lambda item: str(item.get("created_at") or ""))
    return str(run.get("conclusion") or run.get("status") or "unknown")


def publication_check_state(
    api: ApiTransport,
    branch: str,
    sha: str,
    required: Sequence[str] = DEFAULT_REQUIRED_CHECKS,
) -> tuple[str, dict[str, str], str | None]:
    try:
        checks = required_checks_for_sha(api, sha, required)
    except Conflict:
        return "pending", {}, None
    try:
        vault = vault_validation_for_sha(api, branch, sha)
    except Conflict:
        return "pending", checks, None
    terminal_failure = {"failure", "error", "cancelled", "timed_out", "action_required", "startup_failure", "stale"}
    if any(value in terminal_failure for value in checks.values()) or vault in terminal_failure:
        return "failed", checks, vault
    if any(value != "success" for value in checks.values()) or vault != "success":
        return "pending", checks, vault
    return "success", checks, vault


def ensure_draft_for_mutation(api: ApiTransport, pr: Mapping[str, Any]) -> None:
    if pr.get("draft") is False:
        node_id = pr.get("node_id")
        if not node_id:
            raise RuntimeFailure("pull request node_id is required to renew draft review")
        api.graphql(
            "mutation($id:ID!){convertPullRequestToDraft(input:{pullRequestId:$id}){pullRequest{id isDraft}}}",
            {"id": node_id},
        )


class GitHubRuntime:
    """Real apply adapter. Call only after :func:`require_apply_activation`."""

    def __init__(
        self,
        api: ApiTransport,
        state_store: Any,
        *,
        base_branch: str = "main",
        required_checks: Sequence[str] = DEFAULT_REQUIRED_CHECKS,
        lease_owner: str | None = None,
        check_attempts: int = 24,
        check_interval_seconds: float = 5,
        waiter: Callable[[float], None] = time.sleep,
    ) -> None:
        self.api = api
        self.store = state_store
        self.journal = OperationJournal(state_store)
        self.base_branch = base_branch
        self.repo = str(getattr(api, "repo", ""))
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", self.repo):
            raise UnsafeInput("publication transport requires configured repository identity")
        self.required_checks = tuple(required_checks)
        self.lease_owner = lease_owner
        self.check_attempts = max(1, check_attempts)
        self.check_interval_seconds = max(0, check_interval_seconds)
        self.waiter = waiter

    def _assert_lease(self) -> None:
        if not self.lease_owner:
            raise Conflict("publication requires a durable lease owner")
        lease = self.store.read().state.get("lease") or {}
        if lease.get("owner") != self.lease_owner:
            raise Conflict("durable lease ownership changed")
        expires = _parse_time(lease.get("expires_at"))
        if not expires or expires <= utcnow():
            raise Conflict("durable lease expired")

    def ref_sha(self, branch: str) -> str:
        return str(self.api.request("GET", "/git/ref/heads/" + urllib.parse.quote(branch, safe=""))["object"]["sha"])

    def read_note(self, path: str, branch: str) -> str:
        if not path.startswith(ALLOWED_NOTE_PREFIX) or ".." in Path(path).parts:
            raise UnsafeInput("unsafe branch read path")
        result = self.api.request(
            "GET", f"/contents/{urllib.parse.quote(path, safe='/')}?ref={urllib.parse.quote(branch, safe='')}"
        )
        if result.get("encoding") != "base64" or result.get("type", "file") != "file":
            raise RuntimeFailure("branch source is not a regular base64 file")
        try:
            return base64.b64decode(result["content"]).decode()
        except (ValueError, UnicodeDecodeError) as exc:
            raise RuntimeFailure("branch source is invalid") from exc

    def open_prs(self) -> list[dict[str, Any]]:
        rows = self.api.request("GET", "/pulls?state=open&per_page=100", paginate=True)
        return [dict(row) for row in rows]

    def _ensure_branch(self, branch: str, base_sha: str) -> str:
        try:
            return self.ref_sha(branch)
        except RuntimeFailure as exc:
            if "404" not in str(exc):
                raise
        self.api.request("POST", "/git/refs", {"ref": f"refs/heads/{branch}", "sha": base_sha})
        return self.ref_sha(branch)

    def _require_open_pr_identity(
        self, number: int, topic: str, generation: int, branch: str
    ) -> dict[str, Any]:
        if branch != expected_managed_branch(topic, generation):
            raise UnsafeInput("managed branch does not match topic generation")
        selected = self.api.request("GET", f"/pulls/{number}")
        if (
            lifecycle(selected) != "open"
            or not valid_pr_identity(selected, self.repo, self.base_branch, topic, generation)
        ):
            raise Conflict("selected managed PR became terminal or changed identity")
        return dict(selected)

    def _terminal_generation_exists(self, topic: str, generation: int, branch: str) -> bool:
        if branch != expected_managed_branch(topic, generation):
            raise UnsafeInput("managed branch does not match topic generation")
        prs = self.api.request("GET", "/pulls?state=all&per_page=100", paginate=True)
        return any(
            lifecycle(pr) != "open"
            and valid_pr_identity(pr, self.repo, self.base_branch, topic, generation)
            for pr in prs
        )

    def _create_commit(
        self,
        parent_sha: str,
        candidate: Mapping[str, str],
        message: str,
    ) -> str:
        parent = self.api.request("GET", f"/git/commits/{parent_sha}")
        tree_entries = []
        for path, content in sorted(candidate.items()):
            if not path.startswith(ALLOWED_NOTE_PREFIX) or ".." in Path(path).parts or not path.endswith(".md"):
                raise UnsafeInput("candidate includes unsafe path")
            blob = self.api.request(
                "POST",
                "/git/blobs",
                {"content": base64.b64encode(content.encode()).decode(), "encoding": "base64"},
            )
            tree_entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        tree = self.api.request(
            "POST", "/git/trees", {"base_tree": parent["tree"]["sha"], "tree": tree_entries}
        )
        commit = self.api.request(
            "POST", "/git/commits", {"message": message, "tree": tree["sha"], "parents": [parent_sha]}
        )
        return str(commit["sha"])

    def _update_branch_cas(self, branch: str, expected_sha: str, commit_sha: str) -> None:
        if self.ref_sha(branch) != expected_sha:
            raise Conflict("topic branch changed before ref update")
        self.api.request(
            "PATCH",
            "/git/refs/heads/" + urllib.parse.quote(branch, safe=""),
            {"sha": commit_sha, "force": False},
        )

    def _ensure_pr(
        self,
        prs: Iterable[Mapping[str, Any]],
        *,
        topic: str,
        generation: int,
        branch: str,
        title: str,
        body: str,
    ) -> tuple[dict[str, Any], bool]:
        found = managed_pr(
            prs, topic, generation, branch, repo=self.repo, base_branch=self.base_branch,
        )
        if found:
            latest = self._require_open_pr_identity(int(found["number"]), topic, generation, branch)
            current_body = str(latest.get("body") or "")
            try:
                proposed_sections = core._managed_sections(body)
                current_sections = core._managed_sections(current_body)
                if any(section.group("topic") != topic for section in proposed_sections + current_sections):
                    raise ValueError("managed summary belongs to another topic")
            except ValueError as exc:
                raise Conflict("managed PR description needs reconciliation") from exc
            if proposed_sections:
                section = proposed_sections[0].group(0)
                if current_sections:
                    current = current_sections[0]
                    current_body = current_body[:current.start()] + section + current_body[current.end():]
                else:
                    separator = "" if not current_body or current_body.endswith("\n\n") else "\n" if current_body.endswith("\n") else "\n\n"
                    current_body += separator + section + "\n"
            updated = self.api.request("PATCH", f"/pulls/{found['number']}", {"title": title, "body": current_body})
            return dict(updated), False
        created = self.api.request(
            "POST",
            "/pulls",
            {"title": title, "body": body, "head": branch, "base": self.base_branch, "draft": True},
        )
        if parse_marker(str(created.get("body") or "")) != (topic, generation):
            raise Conflict("created PR lost its machine marker")
        return dict(created), True

    def _feedback_unchanged(
        self, pr_number: int, revision: Mapping[str, Any],
        feedback: Iterable[Mapping[str, Any]] | None = None,
    ) -> bool:
        allowlist = [
            (int(row.split(":", 1)[0]), row.split(":", 1)[1])
            for row in revision.get("allowlist", [])
        ]
        if feedback is None:
            feedback = poll_feedback(self.api, pr_number, allowlist) if allowlist else []
        current = {f"{item['kind']}:{item['id']}": item["revision"] for item in feedback}
        return current == dict(revision.get("processed", {}))

    def _archive_pending(
        self, op_id: str, collection: str, evidence: Mapping[str, Any], *, freeze: bool = False,
        terminal_pr: Mapping[str, Any] | None = None,
    ) -> None:
        """Release the global WAL while retaining rejected/failed publication evidence."""
        self._assert_lease()
        snapshot = self.store.read()
        op = dict(snapshot.state.get("pending_operation") or {})
        if op.get("op_id") != op_id:
            raise Conflict("journal operation changed before archival")
        op["evidence"] = {**op.get("evidence", {}), **evidence}
        op["updated_at"] = iso()
        state = dict(snapshot.state)
        state[collection] = {**state.get(collection, {}), op_id: op}
        state["pending_operation"] = None
        if freeze or terminal_pr is not None:
            key = f"{op['topic']}:{op['generation']}"
            receipt = op.get("receipts") or {}
            prs = dict(state.get("prs", {}))
            pr = dict(prs.get(key) or {})
            pr.update(
                topic_id=op["topic"], generation=op["generation"],
                number=op.get("pr_number") or op["evidence"].get("pr_number"),
                branch=op["branch"], status="open", frozen=True,
                head_sha=op["evidence"].get("commit_sha"),
            )
            if terminal_pr is not None:
                # Keep the prior open state until Engine.remote_view consumes receipts
                # and applies its ordinary closure/merge and rejection policies.
                pr["number"] = terminal_pr["number"]
                pr["head_sha"] = terminal_pr.get("head", {}).get("sha") or pr["head_sha"]
                pr["observed_terminal_status"] = lifecycle(terminal_pr)
            if freeze and collection == "failed_operations":
                pr["validation_failure"] = dict(op["evidence"])
            if collection == "export_operations":
                pr.update(export_required=True, export_operation_id=op_id)
            if "records" in receipt:
                pr["proposal_records"] = receipt["records"]
            if "base_note_hashes" in receipt:
                pr["base_note_hashes"] = receipt["base_note_hashes"]
            prs[key] = pr
            state["prs"] = prs
        self.store.write(state, snapshot, f"maintenance: archive {op_id} {collection}")

    def recover_pending(self) -> dict[str, Any] | None:
        """Reconcile one WAL entry from observable refs/PRs/checks, without a model call."""
        operation = self.store.read().state.get("pending_operation")
        if not operation:
            return None
        self._assert_lease()
        op = dict(operation)
        op_id = str(op["op_id"])
        branch = str(op["branch"])
        phase = str(op["phase"])
        if branch != expected_managed_branch(str(op["topic"]), int(op["generation"])):
            raise UnsafeInput("journal branch does not match topic generation")
        evidence = dict(op.get("evidence") or {})
        commit_sha = evidence.get("commit_sha")
        expected_pr_number = op.get("pr_number") or evidence.get("pr_number")
        selected_pr: dict[str, Any] | None = None
        if expected_pr_number:
            selected_pr = dict(self.api.request("GET", f"/pulls/{int(expected_pr_number)}"))
            if not valid_pr_identity(selected_pr, self.repo, self.base_branch, str(op["topic"]), int(op["generation"])):
                raise Conflict("selected managed PR changed identity")
        else:
            prs = self.api.request("GET", "/pulls?state=all&per_page=100", paginate=True)
            selected_pr = next((dict(pr) for pr in prs if lifecycle(pr) != "open" and valid_pr_identity(
                pr, self.repo, self.base_branch, str(op["topic"]), int(op["generation"])
            )), None)
        if selected_pr and lifecycle(selected_pr) != "open":
            status = lifecycle(selected_pr)
            self._archive_pending(
                op_id, "terminal_operations", {"terminal_status": status, "pr_number": selected_pr["number"]},
                terminal_pr=selected_pr,
            )
            return {"op_id": op_id, "commit_sha": commit_sha, "status": "pr_terminal", "terminal_status": status}
        if expected_pr_number and phase in {"prepared", "commit_created"}:
            applied = bool(commit_sha and self.ref_sha(branch) == commit_sha)
            if not applied and not self._feedback_unchanged(
                int(expected_pr_number), op.get("feedback_revision") or {}
            ):
                self._archive_pending(
                    op_id, "invalidated_operations", {"reason": "owner feedback changed before recovery"}
                )
                return {"op_id": op_id, "status": "feedback_changed"}
        if phase == "prepared":
            self._assert_lease()
            commit_sha = self._create_commit(
                str(op["parent_head"]), op["candidate"], str(op["commit_message"])
            )
            self._assert_lease()
            self.journal.advance(op_id, "commit_created", {"commit_sha": commit_sha})
            phase = "commit_created"
        if phase == "commit_created":
            self._assert_lease()
            assert commit_sha
            current = self.ref_sha(branch)
            if expected_pr_number:
                selected_pr = self._require_open_pr_identity(
                    int(expected_pr_number), str(op["topic"]), int(op["generation"]), branch
                )
                if current != commit_sha and not self._feedback_unchanged(
                    int(expected_pr_number), op.get("feedback_revision") or {}
                ):
                    self._archive_pending(
                        op_id, "invalidated_operations", {"reason": "owner feedback changed before recovery"}
                    )
                    return {"op_id": op_id, "status": "feedback_changed"}
                ensure_draft_for_mutation(self.api, selected_pr)
            if current != commit_sha:
                self._update_branch_cas(branch, str(op["parent_head"]), str(commit_sha))
            self._assert_lease()
            self.journal.advance(op_id, "branch_updated", {"branch_sha": commit_sha})
            phase = "branch_updated"
        if phase == "branch_updated":
            self._assert_lease()
            if expected_pr_number:
                selected_pr = self._require_open_pr_identity(
                    int(expected_pr_number), str(op["topic"]), int(op["generation"]), branch
                )
                ensure_draft_for_mutation(self.api, selected_pr)
            prs = self.open_prs()
            if not expected_pr_number:
                if self._terminal_generation_exists(str(op["topic"]), int(op["generation"]), branch):
                    raise Conflict("terminal generation branch cannot be reused")
            pr, created = self._ensure_pr(
                prs,
                topic=str(op["topic"]),
                generation=int(op["generation"]),
                branch=branch,
                title=str(op["title"]),
                body=str(op["body"]),
            )
            self._assert_lease()
            self.journal.advance(op_id, "pr_updated", {"pr_number": pr["number"], "created": created})
            phase = "pr_updated"
        if phase == "pr_updated":
            self._assert_lease()
            if op.get("export_required"):
                self._archive_pending(
                    op_id, "export_operations", {"commit_sha": commit_sha, "reason": "verified Syncer export required"},
                    freeze=True,
                )
                return {"op_id": op_id, "commit_sha": commit_sha, "status": "awaiting_export"}
            verified = self._await_checks(op_id, branch, str(commit_sha))
            if verified is None:
                return {"op_id": op_id, "commit_sha": commit_sha, "status": "awaiting_checks"}
            phase = "checks_verified"
        if phase == "checks_verified":
            self._assert_lease()
            self.journal.advance(op_id, "committed", {"head_sha": commit_sha})
        return {"op_id": op_id, "commit_sha": commit_sha, "status": "recovered"}

    def _await_checks(self, op_id: str, branch: str, commit_sha: str) -> dict[str, Any] | None:
        snapshot = self.store.read()
        operation = dict(snapshot.state.get("pending_operation") or {})
        if operation.get("op_id") != op_id:
            raise Conflict("journal operation changed before check verification")
        evidence = dict(operation.get("evidence") or {})
        if not evidence.get("validation_dispatched"):
            self._assert_lease()
            dispatch_vault_validation(self.api, branch)
            self.journal.advance(
                op_id,
                "pr_updated",
                {"validation_dispatched": True, "validation_dispatched_at": iso(), "check_sha": commit_sha},
            )
        for attempt in range(self.check_attempts):
            state, checks, vault = publication_check_state(
                self.api, branch, commit_sha, self.required_checks
            )
            if state == "failed":
                self._archive_pending(
                    op_id, "failed_operations",
                    {"check_sha": commit_sha, "commit_sha": commit_sha, "checks": checks,
                     "vault_validation": vault, "reason": "exact-head validation failed"},
                    freeze=True,
                )
                raise RuntimeFailure("exact-head validation failed")
            if state == "success":
                self._assert_lease()
                self.journal.advance(
                    op_id, "checks_verified", {"checks": checks, "vault_validation": vault}
                )
                return {"checks": checks, "vault_validation": vault}
            if attempt + 1 < self.check_attempts:
                self.waiter(self.check_interval_seconds)
        return None

    def publish(
        self,
        *,
        topic: str,
        generation: int,
        branch: str,
        expected_sources: Mapping[str, str],
        candidate: Mapping[str, str],
        title: str,
        body: str,
        feedback_revision: Mapping[str, str],
        expected_base_sha: str,
        expected_branch_sha: str | None = None,
        freeze: bool = False,
        pending_feedback: Iterable[Mapping[str, Any]] = (),
        edits: Iterable[Mapping[str, Any]] = (),
        expected_pr_number: int | None = None,
        operation_receipts: Mapping[str, Any] | None = None,
        export_required: bool = False,
    ) -> dict[str, Any]:
        """Publish one guarded batch and persist every ambiguous side effect.

        The caller owns model generation/review and passes only a CLEAN candidate.
        This method rechecks all mutable inputs before the first write.
        """
        require_apply_activation()
        self._assert_lease()
        if branch != expected_managed_branch(topic, generation):
            raise UnsafeInput("managed branch does not match topic generation")
        prs = self.open_prs()
        current_pr = managed_pr(
            prs, topic, generation, branch, repo=self.repo, base_branch=self.base_branch,
        )
        if expected_pr_number is not None:
            current_pr = self._require_open_pr_identity(expected_pr_number, topic, generation, branch)
        elif current_pr is None and self._terminal_generation_exists(topic, generation, branch):
            raise Conflict("terminal generation branch cannot be reused")
        if self.ref_sha(self.base_branch) != expected_base_sha:
            raise Conflict("base branch changed before publication")
        branch_head = self._ensure_branch(branch, expected_base_sha)
        if expected_branch_sha is not None and branch_head != expected_branch_sha:
            raise Conflict("topic branch changed before publication")
        for path, expected in expected_sources.items():
            if self.read_note(path, branch) != expected:
                raise Conflict(f"topic branch note changed before publication: {path}")
        if current_pr:
            current_feedback = poll_feedback(self.api, int(current_pr["number"]), [
                (int(row.split(":", 1)[0]), row.split(":", 1)[1])
                for row in feedback_revision.get("allowlist", [])
            ]) if feedback_revision.get("allowlist") else []
            if not self._feedback_unchanged(int(current_pr["number"]), feedback_revision, current_feedback):
                raise Conflict("owner feedback changed before publication")
            freeze = freeze or should_freeze(current_pr, current_feedback, notes=0, lines=0)
        if freeze:
            validate_frozen_edits(edits, pending_feedback)
        self._assert_lease()
        prepared_op_id = uuid.uuid4().hex[:16]
        op = self.journal.prepare(
            {
                "op_id": prepared_op_id,
                "topic": topic,
                "generation": generation,
                "branch": branch,
                "parent_head": branch_head,
                "base_head": expected_base_sha,
                "source_hashes": {path: fingerprint(text) for path, text in expected_sources.items()},
                "candidate_hashes": {path: fingerprint(text) for path, text in candidate.items()},
                "candidate": dict(candidate),
                "feedback_revision": dict(feedback_revision),
                "pr_number": current_pr.get("number") if current_pr else None,
                "prior_pr_draft": current_pr.get("draft") if current_pr else None,
                "prior_review_decision": current_pr.get("reviewDecision") if current_pr else None,
                "prior_pr_head": current_pr.get("head", {}).get("sha") if current_pr else None,
                "title": title,
                "body": body if marker(topic, generation) in body else body.rstrip() + "\n\n" + marker(topic, generation) + "\n",
                "commit_message": f"notes: improve {topic} [{prepared_op_id}]",
                "receipts": dict(operation_receipts or {}),
                "export_required": export_required,
            }
        )
        op_id = op["op_id"]
        commit_sha = self._create_commit(
            branch_head, candidate, op["commit_message"]
        )
        self._assert_lease()
        self.journal.advance(op_id, "commit_created", {"commit_sha": commit_sha})
        self._assert_lease()
        if current_pr:
            current_pr = self._require_open_pr_identity(int(current_pr["number"]), topic, generation, branch)
            ensure_draft_for_mutation(self.api, current_pr)
        self._update_branch_cas(branch, branch_head, commit_sha)
        self.journal.advance(op_id, "branch_updated", {"branch_sha": commit_sha})
        self._assert_lease()
        final_body = op["body"]
        if expected_pr_number is not None:
            current_pr = self._require_open_pr_identity(expected_pr_number, topic, generation, branch)
        pr, created = self._ensure_pr(
            self.open_prs(),
            topic=topic,
            generation=generation,
            branch=branch,
            title=title,
            body=final_body,
        )
        self.journal.advance(op_id, "pr_updated", {"pr_number": pr["number"], "created": created})
        self._assert_lease()
        if export_required:
            self._archive_pending(
                op_id, "export_operations", {"commit_sha": commit_sha, "reason": "verified Syncer export required"},
                freeze=True,
            )
            return {"op_id": op_id, "commit_sha": commit_sha, "pr": pr, "status": "awaiting_export"}
        verified = self._await_checks(op_id, branch, commit_sha)
        if verified is None:
            return {
                "op_id": op_id,
                "commit_sha": commit_sha,
                "pr": pr,
                "status": "awaiting_checks",
            }
        self._assert_lease()
        self.journal.advance(op_id, "committed", {"head_sha": commit_sha})
        return {
            "op_id": op_id,
            "commit_sha": commit_sha,
            "pr": pr,
            "status": "committed",
            **verified,
        }


def validate_note_path(root: Path, relative: str) -> Path:
    if not relative.startswith(ALLOWED_NOTE_PREFIX) or not relative.endswith(".md"):
        raise UnsafeInput("proposal path is outside authorable notes")
    if ".." in Path(relative).parts:
        raise UnsafeInput("path traversal rejected")
    root_real = root.resolve()
    target = root / relative
    cursor = root
    for part in Path(relative).parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise UnsafeInput("symlink path rejected")
    resolved = target.resolve(strict=False)
    if not resolved.is_relative_to(root_real):
        raise UnsafeInput("resolved path escaped repository")
    return target


def apply_guarded_sources(root: Path, expected: Mapping[str, str], candidate: Mapping[str, str]) -> None:
    for relative, before in expected.items():
        target = validate_note_path(root, relative)
        if not target.exists() or target.read_text() != before:
            raise Conflict(f"whole-note CAS conflict: {relative}")
    for relative, content in candidate.items():
        if relative not in expected:
            raise UnsafeInput("candidate contains uninspected path")
        validate_note_path(root, relative).write_text(content)


class IsolatedRepository:
    """Committed-source clone used to apply/test candidates away from dirty checkout."""

    def __init__(self, source: Path, base_ref: str = "main") -> None:
        self.source = source.resolve()
        self.base_ref = base_ref
        self._temp: tempfile.TemporaryDirectory[str] | None = None
        self.path: Path | None = None

    def __enter__(self) -> "IsolatedRepository":
        self._temp = tempfile.TemporaryDirectory(prefix="devbook-improvement-")
        self.path = Path(self._temp.name) / "repo"
        _git(("clone", "--no-hardlinks", "--quiet", str(self.source), str(self.path)), cwd=self.source.parent)
        _git(("checkout", "--quiet", self.base_ref), cwd=self.path)
        if _git(("status", "--porcelain"), cwd=self.path).stdout:
            raise RuntimeFailure("isolated repository is unexpectedly dirty")
        for relative in (Path("Web/node_modules"), Path("Web/.quartz")):
            installed = self.source / relative
            linked = self.path / relative
            if installed.is_dir() and not linked.exists():
                linked.parent.mkdir(parents=True, exist_ok=True)
                linked.symlink_to(installed, target_is_directory=True)
        return self

    def __exit__(self, *_: Any) -> None:
        if self._temp:
            self._temp.cleanup()

def _git(argv: Sequence[str], *, cwd: Path) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        ["git", *argv], cwd=cwd, text=True, capture_output=True, check=False, timeout=60
    )
    if completed.returncode:
        raise RuntimeFailure(f"git {' '.join(argv)} failed: {completed.stderr.strip()[:400]}")
    return completed


def validate_source_url(url: str, allowed_hosts: Iterable[str], resolver: Callable[..., Any] = socket.getaddrinfo) -> str:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise UnsafeInput("source must be public HTTPS")
    host = parsed.hostname.encode("idna").decode().casefold()
    allowed = {item.casefold() for item in allowed_hosts}
    if host not in allowed:
        raise UnsafeInput("source host is not explicitly allowed")
    try:
        addresses = resolver(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise RuntimeFailure("source hostname did not resolve") from exc
    for address in {row[4][0] for row in addresses}:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            raise UnsafeInput("source resolved to a non-public address")
    return url


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, validate: Callable[[str], str]) -> None:
        self.validate = validate

    def redirect_request(self, req: Any, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> Any:
        self.validate(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def fetch_primary_source(
    url: str,
    allowed_hosts: Iterable[str],
    *,
    max_bytes: int = 1_000_000,
    timeout: int = 15,
    resolver: Callable[..., Any] = socket.getaddrinfo,
) -> bytes:
    validate = lambda value: validate_source_url(value, allowed_hosts, resolver)
    validate(url)
    opener = urllib.request.build_opener(_SafeRedirect(validate))
    request = urllib.request.Request(url, headers={"User-Agent": "DevBookImprovement/1"})
    try:
        with opener.open(request, timeout=timeout) as response:
            kind = response.headers.get_content_type()
            if kind not in {"text/html", "text/plain"}:
                raise UnsafeInput("source must provide bounded textual evidence; PDF extraction is unavailable")
            data = response.read(max_bytes + 1)
    except urllib.error.URLError as exc:
        raise RuntimeFailure("source retrieval failed") from exc
    if len(data) > max_bytes:
        raise UnsafeInput("source exceeds size limit")
    return data




def run_validations(root: Path, commands: Iterable[Sequence[str]]) -> list[dict[str, str]]:
    results = []
    for command in commands:
        if not command or any(not isinstance(part, str) or not part for part in command):
            raise UnsafeInput("validator commands must be nonempty argv arrays")
        completed = subprocess.run(
            list(command), cwd=root, text=True, capture_output=True, timeout=300, check=False
        )
        result = "passed" if completed.returncode == 0 else f"failed: {(completed.stderr or completed.stdout)[-400:]}"
        results.append({"check": " ".join(command), "result": result})
        if completed.returncode:
            raise RuntimeFailure(f"validation failed: {' '.join(command)}")
    return results


def main(argv: Sequence[str] | None = None) -> int:
    from devbook_improvement.pipeline import main as pipeline_main

    return pipeline_main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
