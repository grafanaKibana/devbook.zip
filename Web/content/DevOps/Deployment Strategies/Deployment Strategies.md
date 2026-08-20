---
publish: true
created: 2026-08-20T20:41:15.622Z
modified: 2026-08-20T20:41:15.623Z
published: 2026-08-20T20:41:15.623Z
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
---

A deployment strategy decides how a new artifact replaces the old one, how users are exposed to it, and how that exposure can be reversed. The choice trades spare capacity and rollout complexity against the size and duration of a failed release.

<nav style="--card-accent: 99, 102, 241;" class="folder-structure-map" aria-label="Deployment Strategies section map"><div class="folder-map-children"><article class="db-card folder-map-node folder-map-node-empty"><div class="db-card-body"><span class="folder-map-empty-text">No notes in this section yet.</span></div></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

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

> [!QUESTION]- When does canary fit better than blue-green deployment, and what does each approach cost?
> Canary fits when a small but representative production cohort can reveal regressions and its results can be measured separately. Blue-green fits when a complete candidate environment must be tested before one traffic switch. Canary adds gradual routing, cohort analysis, and a longer overlap between versions. Blue-green mainly adds the cost of running duplicate capacity.

# References

- [AWS deployment methods](https://docs.aws.amazon.com/whitepapers/latest/practicing-continuous-integration-continuous-delivery/deployment-methods.html)
- [Kubernetes Deployment strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy)
