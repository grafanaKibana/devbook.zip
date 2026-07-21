---
topic:
  - DevOps
subtopic:
  - Version Control Systems
summary: "Tracks file changes over time, enabling collaboration, branching, merging, and reverting."
level:
  - "4"
priority: High
tags:
  - FolderNote

publish: true
status: Creation
---

A version control system (VCS) records committed versions of tracked files so collaborators can branch, merge, compare, and restore states that exist in the repository history. It cannot recover an untracked file or an uncommitted edit that was never captured by Git, and local recovery records such as the reflog expire.

Git is a distributed VCS: a normal clone receives the objects reachable from the refs it fetches, while shallow clones intentionally omit older history and partial clones can defer selected objects until needed. Workflows such as GitFlow or trunk-based development define how teams coordinate changes; they are conventions layered on Git rather than properties of its object model.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Working Tree, Index, Repository, and Remote

Git moves snapshots through distinct states. The working tree is what tools edit. The index is the proposed next snapshot. A commit stores that snapshot and parent links in the local object database. Branches are movable refs to commits; remote-tracking refs are the last fetched view of another repository. `fetch` updates remote-tracking refs without integrating them; `pull` fetches and then merges or rebases according to configuration.

```text
working tree --git add--> index --git commit--> local commit graph
remote-tracking refs <--git fetch-- remote refs
local refs --git push--> remote refs
```

Use `restore` for working-tree/index content and `switch` for branches. `reset` moves a ref and may also replace index or working-tree state, so check its mode before using it. For a published mistake, create a reverting commit; do not rewrite the shared ref.

![[DevOps/DevOps-Version Control Systems-18120000-1.jpg]]

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

![[DevOps/DevOps-Version Control Systems-18120000.png]]

> [!WARNING] Non-normative source visual
> The Alpha → Beta → RC sequence is one release convention, not a SemVer requirement. SemVer permits arbitrary dot-separated prerelease identifiers and defines how they compare; each project defines its own stages, promotion gates, and compatibility evidence.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

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
