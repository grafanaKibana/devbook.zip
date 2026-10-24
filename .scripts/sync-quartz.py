#!/usr/bin/env python3
"""Await a local Obsidian export and stage its outputs, or block the commit."""
import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import runpy
import shutil
import subprocess
import sys
import time


class SyncError(Exception):
    """A failed export must stop the commit."""


OUTPUTS = ["Web/content", "Web/quartz/styles/syncer", "Web/quartz/styles/custom.scss"]


def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=root)


def paths(root, *args):
    return [os.fsdecode(p) for p in git(root, *args).split(b"\0") if p]


def log(root, message):
    path = Path(os.fsdecode(git(root, "rev-parse", "--git-path", "quartz-syncer-publish.log")).strip())
    if not path.is_absolute():
        path = root / path
    with path.open("a") as output:
        output.write(f"{datetime.now(timezone.utc).isoformat()} {message}\n")


def is_source(path):
    return path.startswith("Vault/") and not path.startswith("Vault/.obsidian/")


def staged_source(root):
    return [p for p in paths(root, "diff", "--cached", "--name-only", "-z", "--no-renames") if is_source(p)]


def guard_source(root):
    dirty = paths(root, "diff", "--name-only", "-z", "--no-renames")
    dirty += paths(root, "ls-files", "--others", "--exclude-standard", "-z")
    if any(is_source(p) for p in dirty):
        raise SyncError("Vault contains unstaged, partially staged or untracked source. Stage all intended Vault changes before committing.")


def guard_output(root):
    dirty = paths(root, "diff", "--name-only", "-z", "--", *OUTPUTS)
    dirty += paths(root, "diff", "--cached", "--name-only", "-z", "--", *OUTPUTS)
    dirty += paths(root, "ls-files", "--others", "--exclude-standard", "-z", "--", *OUTPUTS)
    if dirty:
        raise SyncError("Generated Quartz output already has changes. Commit or restore those separately before exporting.")


def snapshot(root):
    result = {}
    for path in sorted((root / "Vault").rglob("*")):
        relative = path.relative_to(root).as_posix()
        if is_source(relative) and path.is_file():
            result[relative] = hashlib.sha256(path.read_bytes()).digest()
    return result


def executable():
    override = os.environ.get("OBSIDIAN_BIN")
    if override:
        return override
    found = shutil.which("obsidian")
    if found:
        return found
    for name in ["obsidian", "Obsidian"]:
        path = Path("/Applications/Obsidian.app/Contents/MacOS") / name
        if path.is_file():
            return str(path)
    raise SyncError("Obsidian CLI not found. Open DevBook in Obsidian with CLI enabled, or set OBSIDIAN_BIN.")


def cli(root, binary, *args, structured=True, timeout=None, json_output=True):
    # Native Obsidian CLI can exit before asynchronous handlers finish when its
    # inherited stdin is already at EOF (as in Git hooks). Keep a private pipe
    # open until the response completes; never read the user's terminal input.
    read_fd, write_fd = os.pipe()
    try:
        try:
            result = subprocess.run([binary, "vault=Vault", *args], cwd=root,
                                    stdin=read_fd, capture_output=True, text=True,
                                    timeout=timeout if timeout is not None else float(os.environ.get("QUARTZ_SYNC_TIMEOUT", "600")))
        except subprocess.TimeoutExpired as error:
            raise SyncError("Export command timed out; Obsidian may still be working. Wait for it to finish and inspect output before retrying.") from error
    finally:
        os.close(read_fd)
        os.close(write_fd)
    if result.returncode:
        raise SyncError("Obsidian command failed. Ensure the correct vault is open and CLI is enabled.")
    if not json_output:
        return result.stdout
    try:
        response = result.stdout.strip()
        if not structured and response.startswith("=> "):
            response = response[3:]
        value = json.loads(response)
    except (ValueError, TypeError) as error:
        raise SyncError("Obsidian returned malformed JSON; export completion cannot be verified.") from error
    if structured:
        if not isinstance(value, dict) or value.get("success") is not True:
            raise SyncError("Quartz Syncer reported failure; the commit is blocked.")
        value = value.get("data")
    if not isinstance(value, dict):
        raise SyncError("Unexpected Obsidian response; export completion cannot be verified.")
    return value


