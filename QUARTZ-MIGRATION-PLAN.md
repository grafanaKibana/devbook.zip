# DevBook: Digital Garden → Quartz v5 Migration Plan

> **How to read this doc.** It has three parts:
> - **Part A — Comes free with Quartz.** Automatic. No checkboxes, no decisions — you get these the moment you migrate.
> - **Part B — Decisions.** Everything that's an actual choice. **All unticked.** Tick `- [x]` only what you want; leave `- [ ]` to skip it. My suggestion is in the *rec:* note, but the tick is yours.
> - **Part C — Dropped.** The items you already said you don't care about. Listed for the record, not migrating.
>
> When you're done ticking Part B, hand the whole file to the migration prompt at the bottom.

**Current stack:** Obsidian vault → Digital Garden plugin → Eleventy 3 (`Web/`) → Vercel (`devbook.zip`).
**Target:** Obsidian vault → Quartz v5 → any host.

## ⭐ Guiding principle

> **Plugin-first, always.** Anything an existing Quartz / Obsidian community plugin can do is done that way —
> **never** hand-rewritten. Custom code only as a last resort, after checking
> [awesome-quartz](https://github.com/quartz-community/awesome-quartz) · [quartz-community](https://github.com/quartz-community) ·
> [Quartz plugins](https://quartz.jzhao.xyz/plugins/) · [Obsidian compatibility](https://quartz.jzhao.xyz/features/obsidian-compatibility).

## Legend

| Mark | Meaning |
|---|---|
| 🟢 | Native to Quartz v5 — automatic |
| 🔌 | Existing Quartz/Obsidian community plugin — wire it up, don't rewrite |
| 🟡 | Small config/CSS glue |
| ⚫ | Dropped (your call) |

---

# Part A — Comes free with Quartz (automatic, nothing to decide)

You get all of these just by migrating. No checkboxes because there's nothing to choose — Quartz does them.

**Markdown & Obsidian syntax** — 🟢
- Wikilinks `[[Note|Alias]]`, `[[Note#Heading]]`
- Transclusions / embeds `![[Note]]`, `![[image.png]]`, and image width `![[img|200]]`
- Callouts `> [!info]/[!QUESTION]/[!WARNING]` (collapsible)
- Highlight `==mark==`, footnotes `[^1]`, task checkboxes `- [ ]`
- Tags (frontmatter + inline `#tag`) → auto tag pages
- Math `$…$` / `$$…$$` (KaTeX; MathJax-SVG available)
- Mermaid diagrams (pan/zoom)
- Code syntax highlighting (Shiki — upgrade over your current Prism)
- External-link decoration (`target=_blank` + icon)

**Navigation & reading** — 🟢
- Graph view (local + global, stock D3)
- Backlinks · File-tree explorer · Table of contents
- Full-text search (FlexSearch — upgrade)
- Rich popover previews (new in v5)
- Auto light/dark by OS
- Created/updated timestamps
- Breadcrumbs (you don't have these today — bonus)
- "What's next" nav blocks — your Python script already writes them as `> [!note]` callouts, so they render for free

**Content model** — 🟢
- Your frontmatter schema is preserved verbatim (`topic, subtopic, level, priority, status, icon, color, whats-next, dg-home, dg-permalink`)
- Folder taxonomy (11 numbered dirs) preserved as-is

---

# Part B — Decisions (all unticked — tick what you want)

## B0. Architecture — pick ONE (this one matters most)

Your Dataview usage makes the publishing model the pivotal choice:

| | **Model A — Quartz Syncer** | **Model B — vanilla Quartz** |
|---|---|---|
| What | Obsidian plugin ([quartz-syncer](https://github.com/saberzero1/quartz-syncer) · [docs](https://saberzero1.github.io/quartz-syncer-docs/)) compiles notes **inside Obsidian** — rendering Dataview/Datacore/Bases to **static** — then pushes to a Quartz repo | Quartz points `content/` straight at `Vault/Software Engineering/`; plugins per feature |
| DataviewJS | ✅ compiled to static | ❌ won't work without Syncer |
| Bases | ✅ compiled (+ Quartz `BasesPage`) | ✅ via Quartz `BasesPage` |
| Feels like | today's DG workflow (compile → push) | simplest repo, but loses Dataview |

- [ ] **Model A — Quartz Syncer** — *rec: this one, since it's the plugin-first way to keep your Dataview homepage & `Questions.md`*
- [ ] **Model B — vanilla Quartz** — *pick only if you decide Dataview isn't worth keeping*

## B1. Plugin-powered features

- [ ] **Obsidian Canvas** (`.canvas`, incl. `Roadmap.canvas`) — 🔌 Quartz Canvas component + Obsidian **Canvas Export** ([issue #628](https://github.com/jackyzha0/quartz/issues/628)). *rec: keep — it's plugin wiring, cheap.*
- [ ] **Obsidian Bases** (` ```base ` blocks) — 🔌 Quartz [`BasesPage`](https://quartz.jzhao.xyz/features/bases). *rec: keep; verify your inline block format maps to native `.base`.*
- [ ] **DataviewJS** (homepage dashboard + `Questions.md`) — 🔌 via **Quartz Syncer** (needs Model A). *rec: keep — but this is the item most likely to need a fallback; verify DataviewJS compiles, not just DQL.*
- [ ] **PlantUML** ` ```plantuml ` — 🔌 plugin if one's on awesome-quartz, else 🟡 convert the few blocks to Mermaid. *rec: keep via whichever's simpler.*
- [ ] **GitHub Gist embeds** ` ```gist ` — 🔌 check awesome-quartz for an embed plugin. *rec: keep only if you actually use it.*

## B2. Navigation extras (not automatic)

- [ ] **Graph color groups by tag** (`FolderNote`/`MetricsIgnore`/`Template`) — 🟡 small custom coloring on the stock graph. *rec: optional.*
- [ ] **Sidebar quicklinks** (Home / Questions / Roadmap buttons) — 🟡 small component. *rec: keep — nice-to-have.*
- [ ] **Lucide note icons** (from `icon`/`color` frontmatter) — 🟡 small component / check awesome-quartz. *rec: keep only if you like them.*

## B3. Theming & branding

> Typography, style-settings, ultra-wide layout, and the Minimal theme fetch are all in Part C (dropped),
> so theming is basically "stock Quartz + whatever you tick here."

- [ ] **Accent color** (British Racing Green, HSL 158°) — 🟢 one config line. *rec: keep — it's your brand, costs nothing.*
- [ ] **Site branding** (logo + title + subtitle) — 🟡 `PageTitle` + tiny custom for subtitle/logo. *rec: keep.*
- [ ] **Contact footer** (email / LinkedIn / GitHub) — 🟡 Quartz `Footer` + small icon glue. *rec: keep.*
- [ ] **Content max-width 1200px** (wider prose) — 🟢 CSS var. *rec: optional.*
- [ ] **Dramatic H1 titles** (big, tight tracking) — 🟡 tiny CSS. *rec: optional.*
- [ ] **Vercel Analytics** — 🟡 inject via `afterBody` component. *rec: keep if you track traffic.*

## B4. URLs

- [ ] **`dg-permalink` custom URLs** — 🟡 Quartz slug/`permalink`. *rec: keep if specific URLs matter for SEO/links.*
- [ ] **Number-prefix stripping** (`01 Programming` → `Programming` in the explorer) — 🟡 tiny Explorer `map` fn. *rec: keep — cosmetic but nice.*

## B5. Build automation (vault-side — keep = repoint paths, don't rewrite)

- [ ] **`render-whats-next.py`** — nav callouts. *rec: keep.*
- [ ] **`sync-folder-rollup-frontmatter.py`** — status/priority/level rollup (feeds the dashboard). *rec: keep.*
- [ ] **`sync-topic-subtopic-frontmatter.py`** — topic/subtopic from path. *rec: keep.*
- [ ] **`generate-roadmap.py`** — regenerates `Roadmap.canvas`. *rec: keep (pairs with the Canvas plugin above).*
- [ ] **`audit_all_pages.py`** — quality report. *rec: keep (SSG-agnostic).*
- [ ] **`.githooks/pre-commit` + markdownlint MD040** — *rec: keep; only swap the `dg-publish` assumption.*

---

# Part C — Dropped (your don't-cares — not migrating)

- ⚫ Responsive image optimization (eleventy-img WebP srcsets)
- ⚫ Graph-in-navbar fusion → stock separate graph panel instead
- ⚫ Right sidebar independent scroll
- ⚫ Note growth history
- ⚫ Typography (Source Serif 4 / Inter / Menlo) → stock Quartz fonts
- ⚫ Style-settings overrides (line-height, highlight, padding)
- ⚫ Obsidian Minimal theme fetch (`get-theme.js`) → stock Quartz theme
- ⚫ Ultra-wide 3-panel layout → stock Quartz layout

---

# Required regardless (not optional — the migration needs these)

- **Publish gate `dg-publish: true`** — Model A: Syncer selection rules keyed off it; Model B: custom Quartz filter. Either way, no mass frontmatter edits.
- **`.env` / `.env.local` → `quartz.config.ts` / `quartz.layout.ts`** — secrets stay out of git.
- **Deploy** — Quartz build command → Vercel (`devbook.zip`).

---

# Phased execution plan

**Phase 0 — Scaffold + architecture (½ day)** — decide **B0**. Model A: install Quartz Syncer in Obsidian, create the target repo, wire selection to `dg-publish`. Model B: `npx quartz create`, point content at the vault + custom filter. Baseline `quartz.config.ts`; confirm first build.

**Phase 1 — Part A verification (½ day)** — confirm all the automatic features render (spot-check one page per top-level folder).

**Phase 2 — Plugin wiring (1 day)** — the ticked B1 items, **no rewrites**: Bases → `BasesPage`; Canvas → Canvas component + Export; Dataview → verify Syncer output; PlantUML → plugin/convert. **Verify DataviewJS homepage early — stop if it doesn't compile.**

**Phase 3 — ticked B2–B4 (½ day)** — accent, branding, footer, quicklinks, icons, analytics, permalinks, prefix stripping.

**Phase 4 — automation + cutover (½ day)** — repoint ticked B5 scripts + pre-commit; swap publish gate; wire deploy; run parity check; flip DNS. Keep `Web/` until it passes.

**Rough total: ~2.5–3 days.** Only real unknown: Syncer's DataviewJS fidelity.

---

# Parity checklist (before cutover)

- [ ] Every `dg-publish: true` note appears; private notes absent.
- [ ] Wikilinks resolve; dead-link count matches current build.
- [ ] Callouts, math, mermaid, code highlighting render (sample per folder).
- [ ] **Homepage Dataview dashboard renders** (the critical check).
- [ ] `Questions.md` aggregation renders.
- [ ] Bases blocks + `Roadmap.canvas` render.
- [ ] Search, graph, backlinks work.
- [ ] URLs match old permalinks OR redirects in place.
- [ ] Pre-commit automations run green against the new flow.

---

# The migration prompt

> Tick your Part B choices first, then paste this prompt (plus this file) into a fresh Claude Code session at the repo root.

```
You are migrating the DevBook site from the Obsidian Digital Garden (Eleventy 3, in `Web/`)
to Quartz v5, WITHOUT rewriting the Obsidian vault content in `Vault/`.

Read `QUARTZ-MIGRATION-PLAN.md` in full — it is the source of truth. Honor it exactly:
- Part A features come with Quartz — set them up / verify them; they're not optional.
- Part B is decisions: implement ONLY items ticked `- [x]`. Skip every unticked `- [ ]` item.
- Part C (Dropped) and anything unticked: do NOT implement, do not add "to be safe".
- Do the "Required regardless" section always.
- OVERRIDING PRINCIPLE — PLUGIN-FIRST: use an existing Quartz/Obsidian community plugin instead of
  writing custom code. Before writing ANY custom transformer/component, search awesome-quartz, the
  quartz-community org, and quartz.jzhao.xyz/plugins, and tell me which plugin you'll use. If none
  exists, flag it and get my approval before writing custom code.
- Architecture: follow B0. Model A → set up Quartz Syncer in Obsidian (compiles Dataview/Datacore/Bases
  to static) and publish to a new Quartz repo. Model B → vanilla Quartz reading Vault/Software Engineering/
  with a custom dg-publish filter.
- Specifically: Bases → Quartz BasesPage; Canvas (incl. Roadmap.canvas) → Quartz Canvas component +
  Obsidian Canvas Export; Dataview/DataviewJS → Quartz Syncer. Do NOT reimplement these.

Constraints:
- Scaffold in a NEW directory / repo so the current `Web/` keeps working until cutover. Use a branch.
- Keep the dg-publish gate via config/plugin — no mass frontmatter edits.
- Theming is deliberately minimal: stock Quartz theme + only the ticked B3 items. Do NOT port typography,
  style-settings, ultra-wide layout, or the Obsidian Minimal theme fetch.
- Python scripts + .githooks/pre-commit stay; only repoint paths and the publish-gate assumption.

Execute in Phase order (section "Phased execution plan"). After EACH phase: build & report errors;
verify that phase's items render (homepage Dataview dashboard, Bases, Roadmap.canvas, graph, search,
callouts explicitly); give me a short diff summary + parity status; then pause for my go-ahead.

VERIFY EARLY: in Phase 2 confirm Quartz Syncer renders the DataviewJS homepage dashboard and Questions.md.
If DataviewJS does not compile cleanly, STOP and tell me before proceeding.

Do not delete anything under `Web/` until I approve cutover. Start with Phase 0 and stop for review.
```

---

*Planning artifact — no code changed. Plugin availability verified via awesome-quartz / quartz-community and Quartz docs.*
