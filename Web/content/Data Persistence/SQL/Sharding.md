---
publish: true
created: 2026-10-28T12:27:02.906Z
modified: 2026-10-28T12:33:02.648Z
published: 2026-10-28T12:33:02.648Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: Horizontal partitioning strategies, workload fit, and the operational threshold for splitting rows across database instances.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Data Persistence
qard-topic: SQL/Sharding
flashcard_uid: 7f93ffe2
---

Sharding is horizontal partitioning across distinct storage and ownership domains, commonly separate database instances or clusters. Each shard owns a non-overlapping subset of rows. Unlike table partitioning inside one server, sharding can distribute storage, writes, backups, and failure domains across machines.

Scale-driven sharding belongs after query and index repair, vertical scaling, read replicas, caching, and in-engine partitioning have failed to remove a measured write or storage ceiling. Sharding can also serve a hard isolation, locality, or data-placement requirement, but those cases still inherit the same routing and cross-shard costs. The simpler alternatives preserve cross-table queries and transaction boundaries with less operational machinery.

The shard key is the long-lived decision. It must distribute load, appear in routed operations, keep atomic data together, and remain stable enough that ownership moves are exceptional. A complete design also needs a versioned ownership map, a fenced migration protocol, and explicit behavior for fan-out queries, distributed workflows, and global constraints.

# Strategy Overview

| Strategy | Ownership rule | Strong fit | Rebalancing boundary |
|---|---|---|---|
| Range | Ordered boundaries such as tenant IDs `1..9999` | Range scans, geographic or lifecycle placement | Split or move selected ranges. Sequential keys can heat the newest range |
| Modulo hash | `hash(key) % N` | Fixed shard count and equality routing | Changing `N` remaps most keys |
| Consistent-hash ring | First ownership token clockwise from the key hash | Elastic key-value ownership | Move reassigned token ranges. Virtual nodes smooth uneven arcs |
| Virtual buckets | `hash(key) % B`, then bucket-to-shard map | Controlled SQL moves with stable logical buckets | Move selected buckets without changing key-to-bucket calculation |
| Directory | Service maps a key or tenant to its shard | Irregular tenants and explicit placement | Update the map while migrating that tenant or range |
| Geographic | Region or jurisdiction determines placement | Data residency and lower regional latency | Uneven regional load. Global queries still fan out |

The strategy defines ownership. An application, proxy, coordinator, or database-native layer performs routing. For example, `tenant_id = 42` can map to logical bucket 2 while a versioned map places that bucket on shard C. The query still carries `tenant_id = 42`, allowing the destination to enforce its ownership boundary.

![[Assets/Data Persistence/Data Persistence-Sharding-18120000.png|theme-aware]]

Consistent hashing limits movement compared with changing a modulo divisor. If `N` equal-capacity nodes own balanced shares and one equal node is added, the new node's expected final share—and therefore the expected movement—is about `1 / (N + 1)` of keys. Sparse or uneven tokens can move much more or less. Virtual nodes reduce that variance. The arithmetic says nothing about safe cutover.

# Vertical and Horizontal Partitioning

Vertical partitioning splits columns, tables, or business functions. Horizontal sharding splits rows by key. They solve different contention.

| Dimension | Vertical partitioning | Horizontal sharding |
|---|---|---|
| Ownership unit | Related columns or tables, such as profile versus billing | Rows sharing a shard key, such as one tenant |
| Routing input | Requested feature or data domain | Shard-key value on every routed operation |
| Write scaling | Isolates independent write domains. One hot table can remain | Distributes writes only when keys and load are balanced |
| Transactions | Local inside one functional database. Remote across functions | Local inside one shard. Coordinated across shard keys |
| Constraints | Cross-database foreign keys may disappear | Global uniqueness and foreign keys require separate design |
| Rebalancing | Move a table/domain and its callers | Move ranges, tokens, or buckets plus their rows |

Vertical scaling adds CPU, memory, or I/O to one server. Replication copies the same ownership domain. Neither is vertical partitioning, and neither distributes writes across independent row owners.

# Figma's Escalation Path

Figma first separated PostgreSQL tables by product area, reducing contention between independent workloads. Large tables later exceeded one instance, so the team added horizontal sharding, a database proxy, and hash-derived shard keys. Functional decomposition reduced coupling and bought time. Sharding addressed the remaining per-table ceiling.

![[Assets/Data Persistence/Data Persistence-Sharding-18120000-1.png|theme-aware]]

The picture is an escalation map, not proof that partitioning alone creates 100× headroom. Capacity came from decomposition, routing, migration tooling, and operational controls together.

# Routing and Ownership Maps

Shard routing turns a key into the one current owner allowed to serve the operation. This example uses 4,096 logical buckets:

