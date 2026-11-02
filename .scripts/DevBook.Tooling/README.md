# DevBook improvement action

A bounded GitHub Actions queue for DevBook notes and Qard interview cards. Every six hours, an opportunity selects a small topic batch, asks Claude Sonnet 5.5 to refine existing notes for learning, independently reviews complete notes and each proposed change, validates the result, and updates a draft PR with source and genuine published Quartz output. The owner reviews and merges manually; the action never merges or enables auto-merge.

[Workflow](../../.github/workflows/devbook-improvement.yml) · [Configuration](../../.github/devbook-improvement.json) · [Authoring contract](../../AGENTS.md) · [Local publishing](../../Web/README.md)

This README owns setup, operation, quotas and recovery. Production credentials, first real PR publication and schedule activation remain separately confirmed actions. Until activated, scheduled opportunities run the credential-free demo. Passing tests does not activate production.

## Tooling and local checks

Open [DevBook.Tooling.slnx](../DevBook.Tooling.slnx) for the executable and adjacent xUnit/FluentAssertions test project. `Improvement/` owns the queue, JSON model contracts, state and GitHub orchestration; `Vault/` owns validation, Qard migration, dates, rollups and Roadmap; `Export/` owns desktop Syncer rendering, receipts and generated-only publication. `Program.cs` dispatches `improvement` and `export`. PascalCase file-based entry points under `Scripts/` share that implementation and are excluded from project compilation because each has its own entry point. The RAG application keeps its own solution; the unrelated changelog generator remains Python.

Install .NET SDK **10.0.100** and enter `.scripts` so `global.json` selects it:

```sh
cd .scripts
test "$(dotnet --version)" = 10.0.100
dotnet build DevBook.Tooling.slnx --configuration Release
dotnet test DevBook.Tooling.slnx --configuration Release
dotnet run --no-cache --file DevBook.Tooling/Scripts/ValidateVault.cs -- --all --repo-root ..
dotnet run --project DevBook.Tooling -- improvement --repo-root .. --demo --output-dir /tmp/devbook-demo
dotnet run --project DevBook.Tooling -- improvement --repo-root .. --dry-run --output-dir /tmp/devbook-selection
```

Project commands use incremental builds. File-based scripts use `--no-cache` to pick up current tooling changes. Tests keep JSON fixtures and visible Arrange/Act/Assert groups for queue, identity, model, state, feedback, quota, publication and export contracts. Full-vault validation and genuine export are separate checks.

The demo writes `result.json`, `proposed.patch`, `pr-summary.md` and `question-changes.json` through fake model/GitHub/rendering boundaries. It makes no live model request or PR. A local genuine desktop fixture uses the native exporter:

```sh
dotnet run --project DevBook.Tooling -- export fixture --repo-root .. \
  --app-bundle /Applications/Obsidian.app --output /tmp/devbook-export-fixture
```

Use the workflow's pinned compatible bundle when the installed app differs. Hosted credential-free `mode=fixture` pins Obsidian **1.14.5**, verifies its installer hash/signature, and checks startup, Datacore rendering, Qard/layout markers, unchanged source/media and receipt bindings. Local success does not prove hosted GUI startup or live model judgment.

## Selection and review

1. Reconcile state, topic PRs and verified-owner feedback. Complete scoped feedback goes first.
2. Prioritize eligible whole notes containing active **Needs fixing** Qard cards, then other eligible notes. A topic is the first folder below `Vault/Home`, such as `Programming` or `Network`, including all its descendants. Generated and dashboard pages are excluded by default. The queue selects both topic and notes; scheduled and manually triggered runs use the same selection policy, with no note/focus override.
3. Give the author complete notes, current rules and relevant repair IDs. It refines each whole note for learning: wording, factual accuracy, proofreading, terminology, explanation order, readability, repetition, applicable structure and existing Qard content. Strong passages stay intact. Several small edits can form one coherent improvement. A flag is context, not proof that an edit is needed.
4. Prepare changed source dates against the current topic parent **before** independent review. The separate read-only reviewer judges the combined before/after learning benefit and each edit's contribution, checking complete current notes, sources, identity and rejection history. A useful overall revision cannot excuse an incorrect, harmful or gratuitous edit. Arbitrary rephrasing, cosmetic churn, unsupported defects, redundancy and unnecessary expansion fail review.
5. Validate metadata, whole-note hashes and the cumulative diff; update the draft PR. Separate render/publication jobs add verified output and check the exact final head in the same workflow run.

