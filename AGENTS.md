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

Status tracks both note completeness and personal learning progress (spaced repetition). Lifecycle: `Not-Started` → `Creation` → `Ready To Repeat` → `Repetition` → `Ready To Repeat` (another cycle) or `Done`.

| Status | Meaning |
|--------|---------|
| `Not-Started` | Stub/placeholder — no content written, topic not yet studied. |
| `Creation` | Work in progress — note is being written and/or topic is being studied for the first time. |
| `Ready To Repeat` | Note content is complete and queued for spaced repetition. |
| `Repetition` | Currently in active review — re-reading and reinforcing knowledge. **User-only.** |
| `Done` | Mastered and note complete. **User-only.** |

Agent rule: agents may set `Not-Started`, `Creation`, or `Ready To Repeat`. Agents must never set `Repetition` or `Done`.

Hub notes only need `tags: [FolderNote]`. Concept pages do NOT need FolderNote tag unless they are also hub notes.

### Placement and scope check (before creating pages)

Before creating a new page, the agent MUST evaluate whether the user's request is the best approach for the vault structure. This check runs even when the request seems unambiguous.

**Evaluate:**

1. **Folder placement** — Is the requested folder the most appropriate home? Does a more specific subfolder exist, or would a different topic area be a better fit?
2. **Naming** — Does the proposed name match vault conventions and existing naming patterns? Would a different name be clearer or more discoverable?
3. **Scope** — Should this be a standalone page, or would the content fit better as a new section in an existing page that already covers related material?
4. **Duplication** — Does a page covering this topic (or a near-synonym) already exist?

If any check suggests a better approach, present the alternative concisely and let the user decide:

```text
I'd suggest a different approach:

You asked: [what the user requested]
I'd recommend: [alternative — different folder / name / merge into existing page]
Why: [brief reason]

Should I go with my recommendation, or proceed with your original request?
```

If all checks pass, proceed without asking.

## Formatting rules (STRICT)

- No placeholders in real notes (allowed only in `Vault/Templates/`).
- Every real note must have: intro ("what + why"), at least one concrete example, at least one real reference link.
- Internal links: Obsidian wikilinks are allowed and common (prefer `[[path/to/note|Title]]` for internal references).
- External links: Markdown links (`[Title](https://...)`).
- **Heading levels.** Open each note with `# Intro` (H1). Every other section heading is H2 (`##`); use H3 (`###`) only for nested detail inside a section. Do not give any section other than `Intro` an H1 heading.
- **Source section naming.** On concept pages, title the closing list of external sources `## References` (annotated links to docs/primary sources). Reserve `## Links` for hub/folder notes, where it lists child and related pages.
- **No manual folder navigation.** Do not add "Detailed Pages", "See also", or link lists enumerating sibling/child pages in the same folder. The pre-commit hook auto-generates a "Whats next" callout with parent, topic, and sibling links. Targeted cross-links between specific related concepts are fine (e.g., "see [[Task vs ValueTask]]" inside a discussion) — just do not duplicate the auto-generated navigation.
- **Code fences (enforced)**
  - Every fenced code block MUST specify a language. This is enforced automatically via `markdownlint-cli2` (rule MD040) on staged files before commit.
  - Accepted Obsidian-specific block languages: `mermaid`, `dataview`, `dataviewjs`.
  - When no specific language applies, use `text` as the fallback (never leave the language blank).
  - To embed a fenced code block example inside a note (e.g., in documentation), use a quadruple fence to wrap it:

    ````markdown
    ```text
    example content
    ```
    ````

  - To find existing notes with unlabeled fences, run `npm run lint:md:all`; add a language or change to `text` for generic output blocks.
  - **MD040 migration path**: enforcement is staged-only. The pre-commit hook blocks new unlabeled fences but does NOT require fixing the existing backlog immediately. Fix existing fences gradually as you touch files. When fixing: use `text` for generic or unknown blocks; use the real language where the content is clearly identifiable (`bash`, `csharp`, `json`, `yaml`, `mermaid`, `dataview`, `dataviewjs`).
