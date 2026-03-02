---
topic:
  - DevOps
subtopic:
  - Deployment Strategies
dg-publish: false
status: Not-Started
priority: Medium
level:
  - "2"
---

# Deployment Strategies

Deployment strategies control how new versions of software reach production. The right strategy balances risk tolerance, infrastructure cost, and rollback speed. A strategy is only as good as your monitoring — without metrics and alerts, you cannot detect a bad deploy fast enough to stop it.

The five main strategies differ on one axis: **how much of your fleet runs the new version at any given moment** during the rollout.

## All-at-Once (Big Bang)

Replace every instance simultaneously. The old version stops; the new version starts.

**Mechanism**: Stop all instances → deploy new artifact → start all instances. In Kubernetes, this is `RollingUpdate` with `maxUnavailable: 100%` or simply deleting the old Deployment and applying a new one.

**Scenario**: A startup with a single EC2 instance and a 2 AM maintenance window. Downtime is acceptable; infrastructure cost is the constraint.

**Risks**:
- Full downtime during the swap
- If the new version is broken, 100% of users are affected immediately
- Rollback requires another full deploy cycle

**When to use**: Internal tools, dev/staging environments, or services where brief downtime is contractually acceptable and infrastructure cost matters more than availability.

## In-Place (Rolling)

Replace instances one at a time (or in small batches), keeping the rest serving traffic.

**Mechanism**: Take one instance out of the load balancer → deploy new version → health check → put back in → repeat. Kubernetes `RollingUpdate` with `maxUnavailable: 1` and `maxSurge: 1` does this natively.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
```

**Scenario**: A SaaS app with 10 pods. Rolling update replaces pods one by one over ~5 minutes. At any point, 9 pods serve traffic. Users see no downtime.

**Risks**:
- During rollout, old and new versions run simultaneously — your API must be backward-compatible (no breaking schema changes)
- Rollback requires another rolling update in reverse (slow)
- If a bug only manifests under load, it may not surface until most pods are updated

**When to use**: Default strategy for most web services. Works well when you can guarantee API backward compatibility between adjacent versions.

## Blue-Green

Maintain two identical environments (blue = current, green = new). Switch traffic atomically by updating the load balancer.

**Mechanism**: Blue serves 100% of traffic. Deploy new version to green. Run smoke tests on green. Flip the load balancer to green. Blue becomes the standby.

```bash
# AWS ALB target group swap
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions Type=forward,TargetGroupArn=$GREEN_TG_ARN
```

**Scenario**: A fintech app processing payments. Zero-downtime is non-negotiable. Blue-green lets you validate green with synthetic transactions before switching. If green fails, flip back to blue in seconds.

**Risks**:
- Double infrastructure cost during the transition (two full environments)
- Database migrations must be backward-compatible with both versions simultaneously
- Session state tied to blue instances is lost on cutover (use external session stores)

**When to use**: High-availability services where rollback speed matters more than infrastructure cost. Ideal when you have stateless services and an external session/state store.

## Canary

Route a small percentage of real traffic to the new version, monitor, then gradually increase.

**Mechanism**: Deploy new version alongside old. Route 5% of traffic to new (by weight in the load balancer or service mesh). Monitor error rates, latency, and business metrics. If healthy, increase to 20% → 50% → 100%. If unhealthy, route 0% back to old.

```yaml
# Kubernetes with Argo Rollouts
strategy:
  canary:
    steps:
    - setWeight: 5
    - pause: {duration: 10m}
    - setWeight: 20
    - pause: {duration: 10m}
    - setWeight: 100
