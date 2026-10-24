# Recurring DevBook improvement

The recurring improvement system is a bounded GitHub Actions work queue for `Vault/Home` notes. It selects a small topic batch, asks one Claude context with read-only web research to propose guarded block replacements, requires a second independent read-only Claude note-reviewer verdict, runs repository validation, and maintains at most one draft pull request per topic. It never merges or enables auto-merge.

Production processing is not activated by this change. The checked-in workflow runs a credential-free demo on its six-hour schedule until every protected activation gate is deliberately configured and verified.

For usage, inputs, and examples, start with the [action README](../.scripts/devbook_improvement/README.md).

## Components and defaults

- [`.github/workflows/devbook-improvement.yml`](../.github/workflows/devbook-improvement.yml) provides an off-hour `23 */6 * * *` opportunity and manual `demo`, `dry-run`, and `apply` modes. One concurrency group serializes every opportunity without cancelling an active run.
- [`.github/devbook-improvement.json`](../.github/devbook-improvement.json) holds reviewable policy: exact model, topic/PR limits, owner identity allowlist, source hosts, required checks, validators, and content-authority paths.
- [`.scripts/devbook_improvement/core.py`](../.scripts/devbook_improvement/core.py) selects work and enforces source hashes, block identity, Qard metadata, rejection history, cooldowns, and cumulative PR summaries.
- [`.scripts/devbook_improvement/provider.py`](../.scripts/devbook_improvement/provider.py) invokes Claude Code with subscription OAuth. It exposes built-in WebSearch and WebFetch with documentation-domain preapprovals. Shell, local file tools, MCP servers, persistent sessions, project settings, fallback models, and permission prompts remain unavailable. Notes and comments enter through bounded stdin as untrusted JSON; the process receives an isolated Claude config and a small environment allowlist.
- [`.scripts/devbook_improvement/runtime.py`](../.scripts/devbook_improvement/runtime.py) owns Git/GitHub transport, optimistic state updates, feedback polling, source retrieval, validation, write-ahead recovery, exact-head checks, and draft PR updates. `pipeline.py` binds that transport to selection, provider calls, artifacts, and the `demo`/`dry-run`/`apply` CLI.

Default workload is four notes per opportunity, sixteen notes or 1,200 changed lines per PR, three open managed PRs, a 35-minute worker budget within a 40-minute workflow job, and one model invocation at a time. Each author or reviewer call is capped at 900 seconds and 20 model turns, and also receives the pipeline's remaining run budget. A stable topic is the note's exact parent directory relative to `Vault/Home` (currently about 70 topic queues). Generated and dashboard pages remain excluded by default. `claude-sonnet-5-5` is the exact default model; Claude Code is pinned to `2.1.285`, above the model's `2.1.284` minimum. Maintenance runs do not inspect the installed Qard plugin or require a particular version. CI fixtures need no local plugin installation; note/card validation and study-state protections remain enforced.

## Model and quota boundaries

