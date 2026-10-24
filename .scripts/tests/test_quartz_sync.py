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
full_publish = "eval" in sys.argv and "publishBatch" in args
with (root / "calls").open("a") as f: f.write(args + "\n")
if scenario == "stdin-eof":
    if select.select([sys.stdin], [], [], 0.05)[0] and os.read(0, 1) == b"": sys.exit(0)
if scenario == "timeout": time.sleep(2)
if scenario == "malformed": print("not json"); sys.exit(0)
if scenario == "false": print(json.dumps({"success":False})); sys.exit(0)
if scenario == "nonzero-error" and "quartz-syncer:publish" in args:
    print(json.dumps({"success":False,"error":"EACCES: permission denied password=DO_NOT_LOG_PASSWORD","data":{"config":"DO_NOT_LOG_CONFIG"}}))
    print("write failed Authorization: Bearer DO_NOT_LOG_BEARER",file=sys.stderr); sys.exit(13)
if "eval" in sys.argv and "cleanOrphanedMedia" in args:
    if scenario == "cleanup-failure": result = {"success":False,"error":"EACCES: cannot remove Assets/orphan.svg"}
    elif scenario == "cleanup-malformed": result = {}
    elif scenario in ["cleanup", "dynamic-media"]: result = {"success":True,"data":{"outcome":"cleaned","filesDeleted":1}}
    else: result = {"success":True,"data":{"outcome":"unchanged-or-withheld"}}
    print("=> " + json.dumps(result)); sys.exit(0)
if "eval" in sys.argv and "nativePublishPaths" in args:
    inventory = [str(p.relative_to(root / "Vault")) for p in (root / "Vault").rglob("*") if p.is_file() and not any(part.startswith(".") for part in p.relative_to(root / "Vault").parts)]
    native = [] if scenario == "native-incomplete" else ["Home/example.md"]
    extended = [] if scenario == "extended-incomplete" else ["Home/example.md"]
    if scenario == "same-count-wrong-path": native = ["Home/other.md"]
    if scenario == "extended-stale-markdown": extended.append("Home/stale.md")
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
if "eval" in sys.argv and not full_publish:
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
elif "quartz-syncer:publish" in args or full_publish:
    if scenario == "edit": (root / "Vault/note.md").write_text("concurrent")
    time.sleep(0.05)
    content = "exported"
    if scenario == "query": content = "```datacoretsx\nreturn [];\n```"
    if scenario == "comment-query": content = "%%\n```datacoretsx\nreturn [];\n```\n%%"
    (root / "Web/content/note.md").write_text(content)
    if full_publish:
        for source in (root / "Vault/Assets").rglob("*"):
            if source.is_file():
                target = root / "Web/content/Assets" / source.relative_to(root / "Vault/Assets")
                target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(source.read_bytes())
    data = {"failures":[{"vaultPath":"Home/broken note.md","error":"EACCES: permission denied token=DO_NOT_LOG_TOKEN"}] if scenario == "partial" else [], "skipped":0}
    if scenario == "structured-error":
        print(json.dumps({"success":False,"error":"EACCES: cannot write output","data":{"failures":[{"vaultPath":"Home/broken note.md","error":"permission denied token=DO_NOT_LOG_TOKEN"}],"config":"DO_NOT_LOG_CONFIG"}})); sys.exit(0)
elif "quartz-syncer:delete" in args: data = {"filesDeleted":0}
elif "quartz-syncer:cache" in args:
    if "action=clear" in sys.argv and scenario == "cache-clear-failure": print(json.dumps({"success":False})); sys.exit(0)
    if scenario == "refresh-failure" or (scenario == "final-refresh-failure" and (root / "calls").read_text().count("action=tree-refresh") == 2): print(json.dumps({"success":False})); sys.exit(0)
    data = {"refreshed":True,"cleared":True}
elif "quartz-syncer:media" in args:
    if "action=clean" in args:
        if scenario == "cleanup-failure": print(json.dumps({"success":False})); sys.exit(0)
        if scenario == "dynamic-media": (root / "Web/content/Assets/query-only.svg").unlink()
        data = {"cleaned":1}
    else:
        data = {"files":[{"linked":False}] * (6 if scenario == "mass-cleanup" else 1) if scenario in ["cleanup-failure", "mass-cleanup", "cleanup", "dynamic-media"] else []}
