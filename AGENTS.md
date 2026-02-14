# AGENTS.md (Vault Operating Contract)

Obsidian knowledge base. These rules govern all human and agent operations.

## Vault layout

- `Software Engineering/`: all notes go here. No inbox. Homepage: `Software Engineering/Software Engineering.md`.
- `Templates/`: note templates (examples, not mandatory headers). Start from template, delete irrelevant sections.
- `Assets/`: all attachments. Never place images/files inside `Knowledge/`.
- `Roadmap.canvas`: auto-generated vault map. Do not modify.

MUST NOT introduce new root folders or page types.

## Creating structure

### Hub notes (Folder Notes plugin)

Folders: `Topic/`, `Topic/Subtopic/`, `Topic/Subtopic/Subsubtopic/`.
Hub note auto-created inside each folder as `<Folder>/<Folder>.md` using `Templates/Template - Index.md`.

**INVARIANT**: Every hub note MUST have `tags: [FolderNote]` in frontmatter. Hub may be hidden in nav views — always verify tag exists.

### Concept pages

Use `Templates/Template - Concept Page.md`. Strict frontmatter:

```yaml
---
topic:
  - Programming
subtopic:
  - NET
level:
  - "1"
priority: Medium
status: Not-Started
---
```

- `topic`, `subtopic`, `level`: arrays of strings (even single values)
- `priority`: always `Medium`
- `status`: one of `Not-Started`, `Repetition`, `Creation`, `Ready To Repeat`, `Done`

Hub notes only need `tags: [FolderNote]`. Concept pages do NOT need FolderNote tag unless they are also hub notes.

## Formatting rules (STRICT)

- No placeholders in real notes (allowed only in `Templates/`).
- Every real note must have: intro ("what + why"), at least one concrete example, at least one real reference link.
- All links: Markdown syntax (no `[[wikilink]]` in authored text).
- Code fences: always specify language (`bash`, `json`, `yaml`, `mermaid`, etc.).
- Mermaid: only when it materially aids comprehension. Keep small. Avoid punctuation `()[]{},:;/|` in labels — write as words.

## Plugin essentials

- **Folder Notes**: auto-creates hubs; hidden in some views. Always verify `FolderNote` tag.
- **Dataview/DataviewJS**: enabled. Only trusted snippets.
- **Obsidian Git**: manual sync only. Remind user to sync after work.
- **Omnisearch**: vault-wide full-text search. No HTTP API.

## Workflow notes

- If request changes vault structure/formatting rules, ask user whether to update AGENTS.md Memory.

## Memory

- 