INDEX_STATE = """JSON.stringify((()=>{
 const plugin=app.plugins.plugins['quartz-syncer'];
 const key=plugin.settings.publishFrontmatterKey;
 const files=app.vault.getMarkdownFiles().filter(f=>f.path.startsWith('Home/'));
 const native=files.filter(f=>!!app.metadataCache.getFileCache(f)?.frontmatter?.[key]).map(f=>f.path);
 const extended=plugin.cacheHandle?.api;
 const visible=f=>!f.path.split('/').some(part=>part.startsWith('.'));
 const all=app.vault.getFiles().filter(visible);
 const observedStats=Object.fromEntries(all.map(f=>[f.path,{mtime:f.stat.mtime,size:f.stat.size}]));
 const metadataStats=Object.fromEntries(app.vault.getMarkdownFiles().filter(visible).map(f=>{
  const entry=app.metadataCache.fileCache[f.path];
  return [f.path,entry?{mtime:entry.mtime,size:entry.size}:null];
 }));
 return {inventory:all.map(f=>f.path),observedStats,metadataStats,
  nativePublishPaths:native,extendedReady:extended?.isReady===true,
  extendedPublishPaths:extended?.isReady?Array.from(extended.getFilesWithFrontmatterValue(key,true)).filter(p=>p.startsWith('Home/')):[]};
})())"""


def wait_for_indexes(root, binary, source):
    """Require exact source/index path parity before any publication/deletion."""
    deadline = time.monotonic() + float(os.environ.get("QUARTZ_SYNC_TIMEOUT", "600"))
    expected = {path.removeprefix("Vault/") for path in source
                if not any(part.startswith(".") for part in Path(path).parts)}
    markdown = {path for path in expected if Path(path).suffix.lower() == ".md"}
    split_frontmatter = runpy.run_path(str(Path(__file__).with_name("validate-vault.py")))["split_frontmatter"]
    publish_paths = set()
    for name in markdown:
        if not name.startswith("Home/"):
            continue
        frontmatter, _, _ = split_frontmatter((root / "Vault" / name).read_text())
        publish = frontmatter.get("publish")
        if publish is not None and publish.value:
            publish_paths.add(name)

    def matching_stats(observed, names):
        if not isinstance(observed, dict) or set(observed) != names:
            return False
        for name in names:
            entry = observed[name]
            stat = (root / "Vault" / name).stat()
            if (not isinstance(entry, dict)
                    or not isinstance(entry.get("mtime"), (int, float))
                    or entry.get("size") != stat.st_size
                    or abs(entry["mtime"] - stat.st_mtime_ns / 1_000_000) >= 1):
                return False
        return True
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise SyncError("Obsidian metadata indexes do not match the source files. Wait for indexing or reload Obsidian before committing.")
        state = cli(root, binary, "eval", "code=" + INDEX_STATE, structured=False, timeout=remaining)
        names = ("inventory", "nativePublishPaths", "extendedPublishPaths")
        if any(not isinstance(state.get(name), list) or any(not isinstance(path, str) for path in state[name]) for name in names):
            raise SyncError("Unexpected metadata index response; commit blocked.")
        if (state.get("extendedReady") is True
                and set(state["inventory"]) == expected
                and matching_stats(state.get("observedStats"), expected)
                and matching_stats(state.get("metadataStats"), markdown)
                and all(state["metadataStats"][path] == state["observedStats"][path] for path in markdown)
                and publish_paths == set(state["nativePublishPaths"]) == set(state["extendedPublishPaths"])):
            return
        time.sleep(min(0.25, max(0, deadline - time.monotonic())))


