# DevBook → Quartz v5 — Migration Status & Cutover Gate

> **Single source of truth** for the Digital Garden (Eleventy 3) → Quartz v5 migration on branch
> `feat/digitalgarden-to-quartz`. Reflects what was actually built, not the original plan.
> Supersedes and replaces the earlier `QUARTZ-MIGRATION-PLAN.md` (strategy/why) and
> `QUARTZ-MIGRATION-EXECUTION.md` (execution companion) — both removed; recover from git history if needed.
>
> _Last updated: 2026-07-06. Prod (`main`) still serves the old Eleventy site until the cutover merge._

---

## Final architecture (as built)

- **Model A — Quartz Syncer.** The Obsidian [quartz-syncer](https://github.com/saberzero1/quartz-syncer)
  plugin renders Dataview/Datacore/Bases → static **inside Obsidian** and publishes to `Web/content`,
  gated on `publish: true`.
- **Vault layout:** `Vault/Home/` (home note = `Home/index.md`). Syncer's **vault-root folder = `Home`**,
  so the `Home/` prefix is **stripped** on publish (notes land at `Web/content/01 Programming/…`, etc.).
- **Quartz v5 lives in `Web/`**; the old Eleventy site is preserved in **`OldWeb/`** (parity reference,
  wired to nothing).
- **Deploy:** Vercel builds from `Web/` —
  `npx quartz plugin install --from-config && npx quartz build` (plugins pinned; no Python bootstrap).
  Every push gets a **branch preview**; production = `main` (old site until the merge = cutover).
- **Dashboards = HYBRID** (the key resolution of the "Syncer flattens custom DOM" problem):
  - **Topics** → in-note ` ```datacorejsx ` block in `Home/index.md`; **Syncer renders it to static HTML**.
  - **Questions** → Quartz component (`QuestionsIndex` + `QuestionCollector`), because `[!QUESTION]`
    callout aggregation needs the static build's full-content access (Datacore can't query callouts).
  - **`SyncerFixups`** transformer post-processes Syncer output for the web (see custom code).

---

## Custom code (the only hand-written pieces — everything else is config/plugins)

| File | Purpose |
|---|---|
| `Web/quartz.config.yaml` | plugins, theme (accent green, stock fonts), `ignorePatterns` (incl. `Topics.base`) |
| `Web/quartz.ts` | wiring: injects components + transformers into the layout |
| `Web/custom/transformers/syncer-fixups.ts` | strips raw ` ```dataviewjs `; normalizes `Home/…` links from rendered Datacore (before crawl-links) |
| `Web/custom/transformers/question-collector.ts` | collects `[!QUESTION]` callouts across notes |
| `Web/custom/components/questions-index.tsx` | renders the Questions aggregation page |
| `Web/custom/components/site-marquee.tsx` | "still in development / last-update / log issue" banner (beforeBody, all pages) |

---

## Done ✅

- **Part-A features** (native): wikilinks, embeds, callouts, math (KaTeX), Mermaid, code highlighting,
  tags→tag pages, graph, backlinks, explorer, TOC, search, popovers, breadcrumbs, dark mode.
- **Architecture:** `Web/`→`OldWeb/`, Quartz scaffolded in `Web/`, `vercel.json` de-Pythoned, content
  Syncer-published + committed.
- **Dashboards:** Home Topics (single, Datacore) + Questions (component) render; card links resolve;
  no raw `dataviewjs` leaks. _Verified via local build (exit 0, 372 pages)._
- **Branding & theme:** `pageTitle: DEVBOOK`, **accent green** (`secondary: #3f6212 / #a3e635`), footer
  (Email/LinkedIn/GitHub — kept), Vercel Analytics (`provider: vercel`), `SiteMarquee` banner.
- **Plugins wired:** `canvas-page`, `bases-page`, `alias-redirects`, `cname`, `explicit-publish`,
  `og-image` (disabled; `Head.tsx` decoupled so a failed clone can't break the Vercel build).
- **`Topics.base` unpublished** from the web via `ignorePatterns` (Obsidian-only tool; renders poorly
  on the web due to frontmatter stripping — see risks).
- **Automation:** the vault Python scripts + `.githooks/pre-commit` repointed `Software Engineering`→`Home`.
- **Fonts:** vault snippet (`Vault/.obsidian/snippets/devbook-site-fonts.css`) matches Obsidian to the
  site's **stock Quartz fonts** — Schibsted Grotesk / Source Sans Pro / IBM Plex Mono.

---

## Pending — the cutover gate

| # | Owner | Item |
|---|---|---|
| 1 | you | **Re-validate the live Vercel preview** from current HEAD (all fixes pass locally). |
| 2 | you | **`note-properties` decision** — Syncer's `includeAllFrontmatter: false` strips `topic/subtopic/status/priority/level`, so the enabled `note-properties` plugin shows nothing on notes. Enable "Include all frontmatter" in Syncer + re-publish, or disable that plugin. |
| 3 | you | **Finish fonts** — install the 3 fonts locally + enable the snippet in Obsidian. |
| 4 | me | **Publish automation** — githook / `npm run publish` → `obsidian quartz-syncer:publish`. |
| 5 | you+me | **Prod cutover** — update AGENTS.md `Vault/Software Engineering/` refs, then **merge `feat/digitalgarden-to-quartz` → `main`**. |

### ❓ Verify before cutover
- **Number-prefix stripping** (`01 Programming` → `Programming` in the explorer) — not present in `quartz.ts`; likely still pending.
- **`Roadmap.canvas` renders** on the built site (`canvas-page` is enabled — confirm nodes/links/colors).

---

## Parity checklist (before merge to `main`)

- [ ] Every `publish: true` note present; private/templates absent.
- [ ] Wikilinks resolve; dead-link count comparable to `OldWeb`.
- [ ] Callouts, math, Mermaid, code highlighting render (sample per top-level folder).
- [x] **Home Topics dashboard renders** (Datacore, single, links resolve). _local build_
- [x] **`Questions.md` aggregation renders**; no raw `dataviewjs`. _local build_
- [ ] `Roadmap.canvas` renders.
- [ ] Search, graph, backlinks work on the live preview.
- [ ] **URL parity** — see risk below; redirects in place OR accepted break.
- [ ] Pre-commit automations run green against the `Home/` layout.

---

## Known decisions & risks

- **URL parity (⚠️ decide before cutover).** The `Software Engineering`→`Home`-stripped, flattened layout
  **changes URLs** vs the old DG permalinks (e.g. `/software-engineering/…`). `alias-redirects` only
  handles frontmatter `aliases`, not the wholesale path change. If inbound links / SEO matter, add
  redirects (or per-note `aliases`); otherwise accept the break.
- **`includeAllFrontmatter: false`.** Syncer publishes only `publish/created/modified`. This is why the
  Bases view and `note-properties` came up empty on the web. Flip it (+ re-publish) if you want note
  metadata on the site.
- **Syncer re-copies ignored files.** A re-publish will re-add `Web/content/Topics.base`; harmless —
  `ignorePatterns` keeps Quartz from ever emitting it.

---

_The earlier `QUARTZ-MIGRATION-PLAN.md` and `QUARTZ-MIGRATION-EXECUTION.md` were removed once this
doc superseded them — recover from git history if you ever need the original strategy/decision record._
