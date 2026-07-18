---
publish: true
created: 2026-07-18T14:02:44.061Z
modified: 2026-07-18T14:02:44.061Z
published: 2026-07-18T14:02:44.061Z
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: The four NoSQL families (document, key-value, wide-column, graph) and their access patterns.
level:
  - "3"
priority: High
status: Ready to Repeat
---

"NoSQL" isn't one thing — it's four distinct data models, each trading the relational model's rigid schema and joins for a different scaling and access pattern. Picking the right one is a data-modeling decision driven by _how you query_, not a popularity contest. The four families are **document**, **key-value**, **wide-column**, and **graph**. They share themes (horizontal scaling, flexible schema, usually [[Replication|eventual consistency]] under the [[CAP theorem|CAP]] lens) but differ sharply in what they're good at. This page compares them; for the general "why NoSQL" framing see [[Data Persistence/NoSQL/NoSQL|NoSQL]].

Beyond these four data _models_, specialized engines exist — search engines (Elasticsearch/OpenSearch, built on an inverted index) and time-series stores (InfluxDB, Prometheus, TimescaleDB) — but these are purpose-built or layered _on_ the families above rather than a fifth model.

# The Four Families

## Document

Stores self-contained documents (JSON/BSON), each a nested tree of fields. The document _is_ the unit of read/write, so related data that's read together lives together (no joins). Schema is per-document and flexible.

- **Examples**: MongoDB, Couchbase, Azure Cosmos DB (SQL API).
- **Best for**: content/catalogs, user profiles, anything with a natural aggregate boundary and evolving schema.
- **Model rule**: embed what you read together; reference what you'd otherwise duplicate heavily.

```json
{ "_id": "u42", "name": "Ada", "addresses": [ { "city": "London", "primary": true } ],
  "orders": [ { "id": "o1", "total": 99.50 } ] }
```

## Key-Value

The simplest model: a giant distributed hash map of `key → opaque value`. O(1) get/put by key, no querying _inside_ the value. Often in-memory.

- **Examples**: [[Redis]], DynamoDB (core), Memcached, etcd.
- **Best for**: caching ([[Data Persistence/Caching|Caching]]), sessions, feature flags, rate-limit counters, leaderboards.
- **Constraint**: you can only fetch by key — design the key (and any secondary-index tables) around your access patterns up front.

## Wide-Column

Rows are identified by a partition key and hold a flexible, sparse set of columns; data is physically grouped by partition. Built for **massive write throughput** and queries along a known partition + clustering key. That write throughput comes from the storage engine underneath: these stores are backed by an [[LSM-Tree]] / SSTable engine, which turns random writes into sequential appends.

