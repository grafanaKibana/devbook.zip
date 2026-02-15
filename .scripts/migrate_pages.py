#!/usr/bin/env python3
"""Migrate vault pages to new template structure.

Transformation:
- Remove old nav block (## Parent + parent link + optional dataviewjs + ---) from top of body
- Append new nav block (# Whats next + parent link + updated dataviewjs) to bottom of body
"""

import os
import sys

VAULT_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Software Engineering")
SKIP_FILES = {"Software Engineering.md", "Questions.md"}

# New navigation block to append at the bottom (from template)
# Note: uses tab characters for indentation inside the if blocks, matching template exactly
NEW_NAV_BLOCK = """# Whats next

:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

```dataviewjs
const cur = dv.current();
const curFolder = cur.file.folder;
const curPath = cur.file.path;

const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const children = dv.pages()
  .where(p => p.file.folder.startsWith(curFolder + "/"))
  .where(p => p.file.folder.split("/").length === curFolder.split("/").length + 1)
  .where(p => p.file.name === p.file.folder.split("/").slice(-1)[0])
  .where(p => isFolderNote(p))
  .sort(p => p.file.folder, "asc");

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");
  
  if (children.length) {
\t  dv.header(2, "Topics");
\t  dv.list(children.map(p => p.file.link));
  }
  if (pages.length) {
\t  dv.header(2, "Pages");
\t  dv.list(pages.map(p => p.file.link));
  }
  
```

"""


def split_frontmatter(content):
    """Split content into frontmatter and body. Returns (frontmatter_with_delimiters, body)."""
    if not content.startswith('---'):
        return '', content
    
    # Find the closing ---
    second_dash = content.index('---', 3)
    end_of_frontmatter = content.index('\n', second_dash) + 1
    return content[:end_of_frontmatter], content[end_of_frontmatter:]


def remove_old_nav(body):
    """Remove old navigation block from the top of the body.
    
    Patterns handled:
    1. ## Parent + link + dataviewjs + --- (hub pages)
    2. ## Parent + link + --- (concept pages)
    
    Returns (cleaned_body, was_removed).
    """
    lines = body.split('\n')
    i = 0
    
    # Skip leading blank lines
    while i < len(lines) and lines[i].strip() == '':
        i += 1
    
    # Check for ## Parent
    if i >= len(lines) or lines[i].strip() != '## Parent':
        return body, False
    
    # Skip ## Parent line
    i += 1
    
    # Skip parent link line(s) - starts with :LiArrowUpLeft:
    while i < len(lines) and lines[i].startswith(':LiArrowUpLeft:'):
        i += 1
    
    # Skip blank lines
    while i < len(lines) and lines[i].strip() == '':
        i += 1
    
    # Check for dataviewjs block
    if i < len(lines) and lines[i].strip() == '```dataviewjs':
        # Skip entire code block
        i += 1
        while i < len(lines) and lines[i].strip() != '```':
            i += 1
        if i < len(lines):
            i += 1  # Skip closing ```
        
        # Skip blank lines after code block
        while i < len(lines) and lines[i].strip() == '':
            i += 1
    
    # Skip --- separator
    if i < len(lines) and lines[i].strip() == '---':
        i += 1
    
    # Build cleaned body from remaining lines
    remaining = '\n'.join(lines[i:])
    return remaining, True


def process_file(filepath, dry_run=False):
    """Process a single file. Returns (status_msg, changed)."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    frontmatter, body = split_frontmatter(content)
    cleaned_body, nav_removed = remove_old_nav(body)
    
    if not nav_removed:
        return "SKIP (no old nav block found)", False
    
    # Clean up: strip leading/trailing whitespace from body, but keep structure
    cleaned_body = cleaned_body.strip('\n')
    
    # Reassemble: frontmatter + content + new nav block
    result = frontmatter + cleaned_body + '\n\n' + NEW_NAV_BLOCK
    
    if dry_run:
        return "WOULD UPDATE", True
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(result)
    
    return "UPDATED", True


def main():
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("=== DRY RUN MODE ===\n")
    
    updated = 0
    skipped = 0
    errors = 0
    
    for root, dirs, files in sorted(os.walk(VAULT_ROOT)):
        for fname in sorted(files):
            if not fname.endswith('.md'):
                continue
            if fname in SKIP_FILES and os.path.dirname(os.path.join(root, fname)) == VAULT_ROOT:
                # Only skip if it's the root-level file
                rel = os.path.relpath(os.path.join(root, fname), VAULT_ROOT)
                print(f"  SKIP (excluded) {rel}")
                skipped += 1
                continue
            
            filepath = os.path.join(root, fname)
            rel = os.path.relpath(filepath, VAULT_ROOT)
            
            try:
                status, changed = process_file(filepath, dry_run)
                symbol = "✓" if changed else "·"
                print(f"  {symbol} {status}: {rel}")
                if changed:
                    updated += 1
                else:
                    skipped += 1
            except Exception as e:
                print(f"  ✗ ERROR: {rel} — {e}")
                errors += 1
    
    print(f"\n{'Would update' if dry_run else 'Updated'}: {updated}, Skipped: {skipped}, Errors: {errors}")


if __name__ == '__main__':
    main()
