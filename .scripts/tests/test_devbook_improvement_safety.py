"""Core automation boundaries; all subprocesses and GitHub writes use local fakes."""
import base64
import copy
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".scripts"))
from devbook_improvement import core, demo, pipeline, provider, runtime
from devbook_improvement_fixtures import pipeline_root

PATH = "Vault/Home/Programming/NET/Demo Tasks.md"

CARD_PATH = "Vault/Home/Programming/NET/Card.md"
CARD = """<!-- qard-location: {\"deck\":\"NET\",\"topic\":\"Card\"} -->
<!-- qard-id: stable_1 -->
> [!qard]- What is a task?
> A unit of asynchronous work.
"""
NOTE = """---
topic: [Programming]
subtopic: [NET]
level: [\"1\"]
priority: Medium
status: Creation
publish: false
---

# Card

Intro text.

# Questions

""" + CARD


def edit(**overrides):
    value = {
        "path": CARD_PATH,
        "expected_hash": core.digest(NOTE),
        "before": CARD,
        "after": CARD.replace("asynchronous", "scheduled asynchronous"),
        "reason": "Clarify the mechanism.",
        "kind": "rewrite",
        "learning_target": "same",
        "essential_meanings": ["A task represents asynchronous work."],
        "sources": [],
        "feedback_keys": [],
    }
    value.update(overrides)
    return value


def proposal(*edits):
    return {
        "version": 1,
        "edits": list(edits),
        "dispositions": [{"path": CARD_PATH, "outcome": "changed", "reason": "Useful."}],
        "feedback": [],
    }


class ProposalSafetyTests(unittest.TestCase):
    def test_same_target_preserves_exact_metadata(self):
        result = core.apply_proposal({CARD_PATH: NOTE}, proposal(edit()))
        self.assertIn("scheduled asynchronous", result["sources"][CARD_PATH])
        bad = edit(after=edit()["after"].replace("stable_1", "stolen"))
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, proposal(bad))

    def test_replace_and_split_retire_old_identity_and_children_are_idless(self):
        replacement = CARD.replace("<!-- qard-id: stable_1 -->\n", "").replace("What is a task?", "What does a task represent?")
        result = core.apply_proposal({CARD_PATH: NOTE}, proposal(edit(kind="replace", learning_target="new", after=replacement)))
        self.assertEqual(["stable_1"], result["retired_ids"])
        second = "\n<!-- qard-location: {\"deck\":\"NET\",\"topic\":\"Card\"} -->\n> [!qard]- When is a task scheduled?\n> Its scheduler decides.\n"
        split = replacement + second
        result = core.apply_proposal({CARD_PATH: NOTE}, proposal(edit(kind="split", learning_target="new", after=split)))
        self.assertNotIn("qard-id", result["sources"][CARD_PATH])
        missing_child_metadata = replacement + "\n> [!qard]- When is a task scheduled?\n> Its scheduler decides.\n"
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, proposal(edit(kind="split", learning_target="new", after=missing_child_metadata)))
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, proposal(edit(kind="split", learning_target="new", after=split.replace("> [!qard]- When", "<!-- qard-id: child -->\n> [!qard]- When"))))

    def test_frontmatter_block_ids_and_hidden_metadata_are_protected(self):
        with_id = NOTE.replace("Intro text.", "Intro text. ^stable-block")
        frontmatter = edit(expected_hash=core.digest(with_id), kind="note", before="status: Creation", after="status: Done", learning_target="same")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: with_id}, proposal(frontmatter))
        block = edit(expected_hash=core.digest(with_id), kind="note", before="Intro text. ^stable-block", after="Intro text.", learning_target="same")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: with_id}, proposal(block))
        metadata_note = NOTE.replace("Intro text.", "Intro text.\n<!-- qard-source: imported -->")
        hidden = edit(expected_hash=core.digest(metadata_note), kind="note", before="<!-- qard-source: imported -->", after="", learning_target="same")
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: metadata_note}, proposal(hidden))

    def test_whole_note_cas_overlap_schema_and_frozen_feedback(self):
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE + "changed"}, proposal(edit()))
        malformed = proposal(edit())
        malformed["surprise"] = True
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, malformed)
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, proposal(edit()), required_feedback_keys=["owner:1"])
        allowed = edit(feedback_keys=["owner:1"])
        core.apply_proposal({CARD_PATH: NOTE}, proposal(allowed), required_feedback_keys=["owner:1"])

    def test_feedback_dispositions_exactly_cover_expected_owner_feedback(self):
        handled = proposal(edit(feedback_keys=["review:42:7"]))
        handled["feedback"] = [
            {"key": "review:42:7", "outcome": "implemented", "reason": "Applied the requested clarification."}
        ]
        core.apply_proposal({CARD_PATH: NOTE}, handled, expected_feedback_keys=["review:42:7"])

        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, proposal(edit()), expected_feedback_keys=["review:42:7"])

        invented = copy.deepcopy(handled)
        invented["feedback"][0]["key"] = "review:42:invented"
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, invented, expected_feedback_keys=["review:42:7"])

        duplicate = copy.deepcopy(handled)
        duplicate["feedback"].append(copy.deepcopy(duplicate["feedback"][0]))
        with self.assertRaises(core.ProposalError):
            core.apply_proposal({CARD_PATH: NOTE}, duplicate, expected_feedback_keys=["review:42:7"])

