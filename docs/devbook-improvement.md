# Recurring DevBook improvement

The recurring improvement system is a bounded GitHub Actions work queue for `Vault/Home` notes. It selects a small topic batch, asks one Claude context with read-only web research to propose guarded block replacements, requires a second independent read-only Claude note-reviewer verdict, runs repository validation, and maintains at most one draft pull request per topic. It never merges or enables auto-merge.

Production processing is not activated by this change. The checked-in workflow runs a credential-free demo on its six-hour schedule until every protected activation gate is deliberately configured and verified.

For usage, inputs, and examples, start with the [action README](../.scripts/DevBook.Tooling/README.md).

## Components and defaults

- [`.github/workflows/devbook-improvement.yml`](../.github/workflows/devbook-improvement.yml) provides an off-hour `23 */6 * * *` opportunity and manual `demo`, `dry-run`, `apply`, and genuine-export `fixture` modes. One concurrency group serializes every opportunity without cancelling an active run.
- [`.github/devbook-improvement.json`](../.github/devbook-improvement.json) holds reviewable policy: exact model, topic/PR limits, owner identity allowlist, source hosts, required checks, validators, and content-authority paths.
- The same workflow has separate Ubuntu maintenance, macOS render, and protected Ubuntu publication jobs. No second workflow dispatch is needed for export. A PR or manual `fixture` run uses only credential-free jobs.
- [`.scripts/DevBook.Tooling/`](../.scripts/DevBook.Tooling/) contains the shared native C# implementation: `Improvement` owns queue/provider/state/GitHub orchestration; `Vault` owns Markdown/Qard validation, migration, dates, folder rollups and Roadmap; `Export` owns genuine desktop Syncer rendering, receipts and generated-only publication. Effects are injectable; no server or database is added.
- [`.scripts/DevBook.Tooling.slnx`](../.scripts/DevBook.Tooling.slnx) groups the tooling executable and adjacent `DevBook.Tooling.Tests` project. `Program.cs` dispatches `improvement` and `export`; shared vault entry points live under `DevBook.Tooling/Scripts`. Tests use Arrange/Act/Assert groups with xUnit and FluentAssertions. Run from `.scripts` to select SDK `10.0.100` via `global.json`. The unrelated changelog generator remains Python.

Default workload is four notes per opportunity, sixteen notes or 1,200 changed lines per PR, three open managed PRs, a 35-minute worker budget within a 40-minute workflow job, and one model invocation at a time. Each author or reviewer call is capped at 900 seconds and 20 model turns, and also receives the pipeline's remaining run budget. A stable topic is the note's exact parent directory relative to `Vault/Home` (currently about 70 topic queues). Generated and dashboard pages remain excluded by default. `claude-sonnet-5-5` is the exact default model; Claude Code is pinned to `2.1.285`, above the model's `2.1.284` minimum. Maintenance runs do not inspect the installed Qard plugin or require a particular version. CI fixtures need no local plugin installation; note/card validation and study-state protections remain enforced.

## Model and quota boundaries

