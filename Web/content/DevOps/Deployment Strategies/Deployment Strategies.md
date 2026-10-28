---
publish: true
created: 2026-10-28T12:27:02.907Z
modified: 2026-10-28T12:33:02.648Z
published: 2026-10-28T12:33:02.648Z
tags:
  - FolderNote
topic:
  - DevOps
subtopic:
  - Deployment Strategies
summary: How new versions reach production, balancing risk, cost, and rollback speed.
status: Ready to Repeat
priority: Medium
level:
  - "2"
qard-deck: DevOps
qard-topic: Deployment Strategies/Deployment Strategies
flashcard_uid: f7d6b407
---

A deployment strategy decides how a new artifact replaces the old one, how users are exposed to it, and how that exposure can be reversed. The choice trades spare capacity and rollout complexity against the size and duration of a failed release.

<nav style="--card-accent: 99, 102, 241;" class="folder-structure-map" aria-label="Deployment Strategies section map"><div class="folder-map-children"><article class="db-card folder-map-node folder-map-node-empty"><div class="db-card-body"><span class="folder-map-empty-text">No notes in this section yet.</span></div></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid var(--interactive-accent, var(--secondary, #437100)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

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
