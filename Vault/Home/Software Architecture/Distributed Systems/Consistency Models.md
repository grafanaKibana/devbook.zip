---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Definitions of what value a read may return relative to writes, from linearizable down to eventual, and their coordination costs."
level:
  - "2"
priority: High
status: Done
publish: true
---
Consistency models define what value a read is allowed to return relative to writes in a distributed system.
They matter because every replication, partition-tolerance, and caching decision is also a consistency decision.
You think about consistency when selecting storage, designing leader/replica topology, and deciding whether stale reads are acceptable.
In interviews, the important skill is mapping each business invariant to the weakest model that still preserves correctness.

# Models

## Strong or Linearizable

- **Guarantee:** reads behave as if operations happen in one real-time order.
- **Read rule:** if write `W2` completes before read `R1` starts, `R1` cannot return pre-`W2` data.
- **Mechanism:** leader-plus-consensus or equivalent linearizable-read protocol (lease/commit-index aware reads).
- **Example:** single-leader PostgreSQL for order state.
- **Cost:** highest coordination overhead and latency; availability drops during partitions.

## Sequential

- **Guarantee:** all operations appear in one total order that preserves each client's program order.
- **Difference from linearizable:** order must be globally consistent, but not tied to wall-clock completion time.
- **Mechanism:** global serialization logic without strict real-time constraints.
- **Example:** shared preference changes where clients must agree on one operation order.
- **Example:** ZooKeeper exposes linearizable writes and sequentially consistent reads, so designs often separate write-path correctness from read freshness.
- **Cost:** still coordination-heavy, but weaker real-time freshness than linearizable.

## Causal

- **Guarantee:** causally related operations must be seen in order.
- **Concurrency rule:** unrelated concurrent operations can appear in different orders.
- **Mechanism:** dependency tracking (for example version vectors or causal metadata).
- **Example:** chat replies should not appear before the original message.
- **Example:** collaborative edits preserve dependency chains while merging concurrent edits.
- **Cost:** lower latency than strict global ordering, but extra dependency metadata.

## Eventual

- **Guarantee:** if no new writes occur, replicas converge.
- **Mechanism:** asynchronous replication plus conflict resolution policy.
- **Example:** DNS propagation.
- **Example:** Dynamo-style stores and lagging Redis replicas.
- **Cost:** cheapest coordination model, but stale reads are expected.
- **Design impact:** application code must tolerate temporary divergence.

## Read-your-writes or Session

- **Guarantee:** a client sees its own successful writes in its session.
- **Mechanism:** session token, sticky routing, or dependency-aware replica selection.
- **Example:** user edits profile and immediately refreshes profile page.
- **Use case:** common middle ground for user-facing flows.
- **Cost:** lower than global strong consistency, but requires session propagation discipline.

Session consistency can contain four distinct client-scoped guarantees:

- **Read your writes:** after a client writes `profile.name = "Ada"`, its later reads do not return the old name.
- **Monotonic reads:** once a client observes version 12, it never later observes version 11.
- **Monotonic writes:** a client's writes are applied in the order the client issued them.
- **Writes follow reads:** a write based on a value the client read is ordered after that observed version.

A product may provide only a subset, so name the required guarantee instead of relying on the phrase "session consistency." Stores commonly return a version or session token after a write. The client sends it with the next request, and a replica may answer only after reaching that causal position; otherwise the request waits, routes to a fresher replica, or fails within its deadline.

For example, a shipping-address update returns token `region-a:1842`. The checkout read carries that token and cannot use a replica still at `region-a:1839`, although other users may still see older data. The token must survive load balancing; keeping it only in one web server's memory breaks the guarantee when the next request reaches another instance.

# Eventual consistency mechanisms and user-visible guarantees

"Eventual" states only that replicas converge after writes stop. The mechanism determines what users can observe and how conflicts are repaired.

| Mechanism | What converges | Required failure logic | Useful user guarantee |
|---|---|---|---|
| Asynchronous replica | Copies of one record or log | Detect lag, choose conflict/version policy, repair missing data | Bounded staleness if lag is measured and enforced |
| Asynchronous projection | Read model derived from an authoritative log/store | Idempotent replay, checkpoints, poison-event handling | Show projection version/freshness; route critical post-write reads to source |
| Saga workflow | Several local transactions | Persist workflow state, retry safely, compensate completed steps | Expose `Pending`, `Completed`, or `Compensating` instead of claiming instant completion |
| CQRS | Separately shaped write and read models | Publish committed changes reliably and rebuild projections | Read model can lag while write acknowledgement remains authoritative |
| Conflict-aware multi-writer replication | Concurrent versions of the same logical data | Causality/version metadata plus deterministic or application merge | Never silently discard a conflicting user edit |

Example: an order API commits `OrderPlaced` in the authoritative store and returns `202 Pending`. A projection updates order history asynchronously, while a saga reserves inventory and captures payment. The UI uses read-your-writes against the authoritative order version until the projection catches up. A failed reservation becomes an explicit compensation state; CQRS did not perform the compensation, and messaging alone did not define the consistency guarantee.

# Tradeoffs

| Model | Guarantee | Example Use Case | Cost |
| --- | --- | --- | --- |
| Strong / Linearizable | Latest write in real-time order | Payments, inventory decrement, distributed lock state | Highest latency, lower availability under partition |
| Sequential | One global order preserving per-client order | Shared config updates | High coordination, weaker real-time guarantee |
| Causal | Preserve cause/effect order | Chat threads, collaborative docs | Medium complexity, dependency metadata |
| Session | Client sees own writes | Profile/settings updates | Low-medium cost, session token plumbing |
| Eventual | Converges after writes stop | Catalog/cache/reference data | Lowest coordination, stale reads expected |

