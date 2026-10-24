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
        self.fake.write_text(r'''#!/usr/bin/env python3
import json, os, pathlib, re, select, sys, time
root = pathlib.Path.cwd()
scenario = os.environ.get("SCENARIO", "")
args = " ".join(sys.argv[1:])
with (root / "calls").open("a") as f: f.write(args + "\n")
if scenario == "stdin-eof":
    if select.select([sys.stdin], [], [], 0.05)[0] and os.read(0, 1) == b"": sys.exit(0)
if scenario == "timeout": time.sleep(2)
if scenario == "malformed": print("not json"); sys.exit(0)
if scenario == "false": print(json.dumps({"success":False})); sys.exit(0)
if "eval" in sys.argv and "nativePublishPaths" in args:
    inventory = [str(p.relative_to(root / "Vault")) for p in (root / "Vault").rglob("*") if p.is_file() and not any(part.startswith(".") for part in p.relative_to(root / "Vault").parts)]
    native = [] if scenario == "native-incomplete" else ["Home/example.md"]
    extended = [] if scenario == "extended-incomplete" else ["Home/example.md"]
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
engine_path = root / ".git/fake-syncer-engine.json"
if not engine_path.exists(): engine_path.write_text(json.dumps({"active":scenario in ["active-timer", "reload-failure", "reload-noop"]}))
engine = json.loads(engine_path.read_text())
if "plugin:reload" in sys.argv:
    if scenario == "reload-failure": sys.exit(1)
    if scenario != "reload-noop": engine_path.write_text(json.dumps({"active":False}))
    print("Reloaded plugin: quartz-syncer"); sys.exit(0)
if "eval" in sys.argv:
    result = {"vaultPath":str(root / ("Other" if scenario == "vault" else "Vault")), "datacoreReady":scenario != "datacore", "preserveSupported":scenario != "unsupported", "syncerLoaded":True,"autoPublishActive":engine["active"]}
    print("=> " + json.dumps(result)); sys.exit(0)
state_path = root / ".git/fake-syncer-settings.json"
if state_path.exists(): settings = json.loads(state_path.read_text())
else:
    defaults_path = pathlib.Path(__DEFAULTS_PATH__)
    settings = json.loads(defaults_path.read_text()) if defaults_path.exists() else {}
    settings.update({"publishTarget":"local", "quartzRepoPath":str(root / "Web"), "contentFolder":"content", "vaultPath":"Home/", "publishFrontmatterKey":"publish", "allNotesPublishableByDefault":False, "obsidianCommentMode":"preserve", "autoPublishInterval":0, "autoCleanOrphanedMedia":False,"useDatacore":True,"localOnly":{"keep":True}})
    if scenario == "absent-defaults": settings = {"localOnly":{"keep":True}}
    if scenario in ["relocated", "repo-failure", "repo-noop"]: settings["quartzRepoPath"] = str(root / "previous/Web")
    if scenario == "relative": settings["quartzRepoPath"] = "Web/"
    if scenario in ["active-timer", "reload-failure", "reload-noop"]:
        settings.update({"autoPublishInterval":60,"obsidianCommentMode":"remove","quartzRepoPath":str(root / "previous/Web")})
    if scenario in ["remove", "config-failure", "config-noop", "cache-clear-failure"]: settings["obsidianCommentMode"] = "remove"
    state_path.write_text(json.dumps(settings))
if "quartz-syncer:config" in args:
    if "action=set" in sys.argv:
        if scenario == "config-failure": print(json.dumps({"success":False})); sys.exit(0)
        key = next(a[4:] for a in sys.argv if a.startswith("key="))
        raw = next(a[6:] for a in sys.argv if a.startswith("value="))
        if key == "obsidianCommentMode" and raw not in ["remove", "preserve"]:
            print(json.dumps({"success":False})); sys.exit(0)
        trimmed = raw.strip()
        if trimmed.startswith(("{", "[")) or trimmed in ["true", "false", "null"] or re.fullmatch(r"-?\d+(\.\d+)?", trimmed):
            try: value = json.loads(trimmed)
            except ValueError: value = raw
        else: value = raw
        if scenario != "config-noop": settings[key] = value
        state_path.write_text(json.dumps(settings))
        data = {"key":key,"value":value}
    else: data = settings
elif "quartz-syncer:repo" in args:
    if scenario == "repo-failure": print(json.dumps({"success":False})); sys.exit(0)
    target = next(a[5:] for a in sys.argv if a.startswith("path="))
    if scenario != "repo-noop": settings.update({"publishTarget":"local","quartzRepoPath":target})
    state_path.write_text(json.dumps(settings))
    data = {"mode":"local","localPath":target}
elif "quartz-syncer:publish" in args:
    if scenario == "edit": (root / "Vault/note.md").write_text("concurrent")
    time.sleep(0.05)
    content = "exported"
    if scenario == "query": content = "```datacoretsx\nreturn [];\n```"
    if scenario == "comment-query": content = "%%\n```datacoretsx\nreturn [];\n```\n%%"
    (root / "Web/content/note.md").write_text(content)
    data = {"failures":[{"error":"compile"}] if scenario == "partial" else [], "skipped":0}
elif "quartz-syncer:delete" in args: data = {"filesDeleted":0}
elif "quartz-syncer:cache" in args:
    if "action=clear" in sys.argv and scenario == "cache-clear-failure": print(json.dumps({"success":False})); sys.exit(0)
    if scenario == "refresh-failure" or (scenario == "final-refresh-failure" and (root / "calls").read_text().count("action=tree-refresh") == 2): print(json.dumps({"success":False})); sys.exit(0)
    data = {"refreshed":True,"cleared":True}
elif "quartz-syncer:media" in args:
    if "action=clean" in args:
        if scenario == "cleanup-failure": print(json.dumps({"success":False})); sys.exit(0)
        data = {"cleaned":1}
    else:
        data = {"files":[{"linked":False}] * (6 if scenario == "mass-cleanup" else 1) if scenario in ["cleanup-failure", "mass-cleanup", "cleanup"] else []}
else: data = {"unpublished":0,"deleted":0,"changed":12}
print(json.dumps({"success":True,"data":data}))
'''.replace("__DEFAULTS_PATH__", repr(str(SCRIPT.with_name("quartz-syncer.defaults.json")))))
        self.fake.chmod(0o755)

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo).decode()

    def run_sync(self, scenario="", timeout="5", configure_only=False):
        return subprocess.run([sys.executable, str(SCRIPT), *(["--configure-only"] if configure_only else [])], cwd=self.repo,
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
        for scenario in ["false", "malformed", "partial", "vault", "edit", "cleanup-failure", "mass-cleanup", "datacore", "unsupported", "query", "refresh-failure", "final-refresh-failure", "config-failure", "repo-failure", "config-noop", "repo-noop", "cache-clear-failure"]:
            with self.subTest(scenario=scenario):
                (self.repo / "calls").unlink(missing_ok=True)
                (self.repo / ".git/fake-syncer-settings.json").unlink(missing_ok=True)
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
                result = self.run_sync(scenario, "2")
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

    def test_absent_shared_defaults_are_configured_without_replacing_local_preferences(self):
        result = self.run_sync("absent-defaults")
        self.assertEqual(result.returncode, 0, result.stderr)
        settings = json.loads((self.repo / ".git/fake-syncer-settings.json").read_text())
        self.assertEqual(settings["obsidianCommentMode"], "preserve")
        self.assertEqual(Path(settings["quartzRepoPath"]), (self.repo / "Web").resolve())
        self.assertEqual(settings["localOnly"], {"keep":True})
        calls = (self.repo / "calls").read_text()
        self.assertIn("action=set-local", calls)
        self.assertLess(calls.index("action=clear"), calls.index("quartz-syncer:config action=set"))
        self.assertLess(calls.index("action=clear"), calls.index("quartz-syncer:publish"))

    def test_relocated_and_relative_destinations_are_repaired_locally(self):
        for scenario in ["relocated", "relative"]:
            with self.subTest(scenario=scenario):
                (self.repo / ".git/fake-syncer-settings.json").unlink(missing_ok=True)
                result = self.run_sync(scenario, configure_only=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                settings = json.loads((self.repo / ".git/fake-syncer-settings.json").read_text())
                self.assertEqual(Path(settings["quartzRepoPath"]), (self.repo / "Web").resolve())

    def test_wrong_vault_is_checked_before_configuration_writes(self):
        result = self.run_sync("vault", configure_only=True)
        self.assertNotEqual(result.returncode, 0)
        calls = (self.repo / "calls").read_text()
        self.assertNotIn("quartz-syncer:config", calls)
        self.assertNotIn("quartz-syncer:repo", calls)

    def test_configure_only_skips_source_and_generated_output_guards(self):
        (self.repo / "Vault/new.md").write_text("untracked")
        (self.repo / "Web/content/note.md").write_text("local output")
        result = self.run_sync("remove", configure_only=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = (self.repo / "calls").read_text()
        self.assertIn("action=set", calls)
        self.assertNotIn("quartz-syncer:publish", calls)
        self.assertNotIn("quartz-syncer:delete", calls)
        self.assertEqual(self.git("show", ":Web/content/note.md"), "before\n")

    def test_matching_local_configuration_is_not_written_again(self):
        result = self.run_sync(configure_only=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = (self.repo / "calls").read_text()
        self.assertNotIn("action=set", calls)
        self.assertNotIn("action=clear", calls)
        self.assertNotIn("plugin:reload", calls)

    def test_failed_cache_clear_leaves_old_settings_and_retry_reconfigures(self):
        failed = self.run_sync("cache-clear-failure")
        self.assertNotEqual(failed.returncode, 0)
        settings_path = self.repo / ".git/fake-syncer-settings.json"
        self.assertEqual(json.loads(settings_path.read_text())["obsidianCommentMode"], "remove")
        self.assertNotIn("action=set", (self.repo / "calls").read_text())
        retried = self.run_sync()
        self.assertEqual(retried.returncode, 0, retried.stderr)
        self.assertEqual(json.loads(settings_path.read_text())["obsidianCommentMode"], "preserve")

    def test_shared_defaults_exclude_machine_personal_and_cache_state(self):
        defaults = json.loads(SCRIPT.with_name("quartz-syncer.defaults.json").read_text())
        excluded = {"quartzRepoPath", "settingsSchemaVersion", "pluginVersion", "gitRemoteUrl", "gitBranch",
                    "gitAuthType", "gitAuthUsername", "lastUsedSettingsTab", "cache", "cacheTimestamp",
                    "useCache", "syncCache", "persistCache", "enableSystemCommands", "timestampFormat"}
        self.assertFalse(set(defaults) & excluded)
        self.assertEqual(defaults["obsidianCommentMode"], "preserve")
        self.assertEqual(defaults["autoPublishInterval"], 0)

    def test_active_timer_is_stopped_before_destination_and_policy_changes(self):
        result = self.run_sync("active-timer", configure_only=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = (self.repo / "calls").read_text()
        self.assertEqual(calls.count("plugin:reload id=quartz-syncer"), 2)
        self.assertLess(calls.index("plugin:reload"), calls.index("action=set-local"))
        self.assertLess(calls.index("plugin:reload"), calls.index("key=obsidianCommentMode"))
        self.assertFalse(json.loads((self.repo / ".git/fake-syncer-engine.json").read_text())["active"])

    def test_failed_or_noop_reload_blocks_and_retry_stops_existing_timer(self):
        for scenario in ["reload-failure", "reload-noop"]:
            with self.subTest(scenario=scenario):
                for name in ["fake-syncer-settings.json", "fake-syncer-engine.json"]:
                    (self.repo / ".git" / name).unlink(missing_ok=True)
                result = self.run_sync(scenario)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotIn("quartz-syncer:publish", (self.repo / "calls").read_text())
                self.assertTrue(json.loads((self.repo / ".git/fake-syncer-engine.json").read_text())["active"])
                self.assertEqual(json.loads((self.repo / ".git/fake-syncer-settings.json").read_text())["autoPublishInterval"], 0)
                retried = self.run_sync(configure_only=True)
                self.assertEqual(retried.returncode, 0, retried.stderr)
                self.assertFalse(json.loads((self.repo / ".git/fake-syncer-engine.json").read_text())["active"])

    def test_nonvault_change_skips_cli(self):
        self.git("restore", "--staged", "Vault/note.md")
        self.assertEqual(self.run_sync().returncode, 0)
        self.assertFalse((self.repo / "calls").exists())


if __name__ == "__main__": unittest.main()