```text
bucket = hash(tenant_id) % 4096
map[v17][bucket 730] = shard-c
```

Every routed operation carries the shard key. The router computes bucket 730, reads map version 17, connects to shard C, and still includes `tenant_id` in the query. A fenced design rejects a write when the destination no longer owns that bucket or the caller's map version is stale. An old application instance therefore cannot keep writing to the previous owner after cutover.

The map may be cached outside the synchronous request path only if stale versions fail closed and refresh. A directory uses the same contract without hashing: `tenant 42 → shard C` is an explicit ownership entry.

| Routing location | Advantage | Boundary to own |
| --- | --- | --- |
| Application | Full query and consistency context, no extra hop | Every client must refresh maps and implement identical fencing |
| Proxy or coordinator | Central topology and connection management | Query routing does not imply migration or distributed transactions |
| Database-native | One logical endpoint | Routing, movement, and transaction costs move into the engine contract |

# Rebalancing Protocol

Moving bucket 730 from shard C to shard E is an ownership state machine:

1. Publish a migration record with source, destination, map version, and rollback boundary.
2. Copy a consistent snapshot while C remains the writer.
3. Stream later changes until E reaches the required source position.
4. Fence writes on C, drain in-flight work, apply the final delta, then atomically publish a map version that makes E the sole writer.
5. Reads, writes, counts, and lag are verified while the old copy remains available for a bounded rollback window.
6. Remove the old copy only after no supported router version can address it.

Uncoordinated dual writes create two authorities and two retry paths. A single writer plus change capture, or an engine's documented online-resharding protocol, keeps the cutover boundary explicit. Copy bandwidth and concurrency remain bounded so movement cannot exhaust the serving workload. Rollback is another fenced ownership transition, not a DNS switch back to a stale copy.

Modulo hashing with `N` in the divisor remaps most buckets when `N` changes. Stable virtual buckets keep `hash(key) % B` fixed and move selected bucket-map entries instead. Balanced consistent hashing still needs the same copy, catch-up, fencing, and verification protocol. Limited movement is not safe movement by itself.

# Cross-Shard Operations

Cross-shard work starts when one operation cannot be routed to one owner. A coordinator must fan out reads, coordinate commits, or enforce a global constraint outside any shard.

For a request for the newest 100 orders across 32 shards, each shard can return its local top 100 and a coordinator can merge the 3,200 candidates. The operation needs a deadline, per-shard concurrency limit, deterministic tie-breaker, and an explicit partial-result policy. Pagination needs per-shard progress. A single global offset becomes increasingly expensive. A global secondary index can narrow candidates, but it is another distributed data product with lag and repair obligations.

## Transactions and Workflows

- **Distributed commit** gives one atomic decision only when every participant and coordinator support durable prepare and recovery. It adds coordination latency and can leave prepared work waiting during failures.
- **Saga or workflow** commits local steps and compensates when a later step fails. Intermediate states remain visible. Compensation is business-specific and may not fully reverse an external effect. Retries need stable operation identities.
- **Ownership redesign** co-locates the invariant or reserves inventory/funds through one authority. This is usually the simplest hot-path design.

A cross-shard value transfer cannot be two unrelated updates. It needs either a documented distributed transaction or a durable transfer workflow with one operation ID, balanced ledger entries, retry-safe steps, and reconciliation.

## Global Constraints

A local unique index proves uniqueness only inside one shard. Global uniqueness needs a reservation authority, disjoint ranges, or globally unique identifiers when semantic uniqueness is unnecessary. Foreign keys across independent shard databases likewise need co-location, an owning service, or asynchronous repair.

Shard requests are retry-safe only when the operation is idempotent or deduplicated. Durable operation state records which participants committed, bounds fan-out concurrency, labels partial results, and supports reconciliation after process failure.

# Tradeoffs

| Dimension | Sharding | Simpler alternative |
|---|---|---|
| Write and storage scale | Distributed across balanced owners | Vertical scale or partitioning remains one ownership domain |
| Read scale | Per-shard reads scale. Global reads fan out | Replicas scale reads without partitioning ownership |
| Transactions and constraints | Cheap within one shard, coordinated or redesigned across shards | One database preserves native cross-row semantics |
| Operations | Map versioning, migrations, per-shard backups, skew monitoring | One topology is easier to deploy and recover |
| Reversal | Data and callers must be recombined | Scaling down a replica or cache is usually simpler |

# Pitfalls

- **Hot shard.** Range boundaries or uneven tenant sizes concentrate CPU and storage. Per-shard load exposes this skew. Fleet averages hide it.
- **Hot key.** One celebrity or enterprise tenant can exceed one shard even under a balanced hash. That entity needs a deliberate sub-shard or dedicated placement strategy.
- **Missing shard key.** A common query without the routing key becomes a scatter query. Real query shapes must support the chosen key.
- **Modulo resharding.** Changing `hash(key) % N` moves most keys. Stable bucket indirection or balanced consistent hashing avoids tying ownership directly to the current node count.
- **Operational multiplication.** Schema changes, backups, restore tests, and incidents scale with shard count. Automation is part of the design, not cleanup after the topology expands.