Both model calls use one captured, required rule bundle: `AGENTS.md`, the [Claude writer](../../.claude/agents/note-writer.md) and [reviewer](../../.claude/agents/note-reviewer.md) contracts, Markdown guidance and templates. Codex remains the source of truth: the [Codex writer](../../.codex/agents/note-writer.toml) and [reviewer](../../.codex/agents/note-reviewer.toml) instruction text is mirrored in those Claude files, which are what the pipeline reads. Those texts become trusted content instructions; notes, feedback and sources remain untrusted data. The pipeline uses the contracts in separate restricted Claude calls rather than launching their file-tool agent definitions. Its JSON output protocol and fixed web-only permissions govern each call. Every selected complete note is an assigned audit target, including keeps with an empty focus.

Refinement takes priority over expansion. Add an explanation, example, section or card only to repair a concrete error or essential learning gap that the existing material does not address adequately. Missing optional sections are not defects. The author describes the note-level benefit and each edit's contribution without inventing a major problem for every small correction. Length and edit count are not quality targets; preserve mechanisms, conditions and exceptions.

The pipeline prompts additionally enforce the requested direct technical questions with a finite expected answer. Scenario, hypothetical and role-play prompts, and vague general-advice or release-readiness questions, fail review. Essential meanings must follow from the question itself; correct paraphrases remain valid.

Needs fixing is read from the checked-out repository's Qard data snapshot and matched to card IDs in current note content. A local flag reaches scheduled Actions only after its Qard data update reaches the base branch; the action has no access to running Obsidian state. Only matched repair IDs reach the model. Missing data means no flags; malformed data blocks model work with a diagnostic. Orphan flags do not invent note mappings. Maintenance never writes plugin state, flags, schedules, history, settings or saved sessions; session membership does not exclude a card from content improvement.

A successful changed or independently reviewed unchanged outcome records the repair input with the note version. An unchanged flag already covered by that outcome does not repeatedly select the note. Source, rules, model/protocol, repair-input changes or owner feedback can require another review; flags never override holds, rejections, freezes or PR limits. A false→true flag transition entirely between runs cannot be detected when the observed repair IDs and note remain unchanged.

A keep still requires independent complete-note `CLEAN` evidence: exact current-text quotes, 1-based lines and meaningful reasons. The code binds an exact quotation to its unique source line when the model miscounts; missing or ambiguous quotations remain invalid. Raw reviews and line-binding provenance stay with the control-state or publication receipts; no verdict, quotation, source claim or quality check is rewritten. Concrete High/Medium reviewer findings get one bounded author repair followed by fresh independent review, including after a mistaken keep. The author receives the original notes plus the previous proposal/review as diagnostic data and must verify the finding; it can still justify an unchanged note. The counter is persisted before the repair author call and keyed by source, rules, repair flags and feedback revisions, so changed reviewer wording or a model switch cannot reset it. `max_review_repairs_per_batch=0` disables repairs; `1` is the maximum. A normal opportunity uses two model calls and a repaired opportunity at most four, within the existing time and distinct-source budgets. Quota resumption preserves which author/reviewer phase remains.

