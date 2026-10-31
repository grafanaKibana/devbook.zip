---
topic: [Data Persistence]
subtopic: []
level: ["4"]
priority: High
status: Creation
publish: false
tags: [qard-internal, MetricsIgnore]
qard-mastery: "Data Persistence"
---

Choose data and transaction boundaries before optimizing query and access paths. Then add replication, sharding or specialized stores only for the workload contract they improve.

This is course 5 of the suggested vault route. Learn courses order capabilities; the existing first-pass plans track card exposure, and Today retains the material actually studied. Course switching is manual.

All mapped topics are included in the learning flow, including source notes marked Creation or Not-Started. Previously planned objectives are new and follow the same prerequisite route as other unassessed objectives. Source-note lifecycle statuses remain unchanged; assessment evidence still comes from actual study.

Start lessons and checks from this course's objectives. The record lives outside Home, so folder-based automatic association and Update objectives do not map the source tree. Maintain its explicit objective/source links directly. Prerequisites guide the frontier; Qard still permits manually teaching another objective.

Setup assigns no due dates or evidence. Teaching and assessment write subsequent evidence; source-note lifecycle statuses remain owner-managed. Draft source status does not place an objective on hold.

# Learning Objectives

| Objective | Label | ID | Group | State | Due | Needs | Notes | Evidence | Source revision | Source updated |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Explain atomicity, consistency, isolation and durability and identify where the database guarantee stops during retries or cross-service work | Transaction guarantees | transaction-boundary | 01 Correctness and data shape | new |  |  | [[Home/Data Persistence/ACID]] |  | v1:12955a5b17982f58efc5c5fc0564ebfa53e2d8da757f35a83089bfd597b422e6/3 | |
| Identify dependency-driven update anomalies and justify normalization or deliberate denormalization against the actual workload | Schema dependencies | schema-dependencies | 01 Correctness and data shape | new |  | transaction-boundary | [[Home/Data Persistence/SQL/Normalization Denormalization]] |  | v1:de570d6442fae0fbb4b7a7d36380c3a45a35d51dcad21d9c5d850017e513a9d8/4 | |
| Trace lock compatibility and deadlocks and distinguish logical locks, latches, MVCC snapshots and optimistic conflict detection | Locks and concurrent schedules | lock-concurrency | 01 Correctness and data shape | new |  | transaction-boundary | [[Home/Data Persistence/SQL/Database Locks]] |  | v1:4878265b1ae67a0c62ea63e30ebeab32424cfcd0787cde884623d06819aee283/0 | |
| Choose an index structure and key order for a measured query while accounting for selectivity, covering, write cost and maintenance | Query access paths | query-access-path | 02 Application access and performance | new |  | schema-dependencies | [[Home/Data Persistence/SQL/Indexes]] |  | v1:c8c81e0a70e74dd3cc467ef1ccf3a5273488fdb6ebb509e1bed71395443bd026/0 | |
| Trace physical connection borrowing and return and size fleet-wide pool demand without holding connections across unrelated work | Pooled connection ownership | pooled-connections | 02 Application access and performance | new |  | transaction-boundary | [[Home/Data Persistence/Connection Pooling]] |  | v1:a1897da9fe9826a735c417ee5455e565ba58bdd8a23be4dad5062e03439c04d2/2 | |
| Control DbContext lifetime, tracking and generated query shape and review migration and concurrency behavior for the actual provider | EF Core query shape | efcore-query-shape | 02 Application access and performance | new |  | query-access-path, pooled-connections | [[Home/Data Persistence/ORMs/Entity Framework]] |  | v1:ddacacea7db5a1d56effb6dcad56b7f43964fd2aba102ce6ac3eea44eb6e8c9b/4 | |
| Choose cache ownership, keys and invalidation and predict stale reads, stampedes and origin overload when the cache fails | Cache correctness | cache-correctness | 02 Application access and performance | new |  | query-access-path | [[Home/Data Persistence/Caching]] |  | v1:336545c84e016145d6e04398b2c0926d634962402e91d199c617cf63cceb66f7/0 | |
| Trace write ordering, acknowledgement and replica visibility and reason about lag, failover and stale-read contracts | Replication acknowledgements | replication-ack | 03 Scaling and durable copies | new |  | transaction-boundary | [[Home/Data Persistence/SQL/Replication]] |  | v1:9975a4565ccdabbea542e4579eb506b6c25569a43ac78095faa08a9305ee2b17/0 | |
| Choose a shard key and routing ownership and explain the rebalancing, cross-shard transaction and global-constraint costs | Shard ownership | shard-ownership | 03 Scaling and durable copies | new |  | replication-ack, query-access-path | [[Home/Data Persistence/SQL/Sharding]] |  | v1:07e3c87bc8485b35ca51494c6b8b811ee845dc7c5f02eb6cd3b6da12877f8342/3 | |
| Use bucket and object-key operations with explicit per-key consistency, multipart completion and lifecycle policies rather than filesystem assumptions | Object write boundaries | object-atomicity | 03 Scaling and durable copies | new |  | transaction-boundary | [[Home/Data Persistence/Object Storage]] |  | v1:c45e9ca47738767edd530391a6dc116286f5c2ef715d75e6ca251601f268ef0b/0 | |
| Calculate storage overhead and recoverable shard loss and explain placement, degraded-read and repair costs relative to replication | Erasure coding and repair | erasure-repair | 03 Scaling and durable copies | new |  | object-atomicity, replication-ack | [[Home/Data Persistence/Erasure Coding]] |  | v1:937228e9f739ee3420a0e46fde656fff2d640f79b841925522b3d03628b8d2ef/0 | |
| Choose document, key-value, wide-column or graph storage from the aggregation and query boundary rather than assumed NoSQL guarantees | Specialized data models | store-model-fit | 04 Specialized storage engines | new |  | schema-dependencies | [[Home/Data Persistence/NoSQL/NoSQL Database Types]] |  | v1:58e78cc2247eec9373662d9d7375995b4ea1bab4b56bcea2ef079a97f32595cc/0 | |
| Choose Redis value types and persistence and failover policies according to whether the data is disposable or authoritative | Redis data contracts | redis-data-contract | 04 Specialized storage engines | new |  | cache-correctness, replication-ack | [[Home/Data Persistence/NoSQL/Redis]] |  | v1:95849f1593b33616791d20ae8d93a6e67217605aae900583d0979054e955a5ff/0 | |
| Trace analysis, immutable segments and refresh and design Elasticsearch as a rebuildable read store with explicit mapping and shard limits | Search index lifecycle | search-index-lifecycle | 04 Specialized storage engines | new |  | query-access-path, replication-ack | [[Home/Data Persistence/NoSQL/Elasticsearch]] |  | v1:aa4c9dde5260a272ba6d8204bd2a6481e830fd22d44d03a4bf13eaada9475aff/2 | |
| Trace log append, memtable flush, SSTable reads and compaction and compare their read, write and space amplification with B-tree updates | LSM amplification | lsm-amplification | 04 Specialized storage engines | new |  | query-access-path | [[Home/Data Persistence/NoSQL/LSM-Tree]] |  | v1:57cf0014ae237d05c38c8649f9545bab34996e2d9ec39d74bea13c22ad20980c/0 | |
| Choose series labels, partitioning, retention and rollups from ingest and window-query costs while bounding cardinality | Time-series cardinality | timeseries-cardinality | 04 Specialized storage engines | new |  | query-access-path | [[Home/Data Persistence/NoSQL/Time-Series Databases]] |  | v1:9d991fb6ad3aaea8dbd87452ee31458e8dda6a0cb6144bfde04b58318de5efbb/0 | |
