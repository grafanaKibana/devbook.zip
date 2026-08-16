---
topic:
  - DevOps
subtopic:
  - Deployment Strategies
summary: "How new versions reach production, balancing risk, cost, and rollback speed."
publish: true
status: Ready to Repeat
priority: Medium
level:
  - "2"
tags: [FolderNote]
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

Use recreate when downtime is acceptable and overlap buys little. Use rolling when instances can be replaced gradually and adjacent versions are compatible. Use blue-green when a fully provisioned candidate and fast traffic reversal justify duplicate capacity. Use canary when representative traffic can be isolated and measured before full exposure.

The question is not which strategy is universally safest. It is which failure can be detected, how much traffic may see it, and whether the previous version remains usable when that evidence arrives.

# Questions

> [!QUESTION]- Which boundary favors canary over blue-green deployment?
> Canary fits when a representative production cohort can expose regressions before full release and the platform can measure that cohort separately. Blue-green fits when a complete candidate must be tested before one traffic switch. Canary pays in routing and analysis; blue-green pays mainly in duplicate capacity.

# References

- [AWS deployment methods](https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/deployment-methods.html)
- [Kubernetes Deployment strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)
