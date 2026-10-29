"""Persist created/modified source dates without filesystem timestamps.

The commit hook preserves created, recovering missing dates from Git history.
Modified advances only for body or ordinary-frontmatter changes; date fields
are excluded. Published remains owned by Syncer. Direct UI exports bypass this
commit-time preparation.

The export lock and full-source staging guards belong to sync-quartz.py. These
helpers additionally compare every affected worktree file with its Git index
before writing and stage only their own changes.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys


class NoteDateError(ValueError):
    """Source metadata cannot safely be updated."""


KEYS = {
    "created": ("created", "created_at", "date"),
    "modified": ("modified", "lastmod", "updated", "last-modified"),
}
DATE_KEYS = frozenset(key for aliases in KEYS.values() for key in aliases)
IGNORED_DATE_KEYS = DATE_KEYS | frozenset(("published", "publishDate"))
PROPERTY = re.compile(r"^(?P<key>[A-Za-z][A-Za-z0-9_-]*|\"[^\"]+\"|'[^']+'):\s*(?P<value>.*?)\s*$")


def _git(root, *args, check=True):
    result = subprocess.run(["git", "--literal-pathspecs", *args], cwd=root, capture_output=True)
    if check and result.returncode:
        raise NoteDateError(f"Git date operation failed: {args[0]}")
    return result


def _timestamp(value):
    if not isinstance(value, str):
        raise NoteDateError("Date properties must be ISO 8601 strings")
    raw = value.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        raw = raw[1:-1]
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as error:
        raise NoteDateError("Date properties must be ISO 8601 dates or timestamps") from error
    if len(raw) == 10:
        parsed = parsed.replace(tzinfo=timezone.utc)
    if parsed.tzinfo is None:
        raise NoteDateError("Date timestamps must include a timezone")
    return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _now(value=None):
    return _timestamp(value or datetime.now(timezone.utc).isoformat())


def _frontmatter(data, fields=KEYS):
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise NoteDateError("Note metadata must be UTF-8") from error
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return lines, 0, {}, {}
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        raise NoteDateError("Unclosed note frontmatter")
    dates, positions, ignored = {}, {}, []
    owned_keys = {key for field in fields for key in KEYS[field]}
    for index in range(1, end):
        match = PROPERTY.match(lines[index].rstrip("\r\n"))
        if not match:
            continue
        key = match["key"].strip("\"'")
        raw = match["value"]
        if key in IGNORED_DATE_KEYS:
            ignored.append(index)
        if key not in owned_keys:
            continue
        if key in dates:
            raise NoteDateError(f"Duplicate date property: {key}")
        # A trailing YAML comment is separate from a plain or quoted date value.
        value = re.sub(r"\s+#.*$", "", raw)
        dates[key] = _timestamp(value)
        positions[key] = index
    return lines, end, dates, {"positions": positions, "ignored": ignored}


def _dates(data, fields=KEYS):
    _, _, dates, _ = _frontmatter(data, fields)
    return {field: next((dates[key] for key in aliases if key in dates), None)
            for field, aliases in KEYS.items() if field in fields}


def _validated_dates(data, path, fields=KEYS):
    try:
        return _dates(data, fields)
    except NoteDateError as error:
        raise NoteDateError(f"{path}: {error}") from error


def _content(data):
    lines, end, _, info = _frontmatter(data)
    positions = set(info.get("ignored", []))
    if end and not any(lines[i].strip() for i in range(1, end) if i not in positions):
        lines = lines[end + 1:]
        positions = set()
    return "".join(line for i, line in enumerate(lines) if i not in positions).replace("\r\n", "\n").encode()


def _with_dates(data, dates):
    if not dates.keys() <= KEYS.keys():
        raise NoteDateError("Only created and modified are owned by this helper")
    lines, end, existing, info = _frontmatter(data, dates.keys())
    newline = "\r\n" if b"\r\n" in data else "\n"
    if not end:
        prefix = ["---" + newline]
        suffix = ["---" + newline, *lines]
    else:
        prefix, suffix = list(lines[:end]), lines[end:]
    for field, value in dates.items():
        if value is None:
            continue
        # Do not rewrite an already-valid representation of the same instant.
        if field in existing and existing[field] == value:
            continue
        line = f'{field}: "{value}"{newline}'
        position = info.get("positions", {}).get(field)
        if position is None:
            prefix.append(line)
        else:
            prefix[position] = line
    return "".join([*prefix, *suffix]).encode("utf-8")


def _eligible(path):
    return path.startswith("Vault/Home/") and path.endswith(".md")


def _index(root):
    entries = {}
    for row in _git(root, "ls-files", "--stage", "-z", "--", "Vault/Home").stdout.split(b"\0"):
        if not row:
            continue
        metadata, raw_path = row.split(b"\t", 1)
        path = raw_path.decode()
        if not _eligible(path):
            continue
        mode, oid, stage = metadata.decode().split()
        if stage != "0" or mode not in {"100644", "100755"}:
            raise NoteDateError(f"Unsupported or unmerged note: {path}")
        entries[path] = oid
    files = {}
    for path, oid in entries.items():
        indexed = _git(root, "cat-file", "blob", oid).stdout
        target = root / path
        if target.is_file() and not target.is_symlink() and target.resolve().is_relative_to(root.resolve()):
            actual = target.read_bytes()
            # Git may normalize CRLF in its index. Retain the working file's
            # newline bytes when its content is otherwise exactly staged.
            if actual.replace(b"\r\n", b"\n") == indexed.replace(b"\r\n", b"\n"):
                indexed = actual
        files[path] = indexed
    return files


def _renames(root):
    rows = _git(root, "diff", "--cached", "--name-status", "-z", "-M").stdout.split(b"\0")
    result, index = {}, 0
    while index < len(rows) and rows[index]:
        status = rows[index].decode()
        if status.startswith(("R", "C")):
            old, new = rows[index + 1].decode(), rows[index + 2].decode()
            if status.startswith("R"):
                result[new] = old
            index += 3
        else:
            index += 2
    return result


def _head_note(root, path):
    result = _git(root, "show", "HEAD:" + path, check=False)
    return result.stdout if result.returncode == 0 else None


def _history(root, path):
    if _git(root, "rev-parse", "--is-shallow-repository").stdout.strip() == b"true":
        raise NoteDateError("Full Git history is required to initialize historical note dates; fetch the missing history first")
    result = _git(root, "log", "--follow", "--format=%aI", "--", path)
    return [_timestamp(value) for value in result.stdout.decode().splitlines()]


def _cache(root):
    result = _git(root, "rev-parse", "--git-path", "note-dates-pending.json")
    path = Path(result.stdout.decode().strip())
    if not path.is_absolute():
        path = root / path
    if not path.exists():
        return path, {}
    try:
        value = json.loads(path.read_text())
        if not isinstance(value, dict):
            raise ValueError()
        for entry in value.values():
            if (not isinstance(entry, dict) or not isinstance(entry.get("head"), str)
                    or not re.fullmatch(r"[0-9a-f]{64}", entry.get("fingerprint", ""))):
                raise ValueError()
            _timestamp(entry.get("modified"))
    except (ValueError, OSError) as error:
        raise NoteDateError("Invalid pending note-date cache") from error
    return path, value


def _guard(root, files):
    for path, expected in files.items():
        target = root / path
        if target.is_symlink() or not target.is_file() or not target.resolve().is_relative_to(root.resolve()):
            raise NoteDateError(f"Unsafe note path: {path}")
        if target.read_bytes() != expected:
            raise NoteDateError(f"Note has unstaged or concurrent edits: {path}")


def _apply(root, before, changes, *, stage=True):
    _guard(root, before)
    changed = [path for path, data in changes.items() if data != before[path]]
    for path in changed:
        if (root / path).read_bytes() != before[path]:
            raise NoteDateError(f"Concurrent note edit: {path}")
        (root / path).write_bytes(changes[path])
    expected = {**before, **changes}
    _guard(root, expected)
    if changed and stage:
        _git(root, "add", "--", *changed)
    # The editor can still write between the preceding check and Git's read.
    # Verify both files and index against planned bytes, not a fresh snapshot.
    _guard(root, expected)
    indexed = _index(root)
    index_expected = expected if stage else before
    for path, data in index_expected.items():
        indexed_data = indexed.get(path)
        if indexed_data is None or indexed_data.replace(b"\r\n", b"\n") != data.replace(b"\r\n", b"\n"):
            raise NoteDateError(f"Concurrent staged note edit: {path}")
    _guard(root, expected)
    return changed


def prepare(root: Path, now=None, expected=None):
    """Maintain commit-owned source dates and return exact planned SHA256 updates."""
    root = Path(root)
    instant = _now(now)
    files, renames = _index(root), _renames(root)
    if expected is not None:
        for path, data in files.items():
            if expected.get(path) != hashlib.sha256(data).digest():
                raise NoteDateError(f"Source changed before date preparation: {path}")
    _guard(root, files)
    revision = _git(root, "rev-parse", "--verify", "HEAD", check=False).stdout.decode().strip()
    cache_path, cache = _cache(root)
    cache = {key: value for key, value in cache.items() if key in files}
    changes = {}
    for path, data in files.items():
        source = renames.get(path, path)
        previous = _head_note(root, source)
        current_dates = _validated_dates(data, path)
        old_dates = _validated_dates(previous, source) if previous is not None else dict.fromkeys(KEYS)
        dates = dict(current_dates)
        history = None
        def history_dates():
            nonlocal history
            if history is None:
                history = _history(root, source)
            return history
        dates["created"] = dates["created"] or old_dates["created"] or (history_dates()[-1] if previous is not None and history_dates() else instant)
        content_changed = previous is None or _content(data) != _content(previous)
        fingerprint = hashlib.sha256(_content(data)).hexdigest()
        saved = cache.get(path, {})
        if not isinstance(saved, dict) or saved.get("head") != revision:
            saved = {}
        if content_changed:
            dates["modified"] = saved["modified"] if saved.get("fingerprint") == fingerprint else instant
            cache[path] = {"head": revision, "fingerprint": fingerprint, "modified": dates["modified"]}
        else:
            dates["modified"] = old_dates["modified"] or dates["modified"] or (history_dates()[0] if history_dates() else instant)
            cache.pop(path, None)
        changes[path] = _with_dates(data, dates)
    changed = _apply(root, files, changes)
    temporary = cache_path.with_suffix(".tmp")
    temporary.write_text(json.dumps(cache, sort_keys=True) + "\n")
    temporary.replace(cache_path)
    return {path: hashlib.sha256(changes[path]).digest() for path in changed}



def backfill_created(root: Path, *, write=False):
    """Plan or write missing canonical creation dates; never stage CLI updates."""
    root = Path(root)
    files = _index(root)
    changes, before = {}, {}
    for path, indexed in files.items():
        target = root / path
        if target.is_symlink() or not target.is_file() or not target.resolve().is_relative_to(root.resolve()):
            raise NoteDateError(f"Unsafe note path: {path}")
        data = target.read_bytes()
        current = _validated_dates(data, path, ("created",))["created"]
        _, _, explicit, _ = _frontmatter(data, ("created",))
        if "created" in explicit:
            continue
        before[path] = indexed
        _guard(root, {path: indexed})
        previous = _head_note(root, path)
        if previous is None or previous.replace(b"\r\n", b"\n") != data.replace(b"\r\n", b"\n"):
            raise NoteDateError(f"Creation-date backfill requires a clean committed source: {path}")
        history = _history(root, path) if current is None else []
        created = current or (history[-1] if history else None)
        if created is None:
            raise NoteDateError(f"No Git creation history is available: {path}")
        changes[path] = _with_dates(data, {"created": created})
    changed = [path for path, data in changes.items() if data != before[path]]
    if write:
        _apply(root, before, changes, stage=False)
    else:
        _guard(root, before)
    return {path: hashlib.sha256(changes[path]).digest() for path in changed}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backfill-created", action="store_true", required=True,
                        help="Initialize missing created properties from Git (dry-run by default)")
    parser.add_argument("--write", action="store_true", help="Apply the backfill without staging files")
    args = parser.parse_args()
    root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
    changed = backfill_created(root, write=args.write)
    print(json.dumps({"mode": "write" if args.write else "dry-run", "changed": list(changed)},
                     ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (NoteDateError, OSError, subprocess.CalledProcessError) as error:
        print(f"[note-dates] {error}", file=sys.stderr)
        sys.exit(1)
