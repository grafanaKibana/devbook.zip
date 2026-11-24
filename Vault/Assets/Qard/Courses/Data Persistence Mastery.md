---
topic: [Data Persistence]
subtopic: []
level: ["4"]
priority: High
status: New
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "Data Persistence"
---

The course has one starting point: the **Intro** of Fundamentals. Each group starts with an **Intro** objective for its hub note, and every other objective in the group opens only after it.

Inside a group the route is a tree: each objective has one prerequisite in the group, the topic it builds on most directly.

- **Fundamentals:** the Intro opens ACID (then connection pooling), caching, and object storage (then erasure coding).
- **SQL** opens after ACID. Its Intro opens normalization and denormalization, indexes, database locks, and replication (then sharding).
- **NoSQL** opens after sharding. Its Intro opens the NoSQL database types, which open Redis, LSM trees, Elasticsearch and time-series databases. Redis is built on caching and LSM trees on indexes.
- **ORMs** opens after the SQL Intro and leads to Entity Framework.

Learning objectives follow the linked source material. Their prerequisite links identify the knowledge needed for each target; the suggested route is guidance rather than a requirement to finish every earlier group. Teach, checks, and reviews retain their existing assessment history. Source-note lifecycle status does not establish course mastery. Maintain the explicit source links in this internal course record.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Choose a store type and a block, file or object contract from the invariants, transactions and queries a service needs, and diagnose a slow database-backed request before climbing the scaling ladder | Intro | measured-storage-choice | Fundamentals | new |  |  | [[Home/Data Persistence/Data Persistence]] |  |  v1:71f63b3e3a2ad800dcf3fb654b1624106f9fe23f9593a3f48377711d39ceffcb/2 |  |
| Explain atomicity, consistency, isolation and durability, choose protection for a read-modify-write decision against write skew, and identify where the local guarantee stops at configuration, retries and other services | ACID | transaction-boundary | Fundamentals | new |  | measured-storage-choice | [[Home/Data Persistence/ACID]] |  | v1:6bdcdb5a8bd87cad9e223293766c76099299a3c87d622c6eb0c0bae6379b8d7e/4 | 2026-11-20 |
| Trace physical connection borrowing and return and size fleet-wide pool demand without holding connections across unrelated work | Connection Pooling | pooled-connections | Fundamentals | new |  | transaction-boundary | [[Home/Data Persistence/Connection Pooling]] |  | v1:9794be80e08eb7084b76fa6942d2a46d8378c2dca790946c7f8d60a683212ad2/2 | 2026-11-16 |
| Choose cache ownership, keys and invalidation and predict stale reads, stampedes and origin overload when the cache fails | Caching | cache-correctness | Fundamentals | new |  | measured-storage-choice | [[Home/Data Persistence/Caching]] |  | v1:73ef411e35c6b8b12d422b62d9a0ce991a129b67dae9e20fcca0d6b3e142325e/0 | 2026-11-16 |
| Use bucket and object-key operations with explicit per-key consistency, multipart completion and lifecycle policies rather than filesystem assumptions | Object Storage | object-atomicity | Fundamentals | new |  | measured-storage-choice | [[Home/Data Persistence/Object Storage]] |  | v1:e9ff807375be2f5afec30f16f41a65d8d13301f07c1c0b9c3394e483a5dc57eb/0 | 2026-11-16 |
| Calculate storage overhead and recoverable shard loss and explain placement, degraded-read and repair costs relative to replication | Erasure Coding | erasure-repair | Fundamentals | new |  | object-atomicity | [[Home/Data Persistence/Erasure Coding]] |  | v1:f087e48b2c143d4d7cadad0052c06f6fc69d34bd88841198c93fd7b5cdb43d6a/0 | 2026-11-16 |
| Trace logical SELECT filtering, grouping and joins, choose SQL Server routine and materialization boundaries from result and execution requirements, and compare the read anomalies SQL Server isolation levels allow | Intro | sql-query-contracts | SQL | new |  | transaction-boundary | [[Home/Data Persistence/SQL/SQL]] |  |  v1:3e021efc7c90d6ec432d84a81384511190e20c0bf2721eedfb45691bd8a864c3/8 |  2026-11-16 |
| Identify dependency-driven update anomalies and justify normalization or deliberate denormalization against the actual workload | Normalization Denormalization | schema-dependencies | SQL | new |  | sql-query-contracts | [[Home/Data Persistence/SQL/Normalization Denormalization]] |  | v1:4e0bbf3730fd5a9579d7ab2a77094c3389d8bf580f7f94d518eff8d979d08928/5 | 2026-11-16 |
| Choose an index structure and key order for a measured query while accounting for selectivity, covering, write cost and maintenance | Indexes | query-access-path | SQL | new |  | sql-query-contracts | [[Home/Data Persistence/SQL/Indexes]] |  | v1:63f49da2d6bc12990505422b618ae71b62fe09d0f429f2550b343f602496132f/0 | 2026-11-20 |
| Trace lock compatibility, escalation and deadlocks, and distinguish locks from latches, MVCC row versions and optimistic version checks | Database Locks | lock-concurrency | SQL | new |  | sql-query-contracts | [[Home/Data Persistence/SQL/Database Locks]] |  | v1:c85b04c44356eef8cca63cdf10ca538de422a1cb41ab0cc894ad50a5739ae11f/0 | 2026-11-20 |
| Trace write ordering, acknowledgement and replica visibility and reason about lag, failover and stale-read contracts | Replication | replication-ack | SQL | new |  | sql-query-contracts | [[Home/Data Persistence/SQL/Replication]] |  | v1:005046ba673edca12ea70aa679bcb82266eab5bd7c9f1d9edcfa0533bcdefd75/0 | 2026-11-16 |
| Choose a shard key and routing ownership and explain the rebalancing, cross-shard transaction and global-constraint costs | Sharding | shard-ownership | SQL | new |  | replication-ack, query-access-path | [[Home/Data Persistence/SQL/Sharding]] |  | v1:213fa0314a76f8428ab9f2ec2f99749ca8b3ecb1397d137f5edd10792fe0410e/3 | 2026-11-16 |
| Decide when one dominant access pattern justifies a specialized store beside the relational default and identify the invariants and query flexibility a concrete engine's transaction scope gives up | Intro | specialized-store-fit | NoSQL | new |  | shard-ownership | [[Home/Data Persistence/NoSQL/NoSQL]] |  |  v1:671ede5391ab19bb32f0fa99a35da9c7f34f8bb80d45fdcfade4e78d1db76730/1 |  2026-11-21 |
| Choose document, key-value, wide-column or graph storage from the aggregation and query boundary rather than assumed NoSQL guarantees | NoSQL Database Types | store-model-fit | NoSQL | new |  | specialized-store-fit | [[Home/Data Persistence/NoSQL/NoSQL Database Types]] |  | v1:135f5cbae8f7860b25d28985f946c2044491d17e3247eb637067a46c7f2c0832/0 | 2026-11-20 |
| Choose Redis value types and persistence and failover policies according to whether the data is disposable or authoritative | Redis | redis-data-contract | NoSQL | new |  | store-model-fit, cache-correctness | [[Home/Data Persistence/NoSQL/Redis]] |  | v1:9d1fc971cdc354b23ff0e5e02d02ff3b76f761523ea62806624368e90e0a995d/0 | 2026-11-16 |
| Trace log append, memtable flush, SSTable reads and compaction and compare their read, write and space amplification with B-tree updates | LSM-Tree | lsm-amplification | NoSQL | new |  | store-model-fit, query-access-path | [[Home/Data Persistence/NoSQL/LSM-Tree]] |  | v1:3eb32aa0114852baa74f49a2b9685d7a5e78387289a6800f2940301570a450d2/0 | 2026-11-16 |
| Trace analysis, immutable segments and refresh and design Elasticsearch as a rebuildable read store with explicit mapping and shard limits | Elasticsearch | search-index-lifecycle | NoSQL | new |  | store-model-fit | [[Home/Data Persistence/NoSQL/Elasticsearch]] |  | v1:b2a16bffa4c48d039e2badb547bd27447b8c169c2ff57a9131c639fab1d8f509/2 | 2026-11-16 |
| Choose series labels, partitioning, retention and rollups from ingest and window-query costs while bounding cardinality | Time-Series Databases | timeseries-cardinality | NoSQL | new |  | store-model-fit | [[Home/Data Persistence/NoSQL/Time-Series Databases]] |  | v1:32c2a1275238ebf0782d20b663d6592ad4fcf76c2fdfd65c723d0d8fb85dd4a3/0 | 2026-11-16 |
| Explain what an ORM translates and what stays the database's rules, choose raw SQL only for a missing capability or a measured plan problem, and predict row multiplication from eager-loading sibling collections | Intro | orm-sql-boundary | ORMs | new |  | sql-query-contracts | [[Home/Data Persistence/ORMs/ORMs]] |  |  v1:5d6f43ddf2b0a842731ece1633e236fe626484e358a2779f776315329cd28c15/2 |  |
| Control DbContext lifetime, tracking and generated query shape and review migration and concurrency behavior for the actual provider | Entity Framework | efcore-query-shape | ORMs | new |  | orm-sql-boundary | [[Home/Data Persistence/ORMs/Entity Framework]] |  | v1:80328c917b93651e059940ca88457097c36270ab1a67c20e6f8334c145af3f88/7 | 2026-11-20 |
