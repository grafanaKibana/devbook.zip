#!/usr/bin/env python3
"""Render a literal-link Whats next callout into notes.

Updates either an existing marker block or a legacy '# Whats next' DataviewJS section.

Usage:
    python3 .scripts/render-whats-next.py
    python3 .scripts/render-whats-next.py --write
    python3 .scripts/render-whats-next.py --staged --write
    python3 .scripts/render-whats-next.py --write --print-changed
"""

from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass


REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VAULT_ROOT = os.path.join(REPO_ROOT, "Vault")
DEFAULT_ROOT = os.path.join(VAULT_ROOT, "Software Engineering")

MARKER_START = "<!-- whats-next:start -->"
MARKER_END = "<!-- whats-next:end -->"


@dataclass(frozen=True)
class NoteIndexEntry:
    abs_path: str
    rel_to_vault: str
    rel_no_ext: str
    folder_rel: str
    file_stem: str
    folder_name: str
    is_folder_note: bool
    has_foldernote_tag: bool
    skip_whats_next: bool


def parse_args(argv: list[str]):
    args = {
        "write": False,
        "print_changed": False,
        "staged": False,
        "root": DEFAULT_ROOT,
    }

    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--write":
            args["write"] = True
        elif a == "--print-changed":
            args["print_changed"] = True
        elif a == "--staged":
            args["staged"] = True
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


def read_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_file(path: str, content: str):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)


def split_frontmatter(content: str):
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


def tags_from_fm_lines(fm_lines: list[str] | None) -> set[str]:
    if not fm_lines:
        return set()

    tags: set[str] = set()
    in_tags = False

    for ln in fm_lines:
        s = ln.rstrip("\r")
        stripped = s.strip()

        if not in_tags:
            if stripped == "tags:" or stripped.startswith("tags:"):
                in_tags = True
                if "[" in stripped and "]" in stripped:
                    inside = stripped.split("[", 1)[1].rsplit("]", 1)[0]
                    for part in inside.split(","):
                        v = part.strip().strip("\"'")
                        if v.startswith("#"):
                            v = v[1:]
                        if v:
                            tags.add(v)
                    in_tags = False
            continue

        if stripped == "":
            continue

        if stripped.startswith("-"):
            v = stripped[1:].strip().strip("\"'")
            if v.startswith("#"):
                v = v[1:]
            if v:
                tags.add(v)
            continue

        if ":" in stripped:
            break

    return tags


def read_fm_scalar(fm_lines: list[str] | None, key: str) -> str | None:
    if not fm_lines:
        return None

    key_lower = key.lower()
    for ln in fm_lines:
        stripped = ln.strip()
        if ":" not in stripped:
            continue
        k, _, v = stripped.partition(":")
        if k.strip().lower() != key_lower:
            continue
        value = v.strip()
        if value == "":
            return None
        return value.lower()
    return None


def norm_rel(p: str) -> str:
    return p.replace(os.path.sep, "/")


def scan_notes(root_abs: str) -> list[NoteIndexEntry]:
    out: list[NoteIndexEntry] = []
    for dirpath, dirnames, filenames in os.walk(root_abs):
        dirnames[:] = [d for d in dirnames if d not in (".obsidian", ".trash", "node_modules")]

        for fn in filenames:
            if not fn.endswith(".md"):
                continue
            abs_path = os.path.join(dirpath, fn)
            rel_to_vault = norm_rel(os.path.relpath(abs_path, VAULT_ROOT))
            rel_no_ext = rel_to_vault[:-3]
            folder_rel = norm_rel(os.path.dirname(rel_to_vault))
            file_stem = os.path.splitext(fn)[0]
            folder_name = os.path.basename(dirpath)

            content = read_file(abs_path)
            fm_lines, _ = split_frontmatter(content)
            tags = tags_from_fm_lines(fm_lines)

            is_folder_note_by_name = file_stem == folder_name
            has_foldernote_tag = "FolderNote" in tags
            is_folder_note = is_folder_note_by_name or has_foldernote_tag
            skip_whats_next = read_fm_scalar(fm_lines, "whats-next") in {"false", "no", "off"}

            out.append(
                NoteIndexEntry(
                    abs_path=abs_path,
                    rel_to_vault=rel_to_vault,
                    rel_no_ext=rel_no_ext,
                    folder_rel=folder_rel,
                    file_stem=file_stem,
                    folder_name=folder_name,
                    is_folder_note=is_folder_note,
                    has_foldernote_tag=has_foldernote_tag,
                    skip_whats_next=skip_whats_next,
                )
            )
    return out


def build_lookup(entries: list[NoteIndexEntry]):
    by_abs = {e.abs_path: e for e in entries}
    by_folder: dict[str, list[NoteIndexEntry]] = {}
    for e in entries:
        by_folder.setdefault(e.folder_rel, []).append(e)
    return by_abs, by_folder


