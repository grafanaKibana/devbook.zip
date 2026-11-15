# Releasing

Releases are **fully automated**. Every change reaches `main` through a
**merged pull request**; [DevBook CI/CD](workflows/vault-validation.yml) validates
the accepted `main` commit, builds and deploys Production, then computes the next
version and publishes a GitHub Release + tag after deployment verification succeeds. Direct pushes to `main` are blocked.

## Workflow

`stage` is the integration branch and the one checked out in the local vault.
It deploys Preview; `main` deploys Production and publishes releases. Squash
merges are disabled so commits survive both hops.

1. Work happens on a short-lived branch off `stage`, in the folder matching its
   type — `notes/…` for vault content, `feature/…`, `docs/…`, `bug/…`,
   `maintenance/…` for everything else.
2. Open a PR into `stage` (`gh pr create --base stage`). The **PR title** must
   follow the convention (below) — the `pr-title` job in
   [`DevBook CI/CD`](workflows/vault-validation.yml) enforces it on PRs into `stage` and `main`.
3. **Merge it** manually with a merge commit after required checks pass. Local
   vault changes, including Qard study state, follow the same branch and PR flow.
   The accepted `stage` push validates, builds and deploys Preview.
4. To release, open a promotion PR from `stage` into `main` and use **Update
   branch** first so main-only changes (DevBook Improvement PRs)
   reach `stage`. **Merge it** with a merge commit. The commit prefixes drive
   the MINOR/PATCH bump + changelog; a **MAJOR** is driven by a `!` in the
   promotion PR's title (gated — see below).
5. After the accepted `main` commit passes validation, native export, Production
   build/deployment and immutable/fixed-URL smoke checks, the `release` job in
   [DevBook CI/CD](workflows/vault-validation.yml) reads the merged PR's title
   (for a `!` major) and commits since the last tag (for minor/patch), bumps the
   version, tags it and publishes the GitHub Release. Failed or incomplete
   Production verification blocks release.

Manual dispatch defaults to validation only. Explicit `mode=deploy` deploys only
protected `stage` or `main` through the same prerequisites and never releases.
The [Web runbook](../Web/README.md#cutover-prerequisites) owns caller-specific
OIDC readiness and the separately authorized Stage/Main cutover; the migration
PR stays draft until the new Stage policy and required branch checks are verified.
[Retired workflow history cleanup](../Web/README.md#deferred-workflow-history-cleanup)
follows accepted retirement on default `main` and verified replacement deployments.

## Convention — commit (and PR) titles

```text
<type>: <description>
```

| `type`         | Use for                       | Branch folder   | Version bump |
| -------------- | ----------------------------- | --------------- | ------------ |
| `feature:`     | platform feature              | `feature/…`     | **MINOR**    |
| `notes:`       | vault / note content          | `notes/…`       | **PATCH**    |
| `docs:`        | repo documentation            | `docs/…`        | **PATCH**    |
| `bug:`         | platform bug fix              | `bug/…`         | **PATCH**    |
| `fix:`         | alias of `bug:`               | `fix/…`         | **PATCH**    |
| `maintenance:` | dependency / cleanup / config | `maintenance/…` | **PATCH**    |

The prefixes match the repo's `type:*` issue labels
(`notes`, `docs`, `feature`, `bug`, `maintenance`), and each one names the
branch folder the work lives on. `fix:` is an accepted alias of `bug:` — same
bump, same changelog group, no `type:fix` label. Prefer `bug:`.

**Breaking / major change:** append `!` to the **PR title** — e.g.
`feature!: replace Eleventy build with Quartz`. Only the PR title can trigger a
**MAJOR**, and it's gated (see below); commits never force one. Use it sparingly,
for cutovers that change how the site is built or published.

Keep it **one line, short and concise**. Every commit carries its own type
prefix (that's what drives minor/patch + the changelog). No parenthetical scope,
no `(details)`, no trailing body, and never attribute a commit to an agent (no
`Co-Authored-By` / tool footers).

`maintenance:` titles are produced automatically by Dependabot (via its
`commit-message.prefix` in [dependabot.yml](dependabot.yml)), which also groups
all dependency updates into a single weekly PR → one patch release.

Examples:

```text
notes: add Dijkstra walkthrough to Graph Algorithms
docs: document the branch-folder convention in WORKFLOW
feature: add MongoDB chunk repository to evaluation pipeline
bug: correct rate-limit handling in the LLM judge client
```

## Version scheme — `vMAJOR.MINOR.PATCH` (SemVer)

- **PR title** with `!` (e.g. `feature!:`) → **MAJOR** (`MINOR`/`PATCH` reset to
  0). e.g. `v1.2.0` → `v2.0.0`. Gated — it needs confirmation in the PR (below),
  so a stray `!` can never ship a major on its own. Commits are ignored for this.
- `feature:` commit → **MINOR** (`PATCH` resets to 0). e.g. `v1.2.0` → `v1.3.0`.
- `notes:` / `docs:` / `bug:` / `fix:` / `maintenance:` commit → **PATCH**. e.g.
  `v1.2.0` → `v1.2.1`.
- The highest bump across the commits wins; a `!` PR title overrides everything.
- A release with no matching PR title or commits bumps nothing and is skipped.
- The first release (no existing tag) is **`v1.0.0`**. Current tags: `v1.0.0`,
  `v1.1.0`, `v1.2.0`.

## Enforcement (GitHub rulesets)

- **Protect main branch** (branch ruleset, `~DEFAULT_BRANCH`) — requires a PR,
  the `pr-title` **and** `major-approval` status checks, merge-commit merges only,
  and blocks direct pushes, deletion, and force-pushes. No bypass — the checks
  apply to everyone, including admins.
- **Protect release tags** (tag ruleset, `refs/tags/v*`) — blocks tag deletion
  and force-moves; creation stays open so the CI/CD release job can tag.

## Guardrail — major needs confirmation in the PR

Minor and patch releases publish automatically. A **major** is gated *before*
merge by the major-approval jobs in [`DevBook CI/CD`](workflows/vault-validation.yml):

1. Open a PR. If its **title** carries a `!` prefix (e.g. `feature!:`), the bot
   parks the `major-approval` check as **pending** and comments that merging
   will publish a MAJOR (naming the exact version).
2. **Reply `/approve-major`** — the check turns green, merge is unblocked, and
   the CI/CD `release` job tags the major after successful Production verification.
3. **Reply `/no-major`** — the bot edits the PR title to drop the `!` (no history
   rewrite); the PR falls back to a normal commit-driven minor/patch release.

PRs with a non-`!` title pass the check instantly. Only the repo
owner/collaborators can run the commands. So shipping a major takes two
deliberate acts — the `!` title *and* the `/approve-major` — and a stray `!`
just parks the PR until you decide.

> `major-approval` is already a required check on the **Protect main branch**
> ruleset. It only reports once [`vault-validation.yml`](workflows/vault-validation.yml)
> lives on `main`, so merge this workflow in first — until then, PRs whose branch
> lacks the workflow will sit blocked on the (never-reported) check. The workflow
> defaults to read permission and grants writes only to jobs that need them;
> only deployment requests OIDC, and only release writes repository contents.