Compatible older held reviews with concrete findings or uniquely bindable evidence can automatically enter that repair queue ahead of new notes, after owner feedback. Their original policy/evidence remains archived; a fresh author and reviewer use current policy. Source/flag/feedback changes, frozen/conflicting PRs, full PR slots and quota cooldowns still guard selection. Failed or exhausted repairs stay held without another automatic attempt for the same guarded inputs. Each later hold preserves the previous batch; successful keeps/publications complete only holds for that exact source batch, leaving other batches in the topic intact. Reviewer quota exhaustion preserves proposals without another author call. Pure keeps change neither dates nor source. Legacy author-only keeps need a one-time independent check. Existing Qard IDs survive only for the same learning target; new targets, replacements and split children stay ID-less. Reverse-linked target transformations pause for manual treatment.

Ordinary opportunities are incremental, so different runs can inspect different notes and produce different findings. Compatible interrupted proposals resume from saved evidence; reviewed unchanged notes wait for a reason to be revisited. A separate consistency comparison must freeze the complete notes, source evidence, rules, model/protocol, focus, feedback and rejection history, then compare underlying findings rather than exact wording. This queue does not make three calls per note, and the Sonnet default does not guarantee identical findings. Tests and the credential-free demo verify orchestration and prompt delivery; live editorial quality remains a separate check.

## Topic PRs and feedback

Each topic generation has one stable branch and machine-marked draft PR. Batches append until a size limit, a verified-owner comment/review, or marking the draft ready freezes unrelated additions. Scoped owner corrections and their generated output remain allowed. Viewing a PR or waiting for automatic export does not freeze it. A freeze restricts bot additions, not owner edits. Full PR slots preserve the queue without unnecessary model calls. Merge starts a new generation; closure without merge suppresses those proposals independently of hashes.

Existing nested-topic PRs retain their markers and history. While one remains open, its containing top-level topic pauses to prevent an overlapping PR. Closing or merging it releases that pause on the next reconciliation. Incompatible saved proposals are held with their original evidence; historical outcomes and rejected edits remain intact. Nearby-card context is limited to at most one batch of other notes from the selected notes' immediate folders; selected notes are always supplied in full.

The managed body covers the cumulative diff against `main` in four sections: **Note improvements**, **Questions and answers**, **Significant question changes**, and **User feedback**. Explanations connect the original issue, correction and benefit, with useful sources and before/after question wording. Historical records use saved reasons without inventing benefits. Only the machine-marked section is replaced; owner text and existing generated descriptions outside it survive.

Comments, inline comments and submitted reviews count only when the configured numeric owner ID and login agree. Edited feedback receives a new revision fingerprint. Explicit reject/reconsider decisions must cite verified feedback and pass an independent check quoting the actual request; silence, approval and general feedback imply neither. Rejecting a published proposal restores its original block/identity only while the exact saved replacement remains present, after the same review and guarded publication. Rejection history updates after successful publication or a reviewed decision needing no content change. Closing an unmerged PR suppresses all its proposals. The action never resolves discussions for the owner.

## Defaults and manual inputs

| Setting | Default |
| --- | ---: |
| Notes per opportunity | 4 |
| Notes / changed lines per PR | 16 / 1,200 |
| Open managed PRs | 3 |
| Author or reviewer call | 900 seconds, 20 turns |
| Review repairs / model calls per opportunity | 1 / at most 4 |
| Maintenance / job budget | 35 / 40 minutes |
| Export checks / polling | 600 seconds / 10 seconds |
| Simultaneous model calls | 1 |
| Schedule | `23 */6 * * *` UTC |

The exact default model is `claude-sonnet-5-5`; Claude Code is pinned to `2.1.285` and enforces its compatible minimum. Schedules honor repository variable `DEVBOOK_IMPROVEMENT_MODEL`; manual runs expose `model`, and local CLI runs without `--model` use configuration. Overrides must be deliberate exact identifiers. Missing, mixed or mismatched `modelUsage` fails closed, with no fallback. Background/helper routing uses the same requested model. Model/protocol changes invalidate cached evaluation evidence without relabeling historical records.