def folder_note_for_folder(folder_abs: str) -> str | None:
    folder_name = os.path.basename(folder_abs)
    candidate = os.path.join(folder_abs, folder_name + ".md")
    return candidate if os.path.isfile(candidate) else None


def link_md(target_rel_no_ext: str, alias: str) -> str:
    return f"[[{target_rel_no_ext}|{alias}]]"


def compute_up_link(cur_abs_path: str) -> tuple[str, str] | None:
    cur_folder_abs = os.path.dirname(cur_abs_path)
    parent_folder_abs = os.path.dirname(cur_folder_abs)
    parent_note_abs = folder_note_for_folder(parent_folder_abs)
    if not parent_note_abs:
        return None
    parent_rel = norm_rel(os.path.relpath(parent_note_abs, VAULT_ROOT))
    parent_rel_no_ext = parent_rel[:-3]
    alias = os.path.splitext(os.path.basename(parent_note_abs))[0]
    return parent_rel_no_ext, alias


def compute_children_folder_notes(cur_entry: NoteIndexEntry, entries: list[NoteIndexEntry]) -> list[NoteIndexEntry]:
    cur_folder = cur_entry.folder_rel
    cur_depth = 0 if cur_folder == "." else cur_folder.count("/") + 1
    out: list[NoteIndexEntry] = []

    for e in entries:
        if not e.is_folder_note:
            continue
        if not e.folder_rel.startswith(cur_folder + "/"):
            continue
        depth = e.folder_rel.count("/") + 1
        if depth != cur_depth + 1:
            continue
        if e.file_stem != os.path.basename(e.folder_rel):
            continue
        out.append(e)

    out.sort(key=lambda x: x.folder_rel)
    return out


def compute_pages_in_same_folder(cur_entry: NoteIndexEntry, by_folder: dict[str, list[NoteIndexEntry]]):
    out: list[NoteIndexEntry] = []
    for e in by_folder.get(cur_entry.folder_rel, []):
        if e.abs_path == cur_entry.abs_path:
            continue
        if e.is_folder_note:
            continue
        out.append(e)
    out.sort(key=lambda x: x.file_stem.lower())
    return out


def render_callout(cur_entry: NoteIndexEntry, entries: list[NoteIndexEntry], by_folder: dict[str, list[NoteIndexEntry]]):
    lines: list[str] = []
    lines.append(MARKER_START)
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("> [!note] Whats next")

    up = compute_up_link(cur_entry.abs_path)
    if up is not None:
        up_target, up_alias = up
        lines.append("> **Parent**")
        lines.append(f">  {link_md(up_target, up_alias)}")
        lines.append(">")

    children = compute_children_folder_notes(cur_entry, entries)
    pages = compute_pages_in_same_folder(cur_entry, by_folder)

    if children:
        lines.append("> **Topics**")
        for ch in children:
            alias = ch.file_stem
            lines.append(f"> - {link_md(ch.rel_no_ext, alias)}")
        if pages:
            lines.append(">")

    if pages:
        lines.append("> **Pages**")
        for p in pages:
            alias = p.file_stem
            lines.append(f"> - {link_md(p.rel_no_ext, alias)}")

    lines.append(MARKER_END)
    return "\n".join(lines) + "\n"


def insert_rendered_block_at_end(content: str, rendered_block: str) -> str:
    out = content
    if not out.endswith("\n"):
        out += "\n"
    if not out.endswith("\n\n"):
        out += "\n"
    return out + rendered_block


def _parse_git_name_status_z(raw: bytes) -> list[tuple[str, str, str | None]]:
    text = raw.decode("utf-8", errors="replace")
    parts = text.split("\0")
    out: list[tuple[str, str, str | None]] = []

    i = 0
    while i < len(parts):
        status = parts[i]
        i += 1
        if not status:
            continue
        if i >= len(parts):
            break
        path1 = parts[i]
        i += 1
        if not path1:
            continue
        if status.startswith("R") or status.startswith("C"):
            if i >= len(parts):
                break
            path2 = parts[i]
            i += 1
            if path2:
                out.append((status, path1, path2))
            else:
                out.append((status, path1, None))
            continue

        out.append((status, path1, None))

    return out


