---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/distributed-systems/consistency-models/"}
---

# Intro
Consistency models define what value a read is allowed to return relative to writes in a distributed system.
They matter because every replication, partition-tolerance, and caching decision is also a consistency decision.
You think about consistency when selecting storage, designing leader/replica topology, and deciding whether stale reads are acceptable.
In interviews, the important skill is mapping each business invariant to the weakest model that still preserves correctness.

## Models

### Strong or Linearizable

- **Guarantee:** reads behave as if operations happen in one real-time order.
- **Read rule:** if write `W2` completes before read `R1` starts, `R1` cannot return pre-`W2` data.
- **Mechanism:** leader-plus-consensus or equivalent linearizable-read protocol (lease/commit-index aware reads).
- **Example:** single-leader PostgreSQL for order state.
- **Cost:** highest coordination overhead and latency; availability drops during partitions.

### Sequential

- **Guarantee:** all operations appear in one total order that preserves each client's program order.
- **Difference from linearizable:** order must be globally consistent, but not tied to wall-clock completion time.
- **Mechanism:** global serialization logic without strict real-time constraints.
- **Example:** shared preference changes where clients must agree on one operation order.
- **Example:** ZooKeeper exposes linearizable writes and sequentially consistent reads, so designs often separate write-path correctness from read freshness.
- **Cost:** still coordination-heavy, but weaker real-time freshness than linearizable.

### Causal

- **Guarantee:** causally related operations must be seen in order.
- **Concurrency rule:** unrelated concurrent operations can appear in different orders.
- **Mechanism:** dependency tracking (for example version vectors or causal metadata).
- **Example:** chat replies should not appear before the original message.
- **Example:** collaborative edits preserve dependency chains while merging concurrent edits.
- **Cost:** lower latency than strict global ordering, but extra dependency metadata.

### Eventual

- **Guarantee:** if no new writes occur, replicas converge.
- **Mechanism:** asynchronous replication plus conflict resolution policy.
- **Example:** DNS propagation.
- **Example:** Dynamo-style stores and lagging Redis replicas.
- **Cost:** cheapest coordination model, but stale reads are expected.
- **Design impact:** application code must tolerate temporary divergence.

### Read-your-writes or Session

- **Guarantee:** a client sees its own successful writes in its session.
- **Mechanism:** session token, sticky routing, or dependency-aware replica selection.
- **Example:** user edits profile and immediately refreshes profile page.
- **Use case:** common middle ground for user-facing flows.
- **Cost:** lower than global strong consistency, but requires session propagation discipline.

## Tradeoffs

| Model | Guarantee | Example Use Case | Cost |
| --- | --- | --- | --- |
| Strong / Linearizable | Latest write in real-time order | Payments, inventory decrement, distributed lock state | Highest latency, lower availability under partition |
| Sequential | One global order preserving per-client order | Shared config updates | High coordination, weaker real-time guarantee |
| Causal | Preserve cause/effect order | Chat threads, collaborative docs | Medium complexity, dependency metadata |
| Session | Client sees own writes | Profile/settings updates | Low-medium cost, session token plumbing |
| Eventual | Converges after writes stop | Catalog/cache/reference data | Lowest coordination, stale reads expected |

## Tunable consistency (Cosmos DB)

Azure Cosmos DB sets a default consistency level at the account level.
For the API for NoSQL SDKs, clients and requests can relax reads to weaker levels, but cannot strengthen beyond the account default.

- `Strong`: linearizable; not supported with multiple write regions; highest latency profile.
- `Bounded Staleness`: lag bounded by versions or time window.
- `Session`: read-your-writes per session.
- `Consistent Prefix`: never out-of-order, but may miss latest writes.
- `Eventual`: weakest ordering, best throughput/latency.

This is a practical tradeoff spectrum: moving from `Strong` toward `Eventual` reduces coordination cost and latency while increasing stale-read risk.
During a partition, preserving stronger consistency typically means reduced availability for affected requests, which is the operational lens of [[Software Engineering/05 Architecture/Distributed Systems/CAP theorem\|CAP theorem]].

