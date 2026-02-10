# AGENTS.md (Canonical)

This file is the single source of truth for humans + agents working in this Obsidian vault.

## Root layout (v2)
- `Knowledge/` - primary taxonomy root (all new notes go here)
- `Templates/` - note templates (core Templates plugin + Folder Notes templatePath)

Legacy/transition roots (avoid for new content): `Software Engineering/`.

## Tree + index rule
- Use folders for structure: `Topic/`, `Topic/Subtopic/`, `Topic/Subtopic/Subsubtopic/`.
- Every folder MUST contain an `index.md` that acts as the local hub for that folder.
- New notes go in the correct folder under `Computer Science/` (no inbox).

## Navigation model
- Navigation is via folder index notes.
- Index notes provide:
  - Up: parent folder `index.md`
  - Down: child folders' `index.md`
  - Left/Right: sibling folders' `index.md` when useful

## Navigation links
- Keep navigation in folder `index.md` notes (Up + Children + Pages).
- Avoid putting index links in concept notes' `## Further Reading` (keep Further Reading for external refs).

## Templates (copy/paste)

### Folder index (`index.md`)
```markdown
# <Folder Name>

Up: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/index", regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

## Children
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE file.name = "index"
  AND regexmatch("^" + this.file.folder + "/[^/]+/index\\.md$", file.path)
SORT file.folder ASC
```

## Pages
```dataview
LIST
WHERE file.folder = this.file.folder
  AND file.name != "index"
SORT file.name ASC
```
```

### Concept page
```markdown
---
topic: []
subtopic: []
level: 1
priority: medium
status: Not-Started
---

# <Title>

## Intro

## Deeper Explanation

## Further Reading
```

## Concept notes: frontmatter schema (exact keys + enums)
Use YAML frontmatter on knowledge notes. Do not add extra keys.

```yaml
---
topic: []
subtopic: []
level: 1              # allowed: 1|2|3|4
priority: medium      # allowed: low|medium|high
status: Not-Started   # allowed: Not-Started|Creation|Repetition|Ready-To-Repeat|Done
---
```

## Concept notes: required headings
Every concept note MUST include these headings (exact spelling):
- `## Intro`
- `## Deeper Explanation`
- `## Further Reading`

Other sections from the template (e.g., Examples, Pitfalls, Related Notes) are optional but recommended.

## Plugins we rely on (installed)
- Dataview (index listing queries)
- Templater (template expansion)
- Omnisearch (full-text search)
- Obsidian Git (sync/versioning workflow)
- Terminal (in-vault command execution)
- Folder Notes (click folder -> opens its `index.md`)
