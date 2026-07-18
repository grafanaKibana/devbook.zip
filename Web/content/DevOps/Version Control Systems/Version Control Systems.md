---
publish: true
created: 2026-07-11T21:42:28.457Z
modified: 2026-07-18T11:30:06.665Z
published: 2026-07-18T11:30:06.665Z
tags:
  - FolderNote
topic:
  - DevOps
subtopic:
  - Version Control Systems
summary: Tracks file changes over time, enabling collaboration, branching, merging, and reverting.
level:
  - "4"
priority: High
status: Creation
---

A version control system (VCS) records committed versions of tracked files so collaborators can branch, merge, compare, and restore states that exist in the repository history. It cannot recover an untracked file or an uncommitted edit that was never captured by Git, and local recovery records such as the reflog expire.

Git is a distributed VCS: a normal clone receives the objects reachable from the refs it fetches, while shallow clones intentionally omit older history and partial clones can defer selected objects until needed. Workflows such as GitFlow or trunk-based development define how teams coordinate changes; they are conventions layered on Git rather than properties of its object model.

# Working Tree, Index, Repository, and Remote

Git moves snapshots through distinct states. The working tree is what tools edit. The index is the proposed next snapshot. A commit stores that snapshot and parent links in the local object database. Branches are movable refs to commits; remote-tracking refs are the last fetched view of another repository. `fetch` updates remote-tracking refs without integrating them; `pull` fetches and then merges or rebases according to configuration.

```text
working tree --git add--> index --git commit--> local commit graph
remote-tracking refs <--git fetch-- remote refs
local refs --git push--> remote refs
```

Use `restore` for working-tree/index content and `switch` for branches. `reset` moves a ref and may also replace index or working-tree state, so check its mode before using it. For a published mistake, create a reverting commit; do not rewrite the shared ref.

![[Assets/System Design 101/a75942f9f705cbdaf6901c22d5c21b4db1323060c05f111d67e2f23c61a15180.jpg]]

# Essential Git Commands

| Intent | Command | Safety boundary |
| --- | --- | --- |
| Inspect state | `git status`, `git diff`, `git log --graph` | Read-only; start here |
| Stage selected content | `git add -p` | Changes the index, not history |
| Change branch | `git switch <branch>` | Refuses unsafe overwrites by default |
| Recover a file | `git restore <path>` | Discards unstaged edits; inspect first |
| Integrate remote work | `git fetch`, then `git merge` or `git rebase` | Makes the integration choice explicit |
| Undo published change | `git revert <commit>` | Adds history without changing old IDs |
| Inspect lost refs | `git reflog` | Local recovery record; expires eventually |

A flat command list hides the state transition. Name the source state, destination state, and whether the operation discards data before running it.

# Git vs Hosting Platforms

Git defines objects, commits, refs, remotes, and transfer protocols. GitHub, GitLab, and Azure DevOps host repositories and add identity, permissions, pull requests, protected branches, issues, automation, and marketplaces. A repository can move between hosts without changing Git's commit graph; platform workflows, permissions, and automation do not move automatically.

Choose a host for governance, integration, compliance, and operator cost. Do not describe a GitHub pull request or Actions workflow as a Git feature, and do not treat a local Git clone as a backup of host-side issues or branch protections.

# Repository Strategy

| Boundary | Monorepo | Multirepo |
| --- | --- | --- |
| Cross-component change | One atomic commit and review | Coordinated versions and rollout |
| Dependency policy | Central graph can enforce consistency | Each repository owns its cadence |
| Ownership and access | Path-based controls need tooling | Repository boundary is explicit |
| CI | Affected-graph execution is required at scale | Smaller pipelines, but integration moves downstream |
| Release | Shared source does not require one release | Independent by default |

Use a monorepo when atomic cross-component changes and one dependency/build policy justify investing in an affected-build graph and path ownership. Use multiple repositories when access isolation and independent lifecycle dominate. Company logos are not evidence: measure clone/fetch size, CI fan-out, cross-repo coordination, and release coupling in the actual system.