Live calls require `CLAUDE_CODE_OAUTH_TOKEN`, created by the supported `claude setup-token` subscription flow. The child process strips `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, cloud-provider, federated-provider, and unrelated host variables. There is no API-key or paid-provider fallback. Successful results must report exactly the requested model in `modelUsage`; absent, mixed, or mismatched model evidence fails the run.

Only a nonzero Claude CLI exit or an error envelope can create a quota cooldown. Note text cannot. An actual reset timestamp is persisted when the CLI reports one. When it reports no reset, `reset_at` remains null and a conservative delayed recheck is stored separately. Weekly exhaustion pauses authoring, feedback fixes, and review. Expected cooldown skips make no model call and notify once per episode; genuine provider failures remain visible. The integration does not claim access to remaining-quota percentages because Claude Code exposes no supported CI telemetry for them.

OAuth selects subscription authentication but cannot prevent separately enabled usage credits from continuing beyond plan quota. Production activation therefore requires a human check that usage credits are off in the Claude account.

## Web research

Built-in WebSearch and WebFetch use the existing subscription pool; no additional MCP service, API key, or separately billed API fallback is configured. Search is instructed to target approved primary hosts and public technical facts; fetch permissions preapprove those hosts. Claude also has built-in documentation-domain preapprovals, so these permissions are not a strict hostname firewall. Deterministic retrieval still validates every submitted factual source against the configured public-host policy before publication. External pages and results remain untrusted data.

The isolated environment pins background Haiku routing to the same exact requested Sonnet identifier, preserving exclusive-model verification even when fetch needs extraction. A live activation smoke must verify this behavior on the pinned CLI. Context7 was considered, but its separate free monthly allowance and CI credential are unnecessary while built-in tools suffice.

## Pull request behavior

Each open topic generation has one stable branch and one draft PR identified by a machine marker. Later batches append to that PR until it reaches a configured size or owner review begins. Once frozen, only edits caused by queued owner feedback may enter. Freeze is a bot scope restriction: it never locks your vault or branch. It starts when the verified owner posts a comment/review, marks the draft ready, or the PR reaches its configured limit. Merely viewing the PR does not start review. Automatic export waiting no longer freezes a PR by itself. Generated export commits remain allowed so the proposed note changes can be rendered. A merged PR starts a fresh generation from current `main`; a closed unmerged PR stays closed, and its rejected proposal fingerprints and learning-target lineage remain suppressed.

The managed PR body is cumulative against `main` and contains:

1. scope and purpose;
2. note improvements;
3. question and answer counts;
4. significant question changes, before/after wording, and identity implications;
5. user feedback with links and outcomes;
6. validation, limitations, and sources.

Only the marked DevBook-improvement section is replaced. Manual text and the existing Haiku-generated description outside it survive every update. Ordinary comments, inline comments, and submitted reviews from the configured numeric-ID/login pair are consolidated before new work. Edited comments receive a new revision fingerprint. The system does not resolve discussions for the owner.

The author payload includes `open_proposals`: the known proposal fingerprints eligible for an explicit owner decision. An optional `decisions` result may reject or reconsider one of those fingerprints only when it cites the specific verified feedback key and reason. The independent reviewer returns a corresponding `decision_checks` item with the exact owner-request quote; silence, approval, and general feedback do not imply rejection. Rejecting a published proposal restores its saved original block, including its original identity, only if that exact replacement is still present. This restoration receives the same complete-note review and source guards as any other edit. Rejection history changes only after that check passes and the guarded publication succeeds, or after a reviewed decision requiring no content change. Closing an unmerged PR suppresses all its proposals independently of comment decisions.

Example managed summary:

```markdown
## Scope and purpose
Topic: Programming/NET. Improve `Tasks.md` and `Async Await.md` for mechanism clarity and Qard recall.

## Note improvements
- Clarified where continuations run and preserved the synchronization-context exception.

## Questions and answers
- Added: 1; rewritten: 1; split: 0; proposed removal: 0.

## Significant question changes
- `Tasks.md#questions`: “What is a Task?” → “What does a .NET Task represent, and what does it not imply about threads?” Same learning target; existing `qard-id` preserved.

## User feedback
- owner comment 123: clarified cancellation propagation; implemented in commit `abc1234`.

