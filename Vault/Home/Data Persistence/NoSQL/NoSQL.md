---
topic: [Data Persistence]
subtopic: [NoSQL]
summary: "A family of non-relational and specialized data models chosen around concrete access, consistency, and scaling requirements."
level: ["4"]
status: Creation
tags: [FolderNote]

publish: true
priority: High
qard-deck: "Data Persistence"
qard-topic: "NoSQL/NoSQL"
flashcard_uid: "96ca4645"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

NoSQL names a loose group of data stores rather than one database model. It covers key-value, document, wide-column, and graph stores, while search and time-series engines are often grouped beside them. Product boundaries overlap. A document store may enforce schemas, a key-value service may expose secondary indexes, and either may support transactions within a documented scope.

A specialized store earns its place when one access pattern dominates the workload: point lookup by key, aggregate-shaped documents, relationship traversal, text relevance, or sustained time-window ingestion. A relational database remains the safer default when constraints, multi-entity transactions, and changing query combinations matter more. The useful decision is always about a concrete engine and its consistency, partitioning, query, and recovery contracts.

```mermaid
flowchart TD
  A[Start from required queries and invariants] --> B{Constraints and multi-entity transactions dominate}
  B -->|Yes| C[Relational baseline]
  B -->|No or complementary workload| D{Dominant access pattern}
  D -->|Point lookup| E[Key-value]
  D -->|Aggregate document| F[Document]
  D -->|Wide partition or high-rate series| G[Wide-column or time-series]
  D -->|Relationship traversal| H[Graph]
  D -->|Text relevance| I[Search index]
```

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# How It Works

Each family makes a different operation cheap. Key-value stores center the primary key. Document stores keep an aggregate together. Wide-column stores organize known queries around partition and clustering keys. Graph stores make relationships part of the stored model. Some products expose more than one of these interfaces, so the product name alone says little about the workload fit.

Distributed stores make different [[CAP theorem]] choices for each operation. Cassandra can keep serving selected requests through a partition when the chosen consistency level can still be met. A leader-based replica set may instead reject writes when it cannot establish the required authority. Neither behavior follows from the word “NoSQL.” Relational systems can also be distributed, while non-relational systems can provide strong reads or transactions within bounded scopes.

Data is often shaped around known reads because keeping related values in one partition avoids remote joins or fan-out. That can reduce read work substantially. It also duplicates state, moves coordination into the write path, and creates a repair problem when one copy is missed.

# Tradeoffs

| Dimension | Common relational default | Common NoSQL patterns |
| --- | --- | --- |
| Consistency | ACID transactions across rows and tables within the engine's scope | Engine-specific: strong, causal, eventual, or tunable. Transaction scope varies |
| Schema | Database-enforced table and constraint schema | Flexible, application-enforced, or database-enforced depending on engine |
| Relationships | General joins and foreign keys are normal | Embedded, denormalized, traversed, or joined where the engine supports it |
| Scaling | Scale-up, replicas, partitioning, or distributed SQL | Some engines are built around partitioned scale-out. Others are single-node or leader-bound |
| Strong fit | Integrity-heavy transactions and evolving query combinations | Stable specialized access patterns whose measured benefit pays the modeling cost |

# Questions

<!-- qard-id: 510a2738-ff3d-447d-a2eb-c48661cd012d -->
> [!qard]- When is a non-relational store a poor fit for a service?
> A non-relational store is a poor fit when the service's correctness depends on guarantees that the chosen engine cannot provide within the required scope. Those guarantees are constraints, transactions across related records, or support for a changing set of queries.
>
> - **Invariants move into application code.** If the database cannot enforce a rule across records, the application must enforce it, coordinate concurrent writes and repair copies that drift apart. For example, a transfer between two account records needs both balance changes to commit or fail together. An engine whose transactions are limited to one document or partition provides that atomicity only when both accounts lie inside one such scope. Under a partition-scoped transaction, two separate account documents in the same partition can still commit together. When the accounts fall outside every atomic scope the engine supports, such as in different partitions, the application must coordinate the transfer itself.
> - **New queries can require remodeling.** Data in such stores is often shaped around known reads. A query the model was not designed for may need another index, a duplicated record or a different layout.
> - **The label decides little.** “NoSQL” names no single consistency or transaction model. Some engines provide strong reads or transactions within a bounded scope, while others offer eventual or tunable consistency. The fit therefore depends on the concrete engine and the scope of each operation.
> 
> [Microsoft: Understand data store models](https://learn.microsoft.com/en-us/azure/architecture/data-guide/technology-choices/understand-data-store-models) · [Azure Cosmos DB: Database transactions and optimistic concurrency](https://learn.microsoft.com/en-us/azure/cosmos-db/database-transactions-optimistic-concurrency)

# References

- [Understand data store models](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-store-overview)