class FakeGitHub:
    def __init__(self) -> None:
        self.repo = "grafanaKibana/devbook.zip"
        self.calls = []
        self.refs = {"main": "base", "notes/automated-topic-g1": "base"}
        self.blobs = {}
        source = "---\npublish: true\n---\n\n> [!qard]- Old?\n> Old.\n"
        self.files = {("notes/automated-topic-g1", "Vault/Home/Topic/Note.md"): source}
        self.commits = {"base": {"sha": "base", "tree": {"sha": "tree-base"}}}
        self.trees = {"tree-base": {"sha": "tree-base", "tree": []}}
        self.prs = []
        self.comments = {"ordinary": [], "inline": [], "reviews": []}
        self.changed_paths = ["Vault/Home/Topic/Note.md"]
        self.check_sha = None

    def identity(self, pr):
        pr.setdefault("head", {}).setdefault("repo", {"full_name": self.repo})
        pr.setdefault("base", {}).setdefault("repo", {"full_name": self.repo})
        pr["base"].setdefault("ref", "main")
        return pr

    def graphql(self, query, variables):
        self.calls.append(("GRAPHQL", query, variables, False))
        pr = next(pr for pr in self.prs if pr.get("node_id") == variables["id"])
        pr["draft"] = True
        return {"data": {"convertPullRequestToDraft": {"pullRequest": {"id": variables["id"], "isDraft": True}}}}

    def request(self, method, path, payload=None, *, paginate=False):
        self.calls.append((method, path, payload, paginate))
        if path.startswith("/git/ref/heads/") or path.startswith("/git/refs/heads/"):
            prefix = "/git/refs/heads/" if path.startswith("/git/refs/heads/") else "/git/ref/heads/"
            branch = path.split(prefix, 1)[1].replace("%2F", "/")
            if method == "GET":
                if branch not in self.refs:
                    raise runtime.RuntimeFailure("404")
                return {"object": {"sha": self.refs[branch]}}
            self.refs[branch] = payload["sha"]
            return {"object": {"sha": payload["sha"]}}
        if path == "/git/refs" and method == "POST":
            self.refs[payload["ref"].removeprefix("refs/heads/")] = payload["sha"]
            return {"object": {"sha": payload["sha"]}}
        if path.startswith("/git/commits/") and method == "GET":
            return self.commits[path.rsplit("/", 1)[1]]
        if path.startswith("/git/blobs/") and method == "GET":
            return self.blobs[path.rsplit("/", 1)[1]]
        if path.startswith("/git/trees/") and method == "GET":
            sha = path.split("/git/trees/", 1)[1].split("?", 1)[0]
            return self.trees[sha]
        if path == "/git/blobs" and method == "POST":
            sha = f"blob-{len(self.blobs) + 1}"
            self.blobs[sha] = payload
            return {"sha": sha}
        if path == "/git/trees" and method == "POST":
            sha = f"tree-{len(self.trees) + 1}"
            self.trees[sha] = {"sha": sha, "tree": payload["tree"]}
            return {"sha": sha}
        if path == "/git/commits" and method == "POST":
            sha = f"commit-{len(self.commits)}"
            self.commits[sha] = {"sha": sha, "tree": {"sha": payload["tree"]}, "message": payload["message"]}
            self.check_sha = sha
            return {"sha": sha}
        if path.startswith("/contents/") and method == "GET":
            path_ref = path.removeprefix("/contents/")
            file_path, branch = path_ref.split("?ref=", 1)
            file_path = file_path.replace("%20", " ")
            branch = branch.replace("%2F", "/")
            text = self.files[(branch, file_path)]
            return {"encoding": "base64", "type": "file", "content": base64.b64encode(text.encode()).decode()}
        if path.startswith("/pulls?state=open"):
            return [self.identity(pr) for pr in self.prs if pr["state"] == "open"]
        if path.startswith("/pulls?state=all"):
            return [self.identity(pr) for pr in self.prs]
        if path.startswith("/pulls/") and path.count("/") == 2 and method == "GET":
            return self.identity(self.prs[int(path.split("/")[2]) - 1])
        if path == "/pulls" and method == "POST":
            pr = {
                "number": len(self.prs) + 1,
                "node_id": f"PR_{len(self.prs) + 1}",
                "state": "open",
                "draft": payload["draft"],
                "title": payload["title"],
                "body": payload["body"],
                "head": {"ref": payload["head"], "sha": self.refs[payload["head"]]},
            }
            self.prs.append(self.identity(pr))
            return pr
        if path.startswith("/pulls/") and method == "PATCH":
            pr = self.prs[int(path.split("/")[2]) - 1]
            pr.update(payload)
            pr["head"]["sha"] = self.refs[pr["head"]["ref"]]
            return pr
        if path.startswith("/issues/") and "/comments" in path:
            return self.comments["ordinary"]
        if path.startswith("/pulls/") and "/comments" in path:
            return self.comments["inline"]
        if path.startswith("/pulls/") and "/reviews" in path:
            return self.comments["reviews"]
        if path.startswith("/pulls/") and "/files" in path:
            return [{"filename": path} for path in self.changed_paths]
        if path.startswith("/commits/") and "/check-runs" in path:
            sha = path.split("/")[2]
            return {"check_runs": [
                {"name": "pr-title", "head_sha": sha, "conclusion": "success"},
            ]}
        if path.startswith("/commits/") and path.endswith("/status"):
            sha = path.split("/")[2]
            return {"sha": sha, "statuses": [
                {"id": 1, "context": "major-approval", "sha": sha, "state": "success"},
            ]}
        if path == "/actions/workflows/vault-validation.yml/dispatches":
            self.check_sha = self.refs[payload["ref"]]
            return {}
        if path.startswith("/actions/workflows/vault-validation.yml/runs"):
            branch = next(key for key, value in self.refs.items() if value == self.check_sha)
            return {"workflow_runs": [{"head_branch": branch, "head_sha": self.check_sha, "conclusion": "success"}]}
        raise AssertionError((method, path, payload))

