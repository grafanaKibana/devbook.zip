# DevBook improvement action

A recurring queue for DevBook notes and Qard interview cards. Every six hours, the action selects a small topic batch, asks Claude Sonnet 5.5 to improve it, independently reviews the complete notes, validates the result, and updates a draft PR with the source **and genuine published Quartz output**. You review and merge manually. The action never merges.

[Workflow](../../.github/workflows/devbook-improvement.yml) · [Configuration](../../.github/devbook-improvement.json) · [Activation and recovery runbook](../../docs/devbook-improvement.md)

Open [DevBook.Tooling.slnx](../DevBook.Tooling.slnx) for the tooling executable and its adjacent xUnit project. The executable owns the `improvement` and `export` commands. PascalCase `.cs` file-based scripts expose the shared vault tools used by hooks and manual publishing. The improvement, validation, migration and publishing paths need no Python; the unrelated release/changelog tool remains Python. Production activation and unattended operation require the separate runbook phase; tests passing do not activate them.

## Project layout

```text
.scripts/
  DevBook.Tooling.slnx
  DevBook.Tooling/
    DevBook.Tooling.csproj
    Program.cs
    Improvement/
    Export/
    Vault/
    Infrastructure/
    Scripts/
      ValidateVault.cs
      SyncQuartz.cs
      ...
  DevBook.Tooling.Tests/
    DevBook.Tooling.Tests.csproj
```

The two projects share one solution and build together. `Scripts` contains file-based entry points, visible in the project but excluded from its compilation because each has its own entry point. Tests stay in their own assembly so test dependencies do not enter the application. Test methods group setup, the operation and its expected result into Arrange, Act and Assert sections. The separate RAG application under `Platform/DevBook` keeps its own solution.

## A regular opportunity

1. Reconcile state, topic PRs, and verified-owner comments/reviews. Consolidated feedback goes first.
2. Select up to four notes from one directory-derived topic. Skip unchanged reviewed versions. “No worthwhile changes” succeeds.
3. Ask the author for guarded block replacements with public web research. Prepare source dates against the current topic parent **before** the independent reviewer sees the final candidate.
4. Validate complete notes, protected Qard metadata, source hashes, primary sources, and the cumulative PR diff. Create or update the topic’s draft PR.
5. In the **same workflow run**, a separate macOS job starts pinned genuine Obsidian/Syncer in a disposable profile. A protected Ubuntu publisher adds only verified generated files and the source-bound receipt, then dispatches/checks exact-head validation.

The jobs separate credentials: maintenance has subscription OAuth and the dedicated GitHub token; rendering has repository read access only; publication has the dedicated GitHub token and executes trusted code. Rendering consumes immutable committed source and never prepares or changes note dates. A source-only draft can appear briefly while its output job runs. Review the complete PR after export and checks pass.

## What freezes mean

Each topic generation has one stable branch and machine-marked PR. New batches append until the PR reaches a size limit, the owner comments/reviews, or the draft is marked ready. Then the bot stops adding unrelated content to that PR. It can still implement your queued feedback and publish the corresponding output.

This does not lock your files, prevent your commits, or require immediate action. Merely viewing the PR does not freeze it. Waiting for automatic export alone does not freeze it. If all three PR slots fill and none can accept work, later opportunities keep the queue without making unnecessary model calls. After merge, the topic can start another batch. Closing without merge suppresses those proposals independently of file/rule hashes.

## Defaults and inputs

| Setting | Default |
|---|---:|
| Notes per opportunity | 4 |
| Notes / changed lines per PR | 16 / 1,200 |
| Open managed PRs | 3 |
| Author or reviewer call | 900 seconds, 20 turns |
| Maintenance / job budget | 35 / 40 minutes |
| Export checks / polling | 600 seconds / 10 seconds |
| Simultaneous model calls | 1 |
| Schedule | `23 */6 * * *` UTC |

The exact default model is `claude-sonnet-5-5`; Claude Code is pinned to `2.1.285`. Scheduled runs may use repository variable `DEVBOOK_IMPROVEMENT_MODEL`; manual runs expose `model`. Unsupported/mixed model evidence fails closed. Limits, owners, source hosts and validators live in the configuration. Optional `export_check_wait_seconds` (0–600) and `export_check_poll_seconds` (1–60) bound the publisher’s exact-head wait; zero wait performs one snapshot for fixtures or deliberate recovery probes. Pending checks resume without another model call or export.

| Manual input | Behavior |
|---|---|
| `mode=demo` | Credential-free fake-transport flow through the real engine |
| `mode=dry-run`, `with_model=false` | Current repository selection; no model or writes |
| `mode=dry-run`, `with_model=true` | Protected author/reviewer proposal; control-state writes only |
| `mode=apply` | Protected draft PR update, then automatic render/publish |
| `mode=fixture` | Genuine isolated hosted Obsidian/Syncer test; artifacts only |
| `model` | Exact verified identifier, with no fallback |
| `pilot=true` | Owner-authorized, exact-SHA PR181 test with isolated state and a draft targeting the setup branch; production and scheduling stay off |