# Tunable product consistency

Some databases expose several positions in this taxonomy. Azure Cosmos DB offers five consistency levels, each with a different observable promise:

| Level | Observable promise | Example |
| --- | --- | --- |
| Strong | Reads return the latest committed version | A globally ordered control record where stale reads are unacceptable |
| Bounded Staleness | Reads lag by at most configured versions or time | Inventory dashboards with an explicit maximum lag |
| Session | One client gets read-your-writes and related session guarantees | Shopping profile and cart interactions |
| Consistent Prefix | Reads never observe writes out of order, but may lag | A public activity feed where order matters more than freshness |
| Eventual | Replicas converge without ordering or freshness bounds | Derived recommendations or counters tolerant of temporary anomalies |

Choose from the operation's invariant and user experience, not from a product-wide "strong versus eventual" label. The account default constrains the available behavior, while an individual read can be overridden downward when that default permits it. Never silently weaken a read that enforces a business invariant.

The .NET SDK captures session tokens from responses and sends them on later requests made through the same client. Reuse a singleton `CosmosClient`; creating one per request discards connection pools and makes session behavior harder to preserve. When a session crosses services, explicitly propagate the relevant token only when the API contract owns that guarantee.

# Pitfalls

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
- Use [[Home/Software Architecture/Distributed Systems/Idempotency]] keys on writes so retries are safe when consistency is weaker.
- Test failure modes with delayed replication and partial-region outages.
- Keep consistency decisions visible in architecture docs and API contracts.


# Optimistic write protection

The [[Home/Networks/Protocols/HTTP#Fields, Content, and Conditional Requests|HTTP conditional-request contract]] prevents lost updates by requiring `If-Match`, returning `428` when absent, and enforcing the validator with one atomic compare-and-swap write. An application-side check followed by an unconditional save is still racy.


# Questions

> [!QUESTION]- How do you guarantee read-your-writes when writes go to a strong store but reads come from an eventually consistent cache?
> The problem is the gap between a committed write and a cache that hasn't caught up. The cleanest fix is to route that user's immediate post-write reads past the cache to a strong or session-consistent path, just while freshness matters. Pair it with write-through or explicit invalidation on update so the cache converges quickly, and carry a version or timestamp so you can reject a stale follow-up write. Keep the writes idempotent so a retry is harmless. You don't need global strong consistency — only read-your-writes for the one user who just acted.

> [!QUESTION]- Which chat features should use linearizable, causal, and eventual consistency?
> Map each feature to the weakest model that still feels correct. Message ordering and reply chains need at least causal consistency — a reply must never show up before the message it answers. Typing indicators can be eventual; a dropped or reordered one costs nothing, and the latency win is worth it. Read receipts in a compliance-sensitive context might justify something stronger. The skill on display is refusing a one-size-fits-all level: spend strong-consistency latency only where a user would actually notice the inconsistency.

> [!QUESTION]- Why can linearizability reduce availability during a network partition, and how do you contain the blast radius?
> Linearizable operations need a quorum to agree on one order, and a partition can cut a node off from that quorum. To stop two sides committing conflicting truths, the isolated side must reject or delay those operations — that refusal is the availability you lose (the CP corner of CAP). Contain the blast radius by scoping strong consistency to the writes that truly need it — payments, inventory decrements — and serving everything else from weaker models with explicit degraded-mode behavior. Partition tolerance isn't optional; the real choice is which operations fail closed and which keep serving.

# References

- [Jepsen - Consistency Models](https://jepsen.io/consistency) — the definitive practitioner reference for consistency model taxonomy, with formal definitions and real-world database analysis.
- [ZooKeeper Internals](https://zookeeper.apache.org/doc/current/zookeeperInternals.html) — explains ZooKeeper's linearizable writes + sequentially consistent reads model.
- [Meta Engineering - Cache made consistent](https://engineering.fb.com/2022/06/08/core-infra/cache-made-consistent/) — Meta's production experience with cache consistency at scale; real-world example of read-your-writes and invalidation challenges.
- [Eventual consistency patterns](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-eventual-consistency-patterns-you-must-know.md) — ByteByteGo provenance for the mechanism inventory; its visual was rejected because eventing, jobs, sagas, and CQRS are not interchangeable consistency models.
- [Consistency levels in Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/consistency-levels) — official semantics, availability, latency, and region constraints for all five levels.
- [Azure Cosmos DB .NET SDK best practices](https://learn.microsoft.com/azure/cosmos-db/nosql/best-practice-dotnet) — official client lifetime, connectivity, and SDK usage guidance.
- [Session tokens in Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/nosql/how-to-manage-consistency) — official guidance for reading, capturing, and propagating session tokens.
- [Session Guarantees for Weakly Consistent Replicated Data](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/session-guarantees.pdf) — Terry et al.'s original definitions and client-centric model.
- [Azure Cosmos DB session consistency](https://learn.microsoft.com/azure/cosmos-db/consistency-levels#session-consistency) — official token-based session behavior in a production database.
- [Designing Data-Intensive Applications](https://dataintensive.net/) — practical causal and replica-consistency reasoning across distributed stores.
