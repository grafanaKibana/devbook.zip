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

Commits run source maintenance and validation without opening Obsidian: guarded `created`/`modified` preparation, Changelog refresh, folder rollups, Roadmap generation, staged-vault validation and Learn coverage. Stage all intended source changes before committing; partial staging, unstaged/untracked Vault source, concurrent source changes or failed maintenance still block the commit. Folder-rollup paths use a separate NUL-delimited report, so .NET diagnostics remain visible and cannot become staged paths. During an active Git merge, notes inherited byte-for-byte from an actual parent retain valid existing source dates; newly authored changes and resolutions still receive normal date preparation. Unrelated generated local previews no longer block source commits. Changelog refresh requires authenticated `gh`; a failed release fetch preserves the old page and blocks the commit. A staged Changelog deletion remains respected.

PR checks export the actual candidate commit with the pinned genuine desktop app and build Quartz without Vercel credentials. The required `ci` check aggregates that result with validation; `pr-title` checks only the title. Synthetic exporter fixtures remain separate integration coverage. Automated notes PRs stay source-only and draft until their reviewed source has a trusted native artifact and exact-head checks; they never receive a generated commit. Their configured base remains `main`.

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

Preview serves a fixed snapshot. After editing Vault notes, stop it and rerun `site preview` to export those changes. It does not watch the live Vault.

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

`npm run build` regenerates/checks StepTrace, reinstalls configured Quartz plugins, updates them with `--latest`, then builds the site. The committed `quartz.lock.json` remains the baseline; actual resolved plugin lock data is recorded in deployment packages, and build-time updates are never committed. Use these npm commands after preparing generated content; invoking Quartz directly against ignored `content/` can produce a zero-note site. Deployment packages allow at most 256 MiB of decoded static output, 25 MiB per file and 30,000 files; exceeding a bound blocks packaging and upload. These are repository safety bounds, separate from Vercel account limits. Both `npm run build` and `npm run serve` copy that prepared content into an owned temporary directory outside Git and pass it through Quartz’s supported `--directory` option, keeping the working directory here and output in `public/`. This prevents Git’s generated-content ignore rule from hiding notes from Quartz. Relative paths, file bytes and modification times survive the copy; empty Markdown and symlinks fail validation. Successful builds require every input Markdown file to be parsed, a nonempty content index, indexed note HTML and the homepage. The server watches its temporary snapshot; original Vault edits still require a new export. The wrapper cleans its snapshot on exit, and `site preview` also cleans its owned temporary parent after cancellation.

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

[DevBook CI/CD](../.github/workflows/vault-validation.yml) validates PRs and every accepted push to `stage` or `main`, then deploys: `stage` to Preview, `main` to Production followed by the release. Its required `ci` job passes only when the native export, Quartz build and validation succeed; [PR Rules](../.github/workflows/pr-rules.yml) owns the title-only `pr-title` check and major-version approval. Manual dispatch validates only; `mode=deploy` deploys a protected branch and never releases.

Deployment rebuilds the accepted commit through the same native export flow; it never deploys a PR artifact. The file-based `framework: null` selects Vercel’s static “Other” preset. Target-specific `vercel pull`/`vercel build` preserve `cleanUrls`, redirects and the root `vercel.json` settings. Pulled environment files are cleared before repository or plugin code runs; this static build has no secret build variables. Vercel credentials reach only authenticated CLI/API steps, and deployment also requires `DEVBOOK_ARTIFACT_DEPLOYMENT_READY=true`.

`VERCEL_TOKEN` is the only stored Vercel credential. Protected site verification uses GitHub OIDC through Vercel Trusted Sources, trusted for `vault-validation.yml` on `stage` (Preview) and `main` (Production): only the deploy job requests an identity token, and its masked output goes only to the verification step, sent in `x-vercel-trusted-oidc-idp-token` to the immutable deployment and fixed URL. No OIDC token enters the build, site or artifacts. Missing identity or failed protection access blocks publication before alias assignment or promotion.

Only allowlisted static `.vercel/output` files and an inventory/identity manifest enter the package. Static paths keep their exact case, including Quartz case-redirect aliases such as `About.html` beside `about.html`; NFC-equivalent duplicates are invalid, and extraction refuses case-insensitive destinations without changing existing output. Jobs transfer exact artifact IDs with fail-closed digest checks and bind the payload's SHA-256. Deployment rejects wrong source, target, package bytes and unexpected functions; `--prebuilt` uploads the verified build without a remote rebuild.

Preview and Production serialize per branch. Each deployment checks project, SHA and the served build marker, rechecks the branch head right before alias assignment or Production promotion, then verifies the fixed URL before reporting success. A stale run stops.

GitHub deployment records use **Preview** (`https://stage.devbook.zip`) and **Production** (`https://devbook.zip`). `git.deploymentEnabled:false` disables Vercel’s automatic Git builds. Improvement credentials keep `deployment: false` and create no deployment records.

### Recovery and rollback

For a failed build, fix source/tooling and rebuild the intended SHA. For an expired artifact, rerun its authorized workflow; do not substitute another run's similarly named artifact. A failed identity/alias/smoke check remains a failed deployment even if upload itself succeeded.

To roll Production back, an authorized operator selects a previously verified **production** deployment/package and uses Vercel rollback/promotion without rebuilding unknown source. Verify its project and served build marker afterward. Rollback can disable automatic domain assignment; explicitly restore promotion behavior before resuming releases. Keep the last known-good deployment available independently of expiring CI artifacts.

Old managed-note branches and journals may still reference generated commits. Update their base/source scope deliberately and request a fresh reviewed-source export under the new contract; unsupported legacy operations pause with their audit/review data intact. Never delete their source edits, invent an artifact receipt, or resume an old generated-ref writer. See the [improvement runbook](../.scripts/DevBook.Tooling/README.md).
