---
icon: database
order: 30
color: "#f97316"
topic: [Data Persistence]
subtopic: []
summary: "How software stores and protects state across restarts using SQL, NoSQL, and caching."
tags: [FolderNote]
publish: true
priority: High
level: ["4"]
status: Creation
qard-deck: "Data Persistence"
qard-topic: "Data Persistence"
flashcard_uid: "d03cdcde"
---

Data persistence is the part of a system that must survive process and machine restarts. A storage choice fixes more than where bytes live: it sets the available consistency guarantees, the shape of efficient queries, and much of the operating cost. A weak isolation choice can corrupt business state under concurrency. An unnecessary cache creates a stale-read path that the original system never had.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Storage Options at a Glance

Each store makes a different access pattern cheap. Relational storage is the practical default because constraints and transactions keep invariants close to the data, while joins and ad-hoc queries leave room for the service to change. A narrower store earns its place when a measured workload needs its contract.

| Store type | Access pattern that earns it | Guarantee or cost to verify | Examples |
| --- | --- | --- | --- |
| Relational (SQL) | Default for changing business data, joins, constraints, and multi-row transactions | Index and query-plan discipline. A single writer eventually becomes a scaling boundary | PostgreSQL, SQL Server |
| Document | One aggregate is normally read and replaced as a whole and its fields evolve independently | Cross-document constraints and joins move into application code or explicit transactions | MongoDB, Cosmos DB |
| Key-value | Nearly every request knows one key and needs predictable low latency | Secondary access paths require another index or duplicated record. Hot keys can concentrate load | Redis, DynamoDB |
| Wide-column | Writes and range reads follow a stable partition plus clustering key at very large scale | Query-first denormalization, repair, compaction, and partition balance become design work | Cassandra, Bigtable |
| Graph | The result comes from multi-hop traversal through relationships | Bulk aggregates and high-volume property scans are not its strength | Neo4j, Neptune |
| Time-series | Appends and time-window aggregates dominate, with explicit retention/downsampling | Late data, cardinality, and corrections need product-specific handling | Prometheus, InfluxDB |

Many systems keep a relational source of truth and add one specialized read path, such as a cache or search index. Every extra store needs synchronization and recovery work. Its workload and success metric should be named before it enters the design.

# Block, File, and Object Storage by Access Contract

Block, file, and object storage differ in the unit the application controls. The workload depends on that contract, not the provider label.

| Concern | Block storage | File storage | [[Home/Data Persistence/Object Storage\|Object Storage]] |
| --- | --- | --- | --- |
| Access unit | Addressed blocks presented as a volume | Files and directories through a filesystem protocol | Whole objects addressed by bucket/container and key |
| Namespace owner | Attached host or storage-aware application formats and manages it | Filesystem manages hierarchical paths, permissions, and locks | Service manages a flat keyspace. Clients emulate folders with prefixes |
| Sharing | Commonly attached to one writer. Multi-attach needs filesystem coordination | Designed for concurrent clients through NFS/SMB or a managed equivalent | Many clients use HTTP APIs. No shared POSIX edit/lock contract |
| Update shape | Low-latency random reads and overwrites | File and byte-range operations | Put/replace an object. Multipart upload handles large values |
| Consistency boundary | Volume and filesystem determine ordering and crash behavior | Protocol and service define visibility and locking | Provider defines single-key and listing behavior. Multi-object transactions are application work |
| Application responsibility | Filesystem, snapshots, replication, and recovery | Path/permission design, lock behavior, and shared throughput | Keys, metadata, checksums, lifecycle, versioning, and multi-object publication protocol |
| Typical fit | Database pages, VM disks, transactional logs | Shared home directories, content tooling, lift-and-shift applications | Media, backups, artifacts, data lakes, immutable large values |

![[Data Persistence/Data Persistence-Data Persistence-18120000-1.png|theme-aware]]

A database volume normally needs block storage for low-latency random I/O and crash ordering. A render farm needs file semantics because workers open and lock shared project files. Immutable 500 MiB videos served through a CDN fit object storage and its lifecycle controls. Calling all cloud storage "object storage" hides the failure boundary the application relies on.