def loaded_vault(root, binary):
    identity = cli(root, binary, "eval", "code=JSON.stringify({vaultPath:app.vault.adapter.getBasePath(),datacoreReady:!!window.datacore&&app.plugins.plugins.datacore?.core?.initialized===true,preserveSupported:JSON.stringify(app.setting.pluginTabs.find(t=>t.id==='quartz-syncer')?.getSettingDefinitions?.()??[]).includes('obsidianCommentMode'),syncerLoaded:!!app.plugins.plugins['quartz-syncer'],autoPublishActive:app.plugins.plugins['quartz-syncer']?.getEngineStatus?.()?.autoPublish})", structured=False)
    if Path(identity.get("vaultPath", "")).resolve() != (root / "Vault").resolve():
        raise SyncError("Connected Obsidian vault does not match this checkout's Vault directory.")
    if identity.get("syncerLoaded") is not True or identity.get("preserveSupported") is not True:
        raise SyncError("The running Quartz Syncer does not support Preserve. Reload the installed PR build before committing.")
    if type(identity.get("autoPublishActive")) is not bool:
        raise SyncError("Quartz Syncer's background publishing state cannot be verified.")
    return identity


def reload_syncer(root, binary):
    cli(root, binary, "plugin:reload", "id=quartz-syncer", json_output=False)
    identity = loaded_vault(root, binary)
    if identity["autoPublishActive"]:
        raise SyncError("Quartz Syncer's background publisher is still active after reload; commit blocked.")
    return identity


def configure(root):
    """Apply shared export policy through Syncer's public CLI; retain local data."""
    binary = executable()
    identity = loaded_vault(root, binary)
    defaults = json.loads(Path(__file__).with_name("quartz-syncer.defaults.json").read_text())
    settings = cli(root, binary, "quartz-syncer:config", "action=list", "format=json")
    if identity["autoPublishActive"]:
        # Stop the existing timer before changing any destination or compilation
        # policy. Saving the interval alone does not stop the running engine.
        if settings.get("autoPublishInterval") != 0:
            cli(root, binary, "quartz-syncer:config", "action=set", "key=autoPublishInterval", "value=0", "format=json")
        identity = reload_syncer(root, binary)
        settings = cli(root, binary, "quartz-syncer:config", "action=list", "format=json")
    changed = [key for key, value in defaults.items()
               if key not in settings or type(settings[key]) is not type(value) or settings[key] != value]
    configured_path = settings.get("quartzRepoPath")
    target = str((root / "Web").resolve())
    destination_changed = (settings.get("publishTarget") != "local"
                           or not isinstance(configured_path, str)
                           or not Path(configured_path).is_absolute()
                           or Path(configured_path).resolve() != Path(target))
    if changed or destination_changed:
        # Clear before saving settings so a failed clear cannot leave a retry
        # seeing updated settings but reusing compiled notes from the old policy.
        cleared = cli(root, binary, "quartz-syncer:cache", "action=clear", "format=json")
        if cleared.get("cleared") is not True:
            raise SyncError("Compiled-note cache was not cleared; local configuration blocked.")
        for key in changed:
            cli(root, binary, "quartz-syncer:config", "action=set", "key=" + key,
                "value=" + (defaults[key] if isinstance(defaults[key], str) else json.dumps(defaults[key], separators=(",", ":"))), "format=json")
        if destination_changed:
            cli(root, binary, "quartz-syncer:repo", "action=set-local", "path=" + target, "format=json")
        identity = reload_syncer(root, binary)
    settings = cli(root, binary, "quartz-syncer:config", "action=list", "format=json")
    configured_path = settings.get("quartzRepoPath")
    if (settings.get("publishTarget") != "local"
            or not isinstance(configured_path, str) or not Path(configured_path).is_absolute()
            or Path(configured_path).resolve() != Path(target)
            or any(key not in settings or type(settings[key]) is not type(value) or settings[key] != value
                   for key, value in defaults.items())):
        raise SyncError("Quartz Syncer's local configuration does not match this checkout; commit blocked.")
    return binary, settings, identity


