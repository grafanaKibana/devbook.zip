# Releasing

Releases are **fully automated**. Every change reaches `main` through a
**squash-merged pull request**; merging it computes the next version, generates
notes, and publishes a GitHub Release + tag. Direct pushes to `main` are blocked.

## Workflow

1. **Notes** changes live on the persistent **`notes-updates`** branch.
   Platform changes go on their own short-lived branches off `main`.
2. Open a PR into `main`. The **PR title** must follow the convention (below) —
   the [`PR Title`](workflows/pr-title.yml) check enforces it and is required.
3. **Squash-merge** it (the only merge method allowed). The PR title becomes the
   single commit on `main`, which drives the version + changelog.
4. The [`Release`](workflows/release.yml) workflow tags it and publishes the
   GitHub Release. Done.

> After a release, fast-forward the persistent branch so it doesn't replay old
> commits: `git fetch origin && git checkout notes-updates && git reset --hard origin/main && git push --force-with-lease`.

## Convention — PR titles

```
<type>: <description>
```

| `type`   | Use for                    | Version bump |
| -------- | -------------------------- | ------------ |
| `notes:` | vault / note content       | **MINOR**    |
| `feat:`  | platform feature           | **MINOR**    |
| `fix:`   | platform bug fix           | **PATCH**    |

Optional `(scope)` and a trailing `!` for a breaking platform change (→ MINOR).
Only the PR title matters — individual commits on your branch can be anything
(including `vault backup:`); they're squashed away.

Examples:

```text
notes: add Dijkstra walkthrough to Graph Algorithms
feat: add MongoDB chunk repository to evaluation pipeline
fix: correct rate-limit handling in the LLM judge client
feat!: restructure evaluation store schema
```

## Version scheme — `vYY.MINOR.PATCH`

- `YY` — current two-digit year, stamped automatically at release time.
- `MINOR` / `PATCH` — monotonic counters; nothing resets (the year just
  re-stamps). e.g. `v26.1.15` → `v26.2.15` (notes/feat) → `v27.2.16` (fix next year).

## Enforcement (GitHub rulesets)

- **`main` PR-only + title check** (branch ruleset) — requires a pull request,
  the `pr-title` status check, and squash-only merges. No bypass: nobody pushes
  to `main` directly.
- **Protect release tags** (tag ruleset, `v*`) — blocks deletion and force-moves.

## One-time repo setting

Settings → Actions → General → **Workflow permissions → "Read and write"**
(lets the Release workflow create tags and releases).