def _staged_changes() -> list[tuple[str, str, str | None]]:
    p = subprocess.run(
        [
            "git",
            "diff",
            "--cached",
            "--name-status",
            "-z",
            "-M",
            "--diff-filter=ACMRD",
        ],
        cwd=REPO_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if p.returncode != 0:
        return []
    return _parse_git_name_status_z(p.stdout)


def _folders_to_update_from_staged() -> tuple[set[str], set[str]]:
    update_files: set[str] = set()
    update_folders: set[str] = set()

    for status, p1, p2 in _staged_changes():
        s = status[:1]

        paths = [p1]
        if p2 is not None:
            paths.append(p2)

        for rp in paths:
            rp = norm_rel(rp)
            if not rp.startswith("Vault/"):
                continue
            if not rp.endswith(".md"):
                continue
            rel_to_vault = rp[len("Vault/") :]
            folder_rel = norm_rel(os.path.dirname(rel_to_vault))
            file_stem = os.path.splitext(os.path.basename(rel_to_vault))[0]
            folder_base = os.path.basename(folder_rel)

            is_folder_note = file_stem == folder_base

            if s == "M":
                update_files.add(rel_to_vault)
                continue

            update_folders.add(folder_rel)
            if is_folder_note:
                parent_folder_rel = norm_rel(os.path.dirname(folder_rel))
                if parent_folder_rel and parent_folder_rel != ".":
                    update_folders.add(parent_folder_rel)

    return update_files, update_folders


def strip_marker_block(content: str) -> str:
    start = content.find(MARKER_START)
    if start == -1:
        return content
    end = content.find(MARKER_END, start)
    if end == -1:
        return content
    end_after = end + len(MARKER_END)

    before = content[:start]
    after = content[end_after:]

    # insert_rendered_block_at_end prepends blank line(s) before the marker;
    # drop trailing whitespace-only lines so the preceding content keeps a
    # single trailing newline (or none, if it was the whole file).
    before = before.rstrip("\n")
    # replace_marker_block consumes one newline after MARKER_END; mirror that so
    # the leading newline of the appended block doesn't linger.
    if after.startswith("\r\n"):
        after = after[2:]
    elif after.startswith("\n"):
        after = after[1:]

    if before == "":
        return after
    if after == "":
        return before + "\n"
    return before + "\n" + after


def replace_marker_block(content: str, rendered_block: str) -> str | None:
    start = content.find(MARKER_START)
    if start == -1:
        return None
    end = content.find(MARKER_END, start)
    if end == -1:
        return None
    end_after = end + len(MARKER_END)

    before = content[:start]
    after = content[end_after:]
    if after.startswith("\r\n"):
        after = after[2:]
    elif after.startswith("\n"):
        after = after[1:]
    return before + rendered_block + after


def replace_legacy_whats_next_section(content: str, rendered_block: str) -> str | None:
    lines = content.splitlines(keepends=False)

    def is_header(i: int) -> bool:
        s = lines[i].strip()
        return s in ("# Whats next", "# What's next")

    start_idx = None
    for i in range(len(lines)):
        if is_header(i):
            start_idx = i
            break
    if start_idx is None:
        return None

    end_idx = None
    fence_start = None
    for i in range(start_idx + 1, len(lines)):
        if lines[i].strip().startswith("```dataviewjs"):
            fence_start = i
            break
    if fence_start is not None:
        for j in range(fence_start + 1, len(lines)):
            if lines[j].strip() == "```":
                end_idx = j
                break
    if end_idx is None:
        for j in range(start_idx + 1, len(lines)):
            if lines[j].startswith("# "):
                end_idx = j - 1
                break
        if end_idx is None:
            end_idx = len(lines) - 1

    before = "\n".join(lines[:start_idx])
    after = "\n".join(lines[end_idx + 1 :])

    out = ""
    if before.strip() != "":
        out += before.rstrip() + "\n\n"
    out += rendered_block
    if after.strip() != "":
        out += "\n" + after.lstrip() + "\n"
    return out


def main(argv: list[str]) -> int:
    try:
        args = parse_args(argv)
    except ValueError as e:
        print(f"ERROR: {e}")
        return 2

    root_abs = args["root"]
    if not os.path.isdir(root_abs):
        print(f"ERROR: root not a directory: {root_abs}")
        return 2

    entries = scan_notes(root_abs)
    _, by_folder = build_lookup(entries)

    changed_rel_paths: list[str] = []

    staged_files_rel: set[str] = set()
    staged_folders_rel: set[str] = set()
    if args["staged"]:
        staged_files_rel, staged_folders_rel = _folders_to_update_from_staged()

    def should_update(e: NoteIndexEntry) -> bool:
        if not args["staged"]:
            return True
        if e.rel_to_vault in staged_files_rel:
            return True
        if e.folder_rel in staged_folders_rel:
            return True
        return False

    for e in entries:
        if not should_update(e):
            continue
        original = read_file(e.abs_path)

        if e.skip_whats_next:
            updated = strip_marker_block(original)
        else:
            rendered = render_callout(e, entries, by_folder)

            updated = replace_marker_block(original, rendered)
            if updated is None:
                updated = replace_legacy_whats_next_section(original, rendered)

            if updated is None:
                updated = insert_rendered_block_at_end(original, rendered)

        if updated != original:
            changed_rel_paths.append(norm_rel(os.path.relpath(e.abs_path, REPO_ROOT)))
            if args["write"]:
                write_file(e.abs_path, updated)

    changed_rel_paths.sort()

    if args["print_changed"]:
        for p in changed_rel_paths:
            print(p)
    else:
        if args["write"]:
            print(f"Changed {len(changed_rel_paths)} file(s).")
        else:
            print(f"Would change {len(changed_rel_paths)} file(s).")
            for p in changed_rel_paths:
                print(p)

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
