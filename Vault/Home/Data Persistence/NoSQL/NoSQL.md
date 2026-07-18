---
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: "A family of non-relational and specialized data models chosen around concrete access, consistency, and scaling requirements."
level:
  - "4"
status: Creation
tags:
  - FolderNote

publish: true
priority: High
---

# Intro

NoSQL is an umbrella term for data stores whose primary model is not the conventional relational table-and-join model. The label includes key-value, document, wide-column, graph, search, and time-series systems, but their capabilities overlap: some enforce schemas, support transactions, or provide join-like operators.

Reach for a specialized store when a measured workload is dominated by an access pattern it serves better, such as point reads by key, aggregate-shaped documents, relationship traversal, text search, or high-rate time-series ingestion. Keep a relational database as the baseline when constraints, multi-entity transactions, and ad-hoc joins are central. The hard part is choosing a concrete engine and modeling its consistency, partitioning, and query boundaries—not choosing a label.

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

## How It Works

NoSQL is not one model. Common families optimize different operators and storage layouts, and one product can expose several models. Pick an engine from the reads, writes, invariants, and failure behavior you need, then model data around those operations.

Distributed NoSQL systems make different [[CAP theorem]] choices. Cassandra commonly keeps serving through a partition with tunable consistency, while systems such as MongoDB replica sets or strongly consistent key-value services may reject operations that cannot reach the required authority. Relational systems can also be distributed, and NoSQL systems can offer strong or transactional operations within documented scopes. Query-first denormalization is common because co-locating a read shape avoids remote joins, but it creates duplicate state and write-side repair work.

## Tradeoffs

| Dimension | Common relational default | Common NoSQL patterns |
| --- | --- | --- |
| Consistency | ACID transactions across rows and tables within the engine's scope | Engine-specific: strong, causal, eventual, or tunable; transaction scope varies |
| Schema | Database-enforced table and constraint schema | Flexible, application-enforced, or database-enforced depending on engine |
| Relationships | General joins and foreign keys are normal | Embedded, denormalized, traversed, or joined where the engine supports it |
| Scaling | Scale-up, replicas, partitioning, or distributed SQL | Some engines are built around partitioned scale-out; others are single-node or leader-bound |
| Strong fit | Integrity-heavy transactions and evolving query combinations | Stable specialized access patterns whose measured benefit pays the modeling cost |

## Questions

> [!QUESTION]- Which NoSQL family fits a user-profile API with very frequent reads by user id?
> - Key-value or document store, because the access pattern is dominated by point reads on a single id.
> - Use key-value if it is almost entirely get/put by id with no rich querying.
> - Use document if you read/update an aggregate (profile + preferences) and occasionally query a few indexed fields.
> - A key-value API keeps point lookup semantics narrow; a document engine commonly adds secondary-query options at some indexing and storage cost. Exact latency and query support depend on the product.

> [!QUESTION]- When is NoSQL a bad idea?
> - When the core use case needs relational constraints and multi-entity ACID transactions, or queries are fundamentally join-heavy.
> - Forcing those onto NoSQL pushes join logic and consistency into application code, which is error-prone.
> - Often the better move is to keep SQL and add caching, read replicas, or a denormalized read model.
> - If the specialized store cannot enforce the required joins, constraints, or transaction boundary, its access-pattern advantage does not pay for moving those guarantees into application code.

> [!QUESTION]- Why does NoSQL push you toward denormalization and data duplication?
> - When the chosen store cannot execute an efficient join across the required data, the cheapest read is often one that fetches a whole aggregate in a single hit.
> - You then model that read shape explicitly, sometimes duplicating fields across documents or rows instead of normalizing them once.
> - That makes reads fast and partition-friendly but means a single logical change may touch many copies.
> - You accept write-side duplication and a synchronization policy in exchange for cheaper reads; whether copies may be temporarily inconsistent is a separate consistency decision.

## References

- [Understand data store models](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-store-overview) — Microsoft taxonomy of relational, document, key-value, graph, search, time-series, and analytical store models with workload boundaries.
- [Relational versus NoSQL data](https://learn.microsoft.com/dotnet/architecture/cloud-native/relational-vs-nosql-data) — .NET architecture guidance on aggregate modeling, schema ownership, and consistency tradeoffs between relational and NoSQL stores.
- [Choose a data store](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-stores-getting-started) — decision guidance that starts from data shape, consistency, query, and operational requirements rather than a SQL/NoSQL binary.
- [Designing Data-Intensive Applications, Ch. 3: Storage and Retrieval](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/ch04.html) — comparison of hash indexes, SSTables, LSM trees, and B-trees that explains the storage mechanisms behind several database families.
