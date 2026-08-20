---
publish: true
created: 2026-08-20T20:41:15.682Z
modified: 2026-08-20T20:41:15.683Z
published: 2026-08-20T20:41:15.683Z
tags:
  - FolderNote
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: A system's ability to keep serving requests as load grows by adding resources.
level:
  - "2"
priority: High
status: Creation
---

Scalability measures how capacity and unit cost change as load grows and resources are added. A system scales only while it preserves its latency, error, and reliability targets. The question becomes concrete once workload volume, traffic shape, data growth, and the first likely bottleneck are known.

A checkout service growing from 1,000 to 10,000 RPS cannot be designed by repeating "add more servers." The saturated resource determines the next move, and the same workload test must show whether that move increased useful capacity.

<nav style="--card-accent: 234, 179, 8;" class="folder-structure-map" aria-label="Scalability Patterns section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Horizontal Scaling">Horizontal Scaling</span></span></div><p class="db-card-summary">Horizontal scaling adds service instances. Stateless handlers are simplest, while stateful services need partitioning, replication, and routing.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Architecture/Distributed Systems/Scalability Patterns/Horizontal Scaling.md" data-tooltip-position="top" aria-label="Horizontal Scaling">Horizontal Scaling</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Vertical Scaling">Vertical Scaling</span></span></div><p class="db-card-summary">Vertical scaling gives a single node more CPU, RAM, or disk, the simplest first move for monoliths and managed databases.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Software Architecture/Distributed Systems/Scalability Patterns/Vertical Scaling.md" data-tooltip-position="top" aria-label="Vertical Scaling">Vertical Scaling</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Core Patterns

| Pattern | Primary bottleneck addressed | How it helps | Tradeoff and interview caveat |
|---|---|---|---|
| Horizontal scaling (stateless services behind LB, see [[Software Architecture/Distributed Systems/Load Balancing]]) | App CPU and request concurrency | Add service instances behind a load balancer to increase throughput and availability | Stateless handlers are the simplest model. Stateful services require partitioning, replication, and affinity or coordination |
| Database read replicas | Read-heavy relational load | Offload read queries from primary to replicas | Replica lag can break read-after-write expectations |
| Database sharding | Write throughput and dataset size | Partition data by key so writes and storage spread across shards | Rebalancing, cross-shard queries, and hotspot keys add major complexity |
| CQRS (see [[Software Architecture/Patterns/Architectural Patterns/CQRS]]) | Read/write contention with different query needs | Separate write model from read model to optimize each independently | Eventual consistency and projection maintenance must be explicit |
| Caching (see [[Data Persistence/Caching\|Caching]]) | Repeated expensive reads | Serve hot data from in-memory cache to reduce DB/API pressure | Cache invalidation and staleness policy drive correctness risk |
| CDN | Static asset latency and origin egress | Move static content to edge locations close to users | Cache-control mistakes can serve stale or private content |
| Async processing and message queues (see [[Software Architecture/Distributed Systems/Message Queues/Message Queues\|Message Queues]]) | Synchronous dependency latency and burst traffic | Buffer work, decouple producers/consumers, smooth spikes | Requires idempotency, retry policy, and dead-letter handling |
| Connection pooling | Expensive connection setup and DB connection limits | Reuse open connections to reduce handshake cost and limit churn | Pool exhaustion often appears as latency spikes before hard failures |
| Event-Driven Architecture (see [[Software Architecture/System Architecture/Event-Driven Architecture\|Event-Driven Architecture]]) | Tight coupling between services | Publish events so services scale and evolve independently | Ordering, duplication, and schema evolution must be designed upfront |
| Load shedding and rate limiting | Overload collapse during spikes | Reject or defer excess traffic early to protect critical paths | Requires clear priority rules and client retry behavior |

Stateless request handlers are the simplest horizontal-scaling model because any replica can accept the next request. Stateful services can also scale horizontally. They require explicit partition ownership, state replication, and routing affinity or coordination during failover.

Sharding is usually a late move because routing and resharding become permanent operating work. Connection pooling, query and index repair, caching, or read replicas often remove the measured bottleneck at lower cost. CQRS applies when read and write models genuinely diverge. Ordinary CRUD does not justify it.

# Measurement and Bottleneck Migration

