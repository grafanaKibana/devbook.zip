---
topic:
  - Data Persistence
subtopic:
  - NoSQL
level:
  - "3"
priority: Medium
status: Done
tags:
  - FolderNote

dg-publish: true
---

# Intro

NoSQL is an umbrella term for non-relational data stores that trade some of the relational model (normalized tables + joins) for scalability, flexible schemas, or specialized access patterns.
You reach for it when your workload is better described as "fetch by key", "store a document", "traverse relationships", or "write lots of events" rather than "join many tables".
The hard part is not "NoSQL vs SQL" but selecting the right NoSQL family and modeling your data around your queries.

```mermaid
flowchart TD
  A[Choosing a data store] --> B{Need joins and multi-entity transactions}
  B -->|Yes| C[Relational SQL]
  B -->|No| D{Mostly fetch by id}
  D -->|Yes| E[Key-Value]
  D -->|No| F{Read and write whole aggregates}
  F -->|Yes| G[Document]
  F -->|No| H{High-write time series or wide rows}
  H -->|Yes| I[Wide-Column]
  H -->|No| J{Traverse relationships}
  J -->|Yes| K[Graph]
```

## How It Works

NoSQL is not one thing — it is four data models, each shaped around a different access pattern. Pick the family by how you read and write, then model the data around those queries.

| Family | Stores | Fits | Examples |
| --- | --- | --- | --- |
| Key-Value | opaque value addressed by a key | sessions, caches, lookups by id | Redis, DynamoDB |
| Document | self-contained JSON-like aggregates | catalogs, profiles, content | MongoDB, Cosmos DB |
| Wide-Column | rows with dynamic, sparse columns | time series, very high write throughput | Cassandra, HBase |
| Graph | nodes and edges | relationship traversal, recommendations | Neo4j, Neptune |

Most distributed NoSQL stores sit on the AP side of the [[CAP theorem]]: they favor availability and partition tolerance and offer **eventual** (tunable) consistency rather than the strong, immediately-consistent transactions of a relational database. Modeling is query-first — you denormalize and duplicate data to make the reads you need cheap, accepting write-side duplication as the cost.

## Example

Document store example: a product page is an aggregate, so store it as one document.

```json
{
  "id": "p-123",
  "name": "Keyboard",
  "price": 79.99,
  "tags": ["input", "usb"],
  "inventory": {
    "warehouse": "kyiv-1",
    "available": 42
  }
}
```

## Tradeoffs

| Dimension | Relational (SQL) | NoSQL |
| --- | --- | --- |
| Consistency | Strong, ACID transactions | Often eventual/tunable (BASE) |
| Schema | Fixed, enforced | Flexible, per-record |
| Joins | First-class | Avoided; data is denormalized |
| Scaling | Vertical first; sharding is hard | Horizontal scale-out by design |
| Best for | Complex relationships, integrity | Known access patterns, high scale |

## Questions

> [!QUESTION]- Which NoSQL family fits a user-profile API with very frequent reads by user id?
> - Key-value or document store, because the access pattern is dominated by point reads on a single id.
> - Use key-value if it is almost entirely get/put by id with no rich querying.
> - Use document if you read/update an aggregate (profile + preferences) and occasionally query a few indexed fields.
> - Key-value gives the simplest, fastest id lookups but no secondary queries; the document store adds query flexibility at some indexing and storage cost.

> [!QUESTION]- When is NoSQL a bad idea?
> - When the core use case needs relational constraints and multi-entity ACID transactions, or queries are fundamentally join-heavy.
> - Forcing those onto NoSQL pushes join logic and consistency into application code, which is error-prone.
> - Often the better move is to keep SQL and add caching, read replicas, or a denormalized read model.
> - NoSQL trades joins and strong consistency for scale and flexible schemas — if you need the former, that trade is a net loss.

> [!QUESTION]- Why does NoSQL push you toward denormalization and data duplication?
> - Without joins, the cheapest read is one that fetches a whole aggregate in a single hit.
> - So you model data per query, duplicating fields across documents/rows instead of normalizing them once.
> - That makes reads fast and partition-friendly but means a single logical change may touch many copies.
> - You accept write-side duplication and temporarily inconsistent copies in exchange for fast, scalable reads — the opposite of the normalized SQL bargain.

## References

- [Understand data store models](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-store-overview)
- [Relational vs NoSQL data](https://learn.microsoft.com/dotnet/architecture/cloud-native/relational-vs-nosql-data)
- [Choose a data store](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-stores-getting-started)
- [Designing Data Intensive Applications chapter on storage and retrieval](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/ch04.html)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/03 Data Persistence/03 Data Persistence|03 Data Persistence]]
>
<!-- whats-next:end -->
