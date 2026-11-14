# DevBook Web (Quartz v5)

> Part of **[DevBook](../README.md)** — the static site that publishes the Obsidian vault to **[devbook.zip](https://devbook.zip)**. Built with **[Quartz v5](https://quartz.jzhao.xyz)**.

This directory turns the notes in [`../Vault/`](../Vault) into a fast static website. Content is authored in Obsidian, rendered and published by the **Quartz Syncer** Obsidian plugin, and built by Quartz on deploy.

## The pipeline

```text
Vault sources + authored site/tooling configuration
  │ source-only commit and PR
  ▼
CI: genuine isolated Obsidian/Quartz Syncer export
  │ complete source/policy/output-bound artifact; actual PR Quartz build
  ▼
Review and merge to stage; promote stage → main separately
  │ CI rebuilds the exact accepted commit for its environment
  ▼
Verified Vercel Build Output → deploy --prebuilt
  ├─ stage → Preview → https://stage.devbook.zip
  └─ main  → Production → https://devbook.zip
```

Author notes under `Vault/Home/`; only `publish: true` notes are exported. `Web/content/`, `quartz/styles/syncer/`, `.devbook-improvement/syncer-export.json` and the built site are generated and ignored. A clean clone intentionally has no web-ready content. Never hand-edit or commit these outputs. `quartz/styles/custom.scss` remains authored source, including its existing `@use "./syncer";` import.

Commits run source maintenance and validation without opening Obsidian: guarded `created`/`modified` preparation, Changelog refresh, folder rollups, Roadmap generation, staged-vault validation and Learn coverage. Stage all intended source changes before committing; partial staging, unstaged/untracked Vault source, concurrent source changes or failed maintenance still block the commit. Unrelated generated local previews no longer block source commits. Changelog refresh requires authenticated `gh`; a failed release fetch preserves the old page and blocks the commit. A staged Changelog deletion remains respected.

PR checks export the actual candidate commit with the pinned genuine desktop app and build Quartz without Vercel credentials. The existing `pr-title` check aggregates that result; title validity alone is insufficient. Synthetic exporter fixtures remain separate integration coverage. Automated notes PRs stay source-only and draft until their reviewed source has a trusted native artifact and exact-head checks; they never receive a generated commit. Their configured base remains `main`.

## Local development

Install Git, Bash, Python 3, GitHub CLI, .NET SDK **10.0.100**, Node **22** with npm, then run:

```bash
bash .scripts/setup.sh
```

Setup installs locked Web dependencies and enables this checkout's hooks. Obsidian does not need to be running to set up or commit. Git identity/authentication and `gh auth login` remain local prerequisites for source commits and pushes.

Export the current working Vault and start Quartz with one command:

```bash
(cd .scripts && dotnet run --project DevBook.Tooling -- site preview --repo-root ..)
```

The preview command snapshots current working source, including untracked notes/media, into an ignored disposable checkout and uses a separate Obsidian profile. It preserves the real Git index, personal plugin settings and Qard study state. `--app-bundle /path/to/Obsidian.app` selects a compatible app; CI pins checksum-verified **Obsidian 1.14.5**. `--port 8085` changes the server port and `--no-serve` prepares a build without starting a server. Native rendering currently requires macOS; Node 22 remains required for Quartz.

Existing dated notes preview entirely through the isolated profile. First publication retains its existing meaning and requires the current Vault open in Obsidian with its CLI enabled. For a new `publish: true` note without `published`, this explicit preview operation first completes a genuine export, uses the public `Vault.process()` operation with a current-content hash guard to record only the missing publication date in the owning source, and exports again. There is no filesystem writeback fallback. It does not stage that change; review it with the note. Existing `created`, `modified`, `published` and supported aliases remain authoritative. Failed exports never create a publication date, and a concurrent edit is never overwritten. Immutable CI refuses a missing required publication date and directs the author to this command.

The bundled Quartz Syncer is the temporary Preserve-capable build of [PR #153](https://github.com/saberzero1/quartz-syncer/pull/153), recorded in its `build-info.json`. Keep **Preserve** support before replacing it. Shared defaults in `.scripts/quartz-syncer.defaults.json` select `Home/`, preserve `%%` layout markers, enable compiled-reference-aware media cleanup and disable background publication. Machine-local Syncer `data.json` remains ignored. The isolated renderer uses only its required plugins and restores settings on exit.

Export starts from empty owned output roots and preserves native index-readiness checks, failed/skipped-note checks, source immutability, rendered-query validation and safe media cleanup. A failure produces no successful artifact. If desktop cleanup cannot complete, diagnostics name the retained settings/profile recovery path; inspect that owned recovery data before deleting it. Never discard Vault source to bypass a failure. Local preview directories under `.devbook-preview/` are disposable after the server/profile has stopped.

For an immutable dedicated checkout, CI uses:

```bash
(cd .scripts && dotnet run --project DevBook.Tooling -- site export \
  --repo-root .. --expected-head <exact-commit-sha> \
  --app-bundle /path/to/Obsidian.app --output /tmp/devbook-native)
(cd .scripts && dotnet run --project DevBook.Tooling -- site verify \
  --repo-root .. --expected-head <exact-commit-sha> \
  --bundle /tmp/devbook-native/bundle.json --extract)
npm run build --prefix Web
```

Use a clean disposable checkout for immutable export, not the live Vault. The full bundle binds source/policy and every output byte; extraction validates paths, kinds, bounds and hashes before replacing owned generated roots. PR native artifacts retain for 14 days, managed artifacts for 7, deployment packages for 30. Expired artifacts require a fresh authorized export of the intended source; an artifact name alone never proves freshness.

`npm run build` regenerates/checks StepTrace, reinstalls configured Quartz plugins, updates them with `--latest`, then builds the site. The committed `quartz.lock.json` remains the baseline; actual resolved plugin lock data is recorded in deployment packages, and build-time updates are never committed. Running Quartz directly requires prepared generated content first.

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

The vault's Datacore dashboards are handled two ways on the static site:

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

`.github/workflows/site-deploy.yml` owns deployment after accepted pushes to `stage` or `main`. It rebuilds that exact commit through the same native export flow; it never deploys a PR artifact. The file-based `framework: null` explicitly selects Vercel’s static “Other” preset instead of any legacy dashboard framework. Target-specific `vercel pull`/`vercel build` preserve `cleanUrls`, redirects and the existing root `vercel.json` settings. Pulled environment files are cleared before repository or latest-plugin code runs: this static build has no secret build variables. Vercel credentials are exposed only to authenticated CLI/API steps.

Only allowlisted static `.vercel/output` files and a complete inventory/identity manifest enter the package. Same-run jobs transfer exact artifact IDs with fail-closed digest checks and independently bind the single payload's SHA-256. Deployment rejects wrong source, target, package bytes and unexpected functions. `--prebuilt` uploads that verified build without rebuilding it remotely.

Preview and Production jobs serialize per branch. Preview creates an immutable deployment without GitHub-reporting/branch-alias metadata; Production stages with `--prod --skip-domain`. Each checks deployment project/SHA and the served immutable build marker, then rechecks branch head immediately before explicit alias assignment or Production promotion. Afterward, alias identity and the fixed URL's build marker must match before GitHub reports success. An observed stale run stops; network calls do not provide atomic branch-head freshness. Serialized jobs prevent an older queued run from superseding a newer published deployment.

GitHub deployment records use **Preview** with `https://stage.devbook.zip` and **Production** with `https://devbook.zip`. Vercel still creates its normal immutable URLs for each build. `git.deploymentEnabled:false` disables the old automatic Git builds; the old Preview-link patcher is no longer needed. Improvement credentials keep `deployment: false` and create no site deployment records.

### Cutover prerequisites

Keep the migration PR **draft** until an authorized owner completes these steps; code changes do not provision credentials or activate production:

1. In GitHub environments **Preview** and **Production**, configure `VERCEL_TOKEN` as a protected secret and `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` as variables for the intended Vercel project. The helper pins organization `team_oe3ByhkyzxSLo4G4aibDvOMA` and project `prj_NwP2L88ODNMTDmHk0fWS5c1jtw2Y`; mismatched variables fail before pull, upload or domain assignment. Restrict branches to `stage` / `main`; apply required reviewers according to the release policy.
2. If Deployment Protection covers either immutable or custom URL, configure `VERCEL_AUTOMATION_BYPASS_SECRET` in that environment so the smoke test checks the actual site rather than an SSO page. Protection itself remains enabled.
3. Preserve the Vercel domain/DNS mapping for `stage.devbook.zip`. Validate project identity, artifact package and protection-aware smoke prerequisites. Configure required checks on `stage` through a separately authorized settings change: current stage rules do not enforce checks. A red readiness check alone is advisory there; draft status blocks ordinary PR merge. Main enforces `pr-title`.
4. Set repository variable `DEVBOOK_ARTIFACT_DEPLOYMENT_READY=true` only after the configuration is verified. The default-false readiness gate keeps `pr-title` red while actual source/export/build checks run independently. Deployment jobs also check real credential presence instead of trusting this flag.
5. Review the PR, mark it ready and merge to `stage`; verify the new Preview. Promote `stage` to `main` separately for Production. Before promotion, pause/resume legacy improvement operations using the recovery process below so old publishers cannot reintroduce tracked output.

The live project/settings remain unchanged while this PR is open. Do not disable the old live path manually before the reviewed CI cutover is ready.

### Recovery and rollback

For a failed build, fix source/tooling and rebuild the intended SHA. For an expired artifact, rerun its authorized workflow; do not substitute another run's similarly named artifact. A failed identity/alias/smoke check remains a failed deployment even if upload itself succeeded.

To roll Production back, an authorized operator selects a previously verified **production** deployment/package and uses Vercel rollback/promotion without rebuilding unknown source. Verify its project and served build marker afterward. Rollback can disable automatic domain assignment; explicitly restore promotion behavior before resuming releases. Keep the last known-good deployment available independently of expiring CI artifacts.

Old managed-note branches and journals may still reference generated commits. Update their base/source scope deliberately and request a fresh reviewed-source export under the new contract; unsupported legacy operations pause with their audit/review data intact. Never delete their source edits, invent an artifact receipt, or resume an old generated-ref writer. See the [improvement runbook](../.scripts/DevBook.Tooling/README.md).
