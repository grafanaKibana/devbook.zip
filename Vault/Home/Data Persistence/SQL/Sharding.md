---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "Horizontal partitioning strategies, workload fit, and the operational threshold for splitting rows across database instances."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Sharding is horizontal partitioning across independent database instances: each shard owns a non-overlapping subset of rows. Unlike table partitioning inside one server, sharding distributes storage, writes, backups, and failure domains across machines. Reach for it only when a measured write or storage ceiling remains after vertical scaling, query/index repair, read replicas, caching, and in-engine partitioning. Those alternatives preserve cross-table queries and transaction boundaries with less operational machinery.

The shard key is the long-lived decision. It must distribute load, appear in routed operations, keep transactions that must be atomic together, and remain stable enough that moving ownership is exceptional. [[Home/Data Persistence/SQL/Shard Routing and Rebalancing|Shard Routing and Rebalancing]] owns the map and migration protocol. [[Home/Data Persistence/SQL/Cross-Shard Operations|Cross-Shard Operations]] owns the fan-out, transaction, and global-constraint costs created when work crosses shard keys.

## Strategy Overview

| Strategy | Ownership rule | Strong fit | Rebalancing boundary |
|---|---|---|---|
| Range | Ordered boundaries such as tenant IDs `1..9999` | Range scans, geographic or lifecycle placement | Split or move selected ranges; sequential keys can heat the newest range |
| Modulo hash | `hash(key) % N` | Fixed shard count and equality routing | Changing `N` remaps most keys |
| Consistent-hash ring | First ownership token clockwise from the key hash | Elastic key-value ownership | Move reassigned token ranges; virtual nodes smooth uneven arcs |
| Virtual buckets | `hash(key) % B`, then bucket-to-shard map | Controlled SQL moves with stable logical buckets | Move selected buckets without changing key-to-bucket calculation |
| Directory | Service maps a key or tenant to its shard | Irregular tenants and explicit placement | Update the map while migrating that tenant or range |

The strategy is the ownership algorithm; the application, proxy, coordinator, or database-native layer is the routing location. For example, `tenant_id = 42` can map to logical bucket 2, while a versioned bucket map says bucket 2 currently lives on shard C. The query must still carry `tenant_id = 42` so the destination can enforce the ownership boundary.

![[System Design 101/0d322006a6931952121e8e420eb793b7231859da4805c1a29a2e7eef30b87985.png]]

Consistent hashing limits movement compared with changing a modulo divisor. If `N` equal-capacity nodes own balanced shares and one equal node is added, the new node's expected final share—and therefore the expected movement—is about `1 / (N + 1)` of keys. A ring with sparse or uneven tokens can move much more or less; virtual nodes make the balanced assumption closer to reality. The arithmetic does not provide a safe cutover protocol.

## Vertical and Horizontal Partitioning

Vertical partitioning splits columns, tables, or business functions; horizontal sharding splits rows by key. They solve different contention.

| Dimension | Vertical partitioning | Horizontal sharding |
|---|---|---|
| Ownership unit | Related columns or tables, such as profile versus billing | Rows sharing a shard key, such as one tenant |
| Routing input | Requested feature or data domain | Shard-key value on every routed operation |
| Write scaling | Isolates independent write domains; one hot table can remain | Distributes writes only when keys and load are balanced |
| Transactions | Local inside one functional database; remote across functions | Local inside one shard; coordinated across shard keys |
| Constraints | Cross-database foreign keys may disappear | Global uniqueness and foreign keys require separate design |
| Rebalancing | Move a table/domain and its callers | Move ranges, tokens, or buckets plus their rows |

Vertical scaling adds CPU, memory, or I/O to one server. Replication copies the same ownership domain. Neither is vertical partitioning, and neither distributes writes across independent row owners.

## Figma's Escalation Path

Figma first separated PostgreSQL tables by product area so independent workloads stopped competing in one database. Large tables later exceeded one instance, so the team added horizontal sharding, a database proxy, and hash-derived shard keys. The sequence matters: functional decomposition reduced coupling and bought time; sharding addressed the remaining per-table ceiling.

![[System Design 101/10523f7ffd572d47bbdbd6c827e8621c056df49da3430f74f67520dd7a971d1c.png]]

The picture is an escalation map, not proof that partitioning alone creates 100× headroom. Capacity came from decomposition, routing, migration tooling, and operational controls together.

## Operational Boundary

Sharding is complete only when the system can answer three questions:

1. Which map version owns this key, and what happens when a caller has a stale map?
2. How is a range or bucket copied, caught up, cut over, and cleaned without two writable owners?
3. What is the explicit behavior for queries, transactions, and uniqueness checks that span shards?