## Pitfalls

- **Assuming strong when behavior is eventual:** stale reads cause duplicate actions, confusing UI, and contradictory confirmations.
  - **Cause:** implicit read-after-write assumptions in asynchronously replicated paths.
  - **Mitigation:** explicit freshness contracts, session consistency on critical UX flows, idempotent writes, and version checks.

- **Over-specifying consistency:** paying strong-consistency latency for low-value reads.
  - **Cause:** one-size-fits-all policy across all entities.
  - **Mitigation:** classify data by invariant criticality; reserve strongest guarantees for correctness-critical aggregates.

- **Mixing levels without boundary rules:** one service assumes fresh reads while another serves lagged projections.
  - **Cause:** architecture docs list storage systems but not consistency contracts.
  - **Mitigation:** define consistency in API contracts and test with induced replica lag.

**Practical decision checklist**

- Define the invariant first: what must never be wrong from a business perspective.
- Separate write-path correctness from read-path freshness; they are often different requirements.
- Decide whether read-after-write must hold for everyone or only for the acting user.
- For each endpoint, set an explicit freshness budget (for example: "up to 2 seconds stale").
- Model partition behavior up front: which operations fail closed vs continue degraded.
- Add observability for replica lag, cache age, and stale-read rate.
- Use idempotency keys on writes so retries are safe when consistency is weaker.
- Test failure modes with delayed replication and partial-region outages.
- Keep consistency decisions visible in architecture docs and API contracts.


## Questions

> [!QUESTION]- How do you guarantee read-your-writes when writes go to a strongly consistent store but reads come from an eventually consistent cache?
> **Expected answer**
> - Route post-write reads to strong/session-consistent paths for that user.
> - Invalidate or write-through cache on update.
> - Include version/timestamp and reject stale follow-up writes.
> - Keep write operations idempotent.
> **Why this matters:** tests whether you can combine storage and cache guarantees without breaking read-after-write UX.

> [!QUESTION]- Which chat features should use linearizable, causal, and eventual consistency, and why?
> **Expected answer**
> - Message ordering/reply chains usually need at least causal consistency.
> - Typing indicators can be eventual.
> - Compliance-sensitive receipt semantics may justify stronger guarantees.
> - Pick by user-visible correctness risk vs latency cost.
> **Why this matters:** tests whether you can map business semantics to the minimum safe consistency level.

> [!QUESTION]- Why can linearizability reduce availability during a network partition, and how do you reduce blast radius in design?
> **Expected answer**
> - Linearizable paths need coordination/quorum that partitions can block.
> - System must reject or delay some operations to avoid conflicting truths.
> - Scope strong consistency to critical writes only.
> - Serve non-critical reads with weaker models and explicit degraded-mode behavior.
> **Why this matters:** tests CAP tradeoff reasoning and your ability to design graceful degradation boundaries.

## References

- [Jepsen - Consistency Models](https://jepsen.io/consistency)
- [Azure Cosmos DB Consistency Levels](https://learn.microsoft.com/azure/cosmos-db/consistency-levels)
- [Manage consistency levels in Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/nosql/how-to-manage-consistency)
- [ZooKeeper Internals](https://zookeeper.apache.org/doc/current/zookeeperInternals.html)
- [Meta Engineering - Cache made consistent](https://engineering.fb.com/2022/06/08/core-infra/cache-made-consistent/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Topics**
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Message Queues\|Message Queues]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns\|Scalability Patterns]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Distributed Systems/API Gateway\|API Gateway]]
> - [[Software Engineering/05 Architecture/Distributed Systems/CAP theorem\|CAP theorem]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Distributed Transactions\|Distributed Transactions]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Load Balancing\|Load Balancing]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Webhooks\|Webhooks]]
<!-- whats-next:end -->