| Manual input | Behavior |
| --- | --- |
| `mode=demo` | Credential-free fake-transport flow through the real engine |
| `mode=dry-run`, `with_model=false` | Current selection; no model or writes |
| `mode=dry-run`, `with_model=true` | Protected proposal; control-state/lease writes only |
| `mode=apply` | Protected draft PR update followed by automatic render/publication |
| `mode=fixture` | Genuine isolated hosted Obsidian/Syncer check; artifacts only |
| `model` | Exact model identifier, with no fallback |

Manual triggers start an ordinary queue opportunity; they cannot select a note or supply an editorial focus. Legacy targeting configuration is rejected. Existing publication recovery retains priority. PR-triggered runs remain credential-free; protected live jobs require the `main` workflow and activation gates.

## Public research and subscription quota

Author and reviewer have only built-in **WebSearch** and **WebFetch** for public primary documentation and papers. There is no domain whitelist. Prompts prohibit sending private note text, paths, owner feedback or unpublished identifiers in searches. External pages, notes and comments remain untrusted data. The model has no shell, local file tools, MCP servers or Git credentials. No extra research-service key or separately billed provider fallback is configured.

Deterministic retrieval independently checks evidence URLs: HTTPS on port 443, no embedded credentials, public addresses only, DNS checks at validation and connection, and checks on every redirect (at most five). Proxy use is disabled. Retrieval has a 15-second deadline and accepts Markdown, plain text or HTML; PDF extraction is unavailable. Prefer versioned full-text HTML for papers. The repository configures `max_source_bytes` at 2,000,000 (allowed range 1–2,000,000; programmatic fallback 250,000). Full HTML sources become readable body text before review, retaining their technical content while removing page chrome, scripts and styles. Source-count and 10 MiB model-input limits still apply.

Live calls require `CLAUDE_CODE_OAUTH_TOKEN` from the supported subscription `claude setup-token` flow. The child process clears API-key, alternate-provider and unrelated host variables. OAuth alone cannot prevent enabled account usage credits, so credits must remain disabled and be confirmed during activation.

Only a nonzero CLI exit or error envelope can establish quota exhaustion; note text cannot. Reported resets are persisted. With no reset timestamp, `reset_at` remains null and a conservative 24-hour recheck is stored separately. Weekly exhaustion pauses all new author/reviewer work, including feedback fixes. Cooldown skips succeed quietly and notify at most once per episode; genuine provider failures remain visible. Already-produced export/check finalization can finish without a model call. No precise remaining-quota telemetry is claimed, and the workflow does not attempt to exhaust subscription quota or infer inactivity on other devices.

Optional `model_diagnostics` report safe timing, turn, token/search and permission-denial counts when the pinned CLI provides them. They omit prompts, note text, URLs, queries, raw envelopes and denied tool inputs. They do not measure remaining subscription quota.

## Protected activation

These are setup instructions, not authorization to provision credentials, publish a first real PR or enable scheduling. Keep production and scheduling disabled until each corresponding check succeeds. The protected environment permits only `main`; credential-free branch/PR fixtures need no temporary secret grants.

1. Manually merge the reviewed tooling and current Qard authoring/reader contracts to `main`. Scheduling and protected maintenance use that branch. Keep unrelated local work out of publication.
2. Create protected environment `devbook-improvement-production`, restricted to `main`. Credentials belong there; control variables below belong in **repository Actions variables**, because job selection precedes environment-variable availability. Per-run required reviewers are unnecessary only after explicit unattended activation is authorized.
3. Install the pinned CLI and create the subscription token locally. Use hidden prompts to store it; never put tokens in chat, shell history or committed configuration:

   ```sh
   npm install --global @anthropic-ai/claude-code@2.1.285
   claude setup-token
   gh secret set CLAUDE_CODE_OAUTH_TOKEN --env devbook-improvement-production --repo grafanaKibana/devbook.zip
   ```

