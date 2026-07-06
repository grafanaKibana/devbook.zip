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
| `docs:`        | vault / note content          | **MINOR**    |
| `feature:`     | platform feature              | **MINOR**    |
| `bug:`         | platform bug fix              | **PATCH**    |
| `maintenance:` | dependency / cleanup / config | **PATCH**    |

The prefixes match the repo's `type:*` issue labels
(`docs`, `feature`, `bug`, `maintenance`).

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

- `docs:` / `feature:` → **MINOR** (`PATCH` resets to 0). e.g. `v1.2.0` → `v1.3.0`.
- `bug:` / `maintenance:` → **PATCH**. e.g. `v1.2.0` → `v1.2.1`.
- A release with no `docs`/`feature`/`bug`/`maintenance` commits bumps nothing
  and is skipped.
- `MAJOR` never bumps automatically — bump it deliberately by tagging when you
  decide (there is no breaking-change trigger).
- The first release (no existing tag) is **`v1.0.0`**. Current tags: `v1.0.0`,
  `v1.1.0`, `v1.2.0`.

## Enforcement (GitHub rulesets)

- **`main` PR-only + title check** (branch ruleset) — requires a pull request,
  the `pr-title` status check, and allows merge-commit merges. No bypass: nobody
  pushes to `main` directly.
- **Protect release tags** (tag ruleset, `v*`) — blocks deletion and force-moves.

## One-time repo setting

Settings → Actions → General → **Workflow permissions → "Read and write"**
(lets the Release workflow create tags and releases).