- Mermaid: only when it materially aids comprehension. Keep small. Avoid punctuation `()[]{},:;/|` in labels — write as words.

### Note quality bar (Senior .NET + AI)

These rules exist to make notes useful for the Senior .NET / AI engineering roles (learning + interview readiness). Apply them when creating or upgrading notes under `Vault/Software Engineering/`.

- `dg-publish: true` notes MUST meet the quality bar below; otherwise keep `dg-publish: false` until ready.
- Prefer short, high-signal writing: decision rules, pitfalls, and concrete examples over broad definitions.

Writing paradigm

Eight principles govern note content. Apply them as judgment calls, not checklists.

1. **Concrete over abstract** — Ground every claim in a specific example, mechanism, or scenario. Never write "it depends" without showing on what. Never describe a technique without showing what it does to real input.
2. **Show the machine** — Explain how things actually work: what goes in, what comes out, what breaks if you get it wrong. The reader should understand the mechanism, not just the label.
3. **Depth matches complexity** — A note's size must be proportional to the topic's actual complexity. Simple topics get compact notes. Complex topics earn detailed explanations. (See "Scope-to-depth fit" below for specifics.)
4. **Scannable by design** — A note is a reference the reader returns to, not a one-time tutorial. Someone searching for a specific pitfall or comparing two approaches should orient immediately without reading from the top. Consistent internal structure and labeled transitions (bold phrases that signal what follows — mechanism, use case, risk, mitigation) serve as landmarks the way API documentation lets you jump to the method you need.
5. **Opinionated over neutral** — Comparisons exist to help the reader decide, not to present a balanced menu. Every table, every list of alternatives should leave the reader with a concrete recommendation and the conditions under which it changes. Neutral enumeration without a decision rule forces the reader to do the synthesis work the note should have done.
6. **Symmetric treatment** — When a note presents multiple alternatives, each one deserves the same questions answered at the same depth. If one approach gets a mechanism explanation, failure modes, and use cases, every other approach should too. Asymmetry signals incomplete understanding and undermines trust in the comparison.
7. **Tradeoff-anchored** — Engineering is choosing under constraints, not following best practices. Every recommendation, every pitfall mitigation, every question answer should make the cost explicit. "Use X" is incomplete; "Use X — it costs Y, which is acceptable when Z" is engineering advice.
8. **Plain engineer's voice** — Write the way a senior engineer explains something to a peer at a whiteboard: direct, unadorned, occasionally blunt. The tells of generated prose are specific and cuttable — hype adjectives ("powerful", "robust", "seamless", "crucial", "essential", "rich"), inflated verbs ("leverage", "utilize", "facilitate", "delve into"), throat-clearing transitions ("That said", "Moreover", "It's worth noting that"), and meta-signposting ("In this note we'll explore", "As we can see", "In summary"). Cut them when they are filler; keep a word only when it carries real meaning. Don't restate the heading in a section's first sentence, don't open by claiming the topic is "one of the most important", and don't end with a summary that repeats what was already said — stop at the last real point. Vary sentence and paragraph length; uniform rhythm and a relentless rule-of-three cadence are themselves a tell. Name real things throughout the prose, not just in examples — actual API names, real numbers, specific error messages. Let the mechanism and the numbers carry the weight; the prose should disappear.

These principles override specific section rules. If following a section template produces abstract filler, cut the section.

These principles apply recursively. In a note covering multiple approaches, patterns, or strategies, apply them to each sub-concept — not just to the note as a whole.

Required content (for any non-trivial concept page)

- These are content requirements, not mandatory section headings. For simple topics, keep content compact under `Intro`.

- **Intro**: 2-5 sentences in your own words: what it is + why it matters + when you reach for it.
  - **MUST include** mechanism explanation in `Intro` when the concept has non-obvious mechanics, lifecycle/flow behavior, or decision logic readers must understand to use it correctly.
  - Explain cause/effect in plain language and include at least one concrete example or small diagram walkthrough when useful.
  - Quality over quantity: no minimum bullet count; one concise, well-explained narrative is better than many short statements.
  - Do not use disconnected one-liners that state facts without explaining why they matter.
