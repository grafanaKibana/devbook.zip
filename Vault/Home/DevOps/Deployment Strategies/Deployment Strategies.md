---
topic: [DevOps]
subtopic: [Deployment Strategies]
summary: "How new versions reach production, balancing risk, cost, and rollback speed."
publish: true
status: Ready to Repeat
priority: Medium
level: ["2"]
tags: [FolderNote]
qard-deck: "DevOps"
qard-topic: "Deployment Strategies/Deployment Strategies"
flashcard_uid: "f7d6b407"
---

A deployment strategy decides how a new artifact replaces the old one, how users are exposed to it, and how that exposure can be reversed. The choice trades spare capacity and rollout complexity against the size and duration of a failed release.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Replacement and Exposure Are Separate

Deployment changes which processes run. Traffic management changes which healthy processes receive requests. A feature flag changes which code path a request reaches inside an already deployed process. These controls may be composed, but they prove different things.

Every safe rollout needs:

- a known previous artifact and a reversal path;
- readiness evidence before the candidate receives traffic;
- service-health evidence during exposure;
- compatible APIs, messages, and data while adjacent versions coexist;
- enough capacity for the old and new versions during overlap.

Database changes often determine whether rollback is real. If the candidate writes data the old version cannot read, shifting traffic back does not restore the previous system.

# Strategies

| Strategy | Mechanism | Main cost | Reversal |
| --- | --- | --- | --- |
| Recreate | Stop the old fleet, then start the new fleet | Downtime and full immediate exposure | Redeploy the old artifact |
| Rolling | Replace instances in batches | Adjacent-version compatibility and temporary capacity pressure | Roll the old revision through the fleet |
| Blue-green | Run a complete candidate beside the serving environment, then switch traffic | Near-duplicate capacity | Switch traffic back while the old environment remains compatible |
| Canary | Send a small representative share of traffic to the candidate, then expand from health evidence | Traffic control, separated telemetry, and a longer coexistence window | Remove the canary from traffic |

## Recreate and Rolling

Kubernetes exposes the two replacement policies directly:

```yaml
# Full replacement; downtime is expected.
strategy:
  type: Recreate
```

```yaml
# Batch replacement; values control overlap and minimum available capacity.
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
```

`maxUnavailable` limits how many desired replicas may be unavailable during the rollout. `maxSurge` permits temporary replicas above the desired count. Neither field guarantees successful requests; readiness, graceful shutdown, remaining capacity, and version compatibility still decide that.

Recreate fits disposable environments or an explicit maintenance window. Rolling is the common baseline for replaceable services that can tolerate adjacent versions.

## Blue-Green and Canary

Blue-green provisions a complete candidate before a traffic switch. It favors fast traffic reversal and pre-cutover testing, but pays for two environments during the decision.

Canary increases exposure only after a small cohort produces enough representative evidence. A fixed pause is not evidence by itself. The rollout needs a metric, a threshold, and an observation window long enough to detect the failure that matters. Very low traffic can make a small canary inconclusive.

Neither strategy removes data compatibility requirements. Both keep old and new versions alive during the decision, so shared schemas, messages, sessions, and external side effects must work across that overlap.

# Choosing a Strategy

Recreate fits when downtime is acceptable and overlap buys little. Rolling fits when instances can be replaced gradually and adjacent versions are compatible. Blue-green fits when a fully provisioned candidate and fast traffic reversal justify duplicate capacity. Canary fits when representative traffic can be isolated and measured before full exposure.

The question is not which strategy is universally safest. It is which failure can be detected, how much traffic may see it, and whether the previous version remains usable when that evidence arrives.

# Questions

