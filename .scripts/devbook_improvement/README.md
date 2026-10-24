# DevBook improvement action

Scheduled maintenance for DevBook notes and Qard interview cards. Every six hours, the worker selects a small batch from one topic, proposes improvements with Claude Sonnet 5.5, independently reviews the complete owning notes, runs repository validation, and updates a draft pull request. The owner reviews and merges manually; this action never merges.

The [workflow](../../.github/workflows/devbook-improvement.yml) has scheduled and manual triggers. Cron `23 */6 * * *` runs at 00:23, 06:23, 12:23, and 18:23 UTC. Before activation, scheduled opportunities run the credential-free fixture demo.

## What it improves

- Authoring-rule compliance, proofreading, clarity, terminology, structure, and factual accuracy.
- Self-contained questions with bounded answers, useful overview/follow-up balance, and important coverage gaps.
- Coordinated note/card explanations with primary documentation or original papers for new claims.

Existing Qard IDs survive only when the learning target remains the same. New targets and split children stay ID-less. Study schedules, review history, plugin settings, and saved sessions are protected. Existing card content may be improved even when a saved session references it.

## How a run works

1. Reconcile durable state, open PRs, and verified-owner comments/reviews. Consolidated feedback has priority.
2. Select up to four notes from one directory-derived topic. Unchanged reviewed notes stay checked; keeping good content is successful.
3. Let the author research public technical facts and return guarded block replacements. A separate Claude context reviews the complete candidate notes and factual sources.
4. Validate source hashes, identity, protected metadata, paths, repository rules, and the complete current PR diff.
5. Create or update the topic's draft PR. Preserve text outside the managed summary and require actual checks on the new head.

One stable generation branch and machine marker identify each topic PR. Later batches append until its size limit or owner review freezes it. Frozen PRs accept verified feedback fixes. Closed proposals remain rejected across rule changes; merged PRs allow a new generation.

## Defaults

| Setting | Default |
|---|---:|
| Notes per opportunity | 4 |
| Notes per PR | 16 |
| Changed lines per PR | 1,200 |
| Open managed PRs | 3 |
| Each author/reviewer invocation | 15 minutes |
| Worker budget | 35 minutes |
| GitHub job timeout | 40 minutes |
| Model turns per invocation | 20 |
| Simultaneous model invocations | 1 |

Edit [configuration](../../.github/devbook-improvement.json) for batch sizes, model, source hosts, owners, and validation commands. Schedules use repository variable `DEVBOOK_IMPROVEMENT_MODEL` when supplied; manual runs expose a model input. Default model: `claude-sonnet-5-5`, with Claude Code pinned to `2.1.285`.

## Web research and usage

Both author and reviewer can use built-in **WebSearch** and **WebFetch**. Search discovers primary documentation; fetch reads relevant pages. Prompts restrict queries to public technical facts and prohibit sending note text, paths, owner feedback, or unpublished identifiers into queries or URLs. The accepted sources are independently fetched through the configured public-host checks before a proposal can publish.

Shell, local file tools, MCP, project customizations, and persistent model sessions remain unavailable. The runtime owns all writes and Git operations. Claude's web permissions preapprove configured documentation hosts, but built-in documentation preapprovals mean this is not a strict network allowlist. Deterministic source acceptance remains enforced separately.

These tools consume the existing Claude subscription allocation and require no additional service or API key. Context7 was considered; its separate free allowance and CI credential add unnecessary setup for this workload. This action does not enable API fallback or paid overage. Account usage credits must stay disabled. Tool availability and exclusive Sonnet model usage must pass a live activation smoke; unsupported access blocks activation.

Reported quota reset times are persisted. Unknown resets use a conservative 24-hour delayed recheck. Weekly exhaustion pauses authoring, feedback fixes, and review. Cooldown skips are quiet and make no model calls; each episode emits at most one notice.

## Run without credentials

Requires the current DevBook Qard migration contracts: the Qard-aware vault validator, interview templates, and Obsidian/Quartz readers. Merge that prerequisite before activating the action; this worker does not perform a vault migration.

From the repository root:

```sh
PYTHONPATH=.scripts python3 -m devbook_improvement.pipeline --demo --output-dir /tmp/devbook-demo
PYTHONPATH=.scripts python3 -m devbook_improvement.pipeline --dry-run --output-dir /tmp/devbook-selection
python3 -m unittest discover -s .scripts/tests -p 'test_devbook_improvement_*.py'
```

The demo uses the real engine with fixture providers and GitHub transport. It exercises same-PR reuse, duplicate/edited feedback, quota stops, and reviewer resumption. Outputs include a proposed patch, cumulative PR summary, separate question-change JSON, and run results. It makes no live Claude request or PR.

## Manual workflow inputs

| Input | Purpose |
|---|---|
| `mode=demo` | Credential-free orchestration fixture; default |
| `mode=dry-run`, `with_model=false` | Current repository selection, without model calls |
| `mode=dry-run`, `with_model=true` | Protected live author/reviewer proposal; control-state writes only |
| `mode=apply` | Protected live publication to a draft PR |
| `model` | Exact verified Claude identifier; no fallback |

After the setup PR is manually merged, `gh workflow run devbook-improvement.yml -f mode=demo` starts a safe test. [The activation runbook](../../docs/devbook-improvement.md#safe-activation) covers subscription OAuth, minimal GitHub permissions, protected secrets, live web/model checks, first manual apply, and schedule activation. Credentials go through official local flows and GitHub secret prompts, never chat or committed files.

## Pause and recovery

- Set repository variable `DEVBOOK_IMPROVEMENT_SCHEDULE_ENABLED=false` to pause unattended processing.
- Set `DEVBOOK_IMPROVEMENT_ACTIVATED=false` to stop all live model/publication runs.
- Disable the workflow in Actions to stop even demo opportunities.
- Keep the state branch and open PRs: they preserve progress, feedback revisions, rejection history, and cooldowns.
- Main-topic content drift pauses that topic until its branch includes current `main`; other queues can continue.
- `feedback_needs_scope` keeps an indivisible request pending when its notes exceed the batch limit or are unavailable. Narrow the request’s scope or deliberately raise the configured note limit before retrying.
- Interrupted publications recheck owner feedback before writing an unapplied candidate. Changed feedback archives that candidate for reconciliation.
- Terminal validation failures retain the failed head and proposal evidence, freeze that PR against unrelated additions, and release the queue for other topics or explicit owner corrections. Never force-push or clear state to bypass conflicts or failed checks.

See [detailed failure recovery and limitations](../../docs/devbook-improvement.md#pause-disable-and-recover). The additional Codex content-review experiment remains disabled pending a decision about the existing integration.

## Research references

- [Claude Code built-in web tools](https://code.claude.com/docs/en/tools)
- [CLI isolation and permissions](https://code.claude.com/docs/en/cli-usage)
- [Subscription authentication](https://code.claude.com/docs/en/authentication)
- [Web-search usage limits](https://support.claude.com/en/articles/10684626-enable-and-use-web-search)
- [Context7 plans](https://context7.com/plans)
