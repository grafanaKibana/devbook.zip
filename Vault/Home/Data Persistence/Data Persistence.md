---
icon: database
order: 30
color: "#f97316"
topic:
  - Data Persistence
subtopic: []
summary: "How software stores and protects state across restarts using SQL, NoSQL, and caching."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Done
---

# Intro

Data persistence is how software survives a restart: storing, retrieving, and protecting state across processes and machines. The choice between SQL, NoSQL, and caching layers shapes every system's consistency guarantees, latency profile, and operational cost. Example: picking the wrong isolation level can silently corrupt data under concurrency, while an unnecessary cache adds a stale-read failure mode that did not exist before.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Storage Options at a Glance

Different stores optimize for different access patterns. Pick by the shape of your reads and writes, not by popularity:

| Store type | Best for | Weak at | Examples |
|---|---|---|---|
| Relational (SQL) | Ad-hoc queries, joins, transactional integrity | Rigid schema under rapid change; horizontal write scaling | PostgreSQL, SQL Server |
| Document | Flexible, self-contained records read/written whole | Cross-document joins; multi-document transactions work but aren't the sweet spot | MongoDB, Cosmos DB |
| Key-value | Simple, high-throughput lookups by known key | Rich queries on non-key attributes (without secondary indexes) | Redis, DynamoDB |
| Wide-column | Massive write volume, time-series, known query paths | Ad-hoc querying, flexible access | Cassandra, Bigtable |
| Graph | Relationship-heavy traversal (paths, who-knows-whom) | Bulk scans and aggregate analytics | Neo4j, Neptune |

Most systems combine a relational system of record with a cache or document store on a hot path — polyglot persistence — rather than forcing everything into one model.

## Questions

> [!QUESTION]- How should you choose between SQL and NoSQL for a new service?
> - Default to a relational database: mature tooling, ACID transactions, flexible ad-hoc queries, and joins cover the majority of workloads and let the schema enforce invariants
> - Reach for NoSQL when a specific access pattern dominates and relational cost is real: key-value or document stores for simple high-throughput lookups, wide-column for massive write volume, graph stores for relationship-heavy traversal
> - The honest driver is usually the data model and query pattern, not scale — most services never outgrow a well-indexed relational database, and "web-scale" is rarely the actual constraint
> - Combining them is common and often better than committing everything to one model: a relational system of record with a document or cache layer for a hot read path

> [!QUESTION]- When is an ORM the right abstraction, and when should you drop to raw SQL?
> - ORMs earn their keep for CRUD and domain mapping: they remove boilerplate, keep queries type-safe, and handle change tracking and migrations — most application code is better with one than without
> - They hurt when they hide cost: the N+1 query problem, accidental full-table loads, and opaque generated SQL turn a one-line query into a performance incident
> - Drop to raw SQL (or a hand-tuned query) for reporting, bulk operations, and hot paths where you need index control and a predictable query plan
> - The durable skill is reading the SQL the ORM emits — treat it as a productivity default, not a reason to stop understanding the database underneath

## References

- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) — the definitive book on storage engines, replication, partitioning, and consistency tradeoffs.
- [Use The Index, Luke (Markus Winand)](https://use-the-index-luke.com/) — practical, database-agnostic guide to SQL indexing and query performance.
- [Jepsen analyses (Kyle Kingsbury)](https://jepsen.io/analyses) — evidence-based safety and consistency testing of real databases; grounds the SQL-versus-NoSQL tradeoffs.
- [EF Core performance guidance (Microsoft Learn)](https://learn.microsoft.com/en-us/ef/core/performance/) — practical guidance on ORM query performance: avoiding N+1, batching, and when to drop to raw SQL.