# Narrow CI Fetches Before Tuning Depth

`--depth=1` limits history reachable from fetched refs; it does not stop a broad refspec from advertising or fetching every branch. First request only the ref needed by the job, suppress tags if they are unnecessary, then consider shallow history, partial clone filters, sparse checkout, and a local object cache. Measure negotiated objects and bytes before and after.

```bash
git -c remote.origin.fetch='+refs/heads/main:refs/remotes/origin/main' \
  fetch --no-tags --depth=1 origin main
```

Narrowing refs can break jobs that discover release branches or calculate versions from tags. Make each job declare the history and refs it needs rather than applying one aggressive checkout globally.

# Semantic Versioning and the Release Contract

SemVer only works after the project defines its public API. `MAJOR.MINOR.PATCH` means incompatible API change, backward-compatible functionality, and backward-compatible fix. `0.y.z` signals unstable public API. Prerelease identifiers sort below the corresponding normal version; build metadata does not affect precedence.

Compatibility needs evidence: API diff, consumer tests, migration checks, and a deprecation window. This repository derives minor/patch release intent from typed commit/PR policy and reserves a breaking marker on the PR title for a major. The mechanism is repository-specific, while SemVer precedence is not.

![[Assets/System Design 101/5d69e3bea8f155cadd70ff3bb104f9bac12b75f546eee1c61ffc8b9bb7a2c692.png]]

> [!WARNING] Non-normative source visual
> The Alpha → Beta → RC sequence is one release convention, not a SemVer requirement. SemVer permits arbitrary dot-separated prerelease identifiers and defines how they compare; each project defines its own stages, promotion gates, and compatibility evidence.

<nav style="--card-accent: 99, 102, 241;" class="folder-structure-map" aria-label="Version Control Systems section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Branching Stratagies">Branching Stratagies</span></span></div><p class="db-card-summary">How a team uses Git branches for parallel development, releases, and hotfixes.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/DevOps/Version Control Systems/Branching Stratagies.md" data-tooltip-position="top" aria-label="Branching Stratagies">Branching Stratagies</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# References

- [Pro Git book](https://git-scm.com/book/en/v2) — explains Git's object model, index, refs, remotes, and everyday state transitions.
- [Pro Git — Branching Workflows](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows) — compares long-running, topic, and integration branches as collaboration conventions layered on Git.
- [Trunk Based Development](https://trunkbaseddevelopment.com/) — documents frequent trunk integration, short-lived branches, and incremental release techniques.
- [git-flow cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/index.ru_RU.html) — provides the concrete command sequence for GitFlow feature, release, and hotfix branches.
- [Git glossary](https://git-scm.com/docs/gitglossary) — official definitions for objects, refs, index, working tree, and remote-tracking branches.
- [Git partial clone](https://git-scm.com/docs/partial-clone) — official object filtering behavior and limitations.
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) — normative precedence and compatibility contract.
- [GitHub pull requests](https://docs.github.com/en/pull-requests) — host-level collaboration, review, and policy features.
- [ByteByteGo: Git workflow](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/git-workflow.md) — source contribution for the Git state machine.
- [ByteByteGo: Git commands](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/git-commands-cheat-sheet.md) — source contribution for safe state-transition commands; its visual was rejected by the audit.
- [ByteByteGo: Git and GitHub](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/git-vs-github.md) — source contribution for the VCS/hosting boundary; its visual was rejected by the audit.
- [ByteByteGo: monorepo versus multirepo](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/monorepo-vs.md) — source contribution for the symmetric repository strategy; its visual was rejected by the audit.
- [ByteByteGo: Pinterest clone-time case](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/the-one-line-change-that-reduced-clone-times-by-a-whopping-99-says-pinterest.md) — source contribution for refspec-first CI checkout tuning; its visual was rejected by the audit.
- [ByteByteGo: version numbers](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-do-version-numbers-mean.md) — source contribution for the SemVer contract.
