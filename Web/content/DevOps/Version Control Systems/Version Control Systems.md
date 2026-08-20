---
publish: true
created: 2026-08-20T20:41:15.626Z
modified: 2026-08-20T20:41:15.626Z
published: 2026-08-20T20:41:15.626Z
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

A version control system (VCS) records versions of tracked files so a team can compare, branch, merge, and restore repository history. Git is distributed: a normal clone contains a local object database and refs, so most history operations do not depend on the hosting service.

Git's recovery boundary is explicit. A committed snapshot is durable while it remains reachable or recoverable from local records. An untracked file or an edit Git never captured cannot be reconstructed from Git history.

<nav style="--card-accent: 99, 102, 241;" class="folder-structure-map" aria-label="Version Control Systems section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Branching Stratagies">Branching Stratagies</span></span></div><p class="db-card-summary">How a team uses Git branches for parallel development, releases, and hotfixes.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/DevOps/Version Control Systems/Branching Stratagies.md" data-tooltip-position="top" aria-label="Branching Stratagies">Branching Stratagies</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Working Tree, Index, Repository, and Remote

Git moves snapshots through distinct states:

```text
working tree --git add--> index --git commit--> local commit graph
remote-tracking refs <--git fetch-- remote refs
local refs --git push-------------------------> remote refs
```

The **working tree** contains checked-out files. The **index** is the proposed next snapshot. A **commit** stores a snapshot and parent links in the local object database. A **branch** is a movable ref to a commit. A **remote-tracking ref** is the last fetched view of a remote ref.

`fetch` downloads objects and updates remote-tracking refs without integrating them into the current branch. `pull` fetches and then merges or rebases according to configuration. `restore` changes working-tree or index content. `reset` can move a ref and replace index or working-tree state, so its mode matters. A published mistake is usually reversed with a new `revert` commit so shared commit identities remain valid.

# Git and Hosting Platforms

Git defines objects, commits, refs, remotes, and transfer protocols. GitHub, GitLab, and Azure DevOps host repositories and add identity, permissions, pull requests, protected branches, issues, automation, and policy.

A repository can move between hosts without changing its commit graph. Host-side rules, issues, workflow history, permissions, and secrets do not move with it automatically. The hosting decision is therefore about governance, integrations, compliance, and operating cost rather than Git semantics.

# Repository Strategy

| Boundary | Monorepo | Multiple repositories |
| --- | --- | --- |
| Cross-component change | One atomic commit and review | Coordinated versions and rollout |
| Dependency policy | One graph can enforce consistency | Each repository owns its cadence |
| Access control | Requires reliable path ownership | Repository boundary is explicit |
| CI | Needs affected-component execution at scale | Smaller pipelines; integration moves downstream |
| Release | Shared source can still release independently | Independent by default |

A monorepo fits when atomic cross-component changes and shared dependency policy justify build-graph and ownership tooling. Multiple repositories fit when access isolation and independent lifecycles dominate. The deciding evidence is cross-repository coordination, CI fan-out, release coupling, and access boundaries—not repository count alone.

# Semantic Versioning and the Release Contract

Semantic Versioning only works after a project defines its public API. `MAJOR.MINOR.PATCH` means incompatible API change, backward-compatible functionality, and backward-compatible fix. Prerelease identifiers sort below the corresponding normal version; build metadata does not affect precedence.

The version number is a claim, not proof. API diffs, consumer tests, migration checks, and deprecation policy establish whether a change is compatible. Commit-message or PR-title conventions may automate version selection, but those are repository policy layered on SemVer.

# References

- [Pro Git book](https://git-scm.com/book/en/v2)
- [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)
- [GitHub pull request documentation](https://docs.github.com/en/pull-requests)
