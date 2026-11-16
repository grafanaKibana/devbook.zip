# Workflow

Work moves through an issue, a typed branch, a reviewed PR into `stage`, then a separately reviewed promotion to `main`. [AGENTS.md](AGENTS.md) contains the operating contract; [Releasing](.github/RELEASING.md) owns title conventions, release automation and major-version approval.

## Issues and branches

Use the [issue templates](.github/ISSUE_TEMPLATE/) with a clear problem, affected paths and acceptance criteria. Add exactly one `type:*` and one `area:*` label (`vault`, `web` or `platform`); [Issue Management](.github/workflows/issue-management.yml) syncs issues to DevBook project #7 and marks missing types for triage.

Branch from `origin/stage` using `notes/`, `docs/`, `feature/`, `bug/` or `maintenance/`. The branch type also prefixes each commit and the PR title; `fix` is a supported `bug` alias. Target work PRs at `stage`; only `stage` → `main` promotion PRs target `main`. Direct pushes to protected branches do not replace PR review.

## Pull requests and releases

Describe the complete diff and its validation. Existing description/review integrations assist review; their output does not replace owner approval. The required `pr-title` and `ci` checks must pass, plus `major-approval` on PRs into `main`. Merge manually with a merge commit so release automation preserves individual commit prefixes. Never auto-merge.

[CI/CD](.github/workflows/vault-validation.yml) validates PRs and accepted pushes, deploys Preview from `stage` and Production from `main`, and publishes a release only after successful Production verification. Manual dispatch defaults to validation only; explicit deployment never releases. Commit prefixes determine minor/patch releases; a `!` PR title requires explicit major-version approval. Dependabot groups npm updates into weekly maintenance PRs. [PR Rules](.github/workflows/pr-rules.yml) owns the title check and major-version approval, so title edits and comments never re-run the heavy checks. See [Releasing](.github/RELEASING.md) for exact rules and the [Web runbook](Web/README.md#deploy) for deployment.

## Recurring note improvements

The [improvement workflow](.github/workflows/devbook-improvement.yml) provides six-hour opportunities and manual runs. It remains credential-free until separately activated. Public PR demo/fixture coverage belongs to CI/CD; Improvement retains scheduled/manual maintenance and publication, and reuses each PR's CI export instead of rendering it again. Feedback, Issue Management and Product Captures remain separate. Its [runbook](.scripts/DevBook.Tooling/README.md) owns author/reviewer, export, quota and recovery details.

This queue is the exception to one issue per unit of work: topic PRs, durable state and verified-owner feedback provide its audit trail. Each topic has one draft PR; summaries cover the cumulative diff and preserve user-written text. The owner reviews and merges every batch manually.
