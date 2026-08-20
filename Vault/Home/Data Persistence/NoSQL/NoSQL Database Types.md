---
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: "The four NoSQL families (document, key-value, wide-column, graph) and their access patterns."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

The four common NoSQL families are **document**, **key-value**, **wide-column**, and **graph**. They differ in the data they keep together and the queries they make cheap. Horizontal scaling, flexible schema, and [[Replication|eventual consistency]] are common associations under [[CAP theorem|CAP]], but none is a shared guarantee. [[Home/Data Persistence/NoSQL/NoSQL|NoSQL]] explains when a specialized model is worth adding at all.

Search and time-series engines sit beside these families as specialized models. A product may expose several models at once, so classification is a starting point. The workload still decides.

# The Four Families

## Document

Document stores persist structured records, commonly JSON or BSON, with nested fields and collections. The document is usually the natural aggregate and atomic update boundary. Related data that changes together can stay in one document. References remain useful when an embedded collection would grow without bound or when another aggregate owns the fact. Query operators, schema validation, joins, and multi-document transaction support vary by engine.

- **Examples**: MongoDB, Couchbase, Azure Cosmos DB (SQL API).
- **Best fit**: catalogs, profiles, and other aggregates whose nested shape evolves together.
- **Model rule**: embed data owned by the aggregate. Reference data with an independent lifecycle or unbounded growth.

```json
{ "_id": "u42", "name": "Ada", "addresses": [ { "city": "London", "primary": true } ],
  "orders": [ { "id": "o1", "total": 99.50 } ] }
```

## Key-Value

A key-value store addresses a value through a unique key. The narrow contract makes direct lookup easy to scale and reason about. Some products treat the value as opaque. Others add typed structures, conditional writes, secondary indexes, or range queries. Those additions belong to the product contract rather than the base model.

- **Examples**: [[Redis]], DynamoDB, Memcached, etcd.
- **Best fit**: caching ([[Home/Data Persistence/Caching|Caching]]), session state, idempotency records, and direct entity lookup.
- **Model rule**: design keys from the required lookups, distribution, and atomicity boundary. A value-based query needs a supported secondary access path or another model.

## Wide-Column

Wide-column stores group rows by partition key and order data within a partition using clustering keys or an equivalent layout. They work well when a small set of high-volume queries can be encoded into that key design. Cassandra, ScyllaDB, HBase, and Bigtable use log-structured storage ideas such as memtables and immutable table files, trading cheap buffered writes for compaction and read-amplification costs described in [[LSM-Tree]].

- **Examples**: Cassandra, ScyllaDB, HBase, Bigtable.
- **Best fit**: event histories, telemetry, and other write-heavy workloads queried by a known partition and ordered range.
- **Model rule**: start from the partition-local queries. Duplicate a read shape only when its write and repair costs are acceptable, much like [[Sharding|sharding's]] key discipline.

Discord's message store shows the boundary at production scale. Messages are read by channel and time, so the key keeps that path local. Discord later moved from Cassandra to ScyllaDB after dealing with hot partitions, garbage collection, and repair work. The engine changed. The need for a deliberate partition shape did not.

![[Data Persistence/Data Persistence-NoSQL Database Types-18120000.png]]

## Graph

Graph stores represent nodes and edges directly. This fits variable-depth traversal, where each step discovers the next relationships to follow. Performance still depends on selectivity, indexes, locality, and how many edges the query visits.

- **Examples**: Neo4j, Amazon Neptune, JanusGraph.
- **Best fit**: fraud paths, dependency graphs, knowledge graphs, and recommendation queries driven by relationships.
- **Boundary with SQL**: deep or unpredictable traversal needs repeated joins and intermediate results in a relational model. A graph engine can make adjacency expansion more direct. SQL often remains simpler for fixed-depth joins, set-based aggregates, and strong relational constraints.

# Comparison

| Family | Read by | Strength | Weak at | Typical store |
|---|---|---|---|---|
| **Document** | Document key + supported indexes | Aggregate-shaped records | Unbounded documents, cross-aggregate coordination | MongoDB |
| **Key-Value** | Primary key and product-specific indexes | Direct lookup with a narrow contract | Ad-hoc queries over value contents | Redis, DynamoDB |
| **Wide-Column** | Partition + clustering key | Write throughput at scale | Ad-hoc queries, cross-partition joins | Cassandra |
| **Graph** | Traversal from a node | Deep relationship queries | Bulk aggregate scans | Neo4j |

# Time-Series Workloads

A time-series workload is append-heavy and reads ordered ranges by series and time. The important boundary is not “contains timestamps”. It is whether cardinality, compression, retention, and time-window aggregation have become the dominant storage costs. [[Time-Series Databases]] follows that workload through series cardinality, partitioning, rollups, and late data.

# Pitfalls

- **Flexible schema still has a contract.** Validation may live in the database, the application, or both. Without versioning and migration rules, old and new shapes leak into every reader.
- **Relational habits can fight the selected model.** A normalized document design creates extra lookups. A wide-column design that ignores required queries creates scans. Model around the operations the engine can execute predictably.
- **Consistency labels hide operation-level choices.** Read-your-writes, conditional updates, transactions, and behavior during a partition must be checked separately under the [[CAP theorem|CAP / PACELC]] boundary.
- **Partition keys can concentrate load.** A tenant, timestamp prefix, or popular entity can send too much traffic to one partition, reproducing the hot-key problem in [[Sharding]].
- **Every additional store has an operating cost.** Polyglot persistence adds another backup, monitoring surface, failure mode, and data-repair path. Add a model only when its access-pattern advantage pays for that cost.

# Tradeoffs

Stay relational when changing queries, multi-row transactions, and relational constraints dominate. Choose another model when a measured access pattern has become expensive or awkward in that design. [[Replication]] and [[Home/Data Persistence/Caching|caching]] may buy enough headroom without adding another source of truth.

Distributed SQL systems such as CockroachDB, Spanner, and Vitess are another option when relational semantics must survive horizontal partitioning. Their transaction, latency, topology, and compatibility costs still need to be evaluated directly.

# References

- [DynamoDB single-table design](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)
- [How Discord stores trillions of messages](https://discord.com/blog/how-discord-stores-trillions-of-messages)
