---
{"dg-publish":true,"permalink":"/software-engineering/09-dev-ops/version-control-systems/branching-stratagies/","dg-note-properties":{"topic":["DevOps"],"subtopic":["Version Control Systems"],"level":["4"],"priority":"High","status":"Ready to Repeat"}}
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

## Pitfalls

### Long-Lived Feature Branches

**What goes wrong**: a feature branch lives for 2+ weeks. By the time it merges, `main` has diverged significantly. The merge conflict is large, the review is hard, and integration bugs appear that weren't visible in isolation.

**Why it happens**: features are scoped too large, or the team lacks feature flags to ship incomplete work.

**Mitigation**: keep branches short-lived (1-2 days max for trunk-based, 3-5 days for GitHub Flow). Break large features into smaller vertical slices that can be merged independently. Use feature flags to hide incomplete features from users.

### Inconsistent Branch Naming

**What goes wrong**: branches named `fix`, `johns-branch`, `temp`, `wip`. No one can tell what a branch is for, who owns it, or whether it is safe to delete.

**Mitigation**: enforce a naming convention: `feature/TICKET-123-short-description`, `fix/TICKET-456-bug-name`, `hotfix/TICKET-789-critical-fix`. Automate enforcement with a pre-push hook or CI check.

## Example: Trunk-Based Development with Feature Flag

```bash
# Short-lived branch: created, merged, deleted within 1-2 days
git checkout -b feature/PROJ-123-add-payment-method

# Small, focused commit
git commit -m 'feat: add PayPal payment method behind feature flag'

# Merge to main via PR (CI must pass)
git push origin feature/PROJ-123-add-payment-method
# Open PR, get review, merge, delete branch
```

```csharp
// Feature flag hides incomplete work from users
if (_featureFlags.IsEnabled("PayPalPayment", userId))
{
    // New PayPal integration — only visible to opted-in users
    return await _payPalGateway.ChargeAsync(amount);
}
return await _stripeGateway.ChargeAsync(amount);  // existing path
```


## Questions

> [!QUESTION]- Why does GitFlow create integration problems for teams practicing continuous deployment?
> GitFlow's long-lived `develop` branch accumulates divergence from `main` over days or weeks. Feature branches branch off `develop`, so they also diverge. When multiple features merge back, conflicts compound. The `release/*` stabilization phase adds a manual gate that prevents continuous deployment. For web services that deploy multiple times per day, GitFlow's overhead is pure cost with no benefit. Use trunk-based development or GitHub Flow instead.

> [!QUESTION]- What does trunk-based development require that makes it unsuitable for all teams?
> Trunk-based development requires: (1) feature flags to hide incomplete features from users, (2) fast CI (< 10 minutes) so broken commits are caught quickly, (3) team discipline to keep commits small and the trunk green. Without feature flags, incomplete features must be fully hidden behind code-level conditions or held back entirely. Without fast CI, a broken commit blocks the whole team. Teams without these practices should start with GitHub Flow (short-lived PRs) and evolve toward trunk-based as their CI matures.


## References

- [Trunk Based Development](https://trunkbaseddevelopment.com/) — practitioner site for trunk-based development; covers feature flags, branch by abstraction, and team scaling
- [A successful Git branching model (nvie)](https://nvie.com/posts/a-successful-git-branching-model/) — the original GitFlow post by Vincent Driessen; includes the author's 2020 note recommending trunk-based development for web services
- [Atlassian — Comparing workflows](https://www.atlassian.com/git/tutorials/comparing-workflows) — comparison of branching strategies with diagrams and team-size guidance
- [Martin Fowler — Feature Branch](https://martinfowler.com/bliki/FeatureBranch.html) — canonical analysis of feature branches, their risks, and when they are justified
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/09 DevOps/09 DevOps\|09 DevOps]]
>
<!-- whats-next:end -->