4. Create a dedicated fine-grained automation token restricted to `grafanaKibana/devbook.zip`: **Contents**, **Pull requests**, **Issues**, **Actions** read/write; **Checks**, **Commit statuses**, **Metadata** read. Store it with `gh secret set DEVBOOK_GITHUB_TOKEN --env devbook-improvement-production --repo grafanaKibana/devbook.zip` and its hidden prompt. The default `GITHUB_TOKEN` does not reliably trigger required downstream workflows from its pushes. GitHub App per-run token minting is not implemented; static installation tokens expire too soon to substitute safely.
5. Confirm Claude account usage credits are off. Set the corresponding confirmation only after inspecting that setting. Run credential-free `demo`, selection `dry-run` and hosted `fixture` on the exact revision; inspect artifacts, unchanged source/media, genuine rendering and receipt bindings.
6. After confirming subscription-token creation, set `DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED=true` and `DEVBOOK_IMPROVEMENT_ACTIVATED=true` for authorized protected manual tests, keeping scheduling false. Verify harmless public WebSearch/WebFetch use with no permission denials and exclusive requested `modelUsage`; verify the GitHub token can maintain the state branch and dispatch `vault-validation.yml`. Gate values permit tests; they do not prove access works.
7. Run protected `dry-run` with `with_model=true`. It reads GitHub and writes control state/lease, but makes no note, topic-branch or PR changes. Inspect the patch, question-change report, per-edit benefit checks, independent current-text review and validation.
8. With scheduling still false, run the separately authorized first manual `apply`. Inspect the small draft PR and wait for automatic export and exact-head `pr-title`/`major-approval` validation. Verify secret-free rendering, expected-head publication and stale-artifact rejection. Missing, failed or pending checks never authorize merge.
9. Only after the first managed PR proves required checks, set `DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED=true`. Separately authorize `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=true`. Review any existing model override before publication so the intended exact model is used.

| Repository Actions variable | Safe initial value | Purpose |
| --- | --- | --- |
| `DEVBOOK_IMPROVEMENT_ACTIVATED` | `false` | Permit live model/apply jobs |
| `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED` | `false` | Permit unattended opportunities |
| `DEVBOOK_IMPROVEMENT_SUBSCRIPTION_ONLY_CONFIRMED` | `false` | Subscription-token creation verified |
| `DEVBOOK_IMPROVEMENT_USAGE_CREDITS_DISABLED_CONFIRMED` | `false` | Account overage checked off |
| `DEVBOOK_IMPROVEMENT_PR_WORKFLOWS_CONFIRMED` | `false` | First PR exact-head checks verified |
| `DEVBOOK_IMPROVEMENT_MODEL` | optional | Deliberate exact model override |

Set an authorized variable with `gh variable set NAME --body VALUE --repo grafanaKibana/devbook.zip`. Once the workflow is on `main`, credential-free hosted checks are:

```sh
gh workflow run devbook-improvement.yml --ref main -f mode=demo --repo grafanaKibana/devbook.zip
gh workflow run devbook-improvement.yml --ref main -f mode=dry-run -f with_model=false --repo grafanaKibana/devbook.zip
gh workflow run devbook-improvement.yml --ref main -f mode=fixture --repo grafanaKibana/devbook.zip
```

## Verified export and publication

The author writes only `Vault/Home` Markdown. A reviewed source commit persists an exact-head request and source/review receipts in `export_operations`, then releases the maintenance lease. Rendering and publication continue in the same workflow; interrupted requests can resume later without another model call. Already-proposed source versions remain recorded while export runs.

