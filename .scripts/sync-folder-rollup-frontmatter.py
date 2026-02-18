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
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAULT_SE_ROOT = os.path.join(REPO_ROOT, "Vault", "Software Engineering")

VALID_STATUSES = ["Done", "Ready To Repeat", "Repetition", "Creation", "Not-Started"]
VALID_PRIORITIES = ["High", "Medium", "Low"]

DERIVED_STATUS_ORDER = [
    "Creation",
    "Repetition",
    "Ready To Repeat",
    "Not-Started",
    "Done",
]


@dataclass(frozen=True)
class Note:
    abs_path: str
    rel_to_root: str
    folder_abs: str
    is_folder_note: bool
    is_metrics_ignored: bool
    fm_lines: list[str] | None
    body: str


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


def split_frontmatter(content: str):
    if not content.startswith("---"):
        return None, content

    lines = content.splitlines(keepends=True)
    if not lines:
        return None, content
    if lines[0].strip() != "---":
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


def tags_from_fm_lines(fm_lines: list[str]) -> set[str]:
    tags: set[str] = set()
    in_tags = False

    for ln in fm_lines:
        s = ln.rstrip("\r")
        stripped = s.strip()

        if not in_tags:
            if stripped == "tags:":
                in_tags = True
            continue

        if stripped == "":
            continue

        if stripped.startswith("-"):
            v = stripped[1:].strip()
            if (v.startswith("\"") and v.endswith("\"")) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            if v.startswith("#"):
                v = v[1:]
            if v:
                tags.add(v)
            continue

        if ":" in stripped:
            break

    return tags


def read_scalar_or_first_list_item(fm_lines: list[str], key: str) -> str | None:
    want = key + ":"
    for i, ln in enumerate(fm_lines):
        stripped = ln.strip()
        if not stripped.startswith(want):
            continue

        v = stripped.split(":", 1)[1].strip()
        if v:
            if (v.startswith("\"") and v.endswith("\"")) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            return v or None

        for j in range(i + 1, len(fm_lines)):
            s2 = fm_lines[j].strip()
            if not s2:
                continue
            if s2.startswith("-"):
                v2 = s2[1:].strip()
                if (v2.startswith("\"") and v2.endswith("\"")) or (
                    v2.startswith("'") and v2.endswith("'")
                ):
                    v2 = v2[1:-1]
                return v2 or None
            if ":" in s2:
                return None
        return None
    return None


def parse_level_number(fm_lines: list[str]) -> int | None:
    raw = read_scalar_or_first_list_item(fm_lines, "level")
    if raw is None:
        return None
    try:
        n = int(str(raw))
    except ValueError:
        return None
    return n


def remove_key_block(fm_lines: list[str], key: str) -> list[str]:
    out: list[str] = []
    want = key + ":"
    i = 0
    removed = False

    while i < len(fm_lines):
        stripped = fm_lines[i].strip()
        if (not removed) and stripped.startswith(want):
            removed = True
            i += 1
            while i < len(fm_lines):
                s2 = fm_lines[i]
                st2 = s2.strip()
                if st2.startswith("-") or s2.startswith("  -") or s2.startswith("\t-"):
                    i += 1
                    continue
                if st2 == "":
                    i += 1
                    continue
                break
            continue

        out.append(fm_lines[i])
        i += 1

    return out


def upsert_scalar_key(fm_lines: list[str], key: str, value: str) -> list[str]:
    fm_lines = remove_key_block(fm_lines, key)
    return fm_lines + [f"{key}: {value}"]


def upsert_level_key(fm_lines: list[str], level: int) -> list[str]:
    fm_lines = remove_key_block(fm_lines, "level")
    return fm_lines + ["level:", f"  - \"{level}\""]


def is_md_file(fn: str) -> bool:
    return fn.lower().endswith(".md")


