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
During a partition, preserving stronger consistency typically means reduced availability for affected requests, which is the operational lens of [[CAP theorem]].

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
- Use [[Idempotency]] keys on writes so retries are safe when consistency is weaker.
- Test failure modes with delayed replication and partial-region outages.
- Keep consistency decisions visible in architecture docs and API contracts.


## Example: Optimistic Concurrency for Read-Your-Writes

ETag-based optimistic concurrency enforces that a write only succeeds if the client's version matches the server's current version — a practical implementation of session consistency for HTTP APIs:

```csharp
// GET /orders/42 returns ETag: "v3"
// Client stores the ETag and sends it on the next write

// PUT /orders/42 with If-Match: "v3"
// If another writer committed between the GET and PUT, the server returns 412 Precondition Failed
app.MapPut("/orders/{id}", async (int id, OrderUpdate update,
    HttpContext ctx, OrderRepository repo) =>
{
    var etag = ctx.Request.Headers.IfMatch.FirstOrDefault();
    var order = await repo.GetAsync(id);
    if (order is null) return Results.NotFound();

    // Reject if the client's version is stale (another writer committed first)
    if (etag is not null && etag != order.ETag)
        return Results.StatusCode(412);  // Precondition Failed

    order.Apply(update);
    order.ETag = Guid.NewGuid().ToString("N");
    await repo.SaveAsync(order);
    return Results.Ok(order);
});
```

This pattern implements read-your-writes at the API layer: the client reads the current ETag, includes it on the write, and the server rejects stale writes. The client retries with a fresh GET if it receives 412.


## Questions

> [!QUESTION]- How do you guarantee read-your-writes when writes go to a strong store but reads come from an eventually consistent cache?
> The problem is the gap between a committed write and a cache that hasn't caught up. The cleanest fix is to route that user's immediate post-write reads past the cache to a strong or session-consistent path, just while freshness matters. Pair it with write-through or explicit invalidation on update so the cache converges quickly, and carry a version or timestamp so you can reject a stale follow-up write. Keep the writes idempotent so a retry is harmless. You don't need global strong consistency — only read-your-writes for the one user who just acted.

> [!QUESTION]- Which chat features should use linearizable, causal, and eventual consistency?
> Map each feature to the weakest model that still feels correct. Message ordering and reply chains need at least causal consistency — a reply must never show up before the message it answers. Typing indicators can be eventual; a dropped or reordered one costs nothing, and the latency win is worth it. Read receipts in a compliance-sensitive context might justify something stronger. The skill on display is refusing a one-size-fits-all level: spend strong-consistency latency only where a user would actually notice the inconsistency.

> [!QUESTION]- Why can linearizability reduce availability during a network partition, and how do you contain the blast radius?
> Linearizable operations need a quorum to agree on one order, and a partition can cut a node off from that quorum. To stop two sides committing conflicting truths, the isolated side must reject or delay those operations — that refusal is the availability you lose (the CP corner of CAP). Contain the blast radius by scoping strong consistency to the writes that truly need it — payments, inventory decrements — and serving everything else from weaker models with explicit degraded-mode behavior. Partition tolerance isn't optional; the real choice is which operations fail closed and which keep serving.

## References

- [Jepsen - Consistency Models](https://jepsen.io/consistency) — the definitive practitioner reference for consistency model taxonomy, with formal definitions and real-world database analysis.
- [Azure Cosmos DB Consistency Levels](https://learn.microsoft.com/azure/cosmos-db/consistency-levels) — Microsoft's tunable consistency spectrum (Strong, Bounded Staleness, Session, Consistent Prefix, Eventual) with latency and availability tradeoffs.
- [Manage consistency levels in Azure Cosmos DB](https://learn.microsoft.com/azure/cosmos-db/nosql/how-to-manage-consistency) — how to configure and override consistency per request in Cosmos DB.
- [ZooKeeper Internals](https://zookeeper.apache.org/doc/current/zookeeperInternals.html) — explains ZooKeeper's linearizable writes + sequentially consistent reads model.
- [Meta Engineering - Cache made consistent](https://engineering.fb.com/2022/06/08/core-infra/cache-made-consistent/) — Meta's production experience with cache consistency at scale; real-world example of read-your-writes and invalidation challenges.
