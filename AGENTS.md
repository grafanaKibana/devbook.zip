# AGENTS.md (Canonical)

This file is the single source of truth for humans + agents working in this Obsidian vault.

## Vault layout
- `Knowledge/` - primary taxonomy root (all new notes go here)
- `Templates/` - note templates (core Templates plugin)
- `NotionExport/` - staging for raw Notion exports
- `.sisyphus/notion-import/` - import scripts + reports/artifacts


## Tree + folder notes
- Use folders for structure: `Topic/`, `Topic/Subtopic/`, `Topic/Subtopic/Subsubtopic/`.
- Every folder has a hub note created by Folder Notes: `{{folder_name}}.md` (resolves to the folder name; effectively `<Folder>/<Folder>.md`).
- Folder note template path: `Templates/Template - Index.md`.
- New notes go under `Knowledge/` (no inbox).

## Concept template
- Concept pages use `Templates/Template - Concept Page.md`.
- Frontmatter keys: `topic`, `subtopic`, `level`, `priority`, `status`.

## Properties + migration policy
- Obsidian YAML frontmatter is the source of truth; do not map Notion properties into YAML (no Notion->YAML mapping).
- If Notion fields (Topic/Priority/Required Level/Status) appear, keep them only as non-authoritative body text.
- Add-only migration: never overwrite existing notes.