- **Example content**: at least one concrete example that shows real usage.
  - For simple topics, the example can be inline under `Intro`; a standalone `Example`/`Examples` heading is optional.
  - .NET: prefer a `csharp` code snippet, and optionally a `json`/`yaml` config snippet.
  - AI/LLM: prefer an end-to-end request/response shape, evaluation snippet, or a minimal pipeline pseudo-code.
  - Agentic AI / agent orchestration: prefer C# with Microsoft Agent Framework (`Microsoft.Agents.AI.*` packages) over Python or Semantic Kernel. MAF is the direct successor to SK and AutoGen; use MAF APIs (`AIAgent`, `ChatClientAgent`, `AgentWorkflowBuilder`) for all agent code examples.
  - Examples should read like they come from a real system — specific metrics, error codes, dollar amounts, tenant names — so the reader trusts the advice and can map it to their own production context. Abstract "imagine a scenario" setups signal theoretical reasoning rather than experience.
- **Pitfalls**: conditional content. Include only when the topic has non-obvious real-world failure modes.
  - **MUST include** pitfall coverage when the topic has at least one non-obvious production failure mode (performance, correctness, security, reliability, or operations).
  - **MAY omit** a standalone `Pitfalls` heading when there are no meaningful pitfalls, or when one short caution can be covered inline in `Intro`.
  - If `Pitfalls` exists, each item must include:
    - what can go wrong (specific scenario)
    - why it happens (cause/mechanism)
    - how to avoid or detect it (mitigation/guardrail)
  - Name each pitfall heading after the specific failure mode so a reader scanning can identify relevant risks without reading the body.
- Do not add generic filler such as "handle errors" or "write tests" unless tied to a concrete topic-specific failure.
- **Tradeoffs**: conditional section. Include only when there are multiple plausible choices that a senior engineer would realistically compare.
  - **MUST include** a `Tradeoffs` section when there are 2+ viable options and the right choice depends on constraints.
  - **MAY omit** `Tradeoffs` when one approach is clearly dominant for this scope, or alternatives are out of scope/deprecated.
  - If `Tradeoffs` exists, compare concrete options with decision criteria (latency, memory, complexity, operability, cost, team constraints).
  - Do not create strawman comparisons (real option vs obviously bad option).
  - Close every comparison with a concrete decision rule — what to start with, when to switch, what signals indicate the current choice is wrong. The reader should leave with a decision, not a menu.
- **Questions**: conditional content. Include when the topic has non-obvious interview value — judgment calls, tradeoffs, or failure modes that test engineering reasoning beyond what the intro already explains.
  - **MUST include** questions when the topic involves decisions a senior engineer should be able to articulate under pressure (architecture choices, failure analysis, performance tradeoffs).
  - **MAY omit** questions when the topic is definitional or mechanical — where the intro already teaches everything worth knowing and a question would just ask the reader to repeat it.
  - If `Questions` exists, each should have a short expected answer (3-8 bullets) that demonstrates judgment, not recall.
- **References**: conditional depth. At least 1 external link (official docs or primary source) for any published page.
  - For non-trivial topics, include 2-10 links with at least 1 anchor source (official docs/spec/RFC) and 1 practice source (practitioner blog/postmortem/production deep-dive).
  - For simple/definitional topics, a single official docs link is sufficient — do not pad with marginally relevant links to hit a count.

Section minimalism rule

- For simple topics, prefer a compact note: `Intro` + inline example + `References`.
- Add standalone `Examples` and `Pitfalls` headings only when they add unique value beyond Intro.
- If a section would be only 1-2 short sentences with no extra clarity, merge it into `Intro`.
- Avoid creating multiple tiny sections that fragment one idea.

Scope-to-depth fit