The renderer starts pinned genuine Obsidian in a disposable macOS profile/vault with trusted plugins, repository read access and no protected production/model secrets. Shared Syncer verification checks checkout/vault identity, indexed source inventory, Preserve support, defaults, awaited publishing, zero failed/skipped notes and source stability. Dates were prepared before review; rendering consumes immutable committed source. It materializes filesystem timestamps from metadata/history without rewriting source or generated bytes. Plugins start after native indexing, with Syncer last; app updates are disabled and the fresh profile uses Electron's test-only mock Keychain without real credentials. Original settings restore only after the owned process is proven stopped.

The protected publisher executes trusted code with the dedicated GitHub token. It accepts only `Web/content`, generated Syncer styles and `.devbook-improvement/syncer-export.json`; verifies PR identity, exact source head, complete Git trees, path/schema/size and byte/mode bindings; then updates without force and dispatches `vault-validation.yml`. Races preserve newer heads. Replaying an exact already-published artifact resumes validation without another export commit; human successor commits are not that recovery case. Closed/merged or conflicting PRs receive no stale writes.

Generated text is uploaded in cumulative tree batches bounded by 100 entries and 1 MiB of serialized request data; binary and oversized files use verified blob uploads. Bulk writes are paced, then recheck the live lease before sending. State reads refresh the mutable branch ref and reuse decoded immutable content only while that ref is unchanged. Intermediate trees never publish a partial branch; the complete predicted tree and source-bound receipt must still match.

Exact-head checks poll for up to 600 seconds at 10-second intervals. `export_check_wait_seconds` (0–600) and `export_check_poll_seconds` (1–60) configure those bounds; zero wait takes one snapshot. Polling rechecks PR/head/lease and reserves 30 seconds for finalization. Budget expiry preserves `awaiting_checks` for checks-only resume; failures stay failures. More than 100 check runs on a commit produces an error rather than accepting incomplete evidence.

A source-only draft can appear briefly. It is ready for complete review after export and required checks pass. The required `pr-title` gate checks the receipt against complete current source/generated trees; owner edits or feedback fixes invalidate freshness and queue another export. `publish: true` controls output, and deployment follows the existing tracked-output flow after manual merge. Receipts detect stale/mismatched content; trusted workflow code, job isolation and owner review supply provenance. The hosted GUI fixture is required; Obsidian Headless is not assumed to publish community plugins. Recheck hosted-runner billing if repository visibility or runner choice changes.

Export retries wait at least six hours and stop after three attempts per source head, retaining `export_paused`/`export_error`. Inspect the failed job, original request/artifact and current head; repair the cause before rerunning. A paused bound needs a reviewed, narrowly scoped state update preserving history. Manual `apply` can then select resumable work. Missing validation dispatch has a separate three-attempt/six-hour bound per generated head; saved intent prevents immediate duplicates. Observed queued/running/failed runs are never redispatched by polling. Still-missing validation six hours after the third dispatch pauses with an actionable error. Model work/generated files are not repeated to repair checks.

### Manual export recovery

Automatic export is the default. Deliberately setting `automatic_export: false` makes changed source await local export and freezes unrelated additions. Use a clean dedicated checkout of the exact managed PR head and open **that checkout's** Vault in Obsidian:

```sh
cd .scripts
test "$(dotnet --version)" = 10.0.100
dotnet run --no-cache --file DevBook.Tooling/Scripts/SyncExport.cs -- export --repo-root .. --expected-head <current-PR-head-sha>
```

This uses the verified [local Syncer flow](../../Web/README.md) and stages only generated content/styles and the receipt. Committing/pushing requires explicit approval. It never switches, resets or stashes the checkout. Failed/ambiguous exports retain reviewable files; inspect them before retrying. Never hand-edit `Web/content`, discard source to clear a failure, or bypass a stale receipt.

## Pause, stop and recover

