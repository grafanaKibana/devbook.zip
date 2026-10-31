# Workflow

Work moves through an issue, a typed branch, a reviewed PR and a manual merge to `main`. [AGENTS.md](AGENTS.md) contains the operating contract; [Releasing](.github/RELEASING.md) owns title conventions, release automation and major-version approval.

## Issues and branches

Use the [issue templates](.github/ISSUE_TEMPLATE/) with a clear problem, affected paths and acceptance criteria. Add exactly one `type:*` and one `area:*` label (`vault`, `web` or `platform`); [Issue Management](.github/workflows/issue-management.yml) syncs issues to DevBook project #7 and marks missing types for triage.

Branch from `main` using `notes/`, `docs/`, `feature/`, `bug/` or `maintenance/`. The branch type also prefixes each commit and the PR title; `fix` is a supported `bug` alias. Direct pushes to `main` are blocked.

## Pull requests and releases

Describe the complete diff and its validation. Existing description/review integrations assist review; their output does not replace owner approval. Required title and major-approval checks must pass, along with checks relevant to the change. Merge manually with a merge commit so release automation preserves individual commit prefixes. Never auto-merge.

Pushes to `main` trigger the [release workflow](.github/workflows/release.yml). Commit prefixes determine minor/patch releases; a `!` PR title requires explicit major-version approval. Dependabot groups npm updates into weekly maintenance PRs. See [Releasing](.github/RELEASING.md) for exact rules.

## Recurring note improvements

The [improvement workflow](.github/workflows/devbook-improvement.yml) provides six-hour opportunities and manual runs. It remains credential-free until separately activated. Its [runbook](docs/devbook-improvement.md) owns author/reviewer, export, quota and recovery details.

This queue is the exception to one issue per unit of work: topic PRs, durable state and verified-owner feedback provide its audit trail. Each topic has one draft PR; summaries cover the cumulative diff and preserve user-written text. The owner reviews and merges every batch manually.
