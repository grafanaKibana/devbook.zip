---
topic:
  - DevOps
subtopic:
  - Version Control Systems
level:
  - "4"
priority: High
status: Creation

dg-publish: true
---

# Branching Strategies

A branching strategy defines how a team uses Git branches to manage parallel development, releases, and hotfixes. The right strategy depends on team size, release cadence, and CI/CD maturity. A mismatch between strategy and team workflow creates merge conflicts, long-lived branches, and integration pain.

## GitFlow

**Mechanism**: Two permanent branches (`main` and `develop`) plus three types of short-lived branches (`feature/*`, `release/*`, `hotfix/*`). Features branch off `develop`, are merged back to `develop`, then batched into a `release/*` branch for stabilization, then merged to both `main` and `develop`.

**Team size fit**: Medium to large teams with scheduled release cycles (weekly/monthly releases).

**CI/CD compatibility**: Works with CI on `develop` and `release` branches. CD is manual — releases are gated by the `release/*` branch stabilization process.

**Risks**: Long-lived `develop` branch accumulates divergence from `main`. Feature branches can live for weeks, creating large merge conflicts. Release stabilization adds overhead. Not suited for continuous deployment.

**When to use**: Products with versioned releases (mobile apps, packaged software, APIs with breaking-change versioning). Avoid for web services that deploy continuously.

## Trunk-Based Development

**Mechanism**: All developers commit directly to `main` (or merge short-lived feature branches within 1-2 days). No long-lived branches. Feature flags control what is visible to users. CI runs on every commit to `main`.

**Team size fit**: Any size. Scales from solo developers to 1,000+ engineers (Google, Facebook use trunk-based development).

**CI/CD compatibility**: Excellent. Every commit to `main` can trigger a deployment pipeline. Continuous deployment is natural.

**Risks**: Requires discipline — broken commits affect everyone immediately. Requires feature flags for incomplete features. Requires fast CI (< 10 minutes) to keep the feedback loop tight.

**When to use**: Web services, SaaS products, and any team practicing continuous deployment. The default choice for modern cloud-native development.

## Feature Branch Workflow (GitHub Flow)

**Mechanism**: `main` is always deployable. Developers create short-lived feature branches, open a pull request, get review, and merge to `main`. No `develop` branch. Deployments happen from `main` after merge.

**Team size fit**: Small to medium teams (2-20 developers).

**CI/CD compatibility**: Good. CI runs on PRs; CD deploys from `main` after merge.

**Risks**: If PRs stay open too long (> 2-3 days), branches diverge and merges become painful. Without feature flags, incomplete features must be hidden behind code-level conditions.

**When to use**: Teams that want the simplicity of trunk-based development but need a PR review gate before merging. The most common strategy for open-source projects and small product teams.

## Comparison

| Strategy | Long-lived Branches | Release Cadence | CI/CD Fit | Team Size |
|----------|--------------------|-----------------|-----------|-----------| 
| GitFlow | Yes (develop, main) | Scheduled (weekly+) | Manual CD | Medium-large |
| Trunk-Based | No | Continuous | Excellent | Any |
| GitHub Flow | No (short PRs) | Continuous | Good | Small-medium |

## Decision Rule

**Start with GitHub Flow** (feature branches + PRs to main) for any new team. It is simple, enforces code review, and works with any CI/CD system.

**Switch to Trunk-Based Development** when: your team is mature enough to use feature flags, your CI runs in < 10 minutes, and you want to eliminate merge conflicts from long-lived branches.

**Use GitFlow** only when: you ship versioned releases on a fixed schedule (e.g., a mobile app or packaged software) and need to maintain multiple release branches simultaneously.

## References

- [Trunk Based Development](https://trunkbaseddevelopment.com/) — practitioner site for trunk-based development; covers feature flags, branch by abstraction, and team scaling
- [A successful Git branching model (nvie)](https://nvie.com/posts/a-successful-git-branching-model/) — the original GitFlow post by Vincent Driessen; includes the author's 2020 note recommending trunk-based development for web services
- [Atlassian — Comparing workflows](https://www.atlassian.com/git/tutorials/comparing-workflows) — comparison of branching strategies with diagrams and team-size guidance
- [Martin Fowler — Feature Branch](https://martinfowler.com/bliki/FeatureBranch.html) — canonical analysis of feature branches, their risks, and when they are justified
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/09 DevOps/09 DevOps|09 DevOps]]
>
<!-- whats-next:end -->