![[Assets/Software Architecture/Software Architecture-Scalability Patterns-18120000.png]]

The strategies in the visual solve different measured bottlenecks. They are not a checklist. Each evaluation needs an explicit measurement contract:

- **Offered load:** work presented to the system.
- **Throughput:** completed useful work per unit time.
- **Latency:** a distribution such as p50, p95, and p99.
- **Capacity:** highest sustained offered load that still meets latency, error, and resource limits.
- **Saturation:** constrained resource or queue that stops throughput from rising.
- **Scalability:** how capacity and unit cost change after adding resources or changing architecture.

Success is defined before the test: `2x ASP.NET Core instances should deliver at least 1.7x completed checkout throughput, p99 below 400 ms, errors below 0.1%, and database connections below 80% of the limit for 30 minutes`.

At 1,000 RPS, load increases in steps while request rate, completed orders, latency, errors, runtime resources, database contention, dependency latency, and queue age are recorded. If application CPU reaches 85% and throughput rises when instances double, horizontal scale addressed the current bottleneck. If database lock wait dominates at 2,500 RPS, more application replicas now increase contention. One change is applied and measured before the next bottleneck is located.

# Scaling Decision Framework

Telemetry and saturation lead the decision. Architecture fashion does not.

```mermaid
flowchart TD
    A[What is the bottleneck] --> B{Bottleneck type}
    B -->|CPU or compute| C[Scale stateless services horizontally]
    B -->|Database| D{Measured database cause}
    D -->|Inefficient query index or transaction| I[Tune the query index or transaction path]
    D -->|Repeatable stale-tolerant reads| J[Add a cache]
    D -->|Read-throughput ceiling with acceptable lag| K[Add read replicas]
    D -->|Proven single-writer or storage ceiling| E[Partition or shard]
    B -->|Read and write model contention| H[Consider CQRS]
    B -->|External API latency limit| F[Queue plus rate limit plus retry policy]
    C --> G[Re-measure p95 latency and saturation]
    I --> G
    J --> G
    K --> G
    E --> G
    H --> G
    F --> G
```

# .NET Operating Guidance

`dotnet-counters` supplies runtime counters, OpenTelemetry records request and dependency signals, and the database exposes wait and query telemetry. A low application CPU value does not prove spare capacity when threads are blocked on connections. Platform scaling features help only when their signal matches the saturated resource. CPU-based autoscaling does not fix a database lock or third-party quota.

Cost per completed operation matters more than instance count. Cache, replicas, queues, and sharding move cost into invalidation, replication, backlog, and routing. A rollback threshold limits changes that worsen tail latency or errors. The same workload runs after every change because the bottleneck moves.

# Tradeoffs

| Choice | Better when | Worse when |
|---|---|---|
| Vertical vs horizontal app scaling | Immediate capacity and low migration risk dominate | Single-node ceiling and blast radius become dominant |
| Read replicas vs caching for reads | Queries are complex and freshness matters more than latency | Cache hit ratio is high and stale-tolerant reads dominate |
| Sharding vs larger primary DB | Write throughput and data size exceed one node limits | Team is small and cross-shard operations are frequent |
| Sync calls vs queue-based async | User needs immediate result and latency budget allows it | Dependency is slow or rate-limited and bursty traffic is expected |

# Pitfalls

1. **Scaling before finding the real bottleneck**
   More application instances do not reduce p95 when database locks, connection saturation, or an external quota controls throughput. Record the baseline, identify the saturated resource, and scale that component first.

2. **Premature sharding**
   Shard routing, cross-shard queries, and resharding become permanent operating work. Repair indexes and queries, then consider read replicas, caching, partitioning, or queueing before splitting the write store.

3. **Stateful services that cannot scale horizontally**
   Sticky sessions and per-node state create uneven load and complicate failover. External session storage can keep request handlers stateless. Intrinsic state instead needs partitioning, replication, and affinity or coordination.

4. **Ignoring database bottlenecks while scaling app tier**
   More application instances generate more database work. If database CPU, locks, or connection limits are already saturated, failures arrive faster. Profile queries, repair indexes, tune pools, and add read replicas where their consistency is acceptable before scaling the application tier.

# References

- [Design to scale out](https://learn.microsoft.com/azure/architecture/guide/design-principles/scale-out)
- [Using load shedding to avoid overload](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/)
