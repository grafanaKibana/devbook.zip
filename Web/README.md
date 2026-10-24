# DevBook Web (Quartz v5)

> Part of **[DevBook](../README.md)** — the static site that publishes the Obsidian vault to **[devbook.zip](https://devbook.zip)**. Built with **[Quartz v5](https://quartz.jzhao.xyz)**.

This directory turns the notes in [`../Vault/`](../Vault) into a fast static website. Content is authored in Obsidian, rendered and published by the **Quartz Syncer** Obsidian plugin, and built by Quartz on deploy.

## The pipeline

```text
Obsidian  (Vault/Home, publish: true notes)
   │  Quartz Syncer plugin: renders in-note Dataview/Datacore/Bases → static HTML,
   │  preserves %% markers, strips the "Home" vault-root folder
   │  pre-commit waits for export and stages Web/content/ and Syncer styles
   ▼
Web/content/     # generated, git-tracked, deployed as-is
   │  npx quartz build   (Vercel, on every push)
   ▼
Web/public/  →  devbook.zip
```

- **Author** notes in Obsidian under `Vault/Home/`. Only `publish: true` notes ever leave the vault.
- **Commit** staged vault changes — the pre-commit hook waits for Quartz Syncer to render in-note Dataview/Datacore/Bases to static HTML, verifies publication and cleanup, and stages generated output into that same commit. Treat `Web/content/` as generated output; edit notes in `Vault/`.
- **Build & deploy** — Vercel runs the Quartz build from `Web/` on each push; production deploys from `main`.

## Local development

After cloning, run one setup command from the repository root:

```bash
bash .scripts/setup.sh
```

It installs the locked npm dependencies in `Web/`, enables this checkout’s Git hooks, and configures Syncer for this checkout through the existing supported CLI flow. It does not export notes, stage files, commit, or deploy the site. Running it again is safe; `npm ci` reinstalls the locked dependencies.

**Manual prerequisites before running setup:**

1. Install Git, Bash, Python 3.9 or later, Node 22 with npm, and Obsidian desktop. Activate Node 22 in the shell; `Web/.node-version` records the project version. No pip packages are needed.
2. Open this checkout’s `Vault/` folder in Obsidian and allow community plugins. Enable the bundled Quartz Syncer, Datacore and Dataview plugins, and Git for commits inside Obsidian. Keep the bundled Syncer build described below.
3. Enable **Settings → General → Command line interface** and follow Obsidian’s registration prompt. Keep the vault open while setup runs. See the [Obsidian CLI setup guide](https://obsidian.md/help/cli).

**Manual steps before the first commit/push:** configure Git’s name/email if missing, authenticate Git for GitHub access when pulling or pushing, and let Datacore finish indexing. Setup leaves identity and credentials under your control. Local export needs no Syncer GitHub token. Once ready, commits from desktop Obsidian Git run the same blocking pre-commit export as terminal commits.

If setup fails, its output identifies the failed stage. Dependencies and hooks already installed remain in place; fix the reported prerequisite and run the same command again. Setup only reports success after Syncer configuration succeeds.

This workflow is tested on macOS. Linux has not been verified; native Windows and mobile are unsupported because the exporter uses Bash and Unix file locking. Quartz community plugins are installed and updated by `npm run build`, described below; setup installs the npm dependencies needed for the authoring workflow.

The installed Syncer is a temporary build of [PR #153](https://github.com/saberzero1/quartz-syncer/pull/153), recorded in `Vault/.obsidian/plugins/quartz-syncer/build-info.json`. Shared export defaults live in `.scripts/quartz-syncer.defaults.json`: **Preserve** keeps existing `%%` Tabsdown/Colsdown markers, the vault root is `Home/`, and the content folder is `content`. Automatic publishing and automatic orphan-media cleanup are disabled; the hook performs checked publication and cleanup itself. It never pushes remotely. When replacing the temporary build, first verify the installed release supports Preserve; released builds without that setting cannot export marker layouts correctly.

Before exporting, the hook applies the shared defaults through Syncer’s supported configuration commands and configures **Local** mode with the current checkout’s absolute `Web/` location through `repo action=set-local`. It refreshes the destination after a clone or move without changing the plugin’s runtime behavior. Syncer’s actual `Vault/.obsidian/plugins/quartz-syncer/data.json` is ignored by Git: the generated destination, credentials, cache and UI state stay on this machine. Other local settings are retained; shared export defaults are reapplied when they differ. The shared policy enables Syncer’s cache because its safe media cleanup needs compiled media references. When export settings change, setup clears Syncer’s compilation cache and reloads the plugin through Obsidian’s CLI. It verifies that automatic publication is stopped before exporting, so cached pages cannot retain the previous comment mode and an old timer cannot publish independently of the hook.

The first vault commit configures Syncer automatically. To configure it before using manual Syncer commands, run this from the repository root after opening the vault:

```bash
python3 .scripts/sync-quartz.py --configure-only
```

This command only configures the connected checkout; it does not export, stage files, or require clean vault source. Setup updates an existing local `data.json` without replacing unrelated settings; new clones let Syncer create it.

Stage all intended vault source changes before committing. Partially staged, unstaged, or untracked source blocks export, as do pre-existing generated-output changes. The hook waits for Obsidian and Syncer indexes to match the files on disk before publishing or deleting pages. Asset changes, including Markdown assets under `Vault/Assets/`, republish all eligible notes through Syncer’s existing publisher so an unchanged note cannot leave an edited image stale. Media cleanup uses Syncer’s compiled-reference-aware operation, preserving images produced only by Datacore/Dataview queries. Its native safety guard may retain unused media; a no-change/withheld result is logged explicitly rather than reported as verified removal. A failed or skipped note, an unrendered query, a cleanup error, a wrong connected vault, failed configuration, concurrent source edits, or a timeout blocks the commit. Failures include the operation, failed-note details or bounded process diagnostics, without dumping settings or credentials. Inspect `git status` and the Git metadata log (`git rev-parse --git-path quartz-syncer-publish.log`), fix the cause, then review any partial generated output before committing or restoring it separately and retrying. Do not discard vault source to clear an export failure. The default timeout is 600 seconds per CLI command and index-readiness wait (`QUARTZ_SYNC_TIMEOUT` overrides it); a timeout does not cancel work already running inside Obsidian. Source-free commits skip export.

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
