# DevBook → Quartz v5 — Layered Execution Plan

> Companion to **[QUARTZ-MIGRATION-PLAN.md](QUARTZ-MIGRATION-PLAN.md)** (the strategy doc). This is the *executable*, layered plan with **recon-verified** specifics. Where the two disagree, this file wins — see **Corrections** below.
>
> **Verified from primary source** (workflow `wf_6862a735-f1e`, 5 agents reading the actual Quartz v5 branch, quartz-syncer source, and the current Eleventy site — not summaries).

## Locked decisions

| Axis | Decision |
|---|---|
| **Architecture** | **Model A — quartz-syncer**: the Obsidian plugin compiles Dataview/DataviewJS → static and publishes to `Web/content`, gated on `dg-publish`. |
| **Rollout** | **Rename now**: `Web/`→`OldWeb/`, Quartz into `Web/`, repoint `vercel.json`. Verify each layer on a **Vercel branch preview**. Production (main) stays on the old site until **merge = cutover**. |
| **Customizations to port** | branding (title/subtitle/logo + accent green) · number-prefix stripping · what's-next callouts · Canvas/Roadmap · automation scripts · Vercel Analytics |
| **Dropped (for now)** | contact footer · sidebar quicklinks · dg-permalinks · lucide note icons · graph color groups · all Part C items |

## ⚠️ Two findings that change the plan

**1. The DataviewJS dashboards will very likely NOT survive Syncer's freeze — this is the crux of Model A.**
quartz-syncer *does* genuinely execute DataviewJS inside Obsidian, then freezes the result with Obsidian's `htmlToMarkdown()`. That works for table/list output. But **both** of DevBook's DataviewJS pages build *custom DOM*:
- **Homepage** (`Software Engineering.md`): `require("obsidian")` + `setIcon` + hand-built card grid with weighted multi-segment **progress bars**, per-topic **icons** and **accent colors** from frontmatter.
- **Questions.md**: `await dv.io.load()` per page to build a nested `[!QUESTION]` tree via `MarkdownRenderer`.

`htmlToMarkdown()` cannot represent colored progress bars / icon-styled cards — it will **flatten** them. So Model A, as-is, probably *loses* the very dashboard you chose Model A to keep. **This needs your call** (see the decision below). The plan's own Phase-2 rule already says: *verify DataviewJS early, STOP if it doesn't compile cleanly.*

**2. Quartz v5 is a rewrite — the strategy doc's file names are stale.**
- Config is **`quartz.config.yaml`** (+ optional `quartz.ts` for function-typed overrides like the Explorer `mapFn`). **There is no `quartz.config.ts` / `quartz.layout.ts`.**
- Features are **community plugins** (`github:quartz-community/<name>`) installed via `npx quartz plugin install --from-config`, pinned in **`quartz.lock.json`** (commit it; CI/Vercel must run plugin-install *before* build).

### Corrections to QUARTZ-MIGRATION-PLAN.md
- `quartz.config.ts` / `quartz.layout.ts` → **`quartz.config.yaml` (+ `quartz.ts`)**.
- Canvas: issue `#628` is a stale duplicate → real solution is the native **`quartz-community/canvas-page`** plugin (`#927`).
- Vercel Analytics: **native** — `analytics: {provider: vercel}`. No `afterBody` component needed (plan B3 was over-engineered).
- Content strategy: **symlink FAILS on Vercel** (ephemeral clone) → must use **committed/copied** content.
- Number-prefix stripping: **net-new** (the Eleventy explorer never did it) — build it via `quartz.ts` Explorer `mapFn`.
- Monorepo wrinkle: quartz-syncer hardcodes `quartz.config.yaml`/`quartz.lock.json`/`quartz/` at the **target repo root**; only the *Content folder* is subpath-aware — reconciled in Phase 2.

---

## Layered phases

Legend: 🤖 = I can do autonomously · 🧑 = needs you · ✅ = verify-and-stop gate.

### Phase 0 — Default Quartz in `Web/`, deployed & checked  *(your "step 1")*
1. 🤖 `git mv Web OldWeb` (Eleventy preserved for parity, wired to nothing).
2. 🤖 Scaffold Quartz v5 into `Web/` (clone `jackyzha0/quartz` v5 → `npx quartz create`), commit `quartz.lock.json`.
3. 🤖 **Bootstrap content**: small script copies `dg-publish: true` notes + referenced assets from `Vault/Software Engineering` → `Web/content` (committed; Vercel-safe). Doubles as the Model-B fallback pipeline.
4. 🤖 `quartz.config.yaml`: `pageTitle: DEVBOOK`, `baseUrl: devbook.zip`, `ignorePatterns` for private/templates/`.obsidian`.
5. 🤖 Repoint root `vercel.json`:
   ```json
   { "installCommand": "cd Web && npm ci",
     "buildCommand": "cd Web && npx quartz plugin install --from-config && npx quartz build",
     "outputDirectory": "Web/public", "cleanUrls": true }
   ```
   (drop the old `routes`/404 block — Quartz emits its own 404). Update `.gitignore` (`public/`, `.quartz-cache`).
