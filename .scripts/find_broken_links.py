#!/usr/bin/env python3
"""Scan the vault for broken/unlinked backlinks.

Usage:
    python3 .scripts/find_broken_links.py
"""

import os
import re
import sys
from pathlib import Path
from collections import defaultdict

VAULT = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONTENT_DIR = VAULT / "Software Engineering"

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+?)(?:[|#][^\]]*?)?\]\]")
MD_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+\.md)\)")
FRONTMATTER_RE = re.compile(r"\A---\n.*?\n---\n", re.DOTALL)
CODE_BLOCK_RE = re.compile(r"```.*?```", re.DOTALL)
IMAGE_EMBED_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
HEADING_RE = re.compile(r"^#{1,6}\s+.*$", re.MULTILINE)
DATAVIEW_RE = re.compile(r"```dataviewjs.*?```", re.DOTALL)
INLINE_CODE_RE = re.compile(r"`[^`]+`")

SKIP_DIRS = {".git", ".obsidian", ".opencode", ".scripts", ".sisyphus", ".trash", ".idea", "Assets", "Templates"}

GENERIC_NAMES = {
    "types", "other", "tools", "patterns", "principles", "fundamentals",
    "questions", "runtime", "sockets", "caching", "encryption", "rest",
    "paradigms", "protocols", "azure",
}

MIN_NAME_LENGTH = 6


def collect_notes(root: Path) -> dict[str, Path]:
    notes: dict[str, Path] = {}
    for md in root.rglob("*.md"):
        rel = md.relative_to(root)
        if any(part in SKIP_DIRS for part in rel.parts):
            continue
        notes[md.stem.lower()] = md
    for md in VAULT.glob("*.md"):
        if md.stem.lower() not in notes:
            notes[md.stem.lower()] = md
    return notes


def collect_all_md(vault: Path) -> list[Path]:
    files = []
    for md in vault.rglob("*.md"):
        rel = md.relative_to(vault)
        if any(part in SKIP_DIRS for part in rel.parts):
            continue
        files.append(md)
    return files


def strip_noise(content: str) -> str:
    """Remove frontmatter, code/dataview blocks, image embeds,
    headings, and inline code — leaving only prose."""
    stripped = FRONTMATTER_RE.sub("", content)
    stripped = DATAVIEW_RE.sub("", stripped)
    stripped = CODE_BLOCK_RE.sub("", stripped)
    stripped = IMAGE_EMBED_RE.sub("", stripped)
    stripped = HEADING_RE.sub("", stripped)
    stripped = INLINE_CODE_RE.sub("", stripped)
    return stripped


def main():
    notes = collect_notes(VAULT)
    all_md = collect_all_md(VAULT)

    broken_wiki: list[tuple[Path, str]] = []
    broken_md: list[tuple[Path, str, str]] = []
    unlinked: dict[str, list[tuple[Path, str]]] = defaultdict(list)

    candidate_names = {
        name: path
        for name, path in notes.items()
        if len(name) >= MIN_NAME_LENGTH and name not in GENERIC_NAMES
    }

    for md_file in all_md:
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        rel_path = md_file.relative_to(VAULT)

        for match in WIKILINK_RE.finditer(content):
            target = match.group(1).strip()
            target_lower = target.lower()
            if target_lower not in notes:
                resolved = md_file.parent / (target + ".md")
                if not resolved.exists():
                    broken_wiki.append((rel_path, target))

        for match in MD_LINK_RE.finditer(content):
            link_text = match.group(1)
            link_path = match.group(2)
            if link_path.startswith("http"):
                continue
            resolved = md_file.parent / link_path
            if not resolved.exists():
                if not (VAULT / link_path).exists():
                    broken_md.append((rel_path, link_text, link_path))

        prose = strip_noise(content)

        linked_targets = set()
        for m in WIKILINK_RE.finditer(content):
            linked_targets.add(m.group(1).strip().lower())
        for m in MD_LINK_RE.finditer(content):
            linked_targets.add(m.group(1).strip().lower())
            p = Path(m.group(2))
            linked_targets.add(p.stem.lower())

        this_name = md_file.stem.lower()

        for name, note_path in candidate_names.items():
            if name == this_name:
                continue
            if name in linked_targets:
                continue

            original_stem = note_path.stem
            try:
                pattern = re.compile(r"\b" + re.escape(original_stem) + r"\b", re.IGNORECASE)
            except re.error:
                continue

            found = pattern.search(prose)
            if not found:
                continue

            line_start = prose.rfind("\n", 0, found.start()) + 1
            line_end = prose.find("\n", found.end())
            if line_end == -1:
                line_end = len(prose)
            line = prose[line_start:line_end].strip()

            if not line:
                continue

            context_window = prose[max(0, found.start() - 5):found.end() + 5]
            if "[[" in context_window or "](" in context_window:
                continue

            if re.match(r"^-\s+" + re.escape(original_stem) + r"\s*$", line, re.IGNORECASE):
                continue

            unlinked[name].append((rel_path, line[:150]))

    print("=" * 70)
    print("BROKEN LINKS REPORT")
    print("=" * 70)

    if broken_wiki:
        print(f"\n## Broken Wikilinks ({len(broken_wiki)} found)\n")
        for file_path, target in sorted(broken_wiki):
            print(f"  {file_path}")
            print(f"    → [[{target}]] — target does not exist\n")
    else:
        print("\n✓ No broken wikilinks found.\n")

    if broken_md:
        print(f"\n## Broken Markdown Links ({len(broken_md)} found)\n")
        for file_path, text, link in sorted(broken_md):
            print(f"  {file_path}")
            print(f"    → [{text}]({link}) — target does not exist\n")
    else:
        print("\n✓ No broken markdown links found.\n")

    if unlinked:
        print(f"\n## Unlinked Mentions ({len(unlinked)} notes mentioned but not linked)\n")
        for name in sorted(unlinked.keys()):
            mentions = unlinked[name]
            note_path = candidate_names[name].relative_to(VAULT)
            print(f"  📄 \"{notes[name].stem}\" ({note_path})")
            print(f"     Mentioned in {len(mentions)} file(s):")
            for file_path, context in sorted(mentions)[:5]:
                print(f"       • {file_path}")
                print(f"         \"{context}\"")
            if len(mentions) > 5:
                print(f"       ... and {len(mentions) - 5} more")
            print()
    else:
        print("\n✓ No unlinked mentions found.\n")

    total = len(broken_wiki) + len(broken_md) + len(unlinked)
    print(f"\nTotal issues: {total}")
    return 1 if total > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
