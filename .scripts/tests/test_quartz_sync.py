"""Fixture-only tests; never connect to the user's Obsidian vault."""
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[1] / "sync-quartz.py"


class QuartzSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        (self.repo / "Vault").mkdir()
        (self.repo / "Vault/Home").mkdir()
        (self.repo / "Vault/Home/example.md").write_text("---\npublish: true\n---\nExample\n")
        (self.repo / "Web/content").mkdir(parents=True)
        (self.repo / "Vault/note.md").write_text("before\n")
        (self.repo / "Web/content/note.md").write_text("before\n")
        self.git("init", "-q")
        self.git("add", ".")
        self.git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "fixture")
        (self.repo / "Vault/note.md").write_text("after\n")
        self.git("add", "Vault/note.md")
        self.fake = self.repo / "fake-obsidian"
        self.fake.write_text('''#!/usr/bin/env python3
import json, os, pathlib, select, sys, time
root = pathlib.Path.cwd()
scenario = os.environ.get("SCENARIO", "")
args = " ".join(sys.argv[1:])
with (root / "calls").open("a") as f: f.write(args + "\\n")
if scenario == "stdin-eof":
    # Reproduce native CLI behavior: exit before the async response if stdin closes.
    if select.select([sys.stdin], [], [], 0.05)[0] and os.read(0, 1) == b"": sys.exit(0)
if scenario == "timeout": time.sleep(2)
if scenario == "malformed": print("not json"); sys.exit(0)
if scenario == "false": print(json.dumps({"success":False})); sys.exit(0)
if "eval" in sys.argv and "nativePublishPaths" in args:
    inventory = [str(p.relative_to(root / "Vault")) for p in (root / "Vault").rglob("*") if p.is_file() and not any(part.startswith(".") for part in p.relative_to(root / "Vault").parts)]
    disk = ["Home/example.md"]
    native = [] if scenario == "native-incomplete" else disk
    extended = [] if scenario == "extended-incomplete" else disk
    if scenario == "same-count-wrong-path": native = ["Home/other.md"]
    if scenario == "missing-new-file": inventory = []
    if scenario == "startup-wait" and (root / "calls").read_text().count("nativePublishPaths") == 1: native = []
    observed = {name:{"mtime":(root / "Vault" / name).stat().st_mtime_ns / 1000000,"size":(root / "Vault" / name).stat().st_size} for name in inventory}
    metadata = {name:dict(value) for name,value in observed.items() if name.endswith(".md")}
    if scenario == "stale-stat" or (scenario == "stat-recovery" and (root / "calls").read_text().count("nativePublishPaths") == 1):
        for value in observed.values(): value["mtime"] = 0
    if scenario == "stale-size":
        for value in observed.values(): value["size"] += 1
    if scenario == "stale-metadata":
        for value in metadata.values(): value["mtime"] = 0
    result = {"inventory":inventory, "observedStats":observed, "metadataStats":metadata, "nativePublishPaths":native,"extendedPublishPaths":extended,"extendedReady":scenario != "index-unready"}
    print("=> " + json.dumps(result)); sys.exit(0)
if "eval" in sys.argv:
    result = {"vaultPath":str(root / ("Other" if scenario == "vault" else "Vault")), "datacoreReady":scenario != "datacore", "preserveSupported":scenario != "unsupported"}
    print("=> " + json.dumps(result)); sys.exit(0)
if "quartz-syncer:config" in args:
    data = {"publishTarget":"remote" if scenario == "remote" else "local", "quartzRepoPath":str(root / ("Other" if scenario == "destination" else "Web")), "contentFolder":"content", "vaultPath":"Other/" if scenario == "vault-mapping" else "Home/", "obsidianCommentMode":"remove" if scenario == "remove" else "preserve", "autoPublishInterval":0, "autoCleanOrphanedMedia":False, "useDatacore":True, "publishFrontmatterKey":"other" if scenario == "publish-key" else "publish", "allNotesPublishableByDefault":scenario == "all-notes"}
elif "quartz-syncer:publish" in args:
    if scenario == "edit": (root / "Vault/note.md").write_text("concurrent")
    time.sleep(0.05)
    content = "exported"
    if scenario == "query": content = "```datacoretsx\\nreturn [];\\n```"
    if scenario == "comment-query": content = "%%\\n```datacoretsx\\nreturn [];\\n```\\n%%"
    (root / "Web/content/note.md").write_text(content)
    data = {"failures":[{"error":"compile"}] if scenario == "partial" else [], "skipped":0}
elif "quartz-syncer:delete" in args: data = {"filesDeleted":0}
elif "quartz-syncer:cache" in args:
    if scenario == "refresh-failure" or (scenario == "final-refresh-failure" and (root / "calls").read_text().count("action=tree-refresh") == 2): print(json.dumps({"success":False})); sys.exit(0)
    data = {"refreshed":True}
elif "quartz-syncer:media" in args:
    if "action=clean" in args:
        if scenario == "cleanup-failure": print(json.dumps({"success":False})); sys.exit(0)
        data = {"cleaned":1}
    else:
        data = {"files":[{"linked":False}] * (6 if scenario == "mass-cleanup" else 1) if scenario in ["cleanup-failure", "mass-cleanup", "cleanup"] else []}
else: data = {"unpublished":0,"deleted":0,"changed":12}
print(json.dumps({"success":True,"data":data}))
''')
        self.fake.chmod(0o755)

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo).decode()

    def run_sync(self, scenario="", timeout="5"):
        return subprocess.run([sys.executable, str(SCRIPT)], cwd=self.repo,
                              env={**os.environ, "OBSIDIAN_BIN":str(self.fake), "SCENARIO":scenario,
                                   "QUARTZ_SYNC_TIMEOUT":timeout}, capture_output=True, text=True)

    def test_success_waits_and_stages_export_with_dynamic_changes(self):
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("exported", self.git("show", ":Web/content/note.md"))
        calls = (self.repo / "calls").read_text()
        self.assertLess(calls.index("quartz-syncer:publish"), calls.index("quartz-syncer:delete"))
        commands = calls.splitlines()
        refreshes = [i for i, command in enumerate(commands) if "action=tree-refresh" in command]
        self.assertEqual(len(refreshes), 2)
        publish = next(i for i, command in enumerate(commands) if "quartz-syncer:publish" in command)
        deletion = next(i for i, command in enumerate(commands) if "quartz-syncer:delete" in command)
        status = next(i for i, command in enumerate(commands) if "quartz-syncer:status" in command)
        self.assertLess(refreshes[0], publish)
        self.assertLess(deletion, refreshes[1])
        self.assertLess(refreshes[1], status)

    def test_export_failures_block_without_staging_output(self):
        for scenario in ["false", "malformed", "partial", "vault", "destination", "remote", "remove", "edit", "cleanup-failure", "mass-cleanup", "datacore", "unsupported", "query", "refresh-failure", "final-refresh-failure", "vault-mapping", "publish-key", "all-notes"]:
            with self.subTest(scenario=scenario):
                (self.repo / "calls").unlink(missing_ok=True)
                result = self.run_sync(scenario)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.git("show", ":Web/content/note.md"), "before\n")
                self.git("restore", "Vault/note.md", "Web/content/note.md")

    def test_timeout_blocks(self):
        result = self.run_sync("timeout", "0.1")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("may still", result.stderr)

    def test_unstaged_partial_untracked_and_dirty_generated_block_before_cli(self):
        for file in ["Vault/note.md", "Vault/new.md", "Web/content/note.md"]:
            with self.subTest(file=file):
                path = self.repo / file
                original = path.read_bytes() if path.exists() else None
                path.write_text("unstaged")
                self.assertNotEqual(self.run_sync().returncode, 0)
                self.assertFalse((self.repo / "calls").exists())
                if original is None: path.unlink()
                else: path.write_bytes(original)

    def test_delete_and_asset_changes_trigger_export(self):
        for name in ["Vault/note.md", "Vault/picture.png"]:
            with self.subTest(name=name):
                self.git("restore", "--staged", "Vault/note.md")
                self.git("restore", "Vault/note.md")
                if name.endswith("md"): self.git("rm", name)
                else:
                    (self.repo / name).write_bytes(b"image")
                    self.git("add", name)
                self.assertEqual(self.run_sync().returncode, 0)
                self.assertTrue((self.repo / "calls").exists())
                self.git("reset", "--hard", "HEAD")
                (self.repo / "calls").unlink()

    def test_media_cleanup_is_awaited(self):
        self.assertEqual(self.run_sync("cleanup").returncode, 0)
        self.assertIn("action=clean force", (self.repo / "calls").read_text())

    def test_concurrent_run_is_blocked(self):
        with (self.repo / ".git/quartz-sync.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Another Quartz", result.stderr)
        self.assertFalse((self.repo / "calls").exists())

    def test_nul_paths_and_obsidian_churn(self):
        self.git("restore", "--staged", "Vault/note.md")
        self.git("restore", "Vault/note.md")
        (self.repo / "Vault/line\nbreak.md").write_text("note")
        self.git("add", "Vault")
        (self.repo / "Vault/.obsidian").mkdir()
        (self.repo / "Vault/.obsidian/workspace.json").write_text("{}");
        self.assertEqual(self.run_sync().returncode, 0)

    def test_hook_checks_source_before_maintenance(self):
        (self.repo / "Vault/note.md").write_text("partial")
        hook = self.repo / "maintenance.sh"
        hook.write_text("#!/bin/sh\ntouch maintenance-ran\n")
        result = subprocess.run([sys.executable, str(SCRIPT), "--hook", str(hook)], cwd=self.repo,
                                env={**os.environ, "OBSIDIAN_BIN":str(self.fake)}, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.repo / "maintenance-ran").exists())

    def test_staged_generated_changes_are_preserved_and_block(self):
        (self.repo / "Web/content/note.md").write_text("owned change")
        self.git("add", "Web/content/note.md")
        self.assertNotEqual(self.run_sync().returncode, 0)
        self.assertEqual(self.git("show", ":Web/content/note.md"), "owned change")

    def test_query_examples_inside_preserved_comments_are_opaque(self):
        result = self.run_sync("comment-query")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("datacoretsx", self.git("show", ":Web/content/note.md"))

    def test_native_cli_stdin_stays_open_when_git_stdin_is_closed(self):
        environment = {**os.environ, "OBSIDIAN_BIN":str(self.fake), "SCENARIO":"stdin-eof"}
        # Verify that the fixture itself reproduces the native early exit.
        closed = subprocess.run([str(self.fake), "eval"], cwd=self.repo, env=environment,
                                stdin=subprocess.DEVNULL, capture_output=True, text=True)
        self.assertEqual(closed.stdout, "")
        result = subprocess.run([sys.executable, str(SCRIPT)], cwd=self.repo, env=environment,
                                stdin=subprocess.DEVNULL, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("exported", self.git("show", ":Web/content/note.md"))

    def test_timeout_closes_private_stdin_pipe(self):
        spec = importlib.util.spec_from_file_location("quartz_sync", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        descriptors = []
        make_pipe = os.pipe

        def recorded_pipe():
            pair = make_pipe()
            descriptors.extend(pair)
            return pair

        with mock.patch.object(module.os, "pipe", side_effect=recorded_pipe), mock.patch.object(
                module.subprocess, "run", side_effect=subprocess.TimeoutExpired("obsidian", 1)):
            with self.assertRaises(module.SyncError):
                module.cli(self.repo, str(self.fake), "quartz-syncer:publish")
        self.assertEqual(len(descriptors), 2)
        for descriptor in descriptors:
            with self.assertRaises(OSError):
                os.fstat(descriptor)

    def test_incomplete_indexes_block_before_publication(self):
        for scenario in ["native-incomplete", "extended-incomplete", "missing-new-file", "same-count-wrong-path", "index-unready", "stale-stat", "stale-size", "stale-metadata"]:
            with self.subTest(scenario=scenario):
                (self.repo / "calls").unlink(missing_ok=True)
                result = self.run_sync(scenario, "0.5")
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("quartz-syncer:publish", (self.repo / "calls").read_text())
                self.assertEqual(self.git("show", ":Web/content/note.md"), "before\n")

    def test_waits_for_startup_metadata_indexes(self):
        result = self.run_sync("startup-wait")
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = (self.repo / "calls").read_text()
        self.assertGreaterEqual(calls.count("nativePublishPaths"), 3)
        self.assertIn("exported", self.git("show", ":Web/content/note.md"))

    def test_hidden_runtime_files_do_not_block_inventory(self):
        (self.repo / ".gitignore").write_text("Vault/.DS_Store\nVault/.omc/\n")
        (self.repo / "Vault/.DS_Store").write_bytes(b"finder")
        (self.repo / "Vault/.omc").mkdir()
        (self.repo / "Vault/.omc/state.json").write_text("{}")
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_waits_for_file_stat_observation(self):
        result = self.run_sync("stat-recovery")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertGreaterEqual((self.repo / "calls").read_text().count("nativePublishPaths"), 3)

    def test_nonvault_change_skips_cli(self):
        self.git("restore", "--staged", "Vault/note.md")
        self.assertEqual(self.run_sync().returncode, 0)
        self.assertFalse((self.repo / "calls").exists())


if __name__ == "__main__": unittest.main()
