#!/usr/bin/env python3
"""Bootstrap Quartz content from the Obsidian vault.

Copies published (`dg-publish: true`) notes and their referenced assets from the
Obsidian vault into Quartz's `content/` directory. This is the Phase-0 baseline
content pipeline (a plain, Vercel-safe committed copy) and doubles as the
fallback pipeline if quartz-syncer's monorepo/subpath setup is rejected.

Layout:
  Vault/Software Engineering/**  ->  Web/content/Software Engineering/**   (published .md/.canvas/.base)
  Vault/Assets/**                ->  Web/content/Assets/**                 (all assets)

The publish gate mirrors the existing Digital Garden convention: a note is
published when its frontmatter has `dg-publish: true`. Non-markdown content
(.canvas, .base, images) is copied wholesale.
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

CONTENT_ROOT = REPO_ROOT / "Web" / "content"
SE_DEST = CONTENT_ROOT / "Software Engineering"
ASSETS_DEST = CONTENT_ROOT / "Assets"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
DG_PUBLISH_RE = re.compile(r"^dg-publish:\s*true\s*$", re.IGNORECASE | re.MULTILINE)

# Content file types that ship as-is (no publish parsing).
PASSTHROUGH_SUFFIXES = {".canvas", ".base"}


def is_published(md_path: Path) -> bool:
    """True when the note's frontmatter declares `dg-publish: true`."""
    try:
        text = md_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return False
    match = FRONTMATTER_RE.match(text)
    if not match:
        return False
    return bool(DG_PUBLISH_RE.search(match.group(1)))


def copy_tree_filtered(src: Path, dest: Path, *, dry_run: bool) -> tuple[int, int]:
    """Copy published notes + passthrough content from src to dest.

    Returns (copied, skipped) counts for markdown notes.
    """
    copied = skipped = 0
    for path in sorted(src.rglob("*")):
        if path.is_dir():
            continue
        rel = path.relative_to(src)
        target = dest / rel
        suffix = path.suffix.lower()

        if suffix == ".md":
            if not is_published(path):
                skipped += 1
                continue
            copied += 1
        elif suffix in PASSTHROUGH_SUFFIXES:
            pass  # always copy
        else:
            continue  # ignore stray non-content files under the notes tree

        if not dry_run:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    return copied, skipped


def copy_assets(dry_run: bool) -> int:
    """Copy the whole Assets tree; returns file count."""
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


INDEX_PLACEHOLDER = """\
---
title: DEVBOOK
---

> [!info] Baseline landing page
> This placeholder is replaced in Phase 2 by a native Quartz component that
> renders the topic dashboard (card grid + progress bars). For now, browse the
> knowledge base:

- [[Software Engineering/Software Engineering|Software Engineering]]
- [[Software Engineering/Questions|Questions]]
"""


def write_index(dry_run: bool) -> None:
    index = CONTENT_ROOT / "index.md"
    if index.exists():
        return
    if not dry_run:
        index.write_text(INDEX_PLACEHOLDER, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clean", action="store_true",
                        help="remove Web/content/{Software Engineering,Assets} before copying")
    parser.add_argument("--dry-run", action="store_true",
                        help="report counts without writing")
    args = parser.parse_args()

    if not SE_SRC.exists():
        print(f"ERROR: source not found: {SE_SRC}", file=sys.stderr)
        return 1

    if args.clean and not args.dry_run:
        for d in (SE_DEST, ASSETS_DEST):
            if d.exists():
                shutil.rmtree(d)

    copied, skipped = copy_tree_filtered(SE_SRC, SE_DEST, dry_run=args.dry_run)
    assets = copy_assets(args.dry_run)
    write_index(args.dry_run)

    verb = "would copy" if args.dry_run else "copied"
    print(f"[bootstrap-quartz-content] {verb}: {copied} published notes "
          f"({skipped} unpublished skipped), {assets} assets -> Web/content/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