Live calls require `CLAUDE_CODE_OAUTH_TOKEN`, created by the supported `claude setup-token` subscription flow. The child process strips `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, cloud-provider, federated-provider, and unrelated host variables. There is no API-key or paid-provider fallback. Successful results must report exactly the requested model in `modelUsage`; absent, mixed, or mismatched model evidence fails the run.

Only a nonzero Claude CLI exit or an error envelope can create a quota cooldown. Note text cannot. An actual reset timestamp is persisted when the CLI reports one. When it reports no reset, `reset_at` remains null and a conservative delayed recheck is stored separately. Weekly exhaustion pauses authoring, feedback fixes, and review. Expected cooldown skips make no model call and notify once per episode; genuine provider failures remain visible. The integration does not claim access to remaining-quota percentages because Claude Code exposes no supported CI telemetry for them.

OAuth selects subscription authentication but cannot prevent separately enabled usage credits from continuing beyond plan quota. Production activation therefore requires a human check that usage credits are off in the Claude account.

## Web research

Built-in WebSearch and WebFetch use the existing subscription pool; no additional MCP service, API key, or separately billed API fallback is configured. Search is instructed to target approved primary hosts and public technical facts; fetch permissions preapprove those hosts. Claude also has built-in documentation-domain preapprovals, so these permissions are not a strict hostname firewall. Deterministic retrieval still validates every submitted factual source against the configured public-host policy before publication. External pages and results remain untrusted data.

The isolated environment pins background Haiku routing to the same exact requested Sonnet identifier, preserving exclusive-model verification even when fetch needs extraction. A live activation smoke must verify this behavior on the pinned CLI. Context7 was considered, but its separate free monthly allowance and CI credential are unnecessary while built-in tools suffice.

## Pull request behavior

Each open topic generation has one stable branch and one draft PR identified by a machine marker. Later batches append to that PR until it reaches a configured size or owner review begins. Once frozen, only edits caused by queued owner feedback may enter. A merged PR starts a fresh generation from current `main`; a closed unmerged PR stays closed, and its rejected proposal fingerprints and learning-target lineage remain suppressed.

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

Activation publishes the workflow and provisions access. Keep scheduled processing disabled until the protected pilot and its exact-head checks succeed:

0. Merge the prerequisite Qard migration, then the scoped improvement setup PR, manually to `main`. The worker requires its current Qard validator/template/reader contracts. GitHub requires the workflow on the default branch for its scheduled and manual entry points. Existing uncommitted notes and unrelated checkout changes do not belong in either setup publication.

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
5. Run manual `demo`, then the credential-free `dry-run`. Inspect its inventory and selection artifacts and confirm zero checkout mutation.
6. Confirm the OAuth token was created through the Claude subscription flow. Set `DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED=true` and `DEVBOOK_IMPROVEMENT_ACTIVATED=true` to permit protected manual testing, keeping `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`. These gates permit the activation tests; they do not prove access works. Before enabling scheduled processing, verify a harmless public-documentation WebSearch/WebFetch smoke with successful tool use, no permission denials, and matching exclusive `modelUsage`. Background/helper routing is pinned to the same exact model; mixed or missing model evidence fails closed. Also verify the automation token can create/update the control-state branch and dispatch `vault-validation.yml`. The activation phase authorizes these external credential/deployment smokes.
7. Run the protected dry-run with **with model** enabled. It reads GitHub and writes only the persistent control state/lease; it makes no note, topic-branch, or PR changes. Inspect the proposed diff, separate question-change report, independent reviewer evidence, and validation. Each evidence item contains an exact current-note quote, its 1-based line, and a reason; the pipeline verifies the quote at that line before accepting `CLEAN`.
8. With `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`, run the authorized first protected manual `apply` to create a small draft topic PR. Manual apply is gated by activation, subscription OAuth, disabled usage credits, and the explicit `apply` selection; it does not pre-claim workflow propagation. Inspect the resulting draft PR, cumulative body, and review evidence. Complete the verified local Syncer handoff below, then inspect exact-head validation and `pr-title`/`major-approval` checks. The runtime never merges around a missing or failed check.
9. Only after that first managed PR proves the check path, set `DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED=true` and separately set `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=true` to authorize unattended scheduled opportunities. Optionally set `DEVBOOK_IMPROVEMENT_MODEL` to another exact verified identifier; otherwise schedules use `claude-sonnet-5-5`.

The manual model input and scheduled `DEVBOOK_IMPROVEMENT_MODEL` variable select another exact model. Local CLI runs without `--model` use the checked-in configuration field. The Claude CLI minimum version and `modelUsage` checks still fail closed; there is no fallback.

## Verified local Syncer handoff

The model and GitHub API author only `Vault/Home` Markdown. An API commit does not run local Git hooks, and Linux runners cannot invoke Obsidian. A changed-note publication therefore returns `awaiting_export`; its journal, source review and proposal history move to `export_operations`, and the draft topic PR is frozen against unrelated additions. Other topic queues and explicit owner corrections can continue.

After inspecting the note/card diff, use a clean dedicated checkout of the exact managed PR head, open **that checkout's** Vault in Obsidian, and run:

```sh
PYTHONPATH=.scripts python3 -m devbook_improvement.sync_export export --expected-head <current-PR-head-sha>
```

The command verifies checkout/vault identity and locks the same export boundary as the normal hook. It calls the existing Syncer implementation even though the note changes are already committed, verifies source stability, and stages only `Web/content`, the existing generated Syncer styles, and `.devbook-improvement/syncer-export.json`. It leaves commits and pushes for explicit approval. It never switches, resets or stashes the primary checkout. Failed or ambiguous exports leave reviewable files in the dedicated checkout and do not produce an accepted receipt; inspect them before retrying rather than bypassing the guard.

The receipt binds the complete tracked Vault source (excluding Obsidian state), generated output, Syncer implementation and policy through Git blob hashes. CI recomputes these bindings inside the existing required `pr-title` job for managed branches targeting `main`. Live read-only protection inspection found `pr-title` and `major-approval` are the required contexts; this change does not modify repository settings. If a different content base is configured, verify its required check path separately before activation. A later note edit invalidates freshness, including an owner-requested correction. Regenerate, review, commit and push the export again before marking the PR ready or merging it.

Receipts prove matching content versions, not cryptographic Syncer provenance. The trusted local exporter and manual review supply that provenance. Tests use synthetic Git trees and a fake exporter; no live Obsidian export has been performed by this repair.

## Pause, disable, and recover

- Pause unattended work by setting `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`; protected manual dry-runs and explicitly requested manual apply remain available. Set `DEVBOOK_IMPROVEMENT_ACTIVATED=false` for an emergency stop that disables every live model/apply run. Either setting returns scheduled opportunities to the credential-free demo path.
- Disable all opportunities from the Actions UI by disabling the `DevBook Improvement` workflow. Open draft PRs and the state branch remain intact.
- A quota episode resumes automatically after the recorded `next_check_at`; do not add short retry schedules. Clear a cooldown only when its persisted evidence is wrong and record why.
- A source/hash or branch CAS conflict preserves the proposal and pauses that topic. If any authoritative topic note changed on `main` since its PR generation, authoring and feedback fixes pause until GitHub ancestry proves the topic branch includes current `main`. Merge current `main` into that branch through normal reviewed Git work, resolve conflicts, then re-run; unrelated topic queues continue. Never force-push or discard user edits. Pause reasons are recorded in the control state and run artifacts.
- A write-ahead journal entry is reconciled before selecting new work. If GitHub state is ambiguous, leave the entry in place and inspect its branch, PR marker, and exact operation ID rather than replaying publication.
- `feedback_needs_scope` means a complete feedback request cannot fit the available notes and configured batch bound. Its status remains pending, and no model call is made. Narrow the owner request or deliberately raise the note limit; fitting requests can proceed first.
- Closed or merged owning PRs archive pending publications in `terminal_operations` and release the queue without further branch mutations. Ordinary terminal reconciliation retains closure rejections and merged review history.
- Before recovering an unapplied publication, compare current verified-owner feedback with the saved revisions. A mismatch moves the candidate to `invalidated_operations`, preserving its evidence and releasing the journal so the next opportunity can reconcile current feedback. A branch write that already completed is reconciled as applied.
- A terminal failed check stays visible on the draft PR. Its exact head, check evidence, and proposal receipts are retained in `failed_operations`; the global journal is released. That PR stays frozen against unrelated additions, while other topics and explicit owner corrections can proceed. Fix the underlying note or pipeline and run another bounded opportunity; never mark or merge around it.
- Rotate a compromised OAuth or automation token in the protected environment, then run `dry-run` before resuming apply mode.

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
