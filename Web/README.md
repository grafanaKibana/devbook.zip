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

[DevBook CI/CD](../.github/workflows/vault-validation.yml) owns product validation, native export/build, protected deployment and release. Its filename stays `vault-validation.yml` for automated validation callers. [Site Build](../.github/workflows/site-check.yml) remains a `workflow_call` helper with no independent trigger. Improvement, Feedback, Issue Management and Product Captures remain separate workflows.

PRs into `stage` or `main` run software/source checks, relevant credential-free demo/fixture coverage and genuine candidate export/build. Accepted pushes to `stage` or `main` run validation, then exact-SHA native export, target-specific package creation, deployment and immutable/fixed-URL smoke checks in order. `stage` deploys Preview; `main` deploys Production and can publish a release only after Production verification succeeds. Manual dispatch with no inputs, or `mode=validate`, validates only; explicit `mode=deploy` follows the same deployment prerequisites on protected `stage` or `main` and never publishes a release. PR title edits and approval comments cannot deploy or release.

The workflow defaults to read permission. Jobs request only their required permissions: only deployment requests an OIDC token, and only release writes repository contents. Pure software suites have one owner in CI; source-dependent candidate validation remains at the Improvement mutation boundary. Deployment rebuilds the accepted commit through the native export flow; it never deploys a PR artifact. The file-based `framework: null` explicitly selects Vercel’s static “Other” preset instead of any legacy dashboard framework. Target-specific `vercel pull`/`vercel build` preserve `cleanUrls`, redirects and the existing root `vercel.json` settings. Pulled environment files are cleared before repository or latest-plugin code runs: this static build has no secret build variables. Vercel credentials are exposed only to authenticated CLI/API steps.

`VERCEL_TOKEN` is the only stored Vercel credential. Protected site verification uses GitHub OIDC through Vercel Trusted Sources: only the deploy job can request an identity token, and its masked step output is passed only to the verification step. The short-lived token is sent in `x-vercel-trusted-oidc-idp-token` to the immutable deployment and fixed site URL; Vercel API calls keep their separate API credential. No OIDC token enters the build, site or uploaded artifacts. Missing identity or failed protection access blocks fixed-domain publication before alias assignment or promotion.

Only allowlisted static `.vercel/output` files and a complete inventory/identity manifest enter the package. Static paths retain their exact case, including Quartz case-redirect aliases such as `About.html` alongside `about.html`; Unicode NFC-equivalent duplicate paths remain invalid. Packages with case-distinct files or directory names require a case-sensitive destination filesystem. Extraction probes the actual destination before replacing existing output and refuses unsupported filesystems without changing that output. Native source-artifact path restrictions remain unchanged. Same-run jobs transfer exact artifact IDs with fail-closed digest checks and independently bind the single payload's SHA-256. Deployment rejects wrong source, target, package bytes and unexpected functions. `--prebuilt` uploads that verified build without rebuilding it remotely.

Preview and Production jobs serialize per branch. Preview creates an immutable deployment without GitHub-reporting/branch-alias metadata; Production stages with `--prod --skip-domain`. Each checks deployment project/SHA and the served immutable build marker, then rechecks branch head immediately before explicit alias assignment or Production promotion. Afterward, alias identity and the fixed URL's build marker must match before GitHub reports success. An observed stale run stops; network calls do not provide atomic branch-head freshness. Serialized jobs prevent an older queued run from superseding a newer published deployment.

GitHub deployment records use **Preview** with `https://stage.devbook.zip` and **Production** with `https://devbook.zip`. Vercel still creates its normal immutable URLs for each build. `git.deploymentEnabled:false` disables the old automatic Git builds; the old Preview-link patcher is no longer needed. Improvement credentials keep `deployment: false` and create no site deployment records.

### Cutover prerequisites

Keep the caller-migration PR **draft** until the new Stage trust rule and required branch checks have been read back and verified. Existing `DEVBOOK_ARTIFACT_DEPLOYMENT_READY=true` records the previous configuration; it does not prove trust for the new `vault-validation.yml` caller. This operator gate is separate from runtime authentication: merging prematurely can still fail deployment. Code changes do not provision credentials or authorize deployment.

