#!/usr/bin/env python3
"""Sync derived frontmatter onto FolderNote pages.

Derives folder note fields from descendant non-folder pages:
- status: worst-first (Creation -> Repetition -> Ready To Repeat -> Not-Started -> Done)
- priority: highest-first (High -> Medium -> Low)
- level: max numeric level

Skips any note tagged MetricsIgnore.

Usage:
    python3 .scripts/sync-folder-rollup-frontmatter.py                 (dry-run)
    python3 .scripts/sync-folder-rollup-frontmatter.py --write         (apply)
    python3 .scripts/sync-folder-rollup-frontmatter.py --write --force (overwrite existing values)
    python3 .scripts/sync-folder-rollup-frontmatter.py --print-changed (paths only)

Called automatically by the git pre-commit hook.

Improvements over the original hand-rolled version:
- Parses inline/flow YAML (`tags: [FolderNote]`, `status: [Done]`), not just block lists.
- Strips CR from CRLF-saved files so values like "Done\r" no longer fail validation.
- Updates keys IN PLACE (preserving their position) instead of moving them to the
  bottom of the frontmatter -- eliminates spurious diff churn at commit time.
- Rewrites a file ONLY when a value actually changes; untouched notes are never
  reformatted.
- Parses each note's frontmatter once and reads each file once (was O(folders x
  leaves) re-parses plus a double read per folder note).
- Human-readable output shows exactly which field changed (status: Creation -> Done).
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAULT_SE_ROOT = os.path.join(REPO_ROOT, "Vault", "Home")

# Worst-first: the folder note inherits the least-complete status among its
# descendants. Membership and ordering are the same set -- guarded below.
DERIVED_STATUS_ORDER = [
    "Creation",
    "Repetition",
    "Ready To Repeat",
    "Not-Started",
    "Done",
]
VALID_STATUSES = set(DERIVED_STATUS_ORDER)

# Highest-first: index 0 wins.
VALID_PRIORITIES = ["High", "Medium", "Low"]


@dataclass(frozen=True)
class Note:
    abs_path: str
    rel_to_root: str
    folder_abs: str
    content: str
    fm_lines: list[str]
    body: str
    is_folder_note: bool
    is_metrics_ignored: bool
    # Parsed once at load time.
    status: str | None
    priority: str | None
    level: int | None


# --------------------------------------------------------------------------- #
# Argument parsing
# --------------------------------------------------------------------------- #
def parse_args(argv: list[str]):
    args = {
        "write": False,
        "force": False,
        "print_changed": False,
        "root": VAULT_SE_ROOT,
    }

    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--write":
            args["write"] = True
        elif a == "--force":
            args["force"] = True
        elif a == "--print-changed":
            args["print_changed"] = True
        elif a == "--root":
            if i + 1 >= len(argv):
                raise ValueError("--root requires a value")
            args["root"] = argv[i + 1]
            i += 1
        elif a in ("--help", "-h"):
            print(__doc__)
            sys.exit(0)
        else:
            raise ValueError(f"Unknown arg: {a}")
        i += 1

    args["root"] = os.path.abspath(args["root"])
    return args


# --------------------------------------------------------------------------- #
# Frontmatter parsing (dependency-free, but inline- and CRLF-aware)
# --------------------------------------------------------------------------- #
def split_frontmatter(content: str):
    """Return (fm_lines, body) or (None, content) when there is no frontmatter.

    fm_lines have trailing newlines stripped but retain any other content
    (including a trailing CR on CRLF files, which value readers normalize away).
    """
    if not content.startswith("---"):
        return None, content

    lines = content.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return None, content

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break
    if end_idx is None:
        return None, content

    fm_lines = [ln.rstrip("\n") for ln in lines[1:end_idx]]
    body = "".join(lines[end_idx + 1 :])
    return fm_lines, body


def _unquote(v: str) -> str:
    v = v.strip().rstrip("\r")
    if len(v) >= 2 and (
        (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'"))
    ):
        v = v[1:-1]
    return v.strip()


def _clean_tag(v: str) -> str:
    v = _unquote(v)
    if v.startswith("#"):
        v = v[1:]
    return v.strip()


def _split_inline_list(s: str) -> list[str]:
    """Parse a YAML flow sequence body, e.g. `[a, "b c", d]` -> ['a', 'b c', 'd']."""
    s = s.strip().rstrip("\r")
    if s.startswith("[") and s.endswith("]"):
        s = s[1:-1]
    return [_unquote(part) for part in s.split(",") if part.strip()]


def _is_top_level_key(line: str) -> bool:
    """A frontmatter line that introduces a top-level key (no leading indent)."""
    return bool(line) and not line[0].isspace() and ":" in line


def _find_key_index(fm_lines: list[str], key: str) -> int | None:
    want = key + ":"
    for i, ln in enumerate(fm_lines):
        if _is_top_level_key(ln) and ln.split(":", 1)[0].strip() == key:
            return i
        # Bare `key:` with nothing after the colon still matches split above,
        # but guard the exact-prefix case for keys whose value is empty.
        if _is_top_level_key(ln) and ln.strip() == want:
            return i
    return None


def _key_block_end(fm_lines: list[str], start: int) -> int:
    """Index one past the last line belonging to the key that starts at `start`.

    A block value spans the key line plus any following indented (list-item or
    nested) lines. A blank line or a new top-level key ends the block.
    """
    j = start + 1
    while j < len(fm_lines):
        ln = fm_lines[j]
        if ln.strip() == "":
            break
        if ln[0].isspace():  # indented continuation (block list items, nesting)
            j += 1
            continue
        break
    return j


def collect_list_values(fm_lines: list[str], key: str) -> list[str]:
    """Read a frontmatter value as a list, handling scalar, inline, and block forms."""
    i = _find_key_index(fm_lines, key)
    if i is None:
        return []

    after = fm_lines[i].split(":", 1)[1].strip().rstrip("\r")
    if after.startswith("["):
        return [v for v in _split_inline_list(after) if v]
    if after:  # scalar value used as a single-element list
        return [after] if _unquote(after) else []

    # Block list on following indented `- ` lines.
    out: list[str] = []
    end = _key_block_end(fm_lines, i)
    for ln in fm_lines[i + 1 : end]:
        s = ln.strip()
        if s.startswith("-"):
            v = _unquote(s[1:])
            if v:
                out.append(v)
    return out


def read_scalar_or_first_list_item(fm_lines: list[str], key: str) -> str | None:
    """Read a value as a scalar, or the first item if it is a list (any form)."""
    i = _find_key_index(fm_lines, key)
    if i is None:
        return None

    after = fm_lines[i].split(":", 1)[1].strip().rstrip("\r")
    if after.startswith("["):
        items = _split_inline_list(after)
        return items[0] if items else None
    if after:
        return _unquote(after) or None

    # Look for the first block list item.
    end = _key_block_end(fm_lines, i)
    for ln in fm_lines[i + 1 : end]:
        s = ln.strip()
        if s.startswith("-"):
            return _unquote(s[1:]) or None
    return None


def tags_from_fm_lines(fm_lines: list[str]) -> set[str]:
    return {t for t in (_clean_tag(v) for v in collect_list_values(fm_lines, "tags")) if t}


def parse_level_number(fm_lines: list[str]) -> int | None:
    raw = read_scalar_or_first_list_item(fm_lines, "level")
    if raw is None:
        return None
    try:
        return int(str(raw).strip())
    except ValueError:
        return None


# --------------------------------------------------------------------------- #
# Frontmatter mutation (in place, position-preserving)
# --------------------------------------------------------------------------- #
def replace_key_block(fm_lines: list[str], key: str, new_lines: list[str]) -> list[str]:
    """Replace the block for `key` in place; append it if the key is absent.

    Unlike the original remove-then-append approach, this keeps the key at its
    existing position so unrelated frontmatter ordering (and its git diff) is
    left untouched.
    """
    i = _find_key_index(fm_lines, key)
    if i is None:
        return fm_lines + new_lines
    end = _key_block_end(fm_lines, i)
    return fm_lines[:i] + new_lines + fm_lines[end:]


def set_scalar_key(fm_lines: list[str], key: str, value: str) -> list[str]:
    return replace_key_block(fm_lines, key, [f"{key}: {value}"])


def set_level_key(fm_lines: list[str], level: int) -> list[str]:
    return replace_key_block(fm_lines, "level", ["level:", f'  - "{level}"'])


# --------------------------------------------------------------------------- #
# Loading & derivation
# --------------------------------------------------------------------------- #
def is_md_file(fn: str) -> bool:
    return fn.lower().endswith(".md")


def load_notes(root_abs: str) -> list[Note]:
    notes: list[Note] = []

    for dirpath, dirnames, filenames in os.walk(root_abs):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in sorted(filenames):
            if fn.startswith(".") or not is_md_file(fn):
                continue

            abs_path = os.path.join(dirpath, fn)
            try:
                with open(abs_path, "r", encoding="utf-8") as f:
                    content = f.read()
            except OSError:
                continue

            fm_lines, body = split_frontmatter(content)
            if fm_lines is None:
                continue

            tags = tags_from_fm_lines(fm_lines)
            rel_to_root = os.path.relpath(abs_path, REPO_ROOT).replace("\\", "/")

            notes.append(
                Note(
                    abs_path=abs_path,
                    rel_to_root=rel_to_root,
                    folder_abs=os.path.dirname(abs_path),
                    content=content,
                    fm_lines=fm_lines,
                    body=body,
                    is_folder_note="FolderNote" in tags,
                    is_metrics_ignored="MetricsIgnore" in tags,
                    status=read_scalar_or_first_list_item(fm_lines, "status"),
                    priority=read_scalar_or_first_list_item(fm_lines, "priority"),
                    level=parse_level_number(fm_lines),
                )
            )

    return notes


def derive_from_children(children: list[Note]):
    statuses: set[str] = set()
    prio_best: str | None = None
    level_max: int | None = None

    for c in children:
        if c.is_metrics_ignored:
            continue

        if c.status in VALID_STATUSES:
            statuses.add(c.status)

        if c.priority in VALID_PRIORITIES:
            if prio_best is None or VALID_PRIORITIES.index(c.priority) < VALID_PRIORITIES.index(
                prio_best
            ):
                prio_best = c.priority

        if c.level is not None and (level_max is None or c.level > level_max):
            level_max = c.level

    derived_status = next((s for s in DERIVED_STATUS_ORDER if s in statuses), None)
    return derived_status, prio_best, level_max


# --------------------------------------------------------------------------- #
# Sync
# --------------------------------------------------------------------------- #
def sync(root_abs: str, write: bool, force: bool, print_changed: bool):
    notes = load_notes(root_abs)
    folder_notes = [n for n in notes if n.is_folder_note]
    leaf_notes = [n for n in notes if not n.is_folder_note]

    changed: list[str] = []
    change_details: list[str] = []

    for fn in folder_notes:
        if fn.is_metrics_ignored:
            continue

        prefix = fn.folder_abs + os.sep
        children = [
            n for n in leaf_notes if n.folder_abs == fn.folder_abs or n.folder_abs.startswith(prefix)
        ]
        if not children:
            continue

        derived_status, derived_prio, derived_level = derive_from_children(children)
        if derived_status is None and derived_prio is None and derived_level is None:
            continue

        fm_lines = list(fn.fm_lines)
        edits: list[str] = []

        if derived_status is not None:
            want = (force and fn.status != derived_status) or (
                not force and fn.status not in VALID_STATUSES
            )
            if want:
                fm_lines = set_scalar_key(fm_lines, "status", derived_status)
                edits.append(f"status: {fn.status or '∅'} -> {derived_status}")

        if derived_prio is not None:
            want = (force and fn.priority != derived_prio) or (
                not force and fn.priority not in VALID_PRIORITIES
            )
            if want:
                fm_lines = set_scalar_key(fm_lines, "priority", derived_prio)
                edits.append(f"priority: {fn.priority or '∅'} -> {derived_prio}")

        if derived_level is not None:
            want = (force and fn.level != derived_level) or (not force and fn.level is None)
            if want:
                fm_lines = set_level_key(fm_lines, derived_level)
                edits.append(f"level: {fn.level if fn.level is not None else '∅'} -> {derived_level}")

        if not edits:
            continue

        new_content = "---\n" + "\n".join(fm_lines) + "\n---\n" + fn.body
        if new_content == fn.content:
            continue

        changed.append(fn.rel_to_root)
        change_details.append(f"{fn.rel_to_root} ({'; '.join(edits)})")
        if write:
            with open(fn.abs_path, "w", encoding="utf-8") as f:
                f.write(new_content)

    if print_changed:
        for p in sorted(changed):
            print(p)
        return 0

    mode = "WRITE" if write else "DRY-RUN"
    print(
        f"[{mode}] root={os.path.relpath(root_abs, REPO_ROOT)} "
        f"folderNotes={len(folder_notes)} changed={len(changed)}"
    )
    for d in sorted(change_details):
        print(f"- {d}")
    return 0


def main():
    # Ordering list and membership set must describe the same statuses.
    assert VALID_STATUSES == set(DERIVED_STATUS_ORDER), "status order/set drift"

    try:
        args = parse_args(sys.argv[1:])
    except ValueError as e:
        print(str(e), file=sys.stderr)
        return 2

    return sync(
        root_abs=args["root"],
        write=args["write"],
        force=args["force"],
        print_changed=args["print_changed"],
    )


if __name__ == "__main__":
    raise SystemExit(main())