## Validation
- vault validator: passed. New cancellation claim checked against Microsoft Task cancellation documentation.
```

## Safe activation

### One-off test before merging PR181

The existing registered workflow can be dispatched from `feature/devbook-improvement-setup` without merging the implementation. GitHub documents [API/CLI dispatch to another branch once a workflow has run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch). Use its explicit `pilot=true` input only after reviewing and publishing the pilot implementation. A [credential-free branch dispatch](https://github.com/grafanaKibana/devbook.zip/actions/runs/41181051583) verifies the GitHub dispatch path; it does not verify model access or publication.

The pilot requires the verified owner's manual dispatch, this exact same-repository workflow/ref, and an authorized 40-character commit SHA in repository variable `DEVBOOK_IMPROVEMENT_PILOT_SHA`. The workflow SHA, local checkout and current remote base must agree. Keep both `DEVBOOK_IMPROVEMENT_ACTIVATED=false` and `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`. Pilot-scoped activation/subscription confirmations apply only to that explicitly authorized run; account usage credits must still be confirmed disabled. No scheduled event can enter the pilot path.

The pilot overlays the existing policy in memory: two notes, one draft PR, base `feature/devbook-improvement-setup`, and state branch `maintenance/devbook-improvement-pr181-test-state`. Reserved generation `1810001` keeps its topic branch distinct from initial production generations. Author/reviewer rules, source policy, validators, genuine export and publication guards stay the same. The draft's diff contains only note improvements and their generated output against the setup branch, so it can be reviewed before PR181 merges. A no-worthwhile-changes or quota outcome remains valid; the system never fabricates an edit to force PR creation.

After explicit commit/publication approval, temporarily add the exact setup branch to the existing protected environment's branch policy and authorize only the reviewed SHA. Run a protected `mode=dry-run,with_model=true,pilot=true`, inspect its artifacts, then dispatch `mode=apply,pilot=true` against the same unchanged branch/SHA. The saved author proposal can resume without another author call. Keep the SHA grant through rendering/publication; after completion or interruption, remove that grant and the temporary branch policy. Do not alter the existing `main` policy or credentials. Revoke access before handing the test PR to the owner; never merge or close it automatically.

Preserve pilot state and evidence, including any quota reset/cooldown. The pilot uses the same subscription as future production: isolated state does not imply fresh quota. Check its cooldown before any later live run, and wait for the recorded reset or conservative recheck when needed. A failed/stale export can be resumed only by explicitly reauthorizing its reviewed SHA after inspecting the original run, head and journal.

```sh
gh workflow run 401735063 --ref feature/devbook-improvement-setup \
  -f mode=dry-run -f with_model=true -f pilot=true -f model=claude-sonnet-5-5 \
  --repo grafanaKibana/devbook.zip
# After inspecting the protected proposal and verifying the same authorized SHA:
gh workflow run 401735063 --ref feature/devbook-improvement-setup \
  -f mode=apply -f pilot=true -f model=claude-sonnet-5-5 \
  --repo grafanaKibana/devbook.zip
