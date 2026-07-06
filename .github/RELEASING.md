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
   `main`). Each commit's prefix drives the version + changelog, so every commit
   must follow the convention below — not just the PR title.
4. The [`Release`](workflows/release.yml) workflow scans the commits since the
   last tag, bumps the version, tags it, and publishes the GitHub Release. Done.

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

**Breaking / major change:** append `!` to the prefix — e.g.
`feature!: replace Eleventy build with Quartz`. Any `!` commit in the release
range forces a **MAJOR** bump. Use it sparingly, for cutovers that change how
the site is built or published.

Keep it **one line, short and concise**. Every commit carries its own type
prefix — the version bump is the highest bump found across all commits in the
release. No parenthetical scope, no `(details)`, no trailing body, and never
attribute a commit to an agent (no `Co-Authored-By` / tool footers).

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

- any `!` prefix (e.g. `feature!:`) → **MAJOR** (`MINOR`/`PATCH` reset to 0).
  e.g. `v1.2.0` → `v2.0.0`. **A major release is not automatic** — it pauses for
  manual approval (see the guardrail below), so a stray `!` can never ship a
  major on its own.
- `feature:` → **MINOR** (`PATCH` resets to 0). e.g. `v1.2.0` → `v1.3.0`.
- `docs:` / `bug:` / `maintenance:` → **PATCH**. e.g. `v1.2.0` → `v1.2.1`.
- A release with no `docs`/`feature`/`bug`/`maintenance` commits bumps nothing
  and is skipped.
- The highest bump in the range wins (a `!` anywhere makes the whole release
  major).
- The first release (no existing tag) is **`v1.0.0`**. Current tags: `v1.0.0`,
  `v1.1.0`, `v1.2.0`.

## Enforcement (GitHub rulesets)

- **`main` PR-only + title check** (branch ruleset) — requires a pull request,
  the `pr-title` status check, and allows merge-commit merges. No bypass: nobody
  pushes to `main` directly.
- **Protect release tags** (tag ruleset, `v*`) — blocks deletion and force-moves.
- **`major-approval` required check** (branch ruleset) — required status check
  on PRs into `main`, so a breaking PR can't merge until it's confirmed (below).

## Guardrail — major needs confirmation in the PR

Minor and patch releases publish automatically. A **major** is gated *before*
merge by [`Major Release Approval`](workflows/major-approval.yml):

1. Open a PR. If any commit carries a `!` prefix (e.g. `feature!:`), the bot
   parks the `major-approval` check as **pending** and comments that merging
   will publish a MAJOR (naming the exact version).
2. **Reply `/approve-major`** — the check turns green, merge is unblocked, and
   the [`Release`](workflows/release.yml) workflow tags the major after merge.
3. **Reply `/no-major`** — the bot rewrites the commit subjects to drop the `!`
   and force-pushes; the PR becomes a normal minor/patch release.

PRs with no `!` pass the check instantly. Only the repo owner/collaborators can
run the commands. So shipping a major takes two deliberate acts — the `!` *and*
the `/approve-major` — and a stray `!` just parks the PR until you decide.

> One-time: mark **`major-approval`** as a required status check in the `main`
> branch ruleset, and keep Actions **Workflow permissions** on "Read and write".

