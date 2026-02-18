#!/usr/bin/env python3
"""
Sync topic/subtopic frontmatter for all .md files under Vault/Software Engineering/.

Rules:
- Folder structure: Vault / Software Engineering / <level1> / <level2> / <level3> / ...
- Strip leading number prefixes from folder names (e.g. "01 Programming" -> "Programming")
- topic = level-1 folder name (cleaned)
- subtopic = level-2 folder name (as-is), or empty if page is in level-1 folder

For FolderNote index pages:
- Level-1 index: topic = own folder name (cleaned), subtopic = empty
- Level-2+ index: topic = level-1 (cleaned), subtopic = level-2
  (same as concept pages at that depth)

Skip: Software Engineering.md, Questions.md, .canvas, .base files
"""

import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SE_DIR = os.path.join(REPO_ROOT, "Vault", "Software Engineering")


def strip_number_prefix(name: str) -> str:
    """Remove leading digits + space, e.g. '01 Programming' -> 'Programming'."""
    return re.sub(r"^\d+\s+", "", name)


def parse_frontmatter(content: str):
    """Return (frontmatter_str, body_str) or (None, content) if no frontmatter."""
    if not content.startswith("---"):
        return None, content
    end = content.find("---", 3)
    if end == -1:
        return None, content
    fm = content[3:end].strip()
    body = content[end + 3:]
    return fm, body


def is_folder_note(fm_str: str) -> bool:
    return "FolderNote" in fm_str


def update_topic_subtopic(fm_str: str, topic: str, subtopic: str) -> str:
    """Replace topic and subtopic values in frontmatter string."""
    lines = fm_str.split("\n")
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("topic:"):
            # Write new topic
            result.append("topic:")
            result.append(f"  - {topic}")
            i += 1
            # Skip old topic value lines
            while i < len(lines) and (lines[i].startswith("  - ") or lines[i].startswith("  -") and len(lines[i].strip()) > 1):
                if lines[i].strip().startswith("- "):
                    i += 1
                else:
                    break
            # Also handle inline value like "topic: Something"
            if ":" in stripped and stripped != "topic:":
                pass  # already consumed
            continue

        elif stripped.startswith("subtopic:"):
            # Write new subtopic
            if subtopic:
                result.append("subtopic:")
                result.append(f"  - {subtopic}")
            else:
                result.append("subtopic: []")
            i += 1
            # Skip old subtopic value lines
            while i < len(lines) and (lines[i].startswith("  - ") or lines[i].startswith("  -") and len(lines[i].strip()) > 1):
                if lines[i].strip().startswith("- "):
                    i += 1
                else:
                    break
            continue

        else:
            result.append(line)
            i += 1

    return "\n".join(result)


def process_file(filepath: str, dry_run: bool = False):
    rel = os.path.relpath(filepath, SE_DIR)
    parts = rel.replace("\\", "/").split("/")

    # Skip root-level files (Software Engineering.md, Questions.md)
    if len(parts) < 2:
        return None

    # parts[0] = level-1 folder, parts[1] = level-2 folder or file, etc.
    level1 = strip_number_prefix(parts[0])

    # Determine level-2 folder name
    level2 = ""
    if len(parts) >= 3:
        # File is at level-2 depth or deeper
        level2 = parts[1]  # No number stripping for level-2
    elif len(parts) == 2:
        # File is directly in level-1 folder
        level2 = ""

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    fm_str, body = parse_frontmatter(content)
    if fm_str is None:
        return None

    # Check if it has topic/subtopic fields at all
    if "topic:" not in fm_str:
        return None

    is_fn = is_folder_note(fm_str)

    # Determine topic and subtopic
    filename = os.path.splitext(os.path.basename(filepath))[0]
    folder_name = os.path.basename(os.path.dirname(filepath))

    if is_fn:
        # It's a FolderNote (index page)
        if len(parts) == 2:
            # Level-1 index: topic = own name, subtopic = empty
            topic = level1
            subtopic = ""
        elif len(parts) == 3:
            # Level-2 index: topic = level1, subtopic = own folder name
            topic = level1
            subtopic = folder_name
        else:
            # Level-3+ index: topic = level1, subtopic = level2
            topic = level1
            subtopic = level2
    else:
        # Concept page
        topic = level1
        subtopic = level2

    new_fm = update_topic_subtopic(fm_str, topic, subtopic)
    new_content = f"---\n{new_fm}\n---{body}"

    changed = new_content != content

    if changed:
        action = "WOULD UPDATE" if dry_run else "UPDATED"
        print(f"  {action}: {rel}")
        print(f"    topic: {topic}, subtopic: {subtopic or '[]'}")
        if not dry_run:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
        return True
    else:
        return False


def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("=== DRY RUN MODE (no files will be changed) ===\n")
    else:
        print("=== UPDATING FRONTMATTER ===\n")

    updated = 0
    skipped = 0
    unchanged = 0

    for root, dirs, files in os.walk(SE_DIR):
        for fname in sorted(files):
            if not fname.endswith(".md"):
                continue
            filepath = os.path.join(root, fname)
            result = process_file(filepath, dry_run)
            if result is True:
                updated += 1
            elif result is False:
                unchanged += 1
            else:
                skipped += 1

    print(f"\nDone: {updated} updated, {unchanged} unchanged, {skipped} skipped")


if __name__ == "__main__":
    main()