```

Removing `DEVBOOK_IMPROVEMENT_PILOT_SHA` prevents new pilot jobs, while removing the temporary environment policy prevents secret access from the setup branch. Explicitly cancel an already-running job when an immediate stop is required. The production controls below remain separate.

### Production activation

Activation publishes the workflow and provisions access. Keep scheduled processing disabled until the native hosted fixture, protected pilot and exact-head checks succeed. A previous Python fixture result does not verify this rewrite:

0. Manually merge the current Qard contracts and this scoped native improvement rewrite to `main` before production activation. The worker requires its current Qard validator/template/reader contracts. The workflow must be on the default branch for scheduling and the manual Actions UI; the registered-workflow API/CLI pilot above can run before merge. Existing uncommitted notes and unrelated checkout changes do not belong in either setup publication.

1. Create the protected `devbook-improvement-production` environment with deployment restricted to `main`. Keep `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false` as a repository Actions variable throughout setup. Do not configure a required reviewer for every run: the explicit one-time activation gates below authorize unattended scheduled opportunities.
2. Install the pinned CLI and run the official subscription-token flow locally. Then let `gh` read the token through its hidden prompt and store it in the protected environment. Never send it through chat or place it in shell history:

   ```sh
   npm install --global @anthropic-ai/claude-code@2.1.285
   claude setup-token
   gh secret set CLAUDE_CODE_OAUTH_TOKEN --env devbook-improvement-production --repo grafanaKibana/devbook.zip
   ```

3. For the initial implementation, create a dedicated fine-grained automation token restricted to `grafanaKibana/devbook.zip`: **Contents**, **Pull requests**, **Issues**, and **Actions** read/write; **Checks**, **Commit statuses**, and **Metadata** read. These cover state refs, topic branches, draft PRs, comments, workflow dispatch, and exact-head evidence. Store it as environment secret `DEVBOOK_GITHUB_TOKEN` through `gh secret set`. Do not reuse Actions' default `GITHUB_TOKEN`; its pushes cannot be assumed to trigger required downstream workflows. A GitHub App installation-token path needs a supported per-run mint action because static installation tokens expire in about an hour; that path is not implemented and remains a separately confirmed follow-up.
Store the dedicated GitHub token through the hidden prompt as well:

   ```sh
   gh secret set DEVBOOK_GITHUB_TOKEN --env devbook-improvement-production --repo grafanaKibana/devbook.zip
   ```

4. Store all `DEVBOOK_IMPROVEMENT_*` control variables below as **repository Actions variables**, using `gh variable set NAME --body VALUE --repo grafanaKibana/devbook.zip`. Job selection happens before environment-scoped variables are available. Keep credentials in the protected environment. Confirm Claude usage credits are disabled, then set `DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED=true` only after checking the account setting.
5. Run manual `demo`, then the credential-free `dry-run`. Inspect its inventory and selection artifacts and confirm zero checkout mutation. Also run the same `DevBook Improvement` workflow with `mode=fixture`: it must prove genuine desktop startup, Datacore rendering, preserved Qard/layout markers, unchanged source/media, and a valid receipt on the hosted macOS runner. It needs no production secrets and publishes no repository changes. A local smoke alone does not prove the hosted GUI bootstrap.
6. Confirm the OAuth token was created through the Claude subscription flow. Set `DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED=true` and `DEVBOOK_IMPROVEMENT_ACTIVATED=true` to permit protected manual testing, keeping `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`. These gates permit the activation tests; they do not prove access works. Before enabling scheduled processing, verify a harmless public-documentation WebSearch/WebFetch smoke with successful tool use, no permission denials, and matching exclusive `modelUsage`. Background/helper routing is pinned to the same exact model; mixed or missing model evidence fails closed. Also verify the automation token can create/update the control-state branch and dispatch `vault-validation.yml`. The activation phase authorizes these external credential/deployment smokes.
7. Run the protected dry-run with **with model** enabled. It reads GitHub and writes only the persistent control state/lease; it makes no note, topic-branch, or PR changes. Inspect the proposed diff, separate question-change report, independent reviewer evidence, and validation. Each evidence item contains an exact current-note quote, its 1-based line, and a reason; the pipeline verifies the quote at that line before accepting `CLEAN`.
8. With `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`, run the authorized first protected manual `apply` to create a small draft topic PR. Manual apply is gated by activation, subscription OAuth, disabled usage credits, and the explicit `apply` selection; it does not pre-claim workflow propagation. Inspect the resulting draft PR, cumulative body, and review evidence. Wait for automatic verified export to add generated output and its receipt to the same PR, then inspect exact-head validation and `pr-title`/`major-approval` checks. Verify the renderer receives no protected secrets, the publisher accepts only expected-head output, and a stale fixture cannot overwrite a newer branch head. The runtime never merges around a missing or failed check.
9. Only after that first managed PR proves the check path, set `DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED=true` and separately set `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=true` to authorize unattended scheduled opportunities. Optionally set `DEVBOOK_IMPROVEMENT_MODEL` to another exact verified identifier; otherwise schedules use `claude-sonnet-5-5`.

Repository control variables start with these values; do not enable the last three confirmation gates until their corresponding checks above are complete:

| Variable | Safe initial value | Purpose |
|---|---|---|
| `DEVBOOK_IMPROVEMENT_ACTIVATED` | `false` | All live model/apply jobs |
| `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED` | `false` | Unattended opportunities |
| `DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED` | `false` | Verified subscription-token creation |
| `DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED` | `false` | Account overage checked off |
| `DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED` | `false` | First PR's exact-head checks verified |
| `DEVBOOK_IMPROVEMENT_MODEL` | optional | Exact model override |

After the workflow is available on `main`, the credential-free checks are:

```sh
gh workflow run devbook-improvement.yml --ref main -f mode=demo --repo grafanaKibana/devbook.zip
gh workflow run devbook-improvement.yml --ref main -f mode=dry-run -f with_model=false --repo grafanaKibana/devbook.zip
gh workflow run devbook-improvement.yml --ref main -f mode=fixture --repo grafanaKibana/devbook.zip
```

Wait for each exact-revision result and inspect its artifacts before the protected pilot. Production credentials, first real PR publication and schedule activation remain explicitly confirmed actions; this document is guidance, not automatic permission to perform them.

The manual model input and scheduled `DEVBOOK_IMPROVEMENT_MODEL` variable select another exact model. Local CLI runs without `--model` use the checked-in configuration field. The Claude CLI minimum version and `modelUsage` checks still fail closed; there is no fallback.

## Automatic verified export

The author API continues to write only `Vault/Home` Markdown. After a reviewed source batch is committed, it persists an exact-head export request and source/review receipts in `export_operations`. The maintenance job releases its state lease, and the same workflow continues through the render and publish jobs. A later opportunity can resume a persisted request after a failed or interrupted job. No new model call is needed for export. While export runs, already-proposed source versions stay checked so subsequent batches do not repeat them.

The renderer starts pinned genuine Obsidian on a fresh hosted macOS runner, with a disposable profile/vault and only the trusted rendering plugin bundles. It uses the existing public Syncer CLI and shared native `Syncer` verification: exact checkout/vault identity, indexed source inventory, Preserve support, shared export defaults, awaited publishing, zero failed/skipped notes, and source stability. Source date properties are prepared against the actual current topic parent before independent review, hashes and source publication. Unrelated notes and earlier batches are not redated. The renderer materializes filesystem timestamps from existing metadata/history before indexing, retaining native Syncer timestamp behavior without rewriting committed source or generated bytes. Rendering never calls local commit-time date preparation, even when an unrelated note has no date fields. The original settings are restored only after its owned process is proven stopped.

Rendering and publication run in separate jobs. The renderer has read-only repository access and no protected production or Claude secrets. The protected publisher verifies managed PR identity, exact current source head, strict generated-path/schema/size bounds, complete Git trees, and the source/output/policy receipt. It publishes generated text, media and deletions with a non-force update, then explicitly dispatches `vault-validation.yml`. A race preserves the newer branch head. A failed publisher can be rerun with its original artifact: an exact matching export commit resumes validation dispatch without creating another commit. Human successor commits are never accepted as that recovery case.

The publisher polls exact-head checks in the same invocation for up to 600 seconds, at 10-second intervals. Optional configuration fields `export_check_wait_seconds` (0–600) and `export_check_poll_seconds` (1–60) change those bounds; zero wait takes one snapshot and is useful for fixtures or deliberate recovery probes. The wait is also capped by the remaining lease, reserving 30 seconds for finalization and cleanup. Each poll rechecks the owning PR, head and lease. Successful checks complete publication immediately; budget expiry preserves `awaiting_checks` for a checks-only resume, and failed checks remain failures.

The PR briefly exists as a source-only draft before its output commit arrives. It is complete for review only after export and required checks pass. The existing required `pr-title` job checks the receipt against the current complete source and generated tree. A later owner edit or feedback fix invalidates freshness and queues another export. `publish: true` continues to control which notes Syncer emits. Website deployment still uses the existing tracked-output deployment after manual merge.

Scheduled reconciliation retries failed/missing export at six-hour intervals, with three attempts per current source head. Existing supported pending exports can resume without another content edit. Legacy pending work lacking the prepared-source contract pauses for review. A new head has its own attempt bound; a closed/merged PR is skipped. Three unsuccessful attempts persist `export_paused` and `export_error` in the operation evidence. Inspect the failed render/publish job, repair the cause, then rerun the failed job with its preserved request/artifact. If the attempt bound has paused the operation, inspect `export_error` and the current PR head before a reviewed, narrowly scoped retry-state update; preserve proposal/rejection history. A manual `apply` opportunity can then select the resumable operation. If no matching validation run appears, its dispatch intent and timestamp are saved before the API call. Missing runs have a separate bound of three dispatch attempts per generated head, at least six hours apart; an observed queued/running or failed run is never redispatched by polling. If validation is still missing six hours after the third attempt, the operation pauses with an actionable `export_error`; generated files and model work are not repeated. Failed and pending checks remain visible. A genuine GitHub/API failure can fail that opportunity; the saved intent prevents an immediate repeated request. Model cooldowns pause author/reviewer work, including feedback fixes; already-produced export or exact-head check finalization can finish without model requests.

Receipts detect stale/mismatched content, not cryptographic provenance. Provenance depends on the trusted workflow code, isolated renderer, protected publisher and your review. Obsidian documents a running desktop CLI; this profile/bootstrap integration must be verified by a hosted fixture pilot before enabling production. It does not claim Obsidian Headless supports community-plugin publishing. Installer download and hash are pinned in the workflow. Fresh profiles disable app updates and use Electron’s test-only mock Keychain with no real credentials. Plugins start after native indexing, with Syncer last, to avoid a fresh-cache initialization race. The public-repository hosted-runner allowance avoids an always-on user Mac; recheck GitHub billing if repository visibility or runner choice changes.

## Manual export recovery

Automatic export is the default. To deliberately use the previous local handoff, set `automatic_export: false`; changed source then waits for manual export and freezes unrelated bot additions.

Use a clean dedicated checkout of the exact managed PR head, open **that checkout's** Vault in Obsidian, and run:

```sh
cd .scripts
test "$(dotnet --version)" = 10.0.100
dotnet run --no-cache --file DevBook.Tooling/Scripts/SyncExport.cs -- export --repo-root .. --expected-head <current-PR-head-sha>
```

The command invokes the same verified Syncer flow and stages only `Web/content`, generated Syncer styles and `.devbook-improvement/syncer-export.json`. It leaves committing/pushing for explicit approval and never switches, resets or stashes the working checkout. Failed or ambiguous exports retain reviewable files; inspect them before retrying. Never edit `Web/content` manually or bypass a stale receipt.

## Pause, disable, and recover

- Pause unattended work by setting `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`; protected manual dry-runs and explicitly requested manual apply remain available. Set `DEVBOOK_IMPROVEMENT_ACTIVATED=false` to disable production model/apply runs. Either setting returns scheduled opportunities to the credential-free demo path. The separately authorized premerge pilot already requires both flags false: revoke `DEVBOOK_IMPROVEMENT_PILOT_SHA` and its temporary environment branch allowance to stop new pilot access, and explicitly cancel an in-flight job when required.
- Disable all opportunities from the Actions UI by disabling `DevBook Improvement`; cancel any already-running export explicitly when stopping it is required. Open draft PRs and the state branch remain intact.
- A quota episode resumes automatically after the recorded `next_check_at`; do not add short retry schedules. Clear a cooldown only when its persisted evidence is wrong and record why.
- A source/hash or branch CAS conflict preserves the proposal and pauses that topic. If any authoritative topic note changed on `main` since its PR generation, authoring and feedback fixes pause until GitHub ancestry proves the topic branch includes current `main`. Merge current `main` into that branch through normal reviewed Git work, resolve conflicts, then re-run; unrelated topic queues continue. Never force-push or discard user edits. Pause reasons are recorded in the control state and run artifacts.
- A write-ahead journal entry is reconciled before selecting new work. If GitHub state is ambiguous, leave the entry in place and inspect its branch, PR marker, and exact operation ID rather than replaying publication.
- If recovery verifies that the owner advanced or removed a pending publication's branch, the original operation and expected/observed heads move to `invalidated_operations`. Its global pending slot is released and `topics.<topic-id>.publication_conflict` pauses only that generation; unrelated queues can proceed. No owner content is overwritten and the archived candidate is never replayed automatically. To resume, stop scheduled work and wait for active jobs to finish, inspect the archived operation and current branch/notes, and reconcile the intended content and base. Use a reviewed state update with the current state-branch/file version as its CAS guard to clear only that generation's `publication_conflict` marker; preserve the archive, other state and any owner-review freeze. Run a protected dry-run before apply. Closing or merging the owning PR advances the generation without reviving the archived proposal.
- `feedback_needs_scope` means a complete feedback request cannot fit the available notes and configured batch bound. Its status remains pending, and no model call is made. Narrow the owner request or deliberately raise the note limit; fitting requests can proceed first.
- Closed or merged owning PRs archive pending publications in `terminal_operations` and release the queue without further branch mutations. Ordinary terminal reconciliation retains closure rejections and merged review history.
- Before recovering an unapplied publication, compare current verified-owner feedback with the saved revisions. A mismatch moves the candidate to `invalidated_operations`, preserving its evidence and releasing the journal so the next opportunity can reconcile current feedback. A branch write that already completed is reconciled as applied.
- A terminal failed check stays visible on the draft PR. Its exact head, check evidence, and proposal receipts are retained in `failed_operations`; the global journal is released. That PR stays frozen against unrelated additions, while other topics and explicit owner corrections can proceed. Fix the underlying note or pipeline and run another bounded opportunity; never mark or merge around it.
- Rotate a compromised OAuth or automation token in the protected environment, then run `dry-run` before resuming apply mode.

## Native state and receipt transition

The C# port preserves version-1 state, branch/PR markers, unknown fields, comment revisions, rejection fingerprints and journal phases. It recomputes legacy identities with the original JSON/Unicode rules; a rules update does not revive a rejected edit. It does not reset control state or assign Qard IDs.

Receipt version 1 remains readable, but a Python-policy receipt is stale for the native exporter. The new policy binds the complete native source/project/SDK/default/plugin dependency closure. A genuine export is required before an old receipt can satisfy the required gate. A managed content branch must include the native tooling baseline from `main`; update that branch through normal reviewed Git work before resuming it. Never copy tooling into a content-only PR as an automatic workaround.

Pending operations without the supported prepared-source contract pause with their original candidates and evidence intact. Do not silently add dates to an already-reviewed old candidate or replay an unsupported journal. Inspect it and restart a reviewed proposal against the current branch when necessary.

Local hooks use the same native tools. They prepare/stage source dates under the export lock and source/index guards. Scheduled candidates use the pure date transformation before review; committed-head rendering only reads that source. These are separate orchestration paths sharing one date policy.

## Limits and follow-up review

Dry-run fixtures prove orchestration, schema compatibility, and safety invariants, not model judgment or semantic accuracy. A confirmed pilot still needs human inspection of card quality, reviewer evidence, and source selection. Source retrieval accepts bounded HTML/plain text from configured public hosts; PDF-only sources currently require a supported text source instead. Add a new primary-documentation host through review rather than allowing arbitrary URLs. More than 100 check runs on one commit produces an actionable error rather than accepting incomplete evidence. Reverse-linked card target transformations pause for manual treatment; same-target wording edits preserve that metadata. The workflow cannot detect inactivity on other devices and does not attempt to exhaust subscription quota.

`WORKFLOW.md` describes the existing Codex PR-review integration, but its account-level configuration is inaccessible through this checkout and the available tools. An additional Codex reviewer therefore remains disabled. The proposed follow-up is to inspect and adapt the existing integration into a focused card-quality review after user confirmation, avoiding duplicate independent reviews.

Compatibility references:

- [Claude Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5)
- [Claude Code authentication](https://code.claude.com/docs/en/authentication)
- [Claude Code headless mode](https://code.claude.com/docs/en/headless)
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-usage)
- [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions)
- [Claude usage credits](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)
- [GitHub Actions token behavior](https://docs.github.com/en/actions/concepts/security/github_token)
- [GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [GitHub Actions variable availability](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [Fine-grained token permission matrix](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)

- [Claude web-tool behavior](https://code.claude.com/docs/en/tools)
- [Claude background model configuration](https://code.claude.com/docs/en/model-config)
- [Context7 free-plan limits](https://context7.com/plans)

- [Obsidian desktop CLI](https://obsidian.md/help/cli)
- [Syncer CLI integration](https://saberzero1.github.io/quartz-syncer-docs/guides/cli)
- [GitHub-hosted runner policy](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

- [Electron macOS spawned-app mock-Keychain tests](https://github.com/electron/electron/pull/53790)