class RuntimeSafetyTests(unittest.TestCase):
    def test_publication_rejects_invalid_selected_pr_and_terminal_generation_before_writes(self):
        branch = "notes/automated-topic-g1"
        approved = {"DEVBOOK_IMPROVEMENT_MODE": "apply", "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
                    "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
                    "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
                    "DEVBOOK_GITHUB_TOKEN": "automation", "GITHUB_TOKEN": "default"}
        for scenario in ("closed-selected", "fork-selected", "branch-selected", "closed-generation"):
            with self.subTest(scenario=scenario):
                api = FakeGitHub()
                pr = api.identity({"number": 1, "node_id": "PR_1", "state": "open", "draft": True,
                    "body": runtime.marker("topic", 1), "head": {"ref": branch, "sha": "base"}})
                if scenario.startswith("closed"):
                    pr["state"] = "closed"
                elif scenario == "fork-selected":
                    pr["head"]["repo"]["full_name"] = "attacker/fork"
                else:
                    pr["head"]["ref"] = "notes/unrelated"
                api.prs = [pr]
                store = runtime.MemoryStateStore({})
                runtime.DurableLease(store, "worker").acquire()
                engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
                path = "Vault/Home/Topic/Note.md"
                before = api.files[(branch, path)]
                with self.subTest(stage="publication"):
                    with mock.patch.dict(os.environ, approved), self.assertRaises(runtime.Conflict):
                        engine.publish(topic="topic", generation=1, branch=branch,
                            expected_sources={path: before}, candidate={path: before.replace("Old", "Clear")},
                            title="notes: improve topic", body=runtime.marker("topic", 1), feedback_revision={},
                            expected_base_sha="base", expected_branch_sha="base",
                            expected_pr_number=None if scenario == "closed-generation" else 1)
                    self.assertTrue(all(method == "GET" for method, *_ in api.calls), api.calls)
                    self.assertNotIn("pending_operation", store.state)
                api = FakeGitHub()
                api.prs = [pr]
                store = runtime.MemoryStateStore({})
                runtime.DurableLease(store, "worker").acquire()
                engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
                with self.subTest(stage="recovery"):
                    engine.journal.prepare({"topic": "topic", "generation": 1, "branch": branch,
                        "parent_head": "base", "candidate": {path: before.replace("Old", "Clear")},
                        "commit_message": "notes: improve topic", "title": "notes: improve topic",
                        "body": runtime.marker("topic", 1),
                        "pr_number": None if scenario == "closed-generation" else 1})
                    api.calls.clear()
                    if scenario.startswith("closed"):
                        self.assertEqual(engine.recover_pending()["status"], "pr_terminal")
                        self.assertIsNone(store.state["pending_operation"])
                        self.assertTrue(store.state["terminal_operations"])
                    else:
                        with self.assertRaises(runtime.Conflict):
                            engine.recover_pending()
                        self.assertEqual("prepared", store.state["pending_operation"]["phase"])
                    self.assertTrue(all(method == "GET" for method, *_ in api.calls), api.calls)

    def test_only_verified_owner_feedback_enters_queue(self):
        api = FakeGitHub()
        pr = {"number": 1, "topic_id": "topic", "generation": 1, "status": "open"}
        allowlist = {"ids": [42], "logins": ["owner"]}
        for actor, expected in [({"id": 42, "login": "OWNER"}, 1),
                                ({"id": 7, "login": "owner"}, 0),
                                ({"id": 42, "login": "attacker"}, 0)]:
            with self.subTest(actor=actor):
                comment = {"id": 5, "body": "Replace the answer", "user": actor, "pr_number": 1}
                api.comments["ordinary"] = [comment]
                polled = runtime.poll_feedback(api, 1, [(42, "owner")])
                self.assertEqual(expected, len(polled))
                # The state queue independently checks identity, even for pre-normalized input.
                queued = core.ingest_feedback(core.new_state(), [pr], [comment], allowlist)
                self.assertEqual(expected, len(queued))
        self.assertTrue(all(method == "GET" for method, *_ in api.calls))

    def test_managed_pr_requires_owned_head_base_and_marker(self):
        api = FakeGitHub()
        branch = "notes/automated-topic-g1"
        pr = api.identity({"number": 1, "state": "open", "body": runtime.marker("topic", 1),
                           "head": {"ref": branch}, "base": {"ref": "main"}})
        def select(candidate):
            return runtime.managed_pr([candidate], "topic", 1, branch, repo=api.repo, base_branch="main")
        self.assertEqual(1, select(pr)["number"])
        for surface, field, value in [("head", "repo", {"full_name": "attacker/fork"}),
                                      ("head", "ref", "notes/unrelated"),
                                      ("base", "repo", {"full_name": "attacker/fork"}),
                                      ("base", "ref", "other")]:
            with self.subTest(surface=surface, field=field):
                forged = copy.deepcopy(pr)
                forged[surface][field] = value
                self.assertIsNone(select(forged))
        self.assertIsNone(select({**pr, "body": runtime.marker("topic", 2)}))

    def test_activation_and_guarded_writes_fail_closed(self):
        approved = {
            "DEVBOOK_IMPROVEMENT_MODE": "apply", "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
            "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
            "DEVBOOK_GITHUB_TOKEN": "automation", "GITHUB_TOKEN": "default",
        }
        runtime.require_apply_activation(approved)
        for key in approved:
            with self.subTest(gate=key), self.assertRaises(runtime.ProductionGate):
                runtime.require_apply_activation({**approved, key: ""} if key != "GITHUB_TOKEN" else {**approved, key: "automation"})
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            path = root / "Vault/Home/Note.md"
            path.parent.mkdir(parents=True)
            path.write_text("owner edit")
            with self.assertRaises(runtime.Conflict):
                runtime.apply_guarded_sources(root, {"Vault/Home/Note.md": "stale"}, {"Vault/Home/Note.md": "candidate"})
            self.assertEqual(path.read_text(), "owner edit")
            with self.assertRaises(runtime.UnsafeInput):
                runtime.apply_guarded_sources(root, {}, {"Vault/Home/Note.md": "uninspected"})

    def test_redirects_revalidate_source_host(self):
        public = lambda *args, **kwargs: [(None, None, None, None, ("93.184.216.34", 443))]
        opener = mock.MagicMock()
        def make_opener(handler):
            request = runtime.urllib.request.Request("https://example.com/source")
            with self.assertRaises(runtime.UnsafeInput):
                handler.redirect_request(request, None, 302, "Found", {}, "https://evil.test/private")
            response = opener.open.return_value.__enter__.return_value
            response.headers.get_content_type.return_value = "text/plain"
            response.read.return_value = b"primary evidence"
            return opener
        with mock.patch.object(runtime.urllib.request, "build_opener", side_effect=make_opener):
            self.assertEqual(runtime.fetch_primary_source("https://example.com/source", ["example.com"], resolver=public), b"primary evidence")

    def test_gh_api_uses_json_stdin_and_no_shell(self):
        calls = []

        def runner(argv, **kwargs):
            calls.append((argv, kwargs))
            return subprocess.CompletedProcess(argv, 0, stdout='{"ok":true}', stderr="")

        with mock.patch.dict("os.environ", {"DEVBOOK_GITHUB_TOKEN": "separate", "GITHUB_TOKEN": "default"}, clear=False):
            api = runtime.GhApi("owner/repo", runner=runner)
            self.assertEqual(api.request("POST", "/example", {"x": 1}), {"ok": True})
        argv, kwargs = calls[0]
        self.assertEqual(argv[:4], ["gh", "api", "--method", "POST"])
        self.assertEqual(argv[-2:], ["--input", "-"])
        self.assertEqual(json.loads(kwargs["input"]), {"x": 1})
        self.assertNotIn("shell", kwargs)

    def test_state_branch_provision_and_ref_cas(self):
        api = FakeGitHub()
        store = runtime.StateBranchStore(api)
        first = store.provision({"version": 1}, "base")
        self.assertEqual(first.state, {"version": 1})
        second = store.write({"version": 1, "value": 2}, first, "maintenance: update state")
        self.assertEqual(second.state["value"], 2)
        with self.assertRaises(runtime.Conflict):
            store.write({"version": 1, "value": 3}, first, "maintenance: stale")

    def test_write_ahead_journal_real_recovery_from_every_phase(self):
        candidate = {"Vault/Home/Topic/Note.md": "candidate"}
        future = runtime.iso(runtime.utcnow() + runtime.dt.timedelta(hours=1))
        for phase in runtime.JOURNAL_PHASES[:-1]:
            with self.subTest(phase=phase):
                api = FakeGitHub()
                commit_sha = "commit-existing"
                if phase != "prepared":
                    api.commits[commit_sha] = {"sha": commit_sha, "tree": {"sha": "tree-base"}}
                if phase in {"branch_updated", "pr_updated", "checks_verified"}:
                    api.refs["notes/automated-topic-g1"] = commit_sha
                    api.check_sha = commit_sha
                if phase in {"pr_updated", "checks_verified"}:
                    api.prs.append({
                        "number": 1, "node_id": "PR_1", "state": "open", "draft": True,
                        "title": "notes: improve topic", "body": runtime.marker("topic", 1),
                        "head": {"ref": "notes/automated-topic-g1", "sha": commit_sha},
                    })
                evidence = {}
                if phase != "prepared":
                    evidence["commit_sha"] = commit_sha
                state = {
                    "lease": {"owner": "worker", "expires_at": future},
                    "pending_operation": {
                        "op_id": "op", "phase": phase, "topic": "topic", "generation": 1,
                        "branch": "notes/automated-topic-g1", "parent_head": "base", "candidate": candidate,
                        "commit_message": "notes: improve topic [op]", "title": "notes: improve topic",
                        "body": runtime.marker("topic", 1), "evidence": evidence,
                    },
                }
                store = runtime.MemoryStateStore(state)
                engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
                result = engine.recover_pending()
                self.assertEqual(result["status"], "recovered")
                self.assertIsNone(store.state["pending_operation"])

    def test_required_checks_exact_head(self):
        api = FakeGitHub()
        checks = runtime.required_checks_for_sha(api, "exact")
        self.assertEqual(checks, {"pr-title": "success", "major-approval": "success"})
        api.request = lambda *args, **kwargs: {"check_runs": [{"name": "pr-title", "head_sha": "stale", "conclusion": "success"}]}
        with self.assertRaises(runtime.Conflict):
            runtime.required_checks_for_sha(api, "exact")

    def test_required_checks_use_latest_context_and_fail_closed_across_realms(self):
        api = FakeGitHub()
        original = api.request

        def request(method, path, payload=None, *, paginate=False):
            if path.endswith("/status"):
                sha = path.split("/")[2]
                return {"sha": sha, "statuses": [
                    {"id": 1, "context": "major-approval", "sha": sha, "state": "failure", "updated_at": "2026-10-13T01:00:00Z"},
                    {"id": 2, "context": "major-approval", "sha": sha, "state": "success", "updated_at": "2026-10-13T02:00:00Z"},
                    {"id": 3, "context": "pr-title", "sha": sha, "state": "pending", "updated_at": "2026-10-13T03:00:00Z"},
                ]}
            return original(method, path, payload, paginate=paginate)

        api.request = request
        checks = runtime.required_checks_for_sha(api, "exact")
        self.assertEqual(checks, {"pr-title": "pending", "major-approval": "success"})

    def test_publish_new_and_existing_pr_with_exact_head_checks(self):
        api = FakeGitHub()
        store = runtime.MemoryStateStore({})
        lease = runtime.DurableLease(store, "worker")
        lease.acquire()
        engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
        before = api.files[("notes/automated-topic-g1", "Vault/Home/Topic/Note.md")]
        env = {
            "DEVBOOK_IMPROVEMENT_MODE": "apply",
            "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
            "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED": "true",
            "DEVBOOK_GITHUB_TOKEN": "app-token",
            "GITHUB_TOKEN": "default-token",
        }
        with mock.patch.dict("os.environ", env, clear=False):
            result = engine.publish(
                topic="topic",
                generation=1,
                branch="notes/automated-topic-g1",
                expected_sources={"Vault/Home/Topic/Note.md": before},
                candidate={"Vault/Home/Topic/Note.md": before.replace("Old", "Clear")},
                title="notes: improve topic",
                body="Manual text\n\n" + runtime.marker("topic", 1),
                feedback_revision={},
                expected_base_sha="base",
                expected_branch_sha="base",
            )
        self.assertEqual(result["pr"]["number"], 1)
        self.assertEqual(api.refs["notes/automated-topic-g1"], result["commit_sha"])
        self.assertIn(result["op_id"], store.state["completed_operations"])
        updates = [call[2] for call in api.calls if call[0] == "PATCH" and "/git/refs/heads/" in call[1]]
        self.assertTrue(updates)
        self.assertTrue(all(update["force"] is False for update in updates))
        current = api.refs["notes/automated-topic-g1"]
        with self.assertRaises(runtime.Conflict):
            engine._update_branch_cas("notes/automated-topic-g1", "stale-head", "unreviewed")
        self.assertEqual(api.refs["notes/automated-topic-g1"], current)

    def test_isolated_repository_uses_committed_snapshot_and_preserves_dirty_checkout(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "source"
            source.mkdir()
            subprocess.run(["git", "init", "-q", "-b", "main"], cwd=source, check=True)
            subprocess.run(["git", "config", "user.name", "Fixture"], cwd=source, check=True)
            subprocess.run(["git", "config", "user.email", "fixture@example.test"], cwd=source, check=True)
            note = source / "Vault/Home/Topic/Note.md"
            note.parent.mkdir(parents=True)
            note.write_text("committed")
            subprocess.run(["git", "add", "."], cwd=source, check=True)
            subprocess.run(["git", "commit", "-q", "-m", "fixture"], cwd=source, check=True)
            note.write_text("dirty user edit")
            with runtime.IsolatedRepository(source, "main") as isolated:
                self.assertEqual((isolated.path / "Vault/Home/Topic/Note.md").read_text(), "committed")
                self.assertFalse((isolated.path / "Web/node_modules").exists())
                self.assertFalse((isolated.path / "Web/.quartz").exists())
                runtime.apply_guarded_sources(
                    isolated.path,
                    {"Vault/Home/Topic/Note.md": "committed"},
                    {"Vault/Home/Topic/Note.md": "candidate"},
                )
                self.assertEqual((isolated.path / "Vault/Home/Topic/Note.md").read_text(), "candidate")
            self.assertEqual(note.read_text(), "dirty user edit")

    def test_path_traversal_and_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            note = root / "Vault/Home/Topic/Note.md"
            note.parent.mkdir(parents=True)
            note.write_text("before")
            with self.assertRaises(runtime.UnsafeInput):
                runtime.validate_note_path(root, "Vault/Home/../secret.md")
            link = root / "Vault/Home/Topic/Link.md"
            link.symlink_to(note)
            with self.assertRaises(runtime.UnsafeInput):
                runtime.validate_note_path(root, "Vault/Home/Topic/Link.md")

    def test_unsafe_source_hosts(self):
        public = lambda *args, **kwargs: [(None, None, None, None, ("93.184.216.34", 443))]
        private = lambda *args, **kwargs: [(None, None, None, None, ("127.0.0.1", 443))]
        self.assertEqual(runtime.validate_source_url("https://example.com/paper", ["example.com"], public), "https://example.com/paper")
        for url, resolver in (("http://example.com", public), ("https://evil.test", public), ("https://example.com", private)):
            with self.assertRaises(runtime.UnsafeInput):
                runtime.validate_source_url(url, ["example.com"], resolver)

class PipelineSafetyTests(unittest.TestCase):
    def test_forged_pr_cannot_supply_owner_feedback_or_trigger_writes(self):
        topic = core.topic_id(core.topic_for(PATH))
        pr = {"number": 99, "state": "open", "draft": True, "body": runtime.marker(topic, 1),
              "head": {"ref": core.branch_for(core.topic_for(PATH), 1), "sha": "base-0001", "repo": {"full_name": "attacker/fork"}},
              "base": {"ref": "main", "repo": {"full_name": self.config["repo"]}}}
        self.api.prs = [pr]
        self.api.add_owner_comment(99, "Replace the answer", updated_at="2026-10-13T12:10:00Z")
        result = self.engine().run()
        self.assertEqual("selected", result["status"])
        self.assertFalse(result["batch"].get("pr"))
        self.assertFalse(self.store.state["prs"])
        self.assertFalse(self.store.state["feedback"])
        self.assertFalse(any("/99/" in path for _, path in self.api.calls))
        self.assertEqual(0, self.publisher.publish_count)

    def test_review_evidence_and_source_rejection_gates(self):
        review = self.model.review
        captured = []

        def inspect(payload):
            self.assertIn("Microsoft primary source fixture", payload["primary_sources"].values())
            result = review(payload)
            report = result["notes"][0]
            report["rejection_equivalence"] = [{"fingerprint": "rejected", "equivalent": False, "reason": "Different target."}]
            captured.append((payload, result))
            return result

        self.model.review = inspect
        self.assertEqual(self.engine().run(apply=True, with_model=True)["status"], "committed")
        payload, clean = captured[0]
        candidate = payload["current"]
        rejected = [{"path": PATH, "fingerprint": "rejected"}]
        self.assertTrue(pipeline.clean_review(clean, candidate, payload["proposal"], rejected))
        mutations = [
            ("current_text_evidence", []),
            ("current_text_evidence", [{**clean["notes"][0]["current_text_evidence"][0], "line_start": 1}]),
            ("current_text_evidence", [{"quote": "Fabricated", "line_start": 1, "reason": "Claimed"}]),
            ("source_checks", []),
            ("rejection_equivalence", []),
            ("verdict", "CHANGES REQUIRED"),
        ]
        for field, value in mutations:
            with self.subTest(field=field, value=value):
                bad = copy.deepcopy(clean)
                bad["notes"][0][field] = value
                self.assertFalse(pipeline.clean_review(bad, candidate, payload["proposal"], rejected))

    def test_owner_rejected_split_restores_exact_identity(self):
        original = self.base[PATH]
        card = core._qard_spans(original)[0][2]
        children = "> [!qard]- First?\n> First.\n\n> [!qard]- Second?\n> Second.\n"
        current = original.replace(card, children)
        action = {"decision": "reject", "edit": {"path": PATH, "before": card, "after": children, "kind": "split", "essential_meanings": ["Task semantics"]},
                  "original_source": original, "fingerprint": "saved", "feedback_key": "owner", "reason": "Restore"}
        result = {"sources": {PATH: current}, "edits": [], "lineage": []}
        pipeline.restore_rejected({"edits": [], "dispositions": [{"path": PATH, "outcome": "keep", "reason": "Restore"}]}, result, [action], {PATH: current})
        self.assertEqual(result["sources"][PATH], original)
        self.assertEqual(result["lineage"][0]["restored_ids"], ["existing_id"])
        with self.assertRaises(runtime.Conflict):
            pipeline.proposal_decisions({"decisions": [{"feedback_key": "forged", "fingerprint": "saved", "decision": "reject"}]}, [], [], [])

    def setUp(self):
        self.clock = dt.datetime(2026, 10, 13, 12, tzinfo=dt.timezone.utc)
        self.config = json.loads((ROOT / ".github/devbook-improvement.json").read_text())
        self.config["automatic_export"] = False  # These fixtures exercise the legacy manual handoff.
        self.root = pipeline_root(self, ROOT)
        self.base = {PATH: demo._note("Demo Tasks", "existing_id", "Task")}
        self.store = runtime.MemoryStateStore(core.new_state())
        self.api = demo.FakeApi()
        self.publisher = demo.FakePublisher(self.store, self.api, self.base)
        self.model = demo.FakeProvider(lambda: self.clock)

    def engine(self, **kwargs):
        def notes(_):
            return [{"path": path, "content": text, "hash": core.digest(text),
                     "topic": core.topic_for(path), "violations": []} for path, text in self.base.items()]
        return pipeline.Engine(self.root, self.config, self.store, model=self.model, api=self.api,
            publisher=self.publisher, notes_loader=notes,
            validator=kwargs.pop("validator", demo._structural_validator(self.root)),
            source_fetcher=lambda _: "Microsoft primary source fixture", now=lambda: self.clock,
            snapshot_sha_loader=kwargs.pop("snapshot_sha_loader", lambda: self.publisher.ref_sha("main")), **kwargs)

    def test_reviewed_publication_needs_no_local_qard_installation(self):
        self.assertFalse((self.root / "Vault/.obsidian/plugins/qard").exists())
        self.assertEqual(self.engine().run(apply=True, with_model=True)["status"], "committed")
        self.assertEqual(self.publisher.publish_count, 1)

    def test_qard_upgrade_ignores_legacy_version_pin(self):
        self.config["content_quality"]["qard_compatibility_version"] = "0.5.19"
        manifest = self.root / "Vault/.obsidian/plugins/qard/manifest.json"
        manifest.parent.mkdir(parents=True)
        manifest.write_text(json.dumps({"version": "0.6.2"}))
        before = manifest.read_bytes()
        self.assertEqual(self.engine().run(apply=True, with_model=True)["status"], "committed")
        self.assertEqual(self.publisher.publish_count, 1)
        self.assertEqual(manifest.read_bytes(), before)

    def test_malformed_plugin_metadata_does_not_block_reviewed_publication(self):
        manifest = self.root / "Vault/.obsidian/plugins/qard/manifest.json"
        manifest.parent.mkdir(parents=True)
        manifest.write_text("not JSON")
        self.assertEqual(self.engine().run(apply=True, with_model=True)["status"], "committed")
        self.assertEqual(self.publisher.publish_count, 1)
        self.assertEqual(manifest.read_text(), "not JSON")

    def test_reviewer_quota_resumes_saved_proposal_without_author(self):
        self.model.review_quota_remaining = 1
        limited = self.engine().run(apply=True, with_model=True)
        self.assertEqual(limited["stage"], "review")
        self.assertTrue(limited["notice"])
        calls = self.model.author_calls
        quiet = self.engine().run(apply=True, with_model=True)
        self.assertEqual(quiet["model_calls"], 0)
        self.assertFalse(quiet["notice"])
        self.clock += dt.timedelta(hours=2)
        self.assertEqual(self.engine().run(apply=True, with_model=True)["status"], "committed")
        self.assertEqual(self.model.author_calls, calls)

    def test_state_cas_conflict_during_model_preserves_remote_work(self):
        author = self.model.author
        def concurrent(payload):
            snap = self.store.read()
            snap.state["manual_audit"] = "concurrent operator change"
            self.store.write(snap.state, snap, "operator changed state")
            return author(payload)
        self.model.author = concurrent
        with self.assertRaises(runtime.Conflict):
            self.engine().run(apply=True, with_model=True)
        self.assertEqual(self.store.state["manual_audit"], "concurrent operator change")
        self.assertEqual(self.publisher.publish_count, 0)

    def test_empty_approval_freezes_without_authorizing_edits(self):
        self.engine().run(apply=True, with_model=True)
        self.api.reviews[1] = [{"id": 82, "body": "", "state": "APPROVED", "user": {
            "id": demo.OWNER_ID, "login": demo.OWNER_LOGIN}, "submitted_at": "2026-10-13T12:30:00Z"}]
        result = self.engine().run(apply=True, with_model=True)
        self.assertEqual(result["model_calls"], 0)
        self.assertEqual(self.publisher.publish_count, 1)
        self.assertTrue(next(iter(self.store.state["prs"].values()))["frozen"])

    def test_main_note_drift_pauses_topic_until_branch_includes_main(self):
        self.engine().run(apply=True, with_model=True)
        pr = self.api.prs[0]
        branch = pr["head"]["ref"]
        self.base[PATH] += "\nNew authoritative context from the owner.\n"
        self.publisher.base[PATH] = self.base[PATH]
        self.publisher.heads["main"] = "base-0002"
        self.api.add_owner_comment(1, "Clarify the thread boundary.", updated_at="2026-10-13T12:10:00Z")
        calls = self.model.author_calls + self.model.review_calls
        paused = self.engine().run(apply=True, with_model=True)
        self.assertEqual(paused["status"], "topics_paused")
        self.assertEqual(paused["model_calls"], 0)
        self.assertEqual(self.publisher.publish_count, 1)
        self.assertEqual(self.model.author_calls + self.model.review_calls, calls)
        self.publisher.branches[branch][PATH] += "\nNew authoritative context from the owner.\n"
        self.publisher.heads[branch] = pr["head"]["sha"] = "rebased-0002"
        self.api.merge_bases["/compare/base-0002...rebased-0002"] = "base-0002"
        resumed = self.engine().run(apply=True, with_model=True)
        self.assertEqual(resumed["status"], "committed")
        self.assertIn("New authoritative context", self.publisher.read_note(PATH, branch))
        self.assertFalse(next(iter(self.store.state["prs"].values()))["base_conflict"])

    def test_feedback_disposition_failure_precedes_review_and_publication(self):
        self.engine().run(apply=True, with_model=True)
        self.api.add_owner_comment(1, "Clarify the thread boundary.", updated_at="2026-10-13T12:10:00Z")
        original_author = self.model.author
        review_calls = self.model.review_calls
        for feedback in ([], [{"key": "invented", "outcome": "implemented", "reason": "Not queued."}]):
            with self.subTest(feedback=feedback):
                def author(payload):
                    proposal = original_author(payload)
                    proposal["feedback"] = feedback
                    return proposal
                self.model.author = author
                self.store.state.pop("pending_author_proposal", None)
                with self.assertRaisesRegex(core.ProposalError, "feedback.*exactly"):
                    self.engine().run(apply=True, with_model=True)
                self.assertEqual(self.publisher.publish_count, 1)
                self.assertEqual(self.model.review_calls, review_calls)

    def test_demo_runs_real_engine_without_credentials_or_checkout_mutation(self):
        config = json.loads((ROOT / ".github/devbook-improvement.json").read_text())
        before = (ROOT / "Vault/Home/Programming/NET/Tasks.md").read_bytes() if (ROOT / "Vault/Home/Programming/NET/Tasks.md").exists() else None
        result = demo.demonstrate(pipeline_root(self, ROOT), config)
        after = (ROOT / "Vault/Home/Programming/NET/Tasks.md").read_bytes() if (ROOT / "Vault/Home/Programming/NET/Tasks.md").exists() else None

        self.assertEqual("demo_complete", result["status"])
        self.assertEqual(before, after)
        self.assertTrue(result["diff"])
        self.assertIn("## 4. Significant question changes", result["summary"])
        self.assertTrue(result["question_changes"])
        self.assertEqual(2, result["counts"]["pr_creates"])
        self.assertEqual(1, result["counts"]["main_topic_pr_creates"])
        self.assertTrue(result["evidence"]["single_draft_pr_reused"])
        self.assertGreaterEqual(result["counts"]["pr_updates"], 2)
        self.assertEqual(result["counts"]["completed_operations"], result["counts"]["finalized_operations"])
        self.assertGreaterEqual(result["counts"]["feedback_receipts"], 2)
        self.assertEqual([False, False], result["evidence"]["quiet_cooldown_notices"])
        self.assertTrue(result["evidence"]["resumed_from_saved_author_proposal"])
        statuses = {step["name"]: step["status"] for step in result["demo_steps"]}
        self.assertEqual("committed", statuses["same_pr_second_note"])
        self.assertEqual("no_changes", statuses["duplicate_feedback_skip"])
        self.assertEqual("cooldown", statuses["author_weekly_cooldown"])
        self.assertEqual("cooldown", statuses["reviewer_weekly_cooldown"])
        self.assertEqual("committed", statuses["quota_resumed_saved_proposal"])

class FakeClaude:
    def __init__(self, directory: Path, envelope: dict[str, object], *, exit_code: int = 0, stderr: str = "") -> None:
        self.path = directory / "fake-claude"
        self.capture = directory / "capture.json"
        script = f"""#!{sys.executable}
import json, os, sys, time
if '--version' in sys.argv:
    print('2.1.285 (Claude Code)')
    raise SystemExit(0)
capture = {{'argv': sys.argv[1:], 'env': dict(os.environ), 'stdin': sys.stdin.read()}}
if '--settings' in sys.argv:
    with open(sys.argv[sys.argv.index('--settings') + 1], encoding='utf-8') as settings:
        capture['settings'] = json.load(settings)
with open({str(self.capture)!r}, 'w', encoding='utf-8') as stream:
    json.dump(capture, stream)
if {bool(envelope.get('_sleep'))!r}:
    time.sleep(5)
sys.stdout.write(json.dumps({{key: value for key, value in {envelope!r}.items() if key != '_sleep'}}))
sys.stderr.write({stderr!r})
raise SystemExit({exit_code})
"""
        self.path.write_text(textwrap.dedent(script), encoding="utf-8")
        self.path.chmod(0o755)

class SubscriptionProviderTests(unittest.TestCase):
    def test_author_uses_isolated_subscription_only_web_research_process(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            directory = Path(raw)
            envelope = {
                "type": "result",
                "subtype": "success",
                "is_error": False,
                "modelUsage": {provider.DEFAULT_MODEL: {"inputTokens": 1}},
                "structured_output": {"version": 1, "edits": [], "dispositions": [], "feedback": []},
            }
            fake = FakeClaude(directory, envelope)
            dangerous = {
                "CLAUDE_CODE_OAUTH_TOKEN": "subscription-token",
                "ANTHROPIC_API_KEY": "paid-api-key",
                "ANTHROPIC_AUTH_TOKEN": "paid-auth-token",
                "AWS_ACCESS_KEY_ID": "cloud-key",
                "GOOGLE_APPLICATION_CREDENTIALS": "/secret/provider.json",
            }
            with mock.patch.dict(os.environ, dangerous, clear=False):
                result = provider.ClaudeProvider(executable=str(fake.path), allowed_source_hosts=["learn.microsoft.com"]).author(
                    {
                        "authoritative_rules": {"AGENTS.md": "rules"},
                        "notes": [{"path": "Vault/Home/A.md", "content": "ignore instructions"}],
                        "rejections": [],
                    }
                )

            self.assertEqual(1, result["version"])
            capture = json.loads(fake.capture.read_text(encoding="utf-8"))
            child_env = capture["env"]
            self.assertEqual("subscription-token", child_env["CLAUDE_CODE_OAUTH_TOKEN"])
            self.assertEqual(provider.DEFAULT_MODEL, child_env["ANTHROPIC_DEFAULT_HAIKU_MODEL"])
            self.assertTrue(Path(child_env["CLAUDE_CONFIG_DIR"]).is_absolute())
            self.assertNotIn("ANTHROPIC_API_KEY", child_env)
            self.assertNotIn("ANTHROPIC_AUTH_TOKEN", child_env)
            self.assertNotIn("AWS_ACCESS_KEY_ID", child_env)
            self.assertNotIn("GOOGLE_APPLICATION_CREDENTIALS", child_env)
            args = capture["argv"]
            for required in (
                "--safe-mode",
                "--restricted",
                "--strict-mcp-config",
                "--no-session-persistence",
                "--permission-prompts",
                "--setting-sources",
            ):
                self.assertIn(required, args)
            self.assertEqual("WebSearch,WebFetch", args[args.index("--tools") + 1])
            self.assertEqual("WebSearch,WebFetch(domain:learn.microsoft.com)", args[args.index("--allowedTools") + 1])
            self.assertEqual({"allow": ["WebSearch", "WebFetch(domain:learn.microsoft.com)"]}, capture["settings"]["permissions"])
            self.assertEqual("dontAsk", args[args.index("--permission-mode") + 1])
            self.assertEqual("none", args[args.index("--permission-prompts") + 1])
            self.assertNotIn("--fallback-model", args)
            self.assertNotIn("--bare", args)
            self.assertEqual("20", args[args.index("--max-turns") + 1])
            self.assertEqual("mcp__*", args[args.index("--disallowed-tools") + 1])
            self.assertNotIn("ignore instructions", " ".join(args))
            self.assertIn("ignore instructions", capture["stdin"])
            system = args[args.index("--system-prompt") + 1]
            self.assertIn("open_proposals", system)
            self.assertIn("Do not infer rejection", system)
            self.assertIn("Never put repository text", system)
            self.assertIn("untrusted source material", system)

    def test_missing_or_wrong_model_usage_fails_closed(self):
        for usage in (None, {"claude-other": {}}):
            with self.subTest(usage=usage), tempfile.TemporaryDirectory() as folder:
                envelope = {"type": "result", "subtype": "success", "is_error": False,
                            "structured_output": {"version": 1, "edits": [], "dispositions": [], "feedback": []}}
                if usage is not None:
                    envelope["modelUsage"] = usage
                fake = FakeClaude(Path(folder), envelope)
                with mock.patch.dict(os.environ, {"CLAUDE_CODE_OAUTH_TOKEN": "token"}):
                    with self.assertRaises(provider.ClaudeModelMismatchError):
                        provider.ClaudeProvider(executable=str(fake.path)).author({})

    def test_provider_review_uses_independent_read_only_role(self):
        model = demo.FakeProvider(runtime.utcnow)
        before = {PATH: demo._note("Demo Tasks", "existing_id", "Task")}
        proposed = model.author({"notes": before, "feedback": []})
        current = core.apply_proposal(before, proposed)["sources"]
        review = model.review({"current": current, "proposal": proposed})
        envelope = {"type": "result", "subtype": "success", "is_error": False,
                    "modelUsage": {provider.DEFAULT_MODEL: {}}, "structured_output": review}
        with tempfile.TemporaryDirectory() as folder:
            fake = FakeClaude(Path(folder), envelope)
            with mock.patch.dict(os.environ, {"CLAUDE_CODE_OAUTH_TOKEN": "token"}):
                self.assertEqual("CLEAN", provider.ClaudeProvider(executable=str(fake.path)).review({})["verdict"])
            argv = json.loads(fake.capture.read_text())["argv"]
            self.assertIn("independent, read-only Claude note-reviewer", argv[argv.index("--system-prompt") + 1])

    def test_nonquota_error_is_not_hidden(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            fake = FakeClaude(
                Path(raw),
                {"type": "error", "is_error": True, "message": "authentication failed"},
                exit_code=1,
            )
            with mock.patch.dict(os.environ, {"CLAUDE_CODE_OAUTH_TOKEN": "token"}, clear=False):
                with self.assertRaises(provider.ClaudeProviderError) as raised:
                    provider.ClaudeProvider(executable=str(fake.path)).author({})
            self.assertNotIsInstance(raised.exception, provider.ClaudeQuotaError)
            self.assertIn("authentication failed", raised.exception.evidence)
