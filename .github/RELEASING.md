# Releasing

Releases are **fully automated**. Every change reaches `main` through a
**merged pull request**; the push to `main` computes the next version, generates
notes, and publishes a GitHub Release + tag. Direct pushes to `main` are blocked.

## Workflow

1. **Notes** changes live on the persistent **`notes-updates`** branch.
   Platform changes go on their own short-lived branches off `main`.
2. Open a PR into `main`. The **PR title** must follow the convention (below) —
   the [`PR Title`](workflows/pr-title.yml) check enforces it and is required.
3. **Merge it** with a merge commit (the branch's commits are preserved on
   `main`). The commit prefixes drive the MINOR/PATCH bump + changelog; a
   **MAJOR** is driven by a `!` in the **PR title** (gated — see below).
4. The [`Release`](workflows/release.yml) workflow reads the merged PR's title
   (for a `!` major) and the commits since the last tag (for minor/patch), bumps
   the version, tags it, and publishes the GitHub Release. Done.

> After a release, fast-forward the persistent branch so it doesn't replay old
> commits: `git fetch origin && git checkout notes-updates && git reset --hard origin/main && git push --force-with-lease`.

## Convention — commit (and PR) titles

```
<type>: <description>
```

| `type`         | Use for                       | Version bump |
| -------------- | ----------------------------- | ------------ |
| `feature:`     | platform feature              | **MINOR**    |
| `docs:`        | vault / note content          | **PATCH**    |
| `bug:`         | platform bug fix              | **PATCH**    |
| `maintenance:` | dependency / cleanup / config | **PATCH**    |

The prefixes match the repo's `type:*` issue labels
(`docs`, `feature`, `bug`, `maintenance`).

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
docs: add Dijkstra walkthrough to Graph Algorithms
feature: add MongoDB chunk repository to evaluation pipeline
bug: correct rate-limit handling in the LLM judge client
```

## Version scheme — `vMAJOR.MINOR.PATCH` (SemVer)

- **PR title** with `!` (e.g. `feature!:`) → **MAJOR** (`MINOR`/`PATCH` reset to
  0). e.g. `v1.2.0` → `v2.0.0`. Gated — it needs confirmation in the PR (below),
  so a stray `!` can never ship a major on its own. Commits are ignored for this.
- `feature:` commit → **MINOR** (`PATCH` resets to 0). e.g. `v1.2.0` → `v1.3.0`.
- `docs:` / `bug:` / `maintenance:` commit → **PATCH**. e.g. `v1.2.0` → `v1.2.1`.
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
  and force-moves; creation stays open so the Release workflow can tag.

## Guardrail — major needs confirmation in the PR

Minor and patch releases publish automatically. A **major** is gated *before*
merge by [`Major Release Approval`](workflows/major-approval.yml):

1. Open a PR. If its **title** carries a `!` prefix (e.g. `feature!:`), the bot
   parks the `major-approval` check as **pending** and comments that merging
   will publish a MAJOR (naming the exact version).
2. **Reply `/approve-major`** — the check turns green, merge is unblocked, and
   the [`Release`](workflows/release.yml) workflow tags the major after merge.
3. **Reply `/no-major`** — the bot edits the PR title to drop the `!` (no history
   rewrite); the PR falls back to a normal commit-driven minor/patch release.

PRs with a non-`!` title pass the check instantly. Only the repo
owner/collaborators can run the commands. So shipping a major takes two
deliberate acts — the `!` title *and* the `/approve-major` — and a stray `!`
just parks the PR until you decide.

> `major-approval` is already a required check on the **Protect main branch**
> ruleset. It only reports once [`major-approval.yml`](workflows/major-approval.yml)
> lives on `main`, so merge this workflow in first — until then, PRs whose branch
> lacks the workflow will sit blocked on the (never-reported) check. Also keep
> Actions **Workflow permissions** on "Read and write".

