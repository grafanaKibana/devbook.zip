#!/usr/bin/env python3
"""Generate Quartz content from the Obsidian vault.

`Web/content/` is a BUILD ARTIFACT (kept out of git), regenerated from `Vault/`
on every build. The vault is the single source of truth; this script never edits it.

What it does:
  * Copies published (`publish: true`) notes + assets from Vault/Software Engineering.
  * FLATTENS: the section's contents live at the site root (no `Software Engineering`
    wrapper), so the sidebar shows topics directly and URLs are `/programming`,
    `/questions`, `/roadmap`, etc.
      Vault/Software Engineering/Software Engineering.md -> Web/content/index.md   (the home)
      Vault/Software Engineering/07 Security/Encryption.md -> Web/content/07 Security/Encryption.md
      Vault/Assets/**                                     -> Web/content/Assets/**
  * Rewrites `[[Software Engineering/...]]` wikilinks -> `[[...]]` in the GENERATED
    copy (so the 520 full-path links still resolve after flattening). Vault untouched.
  * Strips Obsidian dynamic blocks (```dataviewjs / ```dataview / ```datacore[jsx])
    everywhere — dead on a static site, replaced by native Quartz components.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VAULT_ROOT = REPO_ROOT / "Vault"
SE_SRC = VAULT_ROOT / "Software Engineering"
ASSETS_SRC = VAULT_ROOT / "Assets"
SE_FOLDER_NOTE = SE_SRC / "Software Engineering.md"

CONTENT_ROOT = REPO_ROOT / "Web" / "content"
ASSETS_DEST = CONTENT_ROOT / "Assets"
INDEX_DEST = CONTENT_ROOT / "index.md"
GITKEEP = CONTENT_ROOT / ".gitkeep"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
PUBLISH_RE = re.compile(r"^publish:\s*true\s*$", re.IGNORECASE | re.MULTILINE)

PASSTHROUGH_SUFFIXES = {".canvas", ".base"}

_DYN = r"(?:dataviewjs|dataview|datacorejsx|datacore)"
DYN_HEADING_RE = re.compile(rf"^#{{1,6}} [^\n]*\n\s*\n(?=```{_DYN}\b)", re.MULTILINE)
DYN_BLOCK_RE = re.compile(rf"^```{_DYN}\b.*?^```[ \t]*$\n?", re.DOTALL | re.MULTILINE)
BLANKS_RE = re.compile(r"\n{3,}")

# Flatten fix-ups for the "Software Engineering" wrapper being dropped:
#   [[Software Engineering/X ...]] -> [[X ...]]  (also covers ![[...]] embeds)
#   [[Software Engineering]] / [[Software Engineering|Alias]] -> link to the home (/)
SE_PREFIX_RE = re.compile(r"(!?\[\[)Software Engineering/")
SE_ROOT_LINK_RE = re.compile(r"\[\[Software Engineering(\|[^\]]*)?\]\]")


def strip_se_prefix(text: str) -> str:
    text = SE_PREFIX_RE.sub(r"\1", text)
    text = SE_ROOT_LINK_RE.sub(lambda m: f"[[/{m.group(1) or '|Software Engineering'}]]", text)
    return text


def split_frontmatter(text: str) -> tuple[str, str]:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return "", text
    return m.group(1), text[m.end():]


def is_published(fm_inner: str) -> bool:
    return bool(PUBLISH_RE.search(fm_inner))


def strip_dynamic(body: str) -> str:
    body = DYN_HEADING_RE.sub("", body)
    body = DYN_BLOCK_RE.sub("", body)
    return BLANKS_RE.sub("\n\n", body).strip() + "\n"


def render_note(text: str) -> str:
    fm_inner, body = split_frontmatter(text)
    body = strip_se_prefix(strip_dynamic(body))
    if not fm_inner:
        return body
    return f"---\n{fm_inner}\n---\n\n{body}"


INDEX_FRONTMATTER = "title: DEVBOOK\npublish: true"


def render_index(text: str) -> str:
    _, body = split_frontmatter(text)
    return f"---\n{INDEX_FRONTMATTER}\n---\n\n{strip_se_prefix(strip_dynamic(body))}"


def generate_notes(*, dry_run: bool) -> tuple[int, int]:
    """Copy published notes (transformed) + passthrough content, flattened. (copied, skipped)."""
    copied = skipped = 0
    for path in sorted(SE_SRC.rglob("*")):
        if path.is_dir():
            continue
        suffix = path.suffix.lower()

        # Section folder note becomes the site root.
        if path == SE_FOLDER_NOTE:
            text = path.read_text(encoding="utf-8")
            if not is_published(split_frontmatter(text)[0]):
                skipped += 1
                continue
            copied += 1
            if not dry_run:
                INDEX_DEST.parent.mkdir(parents=True, exist_ok=True)
                INDEX_DEST.write_text(render_index(text), encoding="utf-8")
            continue

        # Flatten: content lives at the root (drop the Software Engineering wrapper).
        target = CONTENT_ROOT / path.relative_to(SE_SRC)

        if suffix == ".md":
            text = path.read_text(encoding="utf-8", errors="replace")
            if not is_published(split_frontmatter(text)[0]):
                skipped += 1
                continue
            copied += 1
            if not dry_run:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(render_note(text), encoding="utf-8")
        elif suffix in PASSTHROUGH_SUFFIXES:
            # Canvas / Bases carry wikilinks too — rewrite the prefix.
            text = path.read_text(encoding="utf-8", errors="replace")
            if not dry_run:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(strip_se_prefix(text), encoding="utf-8")
    return copied, skipped


def copy_assets(dry_run: bool) -> int:
    if not ASSETS_SRC.exists():
        return 0
    count = 0
    for path in sorted(ASSETS_SRC.rglob("*")):
        if path.is_dir():
            continue
        target = ASSETS_DEST / path.relative_to(ASSETS_SRC)
        count += 1
        if not dry_run:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    return count


def clean_content() -> None:
    """Remove everything under content/ except the tracked .gitkeep."""
    if not CONTENT_ROOT.exists():
        return
    for child in CONTENT_ROOT.iterdir():
        if child == GITKEEP:
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clean", action="store_true",
                        help="wipe generated content (keep .gitkeep) before regenerating")
    parser.add_argument("--dry-run", action="store_true", help="report counts without writing")
    args = parser.parse_args()

    if not SE_SRC.exists():
        print(f"ERROR: source not found: {SE_SRC}", file=sys.stderr)
        return 1

    if args.clean and not args.dry_run:
        clean_content()

    copied, skipped = generate_notes(dry_run=args.dry_run)
    assets = copy_assets(args.dry_run)

    verb = "would generate" if args.dry_run else "generated"
    print(f"[bootstrap-quartz-content] {verb}: {copied} notes "
          f"({skipped} unpublished skipped) + {assets} assets -> Web/content/ "
          f"(flattened; Software Engineering.md -> index.md)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
