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
- **Publish** with the Quartz Syncer plugin — it renders in-note Dataview/Datacore/Bases to static HTML and commits into `Web/content/`. Treat that folder as generated output; edit notes in `Vault/`.
- **Build & deploy** — Vercel runs the Quartz build from `Web/` on each push; production deploys from `main`.

## Local development

Quartz requires **Node 22** (`.node-version`).

```bash
cd Web
npm ci                                     # install dependencies
npx quartz plugin install --from-config    # install community plugins (pinned in quartz.lock.json)
npx quartz build --serve                   # dev server + live reload → http://localhost:8080
npx quartz build                           # production build → Web/public/
```

On a fresh clone / CI, `plugin install --from-config` must run before the first build.

## Customization surfaces

Quartz is "clone and own" — the engine under `quartz/` is committed. **Ground changes in the [official docs](https://quartz.jzhao.xyz) and prefer config/plugins over custom code.** Only these surfaces are ours:

| Path | Purpose |
|---|---|
| `quartz.config.yaml` | site config — plugins, theme (accent green, fonts), `ignorePatterns` |
| `quartz.ts` | function-typed overrides + wiring for the local components/transformers |
| `quartz/styles/custom.scss` | custom CSS/SCSS |
| `custom/` | local components + transformers (below) |
| `content/` | generated content from Quartz Syncer — don't hand-edit |

Do **not** edit anything else under `quartz/` — `npx quartz upgrade` overwrites it.

## Dashboards & custom code

The vault's old DataviewJS dashboards are handled two ways on the static site:

- **Topics dashboard** (homepage) — an in-note `datacorejsx` block in `Home/index.md` that Quartz Syncer renders to static HTML at publish. No component.
- **Questions** — a Quartz component (`custom/components/questions-index.tsx`) fed by a transformer, because `[!QUESTION]` callout aggregation needs the build's full-content access.

Local transformers/components in `custom/` (wired in `quartz.ts`):

| File | Role |
|---|---|
| `transformers/syncer-fixups.ts` | strips raw `dataviewjs` code blocks and normalizes the vault-absolute `Home/…` links Syncer leaves in rendered Datacore |
| `transformers/question-collector.ts` | collects `[!QUESTION]` callouts across notes for the Questions page |
| `transformers/status-backfill.ts` | restores the `status` frontmatter Syncer drops on publish, so status-gated components can read it |
| `components/questions-index.tsx` | renders the Questions aggregation page |
| `components/site-marquee.tsx` | "under construction" banner shown on in-progress (non-`Done`) notes |

## Deploy

Vercel builds from the repo-root `vercel.json`:

```text
installCommand:  cd Web && npm ci
buildCommand:    cd Web && npx quartz plugin install --from-config && npx quartz build
outputDirectory: Web/public
```

`quartz.lock.json` pins plugin commits — commit it, and CI must run the plugin-install step before the build.