# Database Performance Diagnosis before Scaling

Diagnosis starts with the slow request and accounts for its time. Suppose `GET /orders/42` regresses from 80 ms to 600 ms at p95:

1. Request time is split into pool wait, query execution, lock wait, network, serialization, and downstream calls. The same interval is correlated with CPU, memory, IOPS, connection count, cache hit rate, rows scanned, and replication lag.
2. The actual SQL and representative parameters are captured. The engine's plan tooling, such as PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`, is used to compare estimated rows, actual rows, scans, joins, spills, and I/O.
3. The fix targets the smallest demonstrated cause: returning fewer columns/rows, removing an N+1 path, adding or correcting an index, shortening a transaction, or changing a schema/query shape. The same trace and load are then re-run.
4. If requests wait for connections while the database is healthy, the fix corrects leaks and sizes [[Home/Data Persistence/Connection Pooling|the pool]] against the whole fleet. A larger pool does not repair saturated storage or lock contention.
5. Read offloading adds the persistence-layer [[Home/Data Persistence/Caching|cache]] or an asynchronously refreshed read model only when repeated reads tolerate a declared freshness window. A materialized view that the database updates as part of each base-table write, such as a SQL Server indexed view, stays current but makes those writes more expensive. Adding [[Home/Data Persistence/SQL/Replication|read replicas]] is justified when reads dominate and replica lag is acceptable.
6. The node is scaled after the query path is sound. The decision to partition or [[Home/Data Persistence/SQL/Sharding|shard]] is justified only when one node's measured capacity, data size, or failure/recovery boundary remains the limiter.

![[Data Persistence/Data Persistence-Data Persistence-18120000-2.png|theme-aware]]

This sequence keeps the diagnosis tied to evidence. Jumping to cache, replicas, or shards may improve one graph while adding stale reads or duplicated writes that hide the original defect.

# Database Scaling Escalation Ladder

Each step down this ladder is justified only when the previous step still misses a concrete load, latency, or recovery target.

| Step | Diagnostic trigger | What it buys | Cost introduced |
| --- | --- | --- | --- |
| Query and access-path repair | High rows scanned, bad estimates, N+1 calls, lock waits, or unnecessary payload | More capacity from the existing system without changing its consistency model | Indexes add write/storage cost. Query/schema changes need regression tests |
| Materialized view or denormalized read model | Stable expensive join/aggregate dominates reads | Precomputed reads with predictable shape | Refresh logic, duplicate data, and a freshness boundary |
| Vertical scaling | CPU, RAM, or storage throughput is saturated after query repair | Same data model and transaction boundary on a larger node | Higher failure concentration, finite ceiling, and larger restart/recovery events |
| [[Home/Data Persistence/Caching\|Caching]] | Repeated reads tolerate staleness and origin load is the bottleneck | Lower read latency and fewer origin requests | Invalidation, stampedes, eviction, and stale answers |
| [[Home/Data Persistence/SQL/Replication\|Read replicas]] | Reads dominate. Primary writes are healthy | More read capacity and additional failover options | Replication lag, read-your-writes routing, promotion, and replica cost |
| [[Home/Data Persistence/SQL/Sharding\|Sharding]] | One writer or data set exceeds the largest acceptable node | Horizontal write/storage distribution | Shard-key constraints, resharding, hot shards, and cross-shard transaction/query work |

Several steps may be necessary, but their guarantees accumulate. A cached read from a lagging replica has two freshness delays. A denormalized view across shards needs an explicit delivery and replay protocol.

# Data Management Pattern Map