1. Preserve the existing project-scoped `VERCEL_TOKEN` in protected GitHub environments **Preview** and **Production**, and their `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` variables. For initial setup, create a dedicated token in [Vercel Account Tokens](https://vercel.com/account/tokens), named **DevBook GitHub Actions**, for **aldecode's projects → devbook.zip**, with a chosen expiration; the OAuth CLI login cannot mint it. Store it through the environment's secret interface, never in chat, a PR or source. Project scope permits project reads and writes, including Production. The helper pins organization `team_oe3ByhkyzxSLo4G4aibDvOMA` and project `prj_NwP2L88ODNMTDmHk0fWS5c1jtw2Y`; mismatches fail before pull, upload or domain assignment. Restrict Preview to `stage` and Production to `main`; preserve required reviewers.
2. Separately authorize an additive **Stage-only** Trusted Sources update in Vercel **Deployment Protection → Trusted Sources → External Services**. Use the [project API](https://vercel.com/docs/rest-api/projects/update-an-existing-project) for claims not exposed by the guided form. Require issuer `https://token.actions.githubusercontent.com`, audience `https://github.com/grafanaKibana`, repository `grafanaKibana/devbook.zip`, repository ID (`repository_id`) `1154625390` and event (`event_name`) `push` or `workflow_dispatch`, together with every claim in the relevant row:

   | Target | Branch (`ref`) | GitHub environment | Workflow (`workflow_ref`) | Vercel environment |
   | --- | --- | --- | --- | --- |
   | Stage | `refs/heads/stage` | `Preview` | `grafanaKibana/devbook.zip/.github/workflows/vault-validation.yml@refs/heads/stage` | `preview` |
   | Main | `refs/heads/main` | `Production` | `grafanaKibana/devbook.zip/.github/workflows/vault-validation.yml@refs/heads/main` | `production` |

   Use separate rules; never combine their branch/environment claims into interchangeable alternatives. Preserve unrelated rules and the old `site-deploy.yml` rules until old runs have drained. Main policy changes require separate authorization before the later Main promotion. Deployment Protection stays enabled; no Automation Bypass secret is required.
3. Read back the exact Stage rule, project identity, Preview secret presence and branch restrictions. Verify required `pr-title` on `stage`; the readiness variable does not configure branch protection. Check that feature refs, PR events, wrong repository/ID, wrong environment and the old caller do not satisfy the **new** rule. An old caller may still match its retained transition rule. A feature-branch run cannot prove positive protected-ref authentication. Keep the migration PR draft until these configuration checks pass; do not reset shared readiness and disrupt the existing path.
4. After separate merge authorization, the first protected `stage` push must prove Preview OIDC access, immutable deployment identity/smoke, alias assignment and fixed-URL smoke. Preserve the current deployments and domain/DNS mapping for `stage.devbook.zip` during cutover. Runtime credentials, identity and protection checks remain mandatory even when the readiness variable is true.
5. Before a separately authorized `stage` → `main` promotion, add and read back the Main rule, Production credentials, branch protection and project identity. Pause/resume legacy improvement operations using the recovery process below so old publishers cannot reintroduce tracked output. The protected Main push supplies the first positive Production proof; release waits for successful Production verification. A manual deployment never publishes a release.

For initial deployment setup, set `DEVBOOK_ARTIFACT_DEPLOYMENT_READY=true` only after environment, identity, trust and branch checks succeed. Its default-false gate keeps `pr-title` red while source/export/build checks run independently. It records configuration readiness, not deployment success. The caller migration requires fresh policy readback even when this variable is already true. Keep old trust until its runs drain and the replacement is verified; remove it only through a separately authorized change.

### Deferred workflow history cleanup

History cleanup follows accepted migration, verified replacement Stage and Main deployments, and retirement on both `stage` and default `main`. A PR merged only to `stage` does not remove workflow definitions from default `main` or establish that old Actions sidebar items have disappeared. Confirm the sidebar in GitHub after cutover and cleanup; a YAML deletion or API response alone is insufficient.

The migration utility [cleanup-retired-workflow-runs.mjs](../.scripts/cleanup-retired-workflow-runs.mjs) uses a narrow ID/path allowlist for `grafanaKibana/devbook.zip`:

| Retired workflow | ID | Path |
| --- | --- | --- |
| Release | `306608447` | `.github/workflows/release.yml` |
| Site Deployment | `419374696` | `.github/workflows/site-deploy.yml` |
| PR Title | `306607788` | `.github/workflows/pr-title.yml` |
| Major Release Approval | `308100887` | `.github/workflows/major-approval.yml` |
| Preview Link | `417686872` | `.github/workflows/preview-deployment-link.yml` |

The earlier inventory counted 1,705 runs across these identities; that count is informational, never a deletion selector. Preserve active CI identity `312171039` and all its history, plus Improvement (`401735063`), Feedback (`405362272`), Issue (`308223308`), Captures (`401502578`) and Dependabot. Unknown IDs or changed paths block cleanup.

From the repository root, `node .scripts/cleanup-retired-workflow-runs.mjs --manifest /tmp/retired-runs.json` performs a dry-run. It refuses an existing output path and writes no manifest when retirement or replacement evidence is blocked. After review and separate deletion authorization, `node .scripts/cleanup-retired-workflow-runs.mjs --apply --manifest /tmp/retired-runs.json` executes those frozen bytes; never regenerate and delete in one operation. Run without arguments or with `--help` to display usage without API requests.

The dry-run refreshes repository identity, branch SHAs, workflow IDs/paths, all paginated runs/artifacts and open PR heads. All five retired files must be absent on both `stage` and default `main`, and the preserved CI identity must be named **DevBook CI/CD**. Both current branch heads need successful replacement CI runs with a successful deploy job and its final immutable/fixed-URL verification step. Incomplete evidence blocks manifest creation.

The utility retains active runs, open-PR/current-branch proof runs and runs from unknown head repositories. It also retains **every artifact-bearing run**: live export/publication/recovery consumer ownership is unknown, and a finalized cached operation cannot establish that an artifact is unused. The preserved CI history keeps replacement and current last-good deployment proofs. Review every candidate's run ID, attempt, head SHA and status, plus retained reasons and artifact IDs. Apply rechecks retirement/replacement evidence, each exact run and its artifact inventory, then refreshes open PR heads immediately before every sequential deletion. Changed evidence, new artifacts, modified manifest bytes or API errors stop execution. A separate result file under the OS temporary directory records complete or partial deletion.

After an API or rate-limit failure, inspect that report and resolve the cause or wait for the limit reset. Generate and review a **new** dry-run manifest at a fresh path for the remaining inventory; existing output paths are refused. Do not reuse a manifest containing already deleted run IDs or bypass a missing-run error. Even a complete apply removes only its candidates: retained artifact-bearing runs, including expired-artifact records, can keep old history and sidebar entries visible.

Deleting a workflow run permanently deletes its artifacts; GitHub does not offer per-job history deletion. Preserve recovery material before approving a manifest. No deletion is part of the CI/CD migration PR. Actual cleanup and the final Actions sidebar check remain deferred until acceptance and protected deployment proofs.

### Recovery and rollback

For a failed build, fix source/tooling and rebuild the intended SHA. For an expired artifact, rerun its authorized workflow; do not substitute another run's similarly named artifact. A failed identity/alias/smoke check remains a failed deployment even if upload itself succeeded.

To roll Production back, an authorized operator selects a previously verified **production** deployment/package and uses Vercel rollback/promotion without rebuilding unknown source. Verify its project and served build marker afterward. Rollback can disable automatic domain assignment; explicitly restore promotion behavior before resuming releases. Keep the last known-good deployment available independently of expiring CI artifacts.

Old managed-note branches and journals may still reference generated commits. Update their base/source scope deliberately and request a fresh reviewed-source export under the new contract; unsupported legacy operations pause with their audit/review data intact. Never delete their source edits, invent an artifact receipt, or resume an old generated-ref writer. See the [improvement runbook](../.scripts/DevBook.Tooling/README.md).