A note's depth must match its topic's actual complexity. More content is not always better.

- **Small/definitional topics** (e.g., a single enum, a short principle like YAGNI, a trivial command): keep it compact. `Intro` + inline example + `References` is often sufficient. Do NOT force `Pitfalls`/`Tradeoffs`/`Questions` sections when they would be filler or padding.
- **Topics with non-obvious mechanics** (e.g., GC, Async/Await, OAuth flow, caching eviction): the intro MUST include or reference a mechanism explanation (cause/effect in plain language). Include `Pitfalls` when real failure modes exist. Include `Tradeoffs` when 2+ realistic options exist.
- **Topics with multiple competing approaches** (e.g., Task vs ValueTask, RAG vs fine-tuning): include a `Tradeoffs` section with concrete decision criteria, not a strawman comparison.

Reviewer check: Does the note have the right depth for its topic? Flag overstuffed small notes and underwritten complex notes equally.

**Publish gate for `dg-publish: true`**: A published note MUST have non-empty, substantive content — not a template skeleton or a heading with no body. This is content-based, not status-based. A note can be `status: Creation` and still be published if it already has meaningful content.

Note size and splitting

When a note grows large, the reviewer MUST include a **Split Suggestion** section in their output — either recommending a split or explicitly justifying why it's not needed.

**Heuristic trigger**: suggest a split when a note is **>1200 words OR >12 headings**, AND it covers **2+ distinct concepts** (separate definitions, concerns, or decision contexts that could each stand alone).

Reviewer commands to measure size quickly:

```bash
wc -w "<note>.md"           # word count
rg -c "^#+\s" "<note>.md"   # heading count
```

**Decision tree**:

- The note is a **grab-bag / category overview** (e.g., covering DNS, HTTP, and Sockets in one file) → Convert to a **hub note (FolderNote)** + individual sub-notes per concept.
- The note covers **2-3 separable concepts** that can each stand without the original (e.g., combining CQRS and Event Sourcing in one file) → **Split into peer concept notes** in the same folder; add cross-links between them.

**This rule is a suggestion, not a mandate.** The reviewer must justify their recommendation; the author decides whether to split.

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

- Prefer direct interview questions that force judgment (scale, latency, cost, failure modes) over trivia.
- Avoid scenario-based stems that set up a specific situation before the question ("A team does X and Y happens", "A system uses X with Y configuration"). Prefer direct questions that ask about the concept ("Why can X cause Y?", "When is X justified over Y?", "How does X reduce Y?").
- Use precise action verbs in stems when helpful: explain, compare, evaluate, choose, justify.
- Each question should have a short "expected answer" (3-8 bullets) and mention key tradeoffs.
- Answers should close with an explicit tradeoff statement. The goal is to train engineering judgment — thinking in constraints and costs — not factual recall.

Reference hygiene

- Prefer stable/primary sources when available (Microsoft Learn/.NET API refs, RFCs, OWASP, NIST, Kubernetes docs).
- Avoid link dumps; keep references focused and capped at 10 links.
- Do not add documentation index/hub pages that mostly link to other pages; link the specific page with the actual guidance.
- Do not add links that are not directly useful for learning the current topic.
- When updating an existing note, de-duplicate references first; replace weaker/older links instead of only appending new ones.
- Prefer at least one practitioner source with first-hand implementation insight, not only vendor documentation.
- Annotate each reference so the reader can assess its relevance without clicking — briefly describe what the page covers and who wrote it. The reader should know what they will find before they leave the note.

### Mandatory reviewer subagent gate

This gate applies to all created or updated notes under `Vault/Software Engineering/`.

- Main agent MUST spawn a dedicated reviewer subagent at the end of each edit batch, before marking work complete.
- This gate is mandatory for all note changes.
- Reviewer subagent is suggest-only: it MUST NOT edit files directly.
- Completion is blocked until the reviewer reports zero findings.

Reviewer objective