| Need | Pattern | Mechanism | Cost to accept |
| --- | --- | --- | --- |
| Lower latency for repeated reads | [[Home/Data Persistence/Caching\|Cache-aside]] | Reads check the cache first. Misses load from the source. Cache entries are invalidated after source writes | Staleness window, miss storms, eviction, and another failure mode |
| Precompute expensive derived reads | Materialized view | A query result or projection is stored and refreshed on a schedule or change | Refresh lag, extra storage, and failed/duplicate update handling |
| Separate read and write models | [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS\|CQRS]] | Commands update a write model. Queries use an independently shaped read model | Synchronization, messaging, and consistency boundaries |
| Keep historical source of truth | [[Home/Software Architecture/Patterns/Architectural Patterns/Event Sourcing\|Event Sourcing]] | Events are appended, and current state is rebuilt by replay or snapshots | Schema evolution, replay cost, idempotency, and irreversible event history |
| Support an alternate lookup | [[Home/Data Persistence/SQL/Indexes\|Index table or secondary index]] | Another key-to-record path is maintained for a known query | Every write must update it. Rebuilds and uniqueness need a protocol |
| Distribute data and write load | [[Home/Data Persistence/SQL/Sharding\|Sharding]] | Each partition key is routed to one shard | Cross-shard work, resharding, skew, and hot keys |

![[Data Persistence/Data Persistence-Data Persistence-18120000.png|theme-aware]]

The categories overlap. CQRS may use materialized views, event sourcing may feed them, and each shard may maintain local indexes. The design still starts with the problem. Event sourcing does not replace a cache, and a secondary index does not partition a write bottleneck.

# Questions

<!-- qard-id: dcef06ab-abdb-45d7-9cad-1d74f4b02856 -->
> [!qard]- What determines whether a service should use relational or non-relational storage?
> Three needs determine the choice: the invariants the data must keep, the scope of the transactions that protect them, and the queries the service must answer. These needs are judged against a concrete engine's consistency, query, recovery and operational limits.
>
> - **Relational storage** is the usual default when correctness depends on constraints, joins, transactions across several records, or query combinations that keep changing. The database enforces those rules close to the data, and a new query can usually be expressed without reshaping storage.
> - **A specialized non-relational store** fits when one access pattern clearly dominates and the engine's consistency, query and recovery limits are acceptable for that workload. Typical patterns are lookup by key, reading and replacing a whole document, relationship traversal and full-text relevance.
> - **A combination** keeps a relational source of truth and adds one specialized read path, such as a search index or cache, when that path solves a measured need. Each added store brings synchronization and recovery work that must have an owner.
> 
> [Microsoft: Understand data store models](https://learn.microsoft.com/en-us/azure/architecture/data-guide/technology-choices/understand-data-store-models)

> [!qard]- How should a slow database-backed request be diagnosed before scaling the database?
> Diagnosis measures where the slow request spends its time and fixes the smallest demonstrated cause. It moves to read offloading or larger infrastructure only when a measured limit remains.
>
> 1. **Time breakdown:** the request's latency is split into pool wait, query execution, lock wait, network, serialization and downstream calls. The same interval is correlated with database CPU, memory, I/O, connection count, rows scanned and replication lag.
> 2. **Actual query and plan:** the real SQL with representative parameters goes through the engine's plan tooling, such as PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)`. Estimated and actual rows, scans, joins, spills and I/O show where the work goes.
> 3. **Smallest demonstrated fix:** typical fixes return fewer rows or columns, remove an N+1 path, add or correct an index, shorten a transaction, or change the query or schema shape. The same trace and load are then rerun to confirm the effect.
> 4. **Pool check:** connection waits while the database is healthy point to leaks, long checkouts or fleet-wide pool sizing. A larger pool does not repair saturated storage or lock contention.
> 5. **Read offloading:** a cache, or a read model refreshed asynchronously from the source, fits only when repeated reads tolerate a declared staleness window. A materialized view that the database updates as part of each base-table write, such as a SQL Server indexed view, stays current but makes those writes more expensive. Read replicas fit when reads dominate and replica lag is acceptable.
> 6. **Capacity changes:** the node is scaled after the query path is sound. Partitioning or sharding is justified only when one node's measured capacity, data size or recovery boundary is still the limit.
> 
> Jumping straight to caches, replicas or shards can improve one graph while adding stale reads or duplicated writes that hide the original defect.
>
> [PostgreSQL: Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) · [SQL Server: Create indexed views](https://learn.microsoft.com/en-us/sql/relational-databases/views/create-indexed-views?view=sql-server-ver17)

# References

- [Designing Data-Intensive Applications](https://dataintensive.net/)
- [Use The Index, Luke](https://use-the-index-luke.com/)
- [Jepsen analyses](https://jepsen.io/analyses)