def load_notes(root_abs: str) -> list[Note]:
    notes: list[Note] = []

    for dirpath, dirnames, filenames in os.walk(root_abs):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in sorted(filenames):
            if fn.startswith("."):
                continue
            if not is_md_file(fn):
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
            is_folder_note = "FolderNote" in tags
            is_metrics_ignored = "MetricsIgnore" in tags

            rel_to_root = os.path.relpath(abs_path, REPO_ROOT).replace("\\", "/")
            notes.append(
                Note(
                    abs_path=abs_path,
                    rel_to_root=rel_to_root,
                    folder_abs=os.path.dirname(abs_path),
                    is_folder_note=is_folder_note,
                    is_metrics_ignored=is_metrics_ignored,
                    fm_lines=fm_lines,
                    body=body,
                )
            )

    return notes


def derive_from_children(children: list[Note]):
    statuses = set()
    prio_best: str | None = None
    level_max: int | None = None

    for c in children:
        if c.is_metrics_ignored:
            continue

        st = read_scalar_or_first_list_item(c.fm_lines or [], "status")
        if st in VALID_STATUSES:
            statuses.add(st)

        pr = read_scalar_or_first_list_item(c.fm_lines or [], "priority")
        if pr in VALID_PRIORITIES:
            if prio_best is None:
                prio_best = pr
            else:
                if VALID_PRIORITIES.index(pr) < VALID_PRIORITIES.index(prio_best):
                    prio_best = pr

        lvl = parse_level_number(c.fm_lines or [])
        if lvl is not None:
            if level_max is None or lvl > level_max:
                level_max = lvl

    derived_status: str | None = None
    for s in DERIVED_STATUS_ORDER:
        if s in statuses:
            derived_status = s
            break

    return derived_status, prio_best, level_max


def sync(root_abs: str, write: bool, force: bool, print_changed: bool):
    notes = load_notes(root_abs)

    folder_notes = [n for n in notes if n.is_folder_note]
    leaf_notes = [n for n in notes if not n.is_folder_note]

    changed: list[str] = []

    for fn in folder_notes:
        if fn.is_metrics_ignored:
            continue

        children = [
            n
            for n in leaf_notes
            if (n.folder_abs == fn.folder_abs or n.folder_abs.startswith(fn.folder_abs + os.sep))
        ]
        if not children:
            continue

        derived_status, derived_prio, derived_level = derive_from_children(children)
        if derived_status is None and derived_prio is None and derived_level is None:
            continue

        fm_lines = list(fn.fm_lines or [])

        cur_status = read_scalar_or_first_list_item(fm_lines, "status")
        cur_prio = read_scalar_or_first_list_item(fm_lines, "priority")
        cur_level = parse_level_number(fm_lines)

        if derived_status is not None:
            if (force and cur_status != derived_status) or (
                (not force) and (cur_status not in VALID_STATUSES)
            ):
                fm_lines = upsert_scalar_key(fm_lines, "status", derived_status)

        if derived_prio is not None:
            if (force and cur_prio != derived_prio) or (
                (not force) and (cur_prio not in VALID_PRIORITIES)
            ):
                fm_lines = upsert_scalar_key(fm_lines, "priority", derived_prio)

        if derived_level is not None:
            if (force and cur_level != derived_level) or ((not force) and (cur_level is None)):
                fm_lines = upsert_level_key(fm_lines, derived_level)

        new_content = "---\n" + "\n".join(fm_lines) + "\n---\n" + fn.body

        try:
            with open(fn.abs_path, "r", encoding="utf-8") as f:
                before = f.read()
        except OSError:
            continue

        if new_content == before:
            continue

        changed.append(fn.rel_to_root)
        if write:
            with open(fn.abs_path, "w", encoding="utf-8") as f:
                f.write(new_content)

    if print_changed:
        for p in sorted(changed):
            print(p)
        return 0

    mode = "WRITE" if write else "DRY-RUN"
    print(f"[{mode}] root={os.path.relpath(root_abs, REPO_ROOT)} folderNotes={len(folder_notes)} changed={len(changed)}")
    for p in sorted(changed):
        print(f"- {p}")
    return 0


def main():
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