def export(root):
    binary, settings, identity = configure(root)
    if settings.get("useDatacore") and identity.get("datacoreReady") is not True:
        raise SyncError("Datacore is not initialized. Wait for indexing to finish before committing.")
    log(root, "Verified local export destination and settings; starting publication.")
    before = snapshot(root)
    wait_for_indexes(root, binary, before)
    cli(root, binary, "quartz-syncer:cache", "action=tree-refresh", "format=json")
    published = cli(root, binary, "quartz-syncer:publish", "format=json")
    if published.get("failures", []) != [] or published.get("skipped", 0) != 0:
        raise SyncError("Syncer skipped or failed to compile notes; commit blocked.")
    log(root, "Publication completed without skipped or failed notes.")
    if snapshot(root) != before:
        raise SyncError("Vault source changed during export; refusing deletion. Stage the changes and retry.")
    wait_for_indexes(root, binary, before)
    cli(root, binary, "quartz-syncer:delete", "force", "format=json")
    media = cli(root, binary, "quartz-syncer:media", "action=list", "format=json")
    files = media.get("files")
    if not isinstance(files, list) or any(not isinstance(item, dict) or not isinstance(item.get("linked"), bool) for item in files):
        raise SyncError("Unexpected media inventory; refusing cleanup.")
    orphaned = [item for item in files if item["linked"] is False]
    if len(files) > 5 and len(orphaned) > len(files) * 0.8:
        raise SyncError("More than 80% of exported media appears orphaned; inspect the export before cleanup.")
    if orphaned:
        cleaned = cli(root, binary, "quartz-syncer:media", "action=clean", "force", "format=json")
        if cleaned.get("cleaned") != len(orphaned):
            raise SyncError("Media cleanup did not finish; commit blocked.")
    cli(root, binary, "quartz-syncer:cache", "action=tree-refresh", "format=json")
    status = cli(root, binary, "quartz-syncer:status", "format=json")
    if status.get("unpublished") != 0 or status.get("deleted") != 0:
        raise SyncError("Export still has unpublished or deleted notes; commit blocked.")
    for path in (root / "Web/content").rglob("*.md"):
        # Preserved comments are opaque; query examples inside them are not executable.
        visible = re.sub(r"%%[\s\S]*?%%", "", path.read_text())
        if re.search(r"(?m)^\s*(`{3,}|~{3,})(?:datacore(?:js|jsx|ts|tsx)|dataview(?:js)?)\b", visible):
            raise SyncError("Unrendered query block in generated content; commit blocked.")
    if snapshot(root) != before:
        raise SyncError("Vault source changed during export. Review and stage the changes, then retry.")
    guard_source(root)
    existing = [p for p in OUTPUTS if (root / p).exists() or git(root, "ls-files", "--", p)]
    if existing:
        git(root, "add", "-A", "--", *existing)
    log(root, "Export verified; generated output staged.")
    print("[pre-commit] Quartz export completed; generated output staged.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--hook", help="Run this hook's maintenance inside the export lock")
    parser.add_argument("--configure-only", action="store_true", help="Configure the open vault for this checkout without exporting or staging")
    args = parser.parse_args()
    root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()).resolve()
    if not args.configure_only and not staged_source(root):
        return 0
    lock_path = Path(os.fsdecode(git(root, "rev-parse", "--git-path", "quartz-sync.lock")).strip())
    if not lock_path.is_absolute():
        lock_path = root / lock_path
    with lock_path.open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise SyncError("Another Quartz pre-commit sync is running; retry when it finishes.") from error
        if args.configure_only:
            configure(root)
            log(root, "Local Quartz Syncer configuration verified.")
            print("Quartz Syncer configured for this checkout; no export or staging performed.")
            return 0
        guard_source(root)
        guard_output(root)
        if args.hook:
            result = subprocess.run(["bash", args.hook], cwd=root,
                                    env={**os.environ, "DEVBOOK_QUARTZ_MAINTENANCE": "1"})
            if result.returncode:
                raise SyncError("Vault maintenance or validation failed; commit blocked.")
            guard_source(root)
        export(root)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (SyncError, OSError, subprocess.CalledProcessError, ValueError) as error:
        try:
            repository = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
            log(repository, f"Blocked: {error}")
        except (OSError, subprocess.CalledProcessError):
            pass
        print(f"[pre-commit] {error}", file=sys.stderr)
        sys.exit(1)