- **Examples**: Cassandra, ScyllaDB, HBase, Bigtable.
- **Best for**: time-series, event logs, IoT/sensor data, high-write feeds at petabyte scale.
- **Model rule**: **query-first design** — you model one table _per query_, denormalizing aggressively, because there are no joins and cross-partition scans are expensive (echoes [[Sharding|sharding's]] shard-key discipline).

Discord's message store shows the rule under real load. Messages are read by channel and time, so the storage key must keep that access path local instead of scattering one channel across the cluster. Discord moved from Cassandra to ScyllaDB after operational pain around hot partitions, garbage collection, and repairs; the lesson is not that one wide-column engine always wins, but that partition shape and node behavior dominate at trillions of rows.

![[Assets/Data Persistence/Data Persistence-NoSQL Database Types-18120000.png]]

## Graph

Stores **nodes** and **edges** as first-class citizens, making relationship traversal cheap. A query like "friends-of-friends who like X" is a local walk, not an exploding chain of joins.

- **Examples**: Neo4j, Amazon Neptune, JanusGraph.
- **Best for**: social networks, recommendations, fraud rings, knowledge graphs, network/IT topology.
- **Why not SQL**: a deep or unpredictable traversal in a relational database requires repeated joins, index probes, and intermediate rows. A graph engine can keep adjacency relationships close to the node being expanded, reducing lookup and materialization work when the walk is selective. Both still pay for the edges they visit, and SQL can win for set-based aggregates, integrity constraints, and well-indexed fixed-depth joins; the deciding factors are traversal depth, selectivity, data locality, cache state, and the available indexes.

# Comparison

| Family | Read by | Strength | Weak at | Typical store |
|---|---|---|---|---|
| **Document** | Document key + secondary indexes | Flexible aggregates, dev velocity | Cross-document joins, multi-doc transactions | MongoDB |
| **Key-Value** | Key only | Raw speed, simplicity | Querying value contents | Redis, DynamoDB |
| **Wide-Column** | Partition + clustering key | Write throughput at scale | Ad-hoc queries, cross-partition joins | Cassandra |
| **Graph** | Traversal from a node | Deep relationship queries | Bulk aggregate scans | Neo4j |

# Time-Series Workloads

A time-series workload is append-heavy and reads ordered ranges by series and time. The important boundary is not “contains timestamps”; it is whether cardinality, compression, retention, and time-window aggregation have become the dominant storage costs. [[Time-Series Databases]] owns the series model, partitioning, rollups, late data, and the workload-selector diagram.

# Pitfalls

- **"Schemaless" means schema-on-read, not no schema.** The schema moves from the database to your application code. Without discipline (and ideally validation), document collections drift into inconsistent shapes that every reader must defensively handle.
- **Modeling NoSQL like SQL.** Normalizing a document store or expecting joins defeats the point and performs badly. NoSQL is **query-driven**: design the data around the reads you'll do, accepting denormalization and duplication.
- **Assuming strong consistency.** Most of these default to eventual consistency for availability/latency (see [[CAP theorem|CAP / PACELC]]). Read-your-writes and cross-document atomicity often require explicit opt-in (tunable consistency, transactions) or aren't available at all.
- **Hot partitions.** Wide-column and key-value stores spread load by partition key; a poorly chosen key concentrates traffic on one node — the same hot-key problem as [[Sharding]].
- **NoSQL ≠ "no SQL needed."** Most real systems are **polyglot**: a relational store as the system of record plus a key-value cache and maybe a search/graph store — not one database for everything.

# Tradeoffs

**Relational vs NoSQL (when to leave SQL):** stay relational when you need ad-hoc queries, multi-row ACID transactions, and strong consistency over moderate data. Reach for a NoSQL family when a _specific_ access pattern (huge write volume, deep traversals, simple key lookups at massive scale, or rapidly-evolving documents) outgrows what a single relational node serves well — and only after exhausting [[Replication]] and [[Data Persistence/Caching|caching]].

**NewSQL** (CockroachDB, Spanner, Vitess) is the third option: relational semantics and SQL with horizontal scaling — worth considering before giving up ACID for scale.

# Questions

> [!QUESTION]- How do you choose between the four NoSQL families?
> By access pattern. **Key-value** when you only ever fetch by a single key (cache, session). **Document** when data forms self-contained aggregates with flexible schema (profiles, catalogs). **Wide-column** when you need extreme write throughput along a known partition key (time-series, logs). **Graph** when queries traverse relationships many hops deep (social, recommendations, fraud). The query shape, not the data size, drives the choice.

> [!QUESTION]- Why is NoSQL data modeling "query-first" instead of normalized?
> There are no joins, so you can't assemble data from many tables at read time cheaply. Instead you store data pre-shaped for each read — often duplicating it across multiple "tables"/documents (one per query). You trade storage and write-time duplication for fast, single-lookup reads. This is the opposite of relational [[Normalization Denormalization|normalization]].

> [!QUESTION]- What does "polyglot persistence" mean and why is it common?
> Using different databases for different jobs within one system — e.g. PostgreSQL as the system of record, Redis for caching/sessions, Elasticsearch for search, Neo4j for a recommendation graph. No single store is best at everything, so mature systems combine them, accepting the operational cost of running several.

# References

- [NoSQL (Wikipedia)](https://en.wikipedia.org/wiki/NoSQL) — taxonomy of the four families with examples.
- [NoSQL data modeling techniques (Highly Scalable Blog)](https://highlyscalable.wordpress.com/2012/03/01/nosql-data-modeling-techniques/) — query-first modeling patterns across families.
- [DynamoDB single-table design (AWS)](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html) — access-pattern-driven modeling for key-value/wide-column.
- [Designing Data-Intensive Applications, Ch. 2 (Martin Kleppmann)](https://dataintensive.net/) — relational vs document vs graph data models compared in depth.
- [How Discord Stores Trillions of Messages (Discord Engineering)](https://discord.com/blog/how-discord-stores-trillions-of-messages) — production wide-column case study: Cassandra → ScyllaDB, and why the LSM-Tree/SSTable engine underneath matters at that scale.
- [Scaling Time Series Data Storage — Part I (Netflix Tech Blog)](https://netflixtechblog.com/scaling-time-series-data-storage-part-i-ec2b6d44ba39) — Netflix's wide-column (Cassandra) time-series design, a concrete slice of their polyglot-persistence stack.
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/) — authoritative definition of a time series as a metric name plus label set and timestamped samples.
- [Choose a database for a metric collecting system (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/choose-the-right-database-for-metric-collecting-system.md) — visual access-pattern selector, used here with an explicit cardinality and scale boundary.
- [Time-series database in 20 lines (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/time-series-db-tsdb-in-20-lines.md) — compact editorial model of time-series ingestion and queries; its engine-specific infographic is intentionally omitted.
- [How Discord stores trillions of messages (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-discord-stores-trillions-of-messages.md) — condensed production case, paired above with Discord's primary engineering account.