- Set `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false` to pause unattended work; protected manual runs remain available. Set `DEVBOOK_IMPROVEMENT_ACTIVATED=false` to stop production model/apply work. Disabled scheduled opportunities run the credential-free demo.
- Disable **DevBook Improvement** in Actions to stop all new opportunities. Explicitly cancel an already-running job when immediate stopping is required; flag changes do not cancel it. Preserve draft PRs and the state branch.
- Rotate compromised OAuth/automation tokens in the protected environment, then run protected dry-run before apply. Cooldowns resume at persisted `next_check_at`; clear one only when its evidence is wrong and record why. Do not add short retry schedules.

State stays version 1 on `maintenance/devbook-improvement-state`. Preserve unknown fields, Qard identities, retired IDs, rejection fingerprints, feedback revisions, review evidence, cooldowns and journals. Do not clear all state or force-push around a conflict. Stop scheduling and wait for active jobs before a reviewed state repair; use the current state-branch/file version as its CAS guard and change only the affected field.

| Evidence / condition | Recovery |
| --- | --- |
| Source/hash or branch CAS conflict | Preserve the candidate and inspect exact expected/observed heads. If authoritative topic content changed on `main`, merge current `main` into the topic branch through reviewed Git work and resolve conflicts before retrying. Unrelated topics continue. |
| Write-ahead journal with ambiguous GitHub state | Reconcile its branch, PR marker and exact operation ID before new work. Leave ambiguous evidence intact; never blindly replay publication. |
| Owner advanced/removed a pending branch | Evidence moves to `invalidated_operations`; `topics.<topic-id>.publication_conflict` pauses that generation. Inspect archive/current content, reconcile the intended base, then clear only that marker through guarded reviewed state repair. Preserve archive and owner-review freeze; run protected dry-run before apply. Closing/merging advances the generation without reviving it. |
| Saved owner-feedback revisions changed | Unapplied candidates move to `invalidated_operations`, releasing the journal for current feedback. Already-completed branch writes reconcile as applied. |
| Saved model/protocol or repair inputs changed | Preserve the incompatible unreviewed proposal in the held-proposal flow. If another hold cannot safely retain both, pause that topic with the pending envelope intact. Re-review current inputs; never stamp old evidence with new policy or replay archived edits. |
| `feedback_needs_scope` | Complete feedback cannot fit the batch; it stays pending without a model call. Narrow the request or deliberately review a higher note bound. Fitting requests can proceed first. |
| Owning PR closed/merged | Archive pending publication in `terminal_operations` and release the queue without branch writes; preserve closure rejections/merged history. |
| Terminal failed check | Retain exact head, check evidence and proposal receipts in `failed_operations`; release the global journal. The PR stays frozen to unrelated additions; owner corrections and other topics can proceed. Repair the cause and run another bounded opportunity; never mark/merge around it. |

Old receipts remain readable, but Python-policy receipts require genuine re-export against the complete native source/project/SDK/default/plugin policy. Managed content branches need the native tooling baseline from `main`; update through normal reviewed Git work, never automatically copy tooling into content-only PRs. Pending operations lacking the prepared-source contract pause with original candidates/evidence intact. Inspect and restart a reviewed current proposal rather than adding dates to an already-reviewed candidate. Already-reviewed publication journals remain immutable recovery evidence. Local hooks prepare/stage dates under export/source/index locks; scheduled candidates prepare dates before review, and committed-head rendering only reads them.

## Operational references

- [Claude Code authentication](https://code.claude.com/docs/en/authentication)
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-usage)
- [Claude Code tools](https://code.claude.com/docs/en/tools)
- [Claude model configuration](https://code.claude.com/docs/en/model-config)
- [Claude usage credits](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans)
- [GitHub Actions token behavior](https://docs.github.com/en/actions/concepts/security/github_token)
- [GitHub Actions variable availability](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [Fine-grained token permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
- [GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Obsidian desktop CLI](https://obsidian.md/help/cli)
- [Syncer CLI integration](https://saberzero1.github.io/quartz-syncer-docs/guides/cli)
- [GitHub-hosted runner policy](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [Electron macOS mock-Keychain tests](https://github.com/electron/electron/pull/53790)
