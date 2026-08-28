---
topic:
  - DevOps
subtopic:
  - Version Control Systems
summary: "Tracks file changes over time, enabling collaboration, branching, merging, and reverting."
level:
  - "4"
priority: High
tags: [FolderNote]

publish: true
status: Ready to Repeat
---

A version control system (VCS) records versions of tracked files so a team can compare, branch, merge, and restore repository history. Git is distributed: a normal clone contains a local object database and refs, so most history operations do not depend on the hosting service.

Git's recovery boundary is explicit. A committed snapshot is durable while it remains reachable or recoverable from local records. An untracked file or an edit Git never captured cannot be reconstructed from Git history.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

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