- Validate technical correctness and remove unsupported claims.
- Validate source legitimacy and reference quality.
- Ensure explanation style is understandable for software engineers.
- Ensure the note is a quick intro: what it is, why it matters, core mechanics, and interview readiness.
- Ensure deeper study is delegated to curated references.

Reviewer output contract (strict)

- Treat every finding as a blocking error until fixed.
- Provide a detailed summary with each finding explained using:
  - what is wrong
  - why it is wrong or risky
  - exact change required to fix it
  - which rule it violates
- Do not return generic advice. Feedback must be file-specific and actionable.
- Every review MUST include a **Split Suggestion** section. When the note exceeds the size heuristic (>1200 words OR >12 headings AND 2+ distinct concepts), include a specific split recommendation. Otherwise, include "Split Suggestion: No split needed — [brief justification]".

Minimum validation checklist (must all pass)

- Frontmatter and section structure match this contract and the selected template.
- Intro is clear, concise, and in own words.
- The core explanation is accurate and understandable.
- At least one concrete example exists.
- Interview-style questions are meaningful and include expected answers. Questions MAY be omitted when the topic is definitional and the intro already covers everything worth knowing.
- References include at least 1 external link (official docs or primary source). For non-trivial topics, at least:
  - 1 anchor source (official docs/spec/RFC/vendor-neutral standard)
  - 1 practice source (reputable real-world implementation guidance)
- Any non-obvious production failure mode includes cause, impact, and mitigation.
- Any real choice between viable options includes tradeoffs.
- All fenced code blocks have a language specified (MD040). Use `text` for generic blocks.
- Scope-to-depth fit: note depth matches topic complexity (not overstuffed for small topics; not thin for complex ones).
- Split heuristic checked: if >1200 words OR >12 headings AND 2+ distinct concepts, Split Suggestion is included.
- Writing paradigm: note feels scannable (reader orients without reading from the top), opinionated (comparisons end with recommendations), symmetric (alternatives get equal treatment), and tradeoff-anchored (costs are explicit).
- Voice: reads like a human engineer — no hype adjectives, inflated verbs, throat-clearing transitions, meta-signposting, heading restatement, or summary-restate endings; sentence and paragraph rhythm varies; real names and numbers appear in the prose, not only in code blocks.
- References are annotated so the reader can assess relevance without clicking.

Mandatory reviewer prompt format

Use this structure when spawning the reviewer subagent:

Compact repo instructions for future OpenCode sessions. Keep this file limited to facts an agent would likely miss without reading several repo files.

## Repo shape

- This repo has three top-level work areas: `Vault/` for editable Obsidian content, `Web/` for the Eleventy/Digital Garden site, and `Platform/DevBook/` for the .NET RAG API PoC.
- Do not create new root app folders outside `Platform/`, `Vault/`, and `Web/` unless the user explicitly asks for a restructure.
- `Web/src/site/notes/` is Digital Garden export output. Prefer editing notes in `Vault/`; touch exported notes only when fixing the publish/export layer.
- `Vault/Software Engineering/Roadmap.canvas` is generated by `.scripts/generate-roadmap.py`; do not hand-edit it.
- Root `.github/` has Dependabot only; no CI workflows are present. Local verification and the pre-commit hook are the executable checks.

## Commands

- Web setup/dev/build from `Web/`:
  - `npm install`
  - `npm start`
  - `npm run build`
  - `npm run lint:md:all` to lint all vault notes for fenced-code-block languages.
- Deployment config runs the same Web commands: root `vercel.json` uses `cd Web && npm install` and `cd Web && npm run build`, outputting `Web/dist`.
- .NET API commands from repo root:
  - `dotnet run --project Platform/DevBook/DevBook.API/DevBook.API.csproj`
  - `dotnet build Platform/DevBook/DevBook.API/DevBook.API.csproj`
  - `dotnet test Platform/DevBook/DevBook.Tests/DevBook.Tests.csproj`
- `Platform/DevBook/DevBook.slnx` lists the three projects, but the README documents project-file commands; target `.csproj` files for focused runs.