```

**Scenario**: An e-commerce platform with 500k daily users. A new checkout flow is deployed to 5% of users. After 10 minutes, error rate on the canary is 0.3% vs 0.1% baseline — automated rollback triggers. Only 25k users were exposed to the bug.

**Risks**:
- Requires sophisticated traffic splitting (service mesh, weighted load balancer, or feature flags)
- Monitoring must be granular enough to detect issues at 5% traffic
- Longer rollout window means old and new versions coexist for hours

**When to use**: High-traffic services where you want real-user validation before full rollout. Pairs well with feature flags and automated rollback on SLO breach.

## Linear

Increase traffic to the new version in fixed increments on a fixed schedule (e.g., +10% every 10 minutes).

**Mechanism**: Same as canary but automated and time-driven rather than metric-driven. AWS CodeDeploy's `Linear10PercentEvery10Minutes` is the canonical implementation.

**Scenario**: A Lambda function update. CodeDeploy shifts 10% of invocations to the new version every 10 minutes. After 100 minutes, 100% of traffic is on the new version. CloudWatch alarms trigger automatic rollback if error rate spikes.

**Risks**:
- Less adaptive than canary — traffic increases on schedule even if early signals are ambiguous
- Requires automated rollback hooks (CloudWatch alarms → CodeDeploy rollback)
- Not suitable for services where 10% traffic is too small to surface bugs

**When to use**: Serverless functions and AWS Lambda deployments where CodeDeploy integration is native. Good when you want predictable rollout timelines over adaptive ones.

## Comparison

| Strategy | Downtime | Rollback Speed | Infra Cost | Risk Level | Best For |
|----------|----------|----------------|------------|------------|----------|
| All-at-Once | Full | Slow (redeploy) | Lowest | Highest | Dev/staging, internal tools |
| In-Place (Rolling) | None | Slow (re-roll) | Low | Medium | Default for most web services |
| Blue-Green | None | Instant (flip) | 2× during deploy | Low | High-availability, payment flows |
| Canary | None | Fast (re-weight) | Low–medium | Lowest | High-traffic, user-facing features |
| Linear | None | Fast (re-weight) | Low | Low | Lambda, AWS CodeDeploy workloads |

## Decision Rule

**Start with In-Place (Rolling)** for any new service — it's the Kubernetes default, costs nothing extra, and handles most cases.

**Switch to Blue-Green** when: rollback speed is critical (financial transactions, regulated workloads), or you need to validate the full environment before cutover.

**Switch to Canary** when: you have >10k daily users, a service mesh or weighted load balancer, and automated SLO-based rollback. The investment in tooling pays off at scale.

**Use Linear** when: deploying AWS Lambda functions — CodeDeploy makes it trivial and CloudWatch alarms provide automatic rollback.

**Avoid All-at-Once** in production unless downtime is contractually acceptable and infrastructure cost is the primary constraint.

## References

- [Martin Fowler — BlueGreenDeployment](https://martinfowler.com/bliki/BlueGreenDeployment.html) — canonical definition of blue-green by the originator; explains the environment swap pattern and database migration considerations
- [Martin Fowler — CanaryRelease](https://martinfowler.com/bliki/CanaryRelease.html) — canonical canary definition; covers traffic splitting, monitoring requirements, and when canary is worth the complexity
- [AWS — Deployment Methods](https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/deployment-methods.html) — AWS whitepaper covering all major strategies with diagrams and AWS-specific implementation guidance
- [Kubernetes — Rolling Updates](https://kubernetes.io/docs/tutorials/kubernetes-basics/update/update-intro/) — how Kubernetes implements rolling/in-place deploys natively with `maxUnavailable` and `maxSurge`
- [Argo Rollouts](https://argoproj.github.io/rollouts/) — Kubernetes controller for advanced canary and blue-green deployments with automated analysis
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/09 DevOps/09 DevOps|09 DevOps]]
>
> **Pages**
> - [[Software Engineering/09 DevOps/Deployment Strategies/All-In-One Deployment|All-In-One Deployment]]
> - [[Software Engineering/09 DevOps/Deployment Strategies/Blue Green Deployment|Blue Green Deployment]]
> - [[Software Engineering/09 DevOps/Deployment Strategies/Canary Deployment|Canary Deployment]]
> - [[Software Engineering/09 DevOps/Deployment Strategies/In-place Deployment|In-place Deployment]]
> - [[Software Engineering/09 DevOps/Deployment Strategies/Linear Deployment|Linear Deployment]]
<!-- whats-next:end -->

# Intro

Quick introduction to the topic
Explain the topic in plain language.
Prefer clear, complete explanation over short bullets.
Include at least one concrete example or a small diagram walkthrough when useful.

## Examples

Examples if needed with their explanation

## Questions

> [!QUESTION]- What is abc?
> Answer

## Links

Replace or delete these example links.

- [Link 1](https://example.com)
- [Link 2](https://example.com)

<!-- whats-next:start -->

---

> [!note] Whats next
<!-- whats-next:end -->

# Intro

Quick introduction to the concept
For simple topics, keep mechanism + example inline in this section.
Add standalone sections only when they improve clarity:
- `## How It Works` for non-obvious mechanisms/flows
- `## Example` when an inline example is not enough
- `## Pitfalls` only for non-obvious real-world failure modes

## Questions

> [!QUESTION]- What is abc?
> Answer

## Links

Replace or delete these example links.

- [Link 1](https://example.com)
- [Link 2](https://example.com)

<!-- whats-next:start -->

---

> [!note] Whats next
<!-- whats-next:end -->
