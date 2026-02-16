# AGENTS.md (Vault Operating Contract)

Obsidian knowledge base. These rules govern all human and agent operations.

## Vault layout

- The editable Obsidian vault lives under `Vault/` in this repo.
- `Vault/Software Engineering/`: all notes go here. No inbox. Homepage: `Vault/Software Engineering/Software Engineering.md`.
- `Vault/Templates/`: note templates (examples, not mandatory headers). Start from template, delete irrelevant sections.
- `Vault/Assets/`: all attachments. Never place images/files inside `Vault/Software Engineering/`.
- `Vault/Software Engineering/Roadmap.canvas`: auto-generated roadmap map. Do not modify.

## Repository layout (publishing)

- `src/site/notes/`: exported notes for the website build (Digital Garden / Eleventy input). Prefer editing in `Vault/` and treating this as generated output unless you are explicitly fixing the publish/export layer.

MUST NOT introduce new root folders or page types.

## Creating structure

### Hub notes (Folder Notes plugin)

Folders: `Vault/Software Engineering/<Topic>/`, `Vault/Software Engineering/<Topic>/<Subtopic>/`, etc.
Hub note auto-created inside each folder as `<Folder>/<Folder>.md` using `Vault/Templates/Pages/Template - Index.md`.

Folder Notes plugin identifies folder notes by name/location (template like `{{folder_name}}`), not by frontmatter tags.
This vault also uses `tags: [FolderNote]` as a convention to drive Dataview/Bases filters and hub detection.

**INVARIANT**: Every hub note MUST have `tags: [FolderNote]` in frontmatter. Hub may be hidden in nav views — always verify tag exists.

### Concept pages

Use `Vault/Templates/Pages/Template - Concept Page.md`. Strict frontmatter:

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
- `priority`: `Low`, `Medium`, or `High` (default: `Medium`)
- `status`: one of `Not-Started`, `Repetition`, `Creation`, `Ready To Repeat`, `Done`

Hub notes only need `tags: [FolderNote]`. Concept pages do NOT need FolderNote tag unless they are also hub notes.

## Formatting rules (STRICT)

- No placeholders in real notes (allowed only in `Vault/Templates/`).
- Every real note must have: intro ("what + why"), at least one concrete example, at least one real reference link.
- Internal links: Obsidian wikilinks are allowed and common (prefer `[[path/to/note|Title]]` for internal references).
- External links: Markdown links (`[Title](https://...)`).
- Code fences: always specify language (`bash`, `json`, `yaml`, `mermaid`, etc.).
- Mermaid: only when it materially aids comprehension. Keep small. Avoid punctuation `()[]{},:;/|` in labels — write as words.

### Note quality bar (Senior .NET + AI)

These rules exist to make notes useful for the Senior .NET / AI engineering roles (learning + interview readiness). Apply them when creating or upgrading notes under `Vault/Software Engineering/`.

- `dg-publish: true` notes MUST meet the quality bar below; otherwise keep `dg-publish: false` until ready.
- Prefer short, high-signal writing: decision rules, pitfalls, and concrete examples over broad definitions.

Required content (for any non-trivial concept page)

- **Intro**: 2-5 sentences in your own words: what it is + why it matters + when you reach for it.
- **Mental model**: a small explanation that makes the topic "click" (often a diagram or a 5-10 bullet cheatsheet).
- **Example**: at least one representative example.
  - .NET: prefer a `csharp` code snippet, and optionally a `json`/`yaml` config snippet.
  - AI/LLM: prefer an end-to-end request/response shape, evaluation snippet, or a minimal pipeline pseudo-code.
- **Pitfalls**: at least 3 "gotchas" when the topic is used in real systems (perf, correctness, security, operations).
- **Tradeoffs**: when there are multiple plausible choices, include pros/cons and decision criteria.
- **Questions**: include 1-3 tricky / interview-style questions (scenario-based, tradeoff-heavy) with expected answers with explanation why.
- **References**: at least 2 external links.
  - At least 1 should be an "anchor" reference (official docs/spec/RFC/vendor-neutral standard).
  - At least 1 should be a "practice" reference (battle-tested blog/paper/tutorial that explains pitfalls).

Mermaid diagram triggers

Add a Mermaid diagram when it reduces cognitive load, especially for:

- Request/response flows (ASP.NET Core middleware, auth, OAuth/OIDC) → `sequenceDiagram`
- Lifecycle/state (GC, circuit breaker, retries, caching states) → `stateDiagram-v2`
- Decision trees (when to use X vs Y) → `flowchart`
- Architecture boundaries and dependencies → small `flowchart`/`graph` (C4-style simplified)
- Data model relationships (EF Core, indexing, schemas) → `erDiagram` or `classDiagram`

Tradeoffs and pros/cons triggers

If the topic has multiple competing options, include a short comparison (table is fine):

- .NET: `Task` vs `ValueTask`, `IEnumerable` vs `IAsyncEnumerable`, `Singleton` vs `Scoped`, `Include` vs projection, middleware vs filters.
- AI: RAG vs fine-tuning, hybrid search vs vector-only, LLM-as-judge vs human eval, caching vs freshness, safety filters vs false positives.

Question quality rules

- Prefer scenario questions that force judgment (scale, latency, cost, failure modes) over trivia.
- Each question should have a short "expected answer" (3-8 bullets) and mention key tradeoffs.

Reference hygiene

- Prefer stable/primary sources when available (Microsoft Learn/.NET API refs, RFCs, OWASP, NIST, Kubernetes docs).
- Avoid link dumps; pick a few high-signal links and say what each is good for.

### Publishing frontmatter

- `dg-publish: true` marks a note publishable.
- `dg-home: true` marks the Digital Garden home note (currently `Vault/Software Engineering/Software Engineering.md`).

## Plugin essentials

- **Folder Notes**: auto-creates hubs; hidden in some views. Always verify `FolderNote` tag.
- **Templater**: templates in `Vault/Templates/` write/normalize frontmatter.
- **Dataview/DataviewJS**: enabled. Only trusted snippets.
- **Bases**: `.base` files define filtered views (e.g., `Vault/Software Engineering/Topics.base`).
- **Digital Garden**: uses `dg-*` frontmatter and drives the publish/export flow.
- **Obsidian Git**: manual sync only. Remind user to sync after work.
- **Omnisearch**: vault-wide full-text search. No HTTP API.

## Workflow notes

- If request changes vault structure/formatting rules, ask user whether to update AGENTS.md Memory.

## Memory

- 