else: data = {"unpublished":0,"deleted":0,"changed":12}
print(("=> " if full_publish else "") + json.dumps({"success":True,"data":data}))
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
        for scenario in ["false", "malformed", "partial", "vault", "edit", "cleanup-failure", "cleanup-malformed", "datacore", "unsupported", "query", "refresh-failure", "final-refresh-failure", "config-failure", "repo-failure", "config-noop", "repo-noop", "cache-clear-failure"]:
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
        self.assertIn("cleanOrphanedMedia", (self.repo / "calls").read_text())
        self.assertNotIn("quartz-syncer:media", (self.repo / "calls").read_text())

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
        for scenario in ["native-incomplete", "extended-incomplete", "missing-new-file", "same-count-wrong-path", "extended-stale-markdown", "index-unready", "stale-stat", "stale-size", "stale-metadata"]:
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
                    "syncCache", "persistCache", "enableSystemCommands", "timestampFormat"}
        self.assertFalse(set(defaults) & excluded)
        self.assertTrue(defaults["useCache"])
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

    def test_asset_only_and_markdown_asset_updates_publish_unchanged_notes(self):
        self.git("restore", "--staged", "Vault/note.md")
        self.git("restore", "Vault/note.md")
        for name in ["picture.svg", "asset.md", "drawing.excalidraw.md"]:
            with self.subTest(name=name):
                source = self.repo / "Vault/Assets" / name
                target = self.repo / "Web/content/Assets" / name
                source.parent.mkdir(parents=True,exist_ok=True)
                target.parent.mkdir(parents=True,exist_ok=True)
                source.write_bytes(b"old asset")
                target.write_bytes(b"old asset")
                self.git("add", "Vault", "Web/content")
                self.git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "asset baseline")
                source.write_bytes(b"updated asset")
                self.git("add", str(source))
                result = self.run_sync("asset-update")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(self.git("show", ":Web/content/Assets/" + name), "updated asset")
                self.assertIn("publishBatch", (self.repo / "calls").read_text())
                self.git("reset", "--hard", "HEAD")

    def test_query_rendered_media_survives_native_cleanup(self):
        image = self.repo / "Web/content/Assets/query-only.svg"
        image.parent.mkdir(parents=True)
        image.write_text("query-generated link target")
        self.git("add", "Vault", "Web/content")
        self.git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "query asset baseline")
        (self.repo / "Vault/note.md").write_text("query refresh")
        self.git("add", "Vault/note.md")
        result = self.run_sync("dynamic-media")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(image.exists())
        self.assertNotIn("quartz-syncer:media", (self.repo / "calls").read_text())

    def test_native_cleanup_guard_is_an_honest_conservative_noop(self):
        result = self.run_sync("mass-cleanup")
        self.assertEqual(result.returncode, 0, result.stderr)
        log = (self.repo / ".git/quartz-syncer-publish.log").read_text()
        self.assertIn("no changes or cleanup withheld by native safeguard", log)
        self.assertNotIn("cleaned 0", log)

    def test_failures_report_the_command_and_note_without_credentials(self):
        for scenario in ["structured-error", "partial", "nonzero-error", "malformed"]:
            with self.subTest(scenario=scenario):
                result = self.run_sync(scenario)
                self.assertNotEqual(result.returncode, 0)
                if scenario != "malformed":
                    self.assertIn("quartz-syncer:publish", result.stderr)
                    self.assertIn("EACCES", result.stderr)
                if scenario in ["structured-error", "partial"]:
                    self.assertIn("Home/broken note.md", result.stderr)
                if scenario == "nonzero-error":
                    self.assertIn("13", result.stderr)
                self.assertNotIn("DO_NOT_LOG", result.stderr)
                self.assertNotIn("code=", result.stderr)
                self.git("restore", "Web/content/note.md")

    def test_nonvault_change_skips_cli(self):
        self.git("restore", "--staged", "Vault/note.md")
        self.assertEqual(self.run_sync().returncode, 0)
        self.assertFalse((self.repo / "calls").exists())


