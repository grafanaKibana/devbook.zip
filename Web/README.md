# DevBook Web (Quartz v5)

> Part of **[DevBook](../README.md)** — the static site that publishes the Obsidian vault to **[devbook.zip](https://devbook.zip)**. Built with **[Quartz v5](https://quartz.jzhao.xyz)**.

This directory turns the notes in [`../Vault/`](../Vault) into a fast static website. Content is authored in Obsidian, rendered and published by the **Quartz Syncer** Obsidian plugin, and built by Quartz on deploy.

## The pipeline

```text
Obsidian  (Vault/Home, publish: true notes)
   │  Quartz Syncer plugin: renders in-note Dataview/Datacore/Bases → static HTML,
   │  strips the "Home" vault-root folder, commits the result into Web/content/
   ▼
Web/content/     # generated, git-tracked, deployed as-is
   │  npx quartz build   (Vercel, on every push)
   ▼
Web/public/  →  devbook.zip
```

- **Author** notes in Obsidian under `Vault/Home/`. Only `publish: true` notes ever leave the vault.
- **Publish** with the Quartz Syncer plugin — it renders in-note Dataview/Datacore/Bases to static HTML and commits into `Web/content/`. Treat that folder as generated output; edit notes in `Vault/` and regenerate the projection through Syncer.
- **Build & deploy** — Vercel runs the Quartz build from `Web/` on each push; production deploys from `main`.

## Local development

Quartz requires **Node 22** (`.node-version`).

```bash
cd Web
npm ci                       # install dependencies
npm run build                # update community plugins and build → Web/public/
npx quartz build --serve     # dev server + live reload → http://localhost:8080
```

`npm run build` regenerates and checks StepTrace, installs missing configured plugins with `plugin install --from-config`, updates installed plugins with `plugin install --latest`, then builds the site. The two install commands are separate so cached plugin directories also receive updates. Latest follows each plugin's upstream default branch, including commits newer than its last tagged release.

## Customization surfaces

Quartz is "clone and own" — the engine under `quartz/` is committed. **Ground changes in the [official docs](https://quartz.jzhao.xyz) and prefer config/plugins over custom code.** Only these surfaces are ours:

| Path                        | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `quartz.config.yaml`        | site config — plugins, theme (accent green, fonts), `ignorePatterns`    |
| `quartz.ts`                 | function-typed overrides + wiring for the local components/transformers |
| `quartz/styles/custom.scss` | custom CSS/SCSS                                                         |
| `custom/`                   | local components + transformers (below)                                 |
| `content/`                  | generated content from Quartz Syncer — don't hand-edit                  |

Do **not** edit anything else under `quartz/` — `npx quartz upgrade` overwrites it.

## Dashboards & custom code

The vault's old DataviewJS dashboards are handled two ways on the static site:

- **Topics dashboard** (homepage) — an in-note `datacorejsx` block in `Home/index.md` that Quartz Syncer renders to static HTML at publish. No component.
- **Questions** — a Quartz component (`custom/components/questions-index.tsx`) fed by a transformer, because cross-vault `[!qard]` interview and compatible `[!QUESTION]` callout aggregation needs the build's full-content access. Folder paths still own topic and subtopic grouping.

Local transformers/components in `custom/` (wired in `quartz.ts`):

| File                                 | Role                                                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transformers/syncer-fixups.ts`      | strips raw dataview/datacore query fences + the frozen Questions `dc-questions-index` block, and normalizes the vault-absolute `Home/…` links Syncer leaves in rendered Datacore |
| `transformers/question-collector.ts` | collects Qard and compatible Question callouts once across notes; accepts guarded raw-Markdown `blockquote.callout` and Syncer-frozen `div.callout` shapes                       |
| `components/questions-index.tsx`     | renders the Questions aggregation page                                                                                                                                           |

Canonical interview authoring uses collapsed `[!qard]-` callouts in the owning `Vault/Home/` note. The generic `[!QUESTION]` path remains distinct, while both dashboard readers accept both keys. Note-level `qard-deck` and `qard-topic` are initial study-organization seeds only when missing; valid overrides and per-card `qard-location` remain authoritative. Stock Qard owns hidden card IDs and writes them only through its native study/edit behavior.

Native Obsidian keeps its existing disclosure behavior for Question and Qard callouts: click/touch and FAQ styling remain equivalent, while titles lack keyboard focus, Enter/Space toggling, `aria-expanded`, and inert collapsed bodies. Quartz adds keyboard and ARIA disclosure behavior through `CalloutDisclosure`. The migration explicitly accepts this host difference; it does not add an Obsidian accessibility integration.

This pipeline covers Qard cards authored in current `Vault/Home` notes. Stock standalone or AI creation defaults to `Qard/Standalone Deck.md`; Qard exposes a Card Folder setting, but its placement remains owner-configured and outside this pipeline until set deliberately.

The Questions page has one web renderer. Syncer may freeze the in-note Datacore dashboard, but `SyncerFixups` removes the complete `dc-questions-index` wrapper before `QuestionsIndex` collects source callouts. `Web/content/` must come from the actual Syncer export path; do not reproduce or hand-edit that projection.

## Deploy

Vercel builds from the repo-root `vercel.json`:

```text
installCommand:  cd Web && npm ci
buildCommand:    cd Web && npm run build
outputDirectory: Web/public
```

Commit `quartz.lock.json` as the baseline for ordinary lockfile installs. The deployment build intentionally updates plugins beyond that baseline; its lockfile changes stay in the build workspace and are not committed back. Updates happen on each build; publishing a plugin update alone does not trigger a deployment. Vercel regenerates StepTrace before checking artifact freshness, so a stale committed Obsidian bundle cannot block the web build.