> [!qard]- What are the main deployment strategies, and how do they differ?
> Deployment strategies differ in how the new version replaces the old one and how quickly users are exposed to it. Recreate stops the old version before starting the new one. Rolling replaces instances in batches. Blue-green switches traffic to a fully prepared copy. Canary sends a small share of traffic to the new version first. They trade spare capacity and rollout complexity against downtime, the number of users a defect can reach, and how fast a release can be reversed.
>
> | Strategy | Mechanism | User exposure | Main cost | Reversal |
> |---|---|---|---|---|
> | Recreate | All old instances stop, then the new ones start. | Downtime, then every user gets the new version at once. | An outage during each release. | Redeploying the old artifact the same way. |
> | Rolling | Instances are replaced in batches while the rest keep serving. | Grows batch by batch; old and new versions usually serve side by side during the rollout. | Compatibility between adjacent versions while they overlap, and capacity that dips or surges during the rollout. | Rolling the previous version back through the fleet. |
> | Blue-green | A complete new environment runs and is tested beside the live one, then traffic switches to it. | All traffic moves at the switch. | Near-duplicate capacity while the decision is open. | Switching traffic back while the old environment still runs. |
> | Canary | A small representative share of traffic goes to the new version, and exposure expands as health evidence allows. | Starts with a small cohort and grows in steps. | Fine-grained traffic routing and telemetry separated by version. | Removing the canary from traffic. |
>
> Kubernetes Deployments offer the first two directly as the `Recreate` and `RollingUpdate` strategies. For rolling updates, `maxUnavailable` limits how many desired Pods may be unavailable, and `maxSurge` allows temporary extra Pods. These settings and the replica count shape how much the old and new versions overlap.
>
> Rolling, blue-green and canary commonly involve a period in which old and new versions run at the same time. Whenever they coexist, shared schemas, messages and data must work for both. If the new version writes data the old one cannot read, moving traffic back does not restore the previous system.
>
> [Kubernetes: Deployment strategy](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy) · [AWS: Deployment methods](https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/deployment-methods.html)

<!-- qard-id: ff5bb659-796b-4880-846e-a20a2b0fd672 -->
> [!qard]- When does canary fit better than blue-green deployment, and what does each approach cost?
> Canary fits better when a small, representative share of production traffic can be routed to the new version and its health measured before exposure grows. Blue-green fits better when a complete candidate environment can be tested before traffic is switched to it. Canary costs traffic control and reliable per-cohort telemetry; blue-green costs near-duplicate capacity plus a safe cutover and switch-back path.
>
> | Aspect | Canary | Blue-green |
> |---|---|---|
> | How the release proceeds | A small cohort gets the new version first, and exposure expands only while its health evidence stays acceptable. | The candidate runs and is tested beside the live environment, then traffic moves to it. |
> | Direct exposure to the new version | Only the current cohort's requests run the new version until the next expansion step, so a missed defect directly reaches only that cohort. | With a single switch, all requests are routed to the new version at once, so a missed defect can affect any request that exercises the defective code path. |
> | Main cost | Routing a controlled share of traffic, telemetry separated by version, and a phase in which both versions serve live traffic. | Close to a second full environment while the decision is open, plus a reliable traffic switch. |
> | Reversal | Removing the canary from traffic. | Switching traffic back, which works only while the old environment is still running and compatible. |
>
> Routing limits direct exposure, not total impact. The canary and the old version can share databases, caches, queues and downstream services. If the canary corrupts shared data or overloads a shared dependency, requests still served by the old version can fail too. A small cohort therefore contains a defect only as far as its failure domain is isolated.
>
> A canary is only as useful as its evidence. Expanding exposure needs a metric, a threshold and an observation window long enough to show the failure that matters. A fixed pause is not evidence by itself, and very low traffic can leave a small cohort inconclusive.
>
> Neither strategy removes compatibility requirements. While both versions exist, shared schemas, messages and external side effects must work for both. If the new version writes data the old one cannot read, moving traffic back does not restore the previous system.
>
> [AWS: Deployment methods](https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/deployment-methods.html) · [Google SRE Workbook: Canarying releases](https://sre.google/workbook/canarying-releases/#dependencies_and_isolation)

# References

- [AWS deployment methods](https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/deployment-methods.html)
- [Kubernetes Deployment strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)
