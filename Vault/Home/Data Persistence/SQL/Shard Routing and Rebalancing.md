---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "Routing shard-key operations through a versioned ownership map and moving ranges or buckets without creating two writable owners."
level:
  - "4"
priority: High
status: Creation
publish: true
---

# Intro

Shard routing turns a shard key into the one current owner allowed to serve the operation. Rebalancing changes that ownership while data is live. A hash or range calculation is only the first step: the system also needs a versioned map, stale-router behavior, copy and catch-up, a fenced cutover, and cleanup that can be retried safely.

[[Sharding]] owns strategy selection and the scale threshold. This note owns the routing and migration protocol.

## Routing Contract

Assume 4,096 logical buckets and four physical shards:

```text
bucket = hash(tenant_id) % 4096
map[v17][bucket 730] = shard-c
```

Every routed operation carries the shard key. The router computes bucket 730, reads map version 17, connects to shard C, and sends a query that still contains `tenant_id`. The destination rejects a write if it no longer owns that bucket or if the router's map version is stale. This check prevents an old application instance from silently writing to the previous owner after cutover.

The map must be highly available, but it need not sit on every request's synchronous path. Routers can cache it if stale versions fail closed and refresh. A directory scheme uses the same contract without a hash: `tenant 42 -> shard C` is an explicit map entry.

## Routing Location

| Location | Advantage | Boundary to own |
|---|---|---|
| Application | Full query and consistency context; no extra hop | Every client must refresh maps and implement the same fencing behavior |
| Proxy or coordinator | Centralizes topology and connection management | Product capabilities vary; query routing does not imply rebalancing or distributed transactions |
| Database-native | Engine presents one logical endpoint | Routing, movement, and transaction costs move into the engine's consistency and latency model |

Vitess routes through VSchema and keyspace metadata and exposes resharding workflows. A Citus coordinator routes distributed-table queries, while shard rebalancing is a separate operation. ProxySQL can route with rules but is not by itself a general shard-map or migration system. Name the product and capability instead of treating “middleware” as one feature set.

## Rebalancing Protocol

Moving bucket 730 from shard C to shard E requires an explicit state machine:

1. **Plan.** Publish a migration record with source, destination, ownership version, and rollback boundary.
2. **Copy.** Take a consistent snapshot of the bucket and copy it to E while C remains the write owner.
3. **Catch up.** Stream changes after the snapshot until E reaches the required source position.
4. **Cut over.** Fence writes on C, drain or redirect in-flight work, apply the final delta, then atomically publish a map version that makes E the sole writer.
5. **Observe.** Verify reads, writes, counts, and lag under the new owner while retaining the old copy for a bounded rollback window.
6. **Clean.** Remove the old copy only after no supported router version can address it.

Dual writes without a single authority create two conflict and retry paths. Prefer one write owner plus change capture, or use an engine's documented online-resharding protocol.

## Movement Budget

Modulo hashing with `N` in the divisor remaps most buckets when `N` changes. Stable virtual buckets avoid that: membership changes move selected bucket-map entries while `hash(key) % B` remains fixed.

For a balanced consistent-hash cluster with `N` equal-capacity nodes, adding one equal node gives the new node an expected final share of about `1 / (N + 1)`. That is the expected key movement under the balanced assumption. Sparse tokens, unequal weights, hot keys, and capacity-aware placement change the actual bytes and request load, so plan moves from measured size and traffic rather than the formula alone.

## Failure Boundaries

- A stale router must refresh or fail; it must not guess the owner.
- A retry after an unknown write outcome needs an idempotency key or operation identity.
- Cutover must fence the source before the destination accepts writes.
- Rebalancing must limit bandwidth and concurrency so movement does not exhaust the serving workload.
- Rollback is a new ownership transition, not a DNS switch back to a stale copy.

## References

- [Sharding pattern](https://learn.microsoft.com/azure/architecture/patterns/sharding) — Azure Architecture Center guidance on shard maps, routing, scaling, and movement.
- [Vitess resharding](https://vitess.io/docs/user-guides/configuration-advanced/resharding/) — official workflow for copying, switching traffic, reversing traffic, and completing a live reshard.
- [Citus shard rebalancer](https://docs.citusdata.com/en/stable/admin_guide/cluster_management.html#rebalance-shards-without-downtime) — official coordinator and online shard-movement behavior for Citus clusters.
- [Designing Data-Intensive Applications, Ch. 6: Partitioning](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/) — analysis of request routing, fixed partitions, dynamic partitions, and consistent hashing.