PR-triggered runs execute only credential-free tests/fixtures. Protected jobs require the configured base-branch workflow and activation gates. Disabled schedules run the credential-free demo.

A one-off test before merging PR181 uses the same maintenance/render/publication jobs through an explicit manual pilot path. It selects at most two notes, preserves the normal author/reviewer and validation rules, and includes the genuine Quartz output in its draft PR. It needs a temporary exact-branch environment allowance and reviewed-SHA grant, both removed afterward. See the [premerge pilot procedure](../../docs/devbook-improvement.md#one-off-test-before-merging-pr181); passing tests alone grants no credential access.

## Run locally without credentials

Install .NET SDK **10.0.100**. Enter `.scripts` so its `global.json` selects that exact SDK:

```sh
cd .scripts
test "$(dotnet --version)" = 10.0.100
dotnet build DevBook.Tooling.slnx --configuration Release
dotnet test DevBook.Tooling.slnx --configuration Release
dotnet run --no-cache --file DevBook.Tooling/Scripts/ValidateVault.cs -- --all --repo-root ..
dotnet run --project DevBook.Tooling -- improvement --repo-root .. --demo --output-dir /tmp/devbook-demo
dotnet run --project DevBook.Tooling -- improvement --repo-root .. --dry-run --output-dir /tmp/devbook-selection
```

Project commands use normal incremental builds. The shared file-based scripts use `--no-cache` so they pick up current tooling changes instead of reusing an older cached copy.

The compact suite uses xUnit and FluentAssertions for core queue, identity, state, feedback, lifecycle, quota, date and export contracts. It does not reproduce every old parser/regression permutation. Full-vault validation and genuine export remain separate checks.

The demo produces `result.json`, `proposed.patch`, `pr-summary.md`, and separate `question-changes.json`, using fixture model/GitHub boundaries. It makes no live model request or PR. A Mac desktop fixture uses the same native export code:

```sh
dotnet run --project DevBook.Tooling -- export fixture --repo-root .. \
  --app-bundle /Applications/Obsidian.app --output /tmp/devbook-export-fixture
```

Use the pinned compatible app from the workflow when the installed bundle differs. The hosted fixture pins Obsidian `1.14.5`, verifies the installer hash/signature, and proves Datacore rendering, card/layout markers, media bytes, unchanged source, and receipt bindings. Verify hosted success on the exact revision before activation.

## Web tools and quota

Author and reviewer have built-in **WebSearch** and **WebFetch** for public primary documentation and papers. Prompts prohibit putting private note text, paths, owner feedback, or unpublished identifiers into searches. Deterministic source retrieval independently checks accepted URLs against configured public hosts. Pages and comments remain data, never tool instructions.

The model has no shell, local file tools, MCP servers, or Git credentials. Built-in web tools avoid an extra Context7 account/key; no separately billed API fallback is configured. Subscription OAuth alone cannot prevent enabled account overage, so usage credits must remain disabled and be confirmed during activation.

Actual reported reset times are persisted. Unknown resets use a conservative 24-hour recheck without inventing a reset time. Weekly exhaustion pauses all new model work, including feedback fixes. Cooldown skips succeed quietly and emit at most one episode notice. Already-produced export can finish without another model call. No precise remaining-quota telemetry is claimed.

## Identity, state, and recovery

Existing Qard IDs survive only for the same learning target. New targets, replacements and split children remain ID-less. Plugin state, schedules, history and saved sessions stay untouched; being in a session does not exclude a card from content improvement.

State remains version 1 on `maintenance/devbook-improvement-state`; unknown fields, rejections, feedback revisions and journals survive the port. Native fingerprints preserve the old computed identities. Old export receipts remain readable but require a genuine new export against the complete native policy. Old topic branches lacking the native baseline, or pending operations lacking the prepared-source contract, pause with preserved evidence instead of being silently rewritten.

A generated bundle accepts only `Web/content`, generated Syncer styles and the receipt. The publisher checks current PR identity/head, complete Git trees, byte/mode bindings and size/path limits before a non-force update. It resumes an exact already-published export through validation rather than creating another export commit. Closed/merged or conflicting PRs receive no stale writes.

Retries wait at least six hours and stop after three attempts per source head. Inspect the failed run and persisted operation before resuming; never clear all state or force-push to bypass a conflict. The [runbook](../../docs/devbook-improvement.md#pause-disable-and-recover) covers recovery and the optional local handoff.

Pause unattended work with `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false`. Stop production model/apply work with `DEVBOOK_IMPROVEMENT_ACTIVATED=false`. The premerge pilot requires both flags false and has its own access grant: delete `DEVBOOK_IMPROVEMENT_PILOT_SHA` and remove its temporary environment branch allowance to stop new pilot access. Disable **DevBook Improvement** in Actions to stop all opportunities; explicitly cancel a running job when required. Keep the state branch and draft PRs. The additional Codex reviewer experiment stays disabled pending a decision about the existing integration.