## Git hook and generated changes

- Git is configured with `core.hooksPath=.githooks`; `.githooks/pre-commit` runs only when staged Markdown files are under `Vault/`.
- The hook mutates and re-stages vault files in this order: folder rollup frontmatter, `Whats next` callouts, `Roadmap.canvas`, then Markdown MD040 lint.
- MD040 is the only markdownlint rule (`Web/.markdownlint.json`): every fenced code block in staged vault notes needs a language. Use `text` for generic blocks.
- Do not manually add folder navigation sections such as sibling/child link lists; `render-whats-next.py` owns the marker block between `<!-- whats-next:start -->` and `<!-- whats-next:end -->`.
- Never commit unless the user explicitly asks. Leave hook-generated changes visible for the user if you are not committing.

## Vault content rules

- Open/edit the Obsidian vault at `Vault/`. All real notes belong under `Vault/Software Engineering/`; attachments belong under `Vault/Assets/`.
- Before creating or moving a note, check placement, naming, scope, and duplication against existing notes. If a better location/name/merge target is clear, present that recommendation instead of blindly creating a duplicate.
- Hub notes are folder notes named `<Folder>/<Folder>.md` and must keep `tags: [FolderNote]`; the tag drives rollups/views even though Folder Notes also recognizes the filename.
- Concept-note frontmatter uses arrays for `topic`, `subtopic`, and `level`, plus `priority` and `status`. Agents may set only `Not-Started`, `Creation`, or `Ready To Repeat`; never set `Repetition` or `Done`.
- `dg-publish: true` means the note is publishable. Only set it when the note has substantive content, at least one concrete example, and at least one useful external reference.
- Real notes must not contain template placeholders. Start from `Vault/Templates/Pages/Template - Concept Page.md` or `Template - Index.md`, then delete irrelevant scaffold.
- Prefer wikilinks for internal note links and Markdown links for external references. Do not create documentation-index pages that mostly duplicate folder navigation.

## Note quality bar

- Optimize notes for Senior .NET / AI interview readiness: concrete mechanisms, decision rules, production pitfalls, tradeoffs, and concise expected answers where questions add value.
- Keep simple topics compact (`Intro` with an inline example and references is enough). Add `Pitfalls`, `Tradeoffs`, diagrams, or questions only when they teach non-obvious mechanics or judgment.
- Every non-trivial claim should be grounded in a concrete example, a mechanism, or a reference. Avoid abstract filler like “handle errors” unless tied to a topic-specific failure mode.
- If a note compares options, treat options symmetrically and close with a decision rule: when to start with one option, when to switch, and what cost changes the decision.
- For .NET examples, prefer `csharp`; for AI/agent orchestration examples, prefer C# with Microsoft Agent Framework APIs over Python or older Semantic Kernel/AutoGen patterns.
- After creating or updating notes under `Vault/Software Engineering/`, run a reviewer subagent before completion. It must not edit files and must return PASS or exact blocking fixes, including split suggestion, reference quality, MD040, and scope-to-depth fit.

## Web site rules

- `Web/` is an Eleventy 3.x site generated from Digital Garden output plus customizations.
- Safe customization areas are `Web/src/site/styles/user/` and `Web/src/site/_includes/components/user/`; README notes that some stock files are modified and may need reapplying after template updates.
- Web runtime expects Node `24.x` per `Web/package.json`; `Web/package-lock.json` still says Node `22.x` and has a `markdown-it-mathjax3` version mismatch, so prefer `npm install` over assuming `npm ci` is clean until the lockfile is refreshed.
- Personal site metadata/contact overrides are loaded from `Web/.env.local`; this repo does not currently ignore that file, so do not put secrets there unless it is explicitly ignored or kept out of commits.

## Platform API rules

