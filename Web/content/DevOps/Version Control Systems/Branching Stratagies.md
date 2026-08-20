---
publish: true
created: 2026-08-20T20:41:15.625Z
modified: 2026-08-20T20:41:15.625Z
published: 2026-08-20T20:41:15.625Z
topic:
  - DevOps
subtopic:
  - Version Control Systems
summary: How a team uses Git branches for parallel development, releases, and hotfixes.
level:
  - "4"
priority: High
status: Ready to Repeat
---

A branching strategy is a coordination contract: where integration happens, how long work may diverge, which checks gate a merge, and how releases are cut. The fit follows release topology, review latency, and the team's ability to keep the integration branch healthy.

# GitFlow

GitFlow keeps `main` and `develop` as permanent branches and adds feature, release, and hotfix branches. Feature work returns to `develop`. A release branch stabilizes a selected version before it is merged to the production branch and reconciled back into development. A hotfix starts from production and must also return to ongoing development.

The extra branches can be useful for scheduled releases, explicit stabilization periods, or several supported versions. They also create several integration points where histories diverge. That cost is usually unnecessary for a service with one continuously delivered production line.

# Trunk-Based Development

Trunk-based development integrates small changes into one mainline frequently, either directly under policy or through short-lived branches. Incomplete behavior can reach the trunk behind a feature flag, dark endpoint, or other exposure boundary. Deployment and feature exposure remain separate decisions.

The model depends on fast, trustworthy validation and a trunk that is repaired quickly when broken. Each trunk revision can be a release candidate; whether it is automatically deployed remains a separate pipeline policy.

GitHub Flow is a host-specific form of short-lived-branch trunk development: create a branch, open a pull request, pass review and required checks, merge into the one mainline, then delete the branch. It adds a review gate without a permanent `develop` branch.

# What Changes the Choice

| Condition | Better fit |
| --- | --- |
| Parallel supported releases or an explicit stabilization lane | GitFlow may justify its extra branches |
| One frequently released product line | Trunk-based development |
| Review or required checks before mainline moves | Short-lived PRs around the trunk |
| Very fast validation and direct integration under policy | Direct-to-trunk can work |

Team size is not the deciding condition. Branch lifetime is. As a branch remains open, divergence, review scope, and integration risk grow. Long-lived branches usually mean the change cannot be integrated incrementally, validation is too slow, or the review queue is the real bottleneck.

# Merge and Rebase

A non-fast-forward `git merge` creates a two-parent commit and preserves both histories. A fast-forward merge only moves the target ref when the incoming branch is already its descendant. `git rebase` copies commits onto a new base, producing new commit IDs and a linear series.

Rebase is useful while a private branch is still owned by one author. Merge is safer once collaborators may depend on the published commit identities. Rebasing shared history requires coordination because existing descendants and references still point to the old commits. The content result may be equivalent; the collaboration history is not.

# References

- [Trunk Based Development](https://trunkbaseddevelopment.com/)
- [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)
- [Atlassian Git workflow comparison](https://www.atlassian.com/git/tutorials/comparing-workflows)
- [Git rebase documentation](https://git-scm.com/docs/git-rebase)