[[Home/Data Persistence/SQL/Shard Routing and Rebalancing|Shard Routing and Rebalancing]] answers the first two with versioned maps, ownership fencing, copy/catch-up, cutover, and rollback. [[Home/Data Persistence/SQL/Cross-Shard Operations|Cross-Shard Operations]] answers the third with scatter-gather limits, single-shard transaction design, coordination choices, and idempotent repair.

## Tradeoffs

| Dimension | Sharding | Simpler alternative |
|---|---|---|
| Write and storage scale | Distributed across balanced owners | Vertical scale or partitioning remains one ownership domain |
| Read scale | Per-shard reads scale; global reads fan out | Replicas scale reads without partitioning ownership |
| Transactions and constraints | Cheap within one shard, coordinated or redesigned across shards | One database preserves native cross-row semantics |
| Operations | Map versioning, migrations, per-shard backups, skew monitoring | One topology is easier to deploy and recover |
| Reversal | Data and callers must be recombined | Scaling down a replica or cache is usually simpler |

## Pitfalls

- **Hot shard.** Range boundaries or uneven tenant sizes concentrate CPU and storage. Monitor per-shard load, not only fleet averages.
- **Hot key.** One celebrity or enterprise tenant can exceed one shard even under a balanced hash. Split that entity's workload deliberately or isolate it on a dedicated shard.
- **Missing shard key.** A common query without the routing key becomes a scatter query. Analyze real query shapes before committing to the key.
- **Modulo resharding.** Changing `hash(key) % N` moves most keys. Use a stable bucket indirection or a well-balanced consistent-hash scheme when membership changes are expected.
- **Operational multiplication.** Schema changes, backups, restore tests, and incidents scale with shard count. Build automation before the topology requires it.

## Questions

> [!QUESTION]- When should you shard a database?
> After evidence shows that write throughput or storage exceeds one ownership domain and simpler measures cannot remove the ceiling. Read replicas help reads, caches remove repeated reads, and in-engine partitioning improves manageability without creating cross-database transactions.

> [!QUESTION]- How much data should move when one equal node is added to a balanced consistent-hash cluster?
> With `N` balanced equal-capacity nodes before the addition, the new node's expected final share is about `1 / (N + 1)`, so that is the expected movement. Token imbalance changes the actual fraction; virtual nodes reduce variance.

> [!QUESTION]- What makes a useful shard key?
> It distributes bytes and request load, appears in the dominant operations, co-locates data that must transact together, and remains stable. High cardinality is useful only when the traffic and tenant-size distribution are also balanced.

## References

- [Horizontal, vertical, and functional data partitioning](https://learn.microsoft.com/azure/architecture/best-practices/data-partitioning) — Azure Architecture Center guidance on partitioning strategies and their consistency, query, and operational tradeoffs.
- [Sharding pattern](https://learn.microsoft.com/azure/architecture/patterns/sharding) — Azure Architecture Center pattern covering shard-key selection, routing, scaling, and rebalancing.
- [Sharding Pinterest: How We Scaled Our MySQL Fleet](https://medium.com/pinterest-engineering/sharding-pinterest-how-we-scaled-our-mysql-fleet-3f341e96ca6f) — production case study on range-based sharding, placement, and migration at scale.
- [Scaling Etsy Payments with Vitess, Part 1](https://www.etsy.com/codeascraft/scaling-etsy-payments-with-vitess-part-1--the-data-model) — production account of a payments-system migration to Vitess and its data-model constraints.
- [Designing Data-Intensive Applications, Ch. 6: Partitioning](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/) — treatment of partitioning, secondary indexes, routing, and rebalancing algorithms.
- [Do not shard yet: strategies to try first](https://www.lazertechnologies.com/insights/dont-shard-yet-8-database-performance-strategies-to-try-before-sharding) — practitioner checklist for exhausting simpler scaling measures before adopting shards.
- [A crash course in database sharding (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/a-crash-course-in-database-sharding.md) — visual overview of strategies and the key-to-router-to-shard boundary.
- [Table partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html) — PostgreSQL primary reference for range, list, and hash partitioning inside one database server.
- [How Figma's databases team lived to tell the scale](https://www.figma.com/blog/how-figmas-databases-team-lived-to-tell-the-scale/) — primary production account of Figma's decomposition, sharding, routing, and migration sequence.
- [Vertical partitioning versus horizontal partitioning (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/vertical-partitioning-vs-horizontal-partitioning.md) — editorial comparison; its misleading scaling infographic remains intentionally omitted.
- [Key concepts for database sharding (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/key-concepts-to-understand-database-sharding.md) — terminology overview; its image conflates replication with vertical scaling and remains intentionally omitted.
- [100× PostgreSQL scaling at Figma (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/100x-postgres-scaling-at-figma.md) — compact companion to Figma's primary engineering account.
- [Four data-sharding algorithms (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-4-data-sharding-algorithms-explained.md) — algorithm inventory corrected here for collision handling, balanced-node movement, and bucket indirection; the defective infographic remains intentionally omitted.