- `Platform/DevBook/` is a small .NET `net10.0` R&D PoC for learning RAG and agentic-system mechanics, not an enterprise production product. Favor code that makes the mechanics easy to study over production abstractions.
- Projects: `DevBook.API` minimal ASP.NET Core host, `DevBook.Data` ingestion/chunking/MongoDB/embedding logic, `DevBook.Tests` xUnit tests.
- Runtime config currently needs `ConnectionStrings:MongoDb` and `EmbeddingOptions:ApiKey` (for env vars, use `EmbeddingOptions__ApiKey`; current code does not map bare `OPENAI_API_KEY`). The Mongo database name is hard-coded as `DevBook` in `Program.cs`; do not commit secrets in `appsettings*.json`.
- Default ingestion root is `Vault/Software Engineering` via `IngestionOptions:ContentRootPath`; ingestion paths must stay relative to that root.
- `/rag/search` requires Atlas MongoDB `$vectorSearch` and the `chunks_embedding_vector_idx` index with `384` dimensions on `Embedding`. Local/non-Atlas MongoDB is enough only for basic storage experiments.
- `/rag/ask` is intentionally mock-only for now; do not imply it calls MongoDB or an LLM unless implementing that feature.
- **Conservative API logging.** When adding or changing API operations, think explicitly about progress logging at operation boundaries. Log start/end for user-triggered or startup-blocking work such as ingestion, RAG search/ask, index creation, embedding batches, and LLM calls when they can take noticeable time or fail externally. Prefer service-boundary logs over endpoint-only logs so the behavior is visible from every caller. Use structured `ILogger` messages with stable field names and elapsed milliseconds from `Stopwatch`; include safe operational metadata such as source path, file name, strategy names, requested/normalized counts, candidate/result/source counts, mode, dimensions, and collection/index names. Do not log secrets, connection strings, API keys, raw prompts, questions, answers, query text, markdown content, chunk text, embeddings, document IDs, or full exception-sensitive payloads unless the user explicitly asks for temporary debugging. Keep logs conservative: `Information` for operation start/end and major per-collection/per-strategy milestones, `Debug` for noisy internals, no per-item logs inside large loops unless diagnosing a specific bug.

## Obsidian tooling

- Default to file tools for reads/writes. Use Obsidian CLI only when you need Obsidian-index behavior such as backlinks, tags, or wikilink resolution.
- Obsidian CLI requires Obsidian running and uses `=` parameters, for example `obsidian vault="DevBook" read file="Task vs ValueTask"`.
- Load Obsidian skills when delegating vault work: `obsidian-markdown` for notes, `obsidian-cli` for vault-index queries, `obsidian-bases` for `.base`, and `json-canvas` for `.canvas`.

## Workflow notes

- If request changes vault structure/formatting rules, ask user whether to update AGENTS.md Memory.
- **Placement and scope check.** Before creating or moving pages, the agent MUST run the placement and scope check defined in "Creating structure" — even when the user's instruction seems clear. See [Placement and scope check](#placement-and-scope-check-before-creating-pages).
- **AGENTS.md evolution rule.** When updating this contract, prefer extending the writing paradigm or strengthening existing principles over adding prescriptive format rules. If a proposed rule can be derived from the eight writing principles (concrete over abstract, show the machine, depth matches complexity, scannable by design, opinionated over neutral, symmetric treatment, tradeoff-anchored, plain engineer's voice), strengthen the principle instead of adding a new rule. Rules should guide judgment, not prescribe specific section templates or bullet formats for each case.
- **No automatic commits.** Never create git commits unless the user explicitly asks. Leave changes unstaged/uncommitted so the user controls when and what to commit.
- Default to file tools for reads/writes. Use Obsidian CLI only when you need Obsidian-index behavior such as backlinks, tags, or wikilink resolution.
- Obsidian CLI requires Obsidian running and uses `=` parameters, for example `obsidian vault="DevBook" read file="Task vs ValueTask"`.
- Load Obsidian skills when delegating vault work: `obsidian-markdown` for notes, `obsidian-cli` for vault-index queries, `obsidian-bases` for `.base`, and `json-canvas` for `.canvas`.