# Questions

<!-- qard-id: c63ffce5-ccfa-41d5-a62c-fb60c7bbb4db -->

> [!qard]- What evidence justifies sharding a database?
> Sharding is justified by measured evidence that one database primary cannot handle the workload's write throughput or storage, after cheaper options have failed to remove that limit. A hard requirement, such as isolating tenants or keeping data in particular locations, can justify it earlier.
>
> For scale-driven sharding, the relevant ceiling is write throughput or storage, because each cheaper option addresses a different limit:
>
> - **Query and index repair:** removes wasted work, which may be the actual bottleneck.
> - **Vertical scaling:** adds CPU, memory or I/O to the same server.
> - **Read replicas:** add read capacity, but in a single-primary setup every write still goes to one server.
> - **Caching:** serves repeated reads without reaching the database.
> - **Partitioning inside one database:** splits a table into partitions that stay within one database and one transaction domain, so it does not spread work across independent servers.
>
> The bar is high because sharding adds lasting costs:
>
> - Queries that need data from several shards must fan out and merge results.
> - Transactions and constraints that span shards need extra coordination.
> - Data must be moved when shards are rebalanced.
>
> [Microsoft: Sharding pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding)

<!-- qard-id: 3c8d484d-3a0c-4e2e-9e4f-29a7d608fe68 -->

> [!qard]- What makes a shard key viable for a workload?
> A shard key is viable when four conditions hold:
>
> - The workload's common operations include it.
> - It spreads both data and traffic evenly.
> - Data that must change atomically shares the same key value.
> - Its values rarely change.
>
> | Property | Why it matters | Failure when it is missing |
> |---|---|---|
> | Present in common operations | The router can send each operation to the one shard that owns the key. | Common queries without the key must fan out to every shard and merge the results. |
> | Even spread of data and load | Each shard gets a similar share of storage and requests. | Hot shards: skewed values, sequential ranges or one very large tenant overload a single shard even when total cluster capacity is sufficient. |
> | Keeps atomic changes together | Rows that must change in one transaction live on one shard, so a local transaction is enough. | Those changes need cross-shard coordination or a multi-step workflow. |
> | Stable values | Rows avoid moves caused by a change to their own key value. Ownership can still move when the key-to-shard mapping or shard topology changes, such as during rebalancing. | A changed key value can map to a different shard. When it does, the row must migrate across shards instead of being updated in place. |
>
> For example, `tenant_id` can fit a multi-tenant service well: most requests carry it, a tenant's data usually changes together, and it does not change. It still fails if one tenant outgrows a single shard.
>
> [Microsoft: Sharding pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding)

> [!qard]- How do lookup, range and hash sharding strategies differ?
> All three strategies map a shard key to the shard that owns the data. They differ in what decides that mapping, which in turn decides load balance, range-query efficiency and how hard rebalancing is.
>
> | Aspect | Lookup (directory) | Range | Hash |
> |---|---|---|---|
> | How a key is mapped | A stored map records which shard owns each key, tenant or virtual shard. | Contiguous key ranges belong to shards, such as customer IDs `1–9999` on one shard. | A hash of the key determines the shard, so no map has to be stored. |
> | Load balance | Placement is explicit, so large tenants can be placed deliberately. | Can be uneven. Sequential keys, such as timestamps or increasing IDs, send new writes to the newest range and create a hotspot. | Usually spreads data and load evenly, although one very hot key still lands on a single shard. |
> | Range queries | No inherent locality; it depends on how the map groups keys. | Efficient, because neighboring keys sit on the same shard. | Neighboring keys scatter, so a range query fans out to many shards. |
> | Rebalancing | Data is moved and its map entries are updated. With keys mapped to virtual shards, a virtual shard can move between physical servers without changing application code. | Moving or splitting a range moves its data. Rebalancing may not fix load that concentrates on adjacent keys. | Difficult. With a simple `hash(key) % N`, changing the number of shards changes the owner of most keys. |
> | Routing overhead | A map lookup on every routed request. | A comparison of the key against stored range boundaries. | Computing the hash. |
>
> [Microsoft: Sharding pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding)

# References

- [Sharding pattern](https://learn.microsoft.com/azure/architecture/patterns/sharding)
- [Vitess resharding](https://vitess.io/docs/user-guides/configuration-advanced/resharding/)
- [PostgreSQL table partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [How Figma's databases team lived to tell the scale](https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/)
