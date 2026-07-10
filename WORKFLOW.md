# Workflow

A quick dive into how work moves through this repo — issues, project board, PRs, and the automations that glue them together. Not a wiki, just the map.

## 1. Issues

Every unit of work starts as a GitHub issue, filed from one of two templates ([`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE)):

| Template | Use for |
|---|---|
| **Task** | Standard work item |
| **Bug report** | Something broken |

Both templates force the same shape: **Problem → Affected → Instructions for the agent → Acceptance criteria** — written so a coding agent (Claude, Codex, whoever) can pick it up and act without follow-up questions.

**Labels drive everything downstream:**

- `type:*` — `bug` / `feature` / `notes` / `docs` / `maintenance`. Missing one? The [`Issue Management`](.github/workflows/issue-management.yml) workflow auto-tags it `needs:triage`.
- `area:*` — `area:vault` / `area:web` / `area:platform`. Required; syncs the issue's **Area** field on the project board automatically.

## 2. Project board

Every issue lands on the **DevBook** project (#7). The `area:*` label is the only manual input — a workflow keeps the board's **Area** field in sync with it, so triage happens once, at label time, not twice.

## 3. Branching

Short-lived branches off `main`, filed into the folder matching the work's type — the same word that prefixes its commits and its PR title:

| Branch folder | For |
|---|---|
| `notes/…` | Vault / note content |
| `docs/…` | Repo documentation |
| `feature/…` | Platform features |
| `bug/…` | Platform bug fixes |
| `maintenance/…` | Dependencies, cleanup, config |

Direct pushes to `main` are blocked by a branch ruleset; every change lands through a merged PR.

## 4. Pull requests

| Step | What happens |
|---|---|
| **Title** | Must start with `feature:`, `notes:`, `docs:`, `bug:`, or `maintenance:` (append `!` for breaking). Enforced by [`PR Title`](.github/workflows/pr-title.yml), a required check. |
| **Description** | Auto-written by a Claude routine (Haiku) — summarizes the diff so the PR is reviewable without spelunking through commits. |
| **Review** | Codex reviews every PR — correctness, simplification, and reuse feedback before merge. |
| **Breaking changes** | A `!` title parks a `major-approval` check as pending; reply `/approve-major` to confirm or `/no-major` to drop it. See [`Major Release Approval`](.github/workflows/major-approval.yml). |
| **Merge** | Merge commit only (commits are preserved) — required for the release automation to read individual commit prefixes. |

## 5. Automations at a glance

| Workflow | Trigger | Does |
|---|---|---|
| [`issue-management.yml`](.github/workflows/issue-management.yml) | Issue opened/labeled | Adds `needs:triage` if no `type:*` label; syncs `area:*` → project **Area** field |
| [`pr-title.yml`](.github/workflows/pr-title.yml) | PR opened/edited | Validates the `type:` prefix |
| [`major-approval.yml`](.github/workflows/major-approval.yml) | PR opened/edited, or `/approve-major` \| `/no-major` comment | Gates breaking (`!`) releases behind explicit approval |
| [`release.yml`](.github/workflows/release.yml) | Push to `main` | Computes next version from commit prefixes + PR title, tags, publishes a GitHub Release with generated notes |
| Dependabot ([`dependabot.yml`](.github/dependabot.yml)) | Weekly | Groups all npm updates into one `maintenance:` PR |

## 6. Releases

Fully automated SemVer, driven by commit/PR title prefixes — no manual version bumps.

| Prefix | Bump |
|---|---|
| `feature:` | MINOR |
| `notes:` / `docs:` / `bug:` / `maintenance:` | PATCH |
| PR title `!` (e.g. `feature!:`) | MAJOR — gated, see above |

Full detail: [`.github/RELEASING.md`](.github/RELEASING.md).

## TL;DR

```text
issue (labeled type:* + area:*) → project board auto-synced
  → branch → PR (title validated, description by Claude/Haiku, reviewed by Codex)
  → merge (merge commit) → release automation tags + publishes
```