6. 🤖✅ Local `npx quartz build` green + `--serve` preview check (homepage + one page per top folder, no console errors).
7. 🧑✅ **Deploy check**: push branch → confirm the **Vercel branch-preview** builds & serves default Quartz. *(needs you to confirm the push and share/allow the preview URL.)*

### Phase 1 — Part A verification 🤖✅
Spot-check one page per top-level folder: wikilinks, embeds, callouts, highlight, footnotes, tasks, math (KaTeX), Mermaid, code (Shiki), external-link icons, graph, backlinks, explorer, TOC, search.

### Phase 2 — Content pipeline (Model A / Syncer) + **CRITICAL DataviewJS gate** 🧑✅
1. 🧑 Install **quartz-syncer** in Obsidian; fine-grained GitHub PAT (Contents: R/W).
2. 🧑 Settings: **Publish key → `dg-publish`**, **Content folder → `Web/content`**.
3. 🤖 Reconcile monorepo layout — test **(B)** single-repo push to `Web/content`; fallback **(A)** dedicated Quartz repo + CI mirror into `Web/content`. Document which.
4. ✅ **STOP-gate**: do the homepage + Questions dashboards render acceptably? Per finding #1, expect degradation → implement the agreed dashboard approach, then verify. **Stop & report if unresolved.**

### Phase 3 — Customizations, by group (each verified) 🤖✅
- **3a Branding** — `pageTitle: DEVBOOK` + subtitle "by Nikita Reshetnik" + logo slot (local page-title-variant plugin — *flagged custom code*) + **accent green** in `theme.colors` (HSL 158 → hex, tuned by eye).
- **3b Prefix stripping** — `quartz.ts` Explorer `mapFn`: `node.displayName = node.displayName.replace(/^\d+\s+/, '')`.
- **3c What's-next** — verify the script's `[!note]` callout + `[[wikilink|alias]]` render, and the `<!-- whats-next:start/end -->` markers survive markdown processing.
- **3d Canvas/Roadmap** — `npx quartz plugin add github:quartz-community/canvas-page`; ensure `Roadmap.canvas` isn't in `ignorePatterns`; verify nodes/links/colors; fallback = static SVG/mermaid from `generate-roadmap.py`.
- **3e Vercel Analytics** — `analytics: {provider: vercel}`; confirm `/_vercel/insights/script.js` 200s in prod.

### Phase 4 — Automation repoint + parity + cutover 🤖🧑✅
- Repoint `.githooks/pre-commit` markdownlint path (`Web/node_modules` → new Quartz `Web/` or vendored) + relocate `Web/.markdownlint.json`. The 5 Python scripts are generator-agnostic (operate on `Vault/`); only the `dg-publish`/permalink metadata in `generate-roadmap.py` needs reconciling with Quartz's gate.
- Run the full **parity checklist** (below).
- 🧑 **Cutover = merge to main** (keeps `OldWeb/` until you approve; DNS unchanged until you say so).

---

## Parity checklist (before cutover)
- [ ] Every `dg-publish: true` note present; private notes absent.
- [ ] Wikilinks resolve; dead-link count matches OldWeb.
- [ ] Callouts, math, mermaid, code highlighting render (sample per folder).
- [ ] **Homepage dashboard renders** (per the Phase-2 decision).
- [ ] `Questions.md` aggregation renders.
- [ ] `Roadmap.canvas` renders.
- [ ] Search, graph, backlinks work.
- [ ] URLs match old permalinks OR redirects in place.
- [ ] Pre-commit automations run green against the new flow.

## What needs you (gates)
1. Install quartz-syncer in Obsidian + a fine-grained GitHub PAT (Phase 2).
2. Confirm the Vercel branch-preview deploy / share the preview URL (Phase 0 onward).
3. Approve production cutover (merge to main) + any DNS change (Phase 4).

## Open decision (blocking Phase 2, not Phase 0)
**How to handle the homepage + Questions dashboards**, given Syncer will likely flatten them:
- **(A) Rebuild as native Quartz components** — a Preact component reads notes' frontmatter and renders the same card grid + progress bars at build time. Highest fidelity, fully static, no Syncer dependency for these pages. *(Recommended — it's arguably better than Syncer here.)*
- **(B) Try Syncer first, decide at the Phase-2 gate** — publish, look at the degraded output, then choose.
- **(C) Simplify** the pages to what Syncer can faithfully freeze (plain lists/tables).

*Phase 0 does not depend on this — scaffolding can start regardless.*