class PublisherBridgeTests(unittest.TestCase):
    def run_bridge(self, name, assertions):
        spec = importlib.util.spec_from_file_location("quartz_sync_bridge", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        setup = r"""
const assert = require('node:assert/strict');
const vm = require('node:vm');
const events = [];
const publisher = {
 beginDynamicSession(){events.push('begin');},
 endDynamicSession(){events.push('end');},
 async getPublishStatus(){events.push('status');return {unpublished:[{path:'new'}],changed:[{path:'changed'}],published:[{path:'unchanged'}]};}
};
const app = {plugins:{plugins:{'quartz-syncer':{getPublisher(){return publisher;}}}}};
const run = async () => JSON.parse(await vm.runInNewContext(process.argv[1], {app}));
(async()=>{
"""
        result = subprocess.run(["node", "-e", setup + assertions + "\n})().catch(error=>{console.error(error);process.exitCode=1;});",
                                 getattr(module, name)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_index_readiness_compares_markdown_paths_without_dropping_canvas_inventory(self):
        self.run_bridge("INDEX_STATE", r"""
const note = {path:'Home/example.md',stat:{mtime:1,size:2}};
const canvas = {path:'Home/Roadmap.canvas',stat:{mtime:1,size:3}};
app.vault = {getMarkdownFiles(){return [note];},getFiles(){return [note,canvas];}};
app.metadataCache = {getFileCache(){return {frontmatter:{publish:true}};},fileCache:{'Home/example.md':{mtime:1,size:2}}};
const plugin = app.plugins.plugins['quartz-syncer'];
plugin.settings = {publishFrontmatterKey:'publish'};
plugin.cacheHandle = {api:{isReady:true,getFilesWithFrontmatterValue(){return new Set([note.path,canvas.path,'Home/stale.md']);}}};
const result = await run();
assert.deepEqual(result.nativePublishPaths,['Home/example.md']);
assert.deepEqual(result.extendedPublishPaths,['Home/example.md','Home/stale.md']);
assert.deepEqual(result.inventory,['Home/example.md','Home/Roadmap.canvas']);
assert.deepEqual(result.observedStats['Home/Roadmap.canvas'],{mtime:1,size:3});
""")

    def test_full_publication_awaits_all_status_groups_and_closes_dynamic_session(self):
        self.run_bridge("FULL_PUBLISH", r"""
publisher.publishBatch = async files => {
 assert.deepEqual(Array.from(files, file=>file.path), ['new','changed','unchanged']);
 await new Promise(resolve=>setTimeout(resolve,5));
 events.push('published');
 return {success:true,filesPublished:3,filesDeleted:0};
};
const result = await run();
assert.equal(result.success,true);
assert.equal(result.data.filesPublished,3);
assert.deepEqual(events,['begin','status','published','end']);
""")

    def test_full_publication_failures_and_throws_preserve_details_and_close_session(self):
        self.run_bridge("FULL_PUBLISH", r"""
publisher.publishBatch = async ()=>{throw new Error('EACCES: cannot write');};
let result = await run();
assert.equal(result.success,false);
assert.match(result.error,/EACCES/);
publisher.publishBatch = async ()=>({success:false,error:'compile failed',failures:[{vaultPath:'Home/broken.md',error:'denied'}]});
result = await run();
assert.equal(result.success,false);
assert.equal(result.data.failures[0].vaultPath,'Home/broken.md');
publisher.publishBatch = async ()=>null;
assert.equal((await run()).success,false);
publisher.publishBatch = async ()=>({success:true});
assert.equal((await run()).success,false);
assert.equal(events.filter(event=>event==='end').length,4);
""")

    def test_compiled_cleanup_awaits_native_method_and_distinguishes_guarded_noop(self):
        self.run_bridge("COMPILED_MEDIA_CLEANUP", r"""
publisher.cleanOrphanedMedia = async ()=>{await new Promise(resolve=>setTimeout(resolve,5));events.push('cleanup');return null;};
let result = await run();
assert.equal(result.success,true);
assert.equal(result.data.outcome,'unchanged-or-withheld');
assert.equal('filesDeleted' in result.data,false);
assert.deepEqual(events,['begin','cleanup','end']);
publisher.cleanOrphanedMedia = async ()=>({success:true,filesDeleted:1});
result = await run();
assert.equal(result.data.outcome,'cleaned');
assert.equal(result.data.filesDeleted,1);
publisher.cleanOrphanedMedia = async ()=>{throw new Error('EACCES: cannot delete');};
result = await run();
assert.equal(result.success,false);
assert.match(result.error,/EACCES/);
publisher.cleanOrphanedMedia = async ()=>'malformed';
assert.equal((await run()).success,false);
publisher.cleanOrphanedMedia = async ()=>({success:false,error:'unsafe cache'});
assert.equal((await run()).success,false);
assert.equal(events.filter(event=>event==='end').length,5);
""")


if __name__ == "__main__": unittest.main()
