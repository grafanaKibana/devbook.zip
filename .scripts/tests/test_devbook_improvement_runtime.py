from __future__ import annotations

import base64
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


MODULE_PATH = Path(__file__).parents[1] / "devbook_improvement" / "runtime.py"
SPEC = importlib.util.spec_from_file_location("devbook_improvement_runtime", MODULE_PATH)
runtime = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = runtime
SPEC.loader.exec_module(runtime)


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


class RuntimeTests(unittest.TestCase):
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

    def test_gh_graphql_uses_global_endpoint_and_json_stdin(self):
        calls = []

        def runner(argv, **kwargs):
            calls.append((argv, kwargs))
            return subprocess.CompletedProcess(argv, 0, stdout='{"data":{}}', stderr="")

        with mock.patch.dict("os.environ", {"DEVBOOK_GITHUB_TOKEN": "separate"}, clear=False):
            runtime.GhApi("owner/repo", runner=runner).graphql("query($id:ID!){node(id:$id){id}}", {"id": "PR_1"})
        argv, kwargs = calls[0]
        self.assertEqual(argv, ["gh", "api", "graphql", "--input", "-"])
        self.assertEqual(json.loads(kwargs["input"])["variables"], {"id": "PR_1"})

    def test_gh_pagination_is_explicitly_bounded(self):
        calls = []

        def runner(argv, **kwargs):
            calls.append(argv)
            rows = list(range(100)) if "&page=1" in argv[4] else ["last"]
            return subprocess.CompletedProcess(argv, 0, stdout=json.dumps(rows), stderr="")

        with mock.patch.dict("os.environ", {"DEVBOOK_GITHUB_TOKEN": "separate"}, clear=False):
            rows = runtime.GhApi("owner/repo", runner=runner, max_pages=2).request(
                "GET", "/pulls?state=all&per_page=100", paginate=True
            )
        self.assertEqual(len(rows), 101)
        self.assertIn("&page=1", calls[0][4])
        self.assertIn("&page=2", calls[1][4])

    def test_state_cas_conflict_and_two_workers_serialize(self):
        store = runtime.MemoryStateStore({})
        old = store.read()
        store.write({"a": 1}, old, "first")
        with self.assertRaises(runtime.Conflict):
            store.write({"a": 2}, old, "stale")
        with tempfile.TemporaryDirectory() as folder:
            lock = Path(folder) / "lock"
            with runtime.local_lock(lock):
                with self.assertRaises(runtime.Conflict):
                    with runtime.local_lock(lock):
                        pass

    def test_state_branch_provision_and_ref_cas(self):
        api = FakeGitHub()
        store = runtime.StateBranchStore(api)
        first = store.provision({"version": 1}, "base")
        self.assertEqual(first.state, {"version": 1})
        second = store.write({"version": 1, "value": 2}, first, "maintenance: update state")
        self.assertEqual(second.state["value"], 2)
        with self.assertRaises(runtime.Conflict):
            store.write({"version": 1, "value": 3}, first, "maintenance: stale")

    def test_write_ahead_journal_recovers_each_phase(self):
        store = runtime.MemoryStateStore({})
        journal = runtime.OperationJournal(store)
        op = journal.prepare({"topic": "topic"})
        for phase in runtime.JOURNAL_PHASES[1:]:
            journal.advance(op["op_id"], phase)
        self.assertIsNone(store.state["pending_operation"])
        self.assertIn(op["op_id"], store.state["completed_operations"])

    def test_completed_wal_compacts_only_after_pipeline_finalization(self):
        store = runtime.MemoryStateStore({})
        journal = runtime.OperationJournal(store)
        op = journal.prepare({
            "topic": "topic", "generation": 1, "candidate": {"Vault/Home/A.md": "large"},
            "receipts": {"proposal": {"large": "payload"}},
        })
        for phase in runtime.JOURNAL_PHASES[1:]:
            evidence = ({"commit_sha": "head"} if phase == "commit_created" else
                        {"checks": {"pr-title": "success"}, "vault_validation": "success", "head_sha": "head"}
                        if phase == "checks_verified" else None)
            journal.advance(op["op_id"], phase, evidence)
        with self.assertRaises(runtime.Conflict):
            runtime.compact_finalized_operation(store, op["op_id"])
        store.state["finalized_operations"] = {op["op_id"]: True}
        compact = runtime.compact_finalized_operation(store, op["op_id"])
        self.assertEqual(compact["head_sha"], "head")
        self.assertEqual(compact["checks"], {"pr-title": "success"})
        self.assertNotIn("candidate", compact)
        self.assertNotIn("receipts", compact)
        revision = store.revision
        self.assertEqual(runtime.compact_finalized_operation(store, op["op_id"]), compact)
        self.assertEqual(store.revision, revision)

    def test_write_ahead_journal_real_recovery_from_every_phase(self):
        candidate = {"Vault/Home/Topic/Note.md": "candidate"}
        future = runtime.iso(runtime.utcnow() + runtime.dt.timedelta(hours=1))
        for phase in runtime.JOURNAL_PHASES:
            with self.subTest(phase=phase):
                if phase == "committed":
                    continue
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

    def test_existing_pr_reuse_lifecycle_and_terminal_feedback_stop(self):
        body = "Manual text\n" + runtime.marker("topic", 1)
        pr = {"number": 1, "state": "open", "draft": True, "body": body,
              "head": {"ref": "notes/automated-topic-g1", "repo": {"full_name": "grafanaKibana/devbook.zip"}},
              "base": {"ref": "main", "repo": {"full_name": "grafanaKibana/devbook.zip"}}}
        self.assertEqual(runtime.managed_pr(
            [pr], "topic", 1, "notes/automated-topic-g1",
            repo="grafanaKibana/devbook.zip", base_branch="main",
        )["number"], 1)
        closed = {**pr, "state": "closed"}
        self.assertEqual(runtime.lifecycle(closed), "closed")

    def test_managed_pr_rejects_forks_wrong_branches_and_duplicates(self):
        repo = "grafanaKibana/devbook.zip"
        branch = "notes/automated-topic-g1"
        pr = {"number": 1, "state": "open", "body": runtime.marker("topic", 1),
              "head": {"ref": branch, "repo": {"full_name": repo}},
              "base": {"ref": "main", "repo": {"full_name": repo}}}
        external = json.loads(json.dumps(pr))
        external["head"]["repo"]["full_name"] = "attacker/fork"
        self.assertFalse(runtime.valid_pr_identity(external, repo, "main", "topic", 1))
        wrong_base = json.loads(json.dumps(pr))
        wrong_base["base"]["repo"]["full_name"] = "attacker/fork"
        self.assertFalse(runtime.valid_pr_identity(wrong_base, repo, "main", "topic", 1))
        self.assertIsNone(runtime.managed_pr(
            [external], "topic", 1, branch, repo=repo, base_branch="main",
        ))
        for wrong in ("main", "notes/unrelated"):
            with self.subTest(branch=wrong), self.assertRaises(runtime.UnsafeInput):
                runtime.managed_pr([pr], "topic", 1, wrong, repo=repo, base_branch="main")
        duplicate = {**json.loads(json.dumps(pr)), "number": 2}
        with self.assertRaises(runtime.Conflict):
            runtime.managed_pr([pr, duplicate], "topic", 1, branch, repo=repo, base_branch="main")

    def test_publish_and_recovery_reject_unrelated_branch_before_remote_reads(self):
        api = FakeGitHub()
        store = runtime.MemoryStateStore({})
        runtime.DurableLease(store, "worker").acquire()
        engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
        env = {
            "DEVBOOK_IMPROVEMENT_MODE": "apply", "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
            "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED": "true", "DEVBOOK_GITHUB_TOKEN": "app",
        }
        with mock.patch.dict("os.environ", env, clear=False), self.assertRaises(runtime.UnsafeInput):
            engine.publish(
                topic="topic", generation=1, branch="main", expected_sources={}, candidate={},
                title="notes: invalid", body=runtime.marker("topic", 1), feedback_revision={},
                expected_base_sha="base",
            )
        self.assertEqual(api.calls, [])

        future = runtime.iso(runtime.utcnow() + runtime.dt.timedelta(hours=1))
        store.state = {"lease": {"owner": "worker", "expires_at": future}, "pending_operation": {
            "op_id": "bad", "phase": "prepared", "topic": "topic", "generation": 1,
            "branch": "notes/unrelated", "parent_head": "base", "candidate": {},
            "commit_message": "notes: invalid", "title": "notes: invalid",
            "body": runtime.marker("topic", 1), "evidence": {},
        }}
        with self.assertRaises(runtime.UnsafeInput):
            engine.recover_pending()
        self.assertEqual(api.calls, [])

    def test_selected_fork_pr_is_rejected_before_git_ref_access(self):
        api = FakeGitHub()
        branch = "notes/automated-topic-g1"
        api.prs.append({
            "number": 1, "state": "open", "draft": True, "body": runtime.marker("topic", 1),
            "head": {"ref": branch, "repo": {"full_name": "attacker/fork"}},
            "base": {"ref": "main", "repo": {"full_name": api.repo}},
        })
        store = runtime.MemoryStateStore({})
        runtime.DurableLease(store, "worker").acquire()
        engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
        env = {
            "DEVBOOK_IMPROVEMENT_MODE": "apply", "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
            "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED": "true", "DEVBOOK_GITHUB_TOKEN": "app",
        }
        with mock.patch.dict("os.environ", env, clear=False), self.assertRaises(runtime.Conflict):
            engine.publish(
                topic="topic", generation=1, branch=branch, expected_sources={}, candidate={},
                title="notes: improve topic", body=runtime.marker("topic", 1), feedback_revision={},
                expected_base_sha="base", expected_pr_number=1,
            )
        self.assertFalse(any("/git/ref" in call[1] for call in api.calls))

    def test_edited_feedback_revision_and_untrusted_comment(self):
        base = {"id": 9, "body": "first", "updated_at": "2026-10-13T01:00:00Z", "user": {"id": 1, "login": "Owner"}}
        first = runtime.normalize_feedback([base], [], [], [(1, "owner")])
        self.assertEqual(len(first), 1)
        edited = runtime.normalize_feedback([{**base, "body": "second", "updated_at": "2026-10-13T02:00:00Z"}], [], [], [(1, "owner")])
        self.assertNotEqual(first[0]["revision"], edited[0]["revision"])
        self.assertEqual(runtime.normalize_feedback([{**base, "user": {"id": 2, "login": "owner"}}], [], [], [(1, "owner")]), [])
        receipt = {**base, "body": "<!-- devbook-feedback-result:abc -->\nApplied"}
        self.assertEqual(runtime.normalize_feedback([receipt], [], [], [(1, "owner")]), [])

    def test_monotonic_review_freeze_and_feedback_causality(self):
        pr = {"draft": True}
        feedback = [{"kind": "review", "key": "review:1:a", "paths": ["Vault/Home/A.md"]}]
        self.assertFalse(runtime.should_freeze(pr, [], notes=15, lines=1199))
        self.assertTrue(runtime.should_freeze(pr, [], notes=16, lines=1))
        self.assertTrue(runtime.should_freeze(pr, [], notes=1, lines=1200))
        self.assertTrue(runtime.should_freeze(pr, feedback, notes=1, lines=1))
        runtime.validate_frozen_edits([{"path": "Vault/Home/A.md", "feedback_keys": ["review:1:a"]}], feedback)
        with self.assertRaises(runtime.UnsafeInput):
            runtime.validate_frozen_edits([{"path": "Vault/Home/A.md", "feedback_keys": []}], feedback)

    def test_inline_feedback_metadata_scopes_only_its_file(self):
        inline = {
            "id": 3, "body": "Fix this line", "updated_at": "2026-10-13T01:00:00Z",
            "user": {"id": 1, "login": "owner"}, "path": "Vault/Home/A.md", "line": 7,
            "commit_id": "abc",
        }
        feedback = runtime.normalize_feedback([], [inline], [], [(1, "owner")], ["Vault/Home/A.md", "Vault/Home/B.md"])
        self.assertEqual(feedback[0]["paths"], ["Vault/Home/A.md"])
        self.assertEqual((feedback[0]["path"], feedback[0]["line"], feedback[0]["commit_id"]),
                         ("Vault/Home/A.md", 7, "abc"))
        runtime.validate_frozen_edits(
            [{"path": "Vault/Home/A.md", "feedback_keys": [feedback[0]["key"]]}], feedback,
        )
        with self.assertRaises(runtime.UnsafeInput):
            runtime.validate_frozen_edits(
                [{"path": "Vault/Home/B.md", "feedback_keys": [feedback[0]["key"]]}], feedback,
            )

    def test_ordinary_and_review_feedback_scope_to_existing_pr_files(self):
        api = FakeGitHub()
        api.changed_paths = ["Vault/Home/A.md", "Vault/Home/B.md"]
        owner = {"id": 1, "login": "owner"}
        api.comments["ordinary"] = [{"id": 4, "body": "Adjust both", "user": owner}]
        api.comments["reviews"] = [{"id": 5, "body": "Requested updates", "user": owner}]
        feedback = runtime.poll_feedback(api, 1, [(1, "owner")])
        self.assertEqual({item["kind"] for item in feedback}, {"comment", "review"})
        self.assertTrue(all(item["paths"] == api.changed_paths for item in feedback))

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

    def test_newer_pending_check_beats_older_late_completion(self):
        api = FakeGitHub()
        original = api.request

        def request(method, path, payload=None, *, paginate=False):
            if "/check-runs" in path:
                return {"check_runs": [
                    {"id": 1, "name": "pr-title", "head_sha": "exact", "conclusion": "success", "completed_at": "2026-10-13T03:00:00Z"},
                    {"id": 2, "name": "pr-title", "head_sha": "exact", "status": "in_progress", "started_at": "2026-10-13T02:00:00Z"},
                ]}
            return original(method, path, payload, paginate=paginate)

        api.request = request
        self.assertEqual(runtime.required_checks_for_sha(api, "exact")["pr-title"], "in_progress")

    def test_success_in_one_check_realm_cannot_mask_timeout_or_unknown(self):
        for state in ("timed_out", "unknown"):
            with self.subTest(state=state):
                api = FakeGitHub()
                original = api.request

                def request(method, path, payload=None, *, paginate=False):
                    if path.endswith("/status"):
                        return {"sha": "exact", "statuses": [
                            {"context": "major-approval", "state": "success"},
                            {"context": "pr-title", "state": state},
                        ]}
                    return original(method, path, payload, paginate=paginate)

                api.request = request
                self.assertEqual(runtime.required_checks_for_sha(api, "exact")["pr-title"], state)

    def test_truncated_check_runs_are_actionable_error(self):
        api = FakeGitHub()
        original = api.request

        def request(method, path, payload=None, *, paginate=False):
            result = original(method, path, payload, paginate=paginate)
            if "/check-runs" in path:
                result["total_count"] = 101
            return result

        api.request = request
        with self.assertRaisesRegex(runtime.RuntimeFailure, "100-run bound"):
            runtime.required_checks_for_sha(api, "exact")

    def test_pending_checks_are_quiet_and_not_redispatched(self):
        class PendingGitHub(FakeGitHub):
            def request(self, method, path, payload=None, *, paginate=False):
                if path.startswith("/commits/") and "/check-runs" in path:
                    self.calls.append((method, path, payload, paginate))
                    return {"check_runs": []}
                if path.startswith("/actions/workflows/vault-validation.yml/runs"):
                    self.calls.append((method, path, payload, paginate))
                    return {"workflow_runs": []}
                return super().request(method, path, payload, paginate=paginate)

        api = PendingGitHub()
        store = runtime.MemoryStateStore({})
        runtime.DurableLease(store, "worker").acquire()
        engine = runtime.GitHubRuntime(api, store, lease_owner="worker", check_attempts=1, waiter=lambda _: None)
        before = api.files[("notes/automated-topic-g1", "Vault/Home/Topic/Note.md")]
        env = {
            "DEVBOOK_IMPROVEMENT_MODE": "apply", "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
            "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED": "true", "DEVBOOK_GITHUB_TOKEN": "app",
        }
        with mock.patch.dict("os.environ", env, clear=False):
            result = engine.publish(
                topic="topic", generation=1, branch="notes/automated-topic-g1",
                expected_sources={"Vault/Home/Topic/Note.md": before}, candidate={"Vault/Home/Topic/Note.md": before + "\n"},
                title="notes: improve topic", body=runtime.marker("topic", 1), feedback_revision={},
                expected_base_sha="base", expected_branch_sha="base",
            )
            self.assertEqual(result["status"], "awaiting_checks")
            again = engine.recover_pending()
            self.assertEqual(again["status"], "awaiting_checks")
        dispatches = [call for call in api.calls if call[1] == "/actions/workflows/vault-validation.yml/dispatches"]
        self.assertEqual(len(dispatches), 1)

    def test_only_success_check_conclusions_publish(self):
        class NeutralGitHub(FakeGitHub):
            def request(self, method, path, payload=None, *, paginate=False):
                result = super().request(method, path, payload, paginate=paginate)
                if path.startswith("/commits/") and "/check-runs" in path:
                    result["check_runs"][0]["conclusion"] = "neutral"
                return result

        api = NeutralGitHub()
        api.refs["notes/automated-topic-g1"] = "sha"
        api.check_sha = "sha"
        state, checks, vault = runtime.publication_check_state(api, "notes/automated-topic-g1", "sha")
        self.assertEqual(state, "pending")
        self.assertEqual(checks["pr-title"], "neutral")

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

    def test_selected_pr_closure_stops_publication(self):
        api = FakeGitHub()
        api.prs.append({
            "number": 1, "node_id": "PR_1", "state": "closed", "draft": True, "body": runtime.marker("topic", 1),
            "head": {"ref": "notes/automated-topic-g1", "sha": "base"},
        })
        store = runtime.MemoryStateStore({})
        runtime.DurableLease(store, "worker").acquire()
        engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
        before = api.files[("notes/automated-topic-g1", "Vault/Home/Topic/Note.md")]
        env = {
            "DEVBOOK_IMPROVEMENT_MODE": "apply", "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
            "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED": "true", "DEVBOOK_GITHUB_TOKEN": "app",
        }
        with mock.patch.dict("os.environ", env, clear=False), self.assertRaises(runtime.Conflict):
            engine.publish(
                topic="topic", generation=1, branch="notes/automated-topic-g1",
                expected_sources={"Vault/Home/Topic/Note.md": before}, candidate={"Vault/Home/Topic/Note.md": before + "\n"},
                title="notes: improve topic", body=runtime.marker("topic", 1), feedback_revision={},
                expected_base_sha="base", expected_branch_sha="base", expected_pr_number=1,
            )
        self.assertIsNone(store.state.get("pending_operation"))

    def test_recovery_stops_when_selected_pr_closed(self):
        api = FakeGitHub()
        api.prs.append({
            "number": 1, "node_id": "PR_1", "state": "closed", "draft": True,
            "body": runtime.marker("topic", 1), "head": {"ref": "notes/automated-topic-g1", "sha": "base"},
        })
        future = runtime.iso(runtime.utcnow() + runtime.dt.timedelta(hours=1))
        store = runtime.MemoryStateStore({
            "lease": {"owner": "worker", "expires_at": future},
            "pending_operation": {
                "op_id": "op", "phase": "commit_created", "topic": "topic", "generation": 1,
                "branch": "notes/automated-topic-g1", "parent_head": "base", "candidate": {},
                "commit_message": "notes: improve topic [op]", "title": "notes: improve topic",
                "body": runtime.marker("topic", 1), "pr_number": 1,
                "evidence": {"commit_sha": "commit-existing"},
            },
        })
        api.commits["commit-existing"] = {"sha": "commit-existing", "tree": {"sha": "tree-base"}}
        with self.assertRaises(runtime.Conflict):
            runtime.GitHubRuntime(api, store, lease_owner="worker").recover_pending()
        self.assertEqual(store.state["pending_operation"]["phase"], "commit_created")

    def test_recovery_renews_draft_before_or_after_crashed_ref_update(self):
        future = runtime.iso(runtime.utcnow() + runtime.dt.timedelta(hours=1))
        for phase in ("commit_created", "branch_updated", "pr_updated"):
            with self.subTest(phase=phase):
                api = FakeGitHub()
                commit_sha = "commit-existing"
                api.commits[commit_sha] = {"sha": commit_sha, "tree": {"sha": "tree-base"}}
                if phase in {"branch_updated", "pr_updated"}:
                    api.refs["notes/automated-topic-g1"] = commit_sha
                api.prs.append({
                    "number": 1, "node_id": "PR_1", "state": "open", "draft": False,
                    "reviewDecision": "APPROVED", "body": runtime.marker("topic", 1),
                    "head": {"ref": "notes/automated-topic-g1", "sha": api.refs["notes/automated-topic-g1"]},
                })
                store = runtime.MemoryStateStore({
                    "lease": {"owner": "worker", "expires_at": future},
                    "pending_operation": {
                        "op_id": "op", "phase": phase, "topic": "topic", "generation": 1,
                        "branch": "notes/automated-topic-g1", "parent_head": "base", "candidate": {},
                        "commit_message": "notes: improve topic [op]", "title": "notes: improve topic",
                        "body": runtime.marker("topic", 1), "pr_number": 1,
                        "prior_pr_draft": False, "prior_review_decision": "APPROVED",
                        "evidence": {"commit_sha": commit_sha},
                    },
                })
                runtime.GitHubRuntime(api, store, lease_owner="worker").recover_pending()
                self.assertTrue(api.prs[0]["draft"])
                graphql_index = next(i for i, call in enumerate(api.calls) if call[0] == "GRAPHQL")
                ref_updates = [i for i, call in enumerate(api.calls)
                               if call[0] == "PATCH" and call[1].startswith("/git/refs/heads/")]
                if ref_updates:
                    self.assertLess(graphql_index, ref_updates[0])

    def test_post_approval_feedback_requires_renewed_review(self):
        api = FakeGitHub()
        api.prs.append({
            "number": 1, "node_id": "PR_1", "state": "open", "draft": False, "body": runtime.marker("topic", 1),
            "head": {"ref": "notes/automated-topic-g1", "sha": "base"},
        })
        comment = {"id": 8, "body": "Apply this fix", "updated_at": "2026-10-13T01:00:00Z", "user": {"id": 1, "login": "owner"}}
        api.comments["ordinary"] = [comment]
        feedback = runtime.normalize_feedback(
            [comment], [], [], [(1, "owner")], ["Vault/Home/Topic/Note.md"],
        )
        store = runtime.MemoryStateStore({})
        runtime.DurableLease(store, "worker").acquire()
        engine = runtime.GitHubRuntime(api, store, lease_owner="worker")
        before = api.files[("notes/automated-topic-g1", "Vault/Home/Topic/Note.md")]
        env = {
            "DEVBOOK_IMPROVEMENT_MODE": "apply", "DEVBOOK_IMPROVEMENT_ACTIVATED": "true",
            "DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED": "true",
            "DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED": "true", "DEVBOOK_GITHUB_TOKEN": "app",
        }
        with mock.patch.dict("os.environ", env, clear=False):
            engine.publish(
                topic="topic", generation=1, branch="notes/automated-topic-g1",
                expected_sources={"Vault/Home/Topic/Note.md": before}, candidate={"Vault/Home/Topic/Note.md": before + "\n"},
                title="notes: improve topic", body=runtime.marker("topic", 1),
                feedback_revision={"allowlist": ["1:owner"], "processed": {"comment:8": feedback[0]["revision"]}},
                expected_base_sha="base", expected_branch_sha="base", expected_pr_number=1,
                pending_feedback=feedback,
                edits=[{"path": "Vault/Home/Topic/Note.md", "feedback_keys": [feedback[0]["key"]]}],
            )
        self.assertTrue(api.prs[0]["draft"])
        graphql_index = next(i for i, call in enumerate(api.calls) if call[0] == "GRAPHQL")
        ref_index = next(i for i, call in enumerate(api.calls)
                         if call[0] == "PATCH" and call[1].startswith("/git/refs/heads/"))
        self.assertLess(graphql_index, ref_index)

    def test_guarded_candidate_never_mutates_source_checkout(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            note = root / "Vault/Home/Topic/Note.md"
            note.parent.mkdir(parents=True)
            note.write_text("source")
            with tempfile.TemporaryDirectory() as workspace:
                copy_root = Path(workspace)
                copy_note = copy_root / "Vault/Home/Topic/Note.md"
                copy_note.parent.mkdir(parents=True)
                copy_note.write_text("source")
                runtime.apply_guarded_sources(
                    copy_root,
                    {"Vault/Home/Topic/Note.md": "source"},
                    {"Vault/Home/Topic/Note.md": "candidate"},
                )
                self.assertEqual(copy_note.read_text(), "candidate")
            self.assertEqual(note.read_text(), "source")

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

    def test_isolated_repository_reuses_preinstalled_web_dependencies_read_only(self):
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

            module = source / "Web/node_modules/example/index.js"
            quartz = source / "Web/.quartz/plugins.json"
            module.parent.mkdir(parents=True)
            quartz.parent.mkdir(parents=True)
            module.write_text("module.exports = 'trusted dependency';\n")
            quartz.write_text('{"installed":true}\n')
            before = {module: module.read_bytes(), quartz: quartz.read_bytes()}

            with runtime.IsolatedRepository(source, "main") as isolated:
                linked_modules = isolated.path / "Web/node_modules"
                linked_quartz = isolated.path / "Web/.quartz"
                self.assertTrue(linked_modules.is_symlink())
                self.assertTrue(linked_quartz.is_symlink())
                self.assertEqual((linked_modules / "example/index.js").read_bytes(), before[module])
                self.assertEqual((linked_quartz / "plugins.json").read_bytes(), before[quartz])
                self.assertEqual((isolated.path / "Vault/Home/Topic/Note.md").read_text(), "committed")

            self.assertEqual(module.read_bytes(), before[module])
            self.assertEqual(quartz.read_bytes(), before[quartz])


if __name__ == "__main__":
    unittest.main()
