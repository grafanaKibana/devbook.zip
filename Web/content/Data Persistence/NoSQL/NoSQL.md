---
publish: true
created: 2026-07-11T21:41:52.211Z
modified: 2026-07-16T15:18:15.665Z
published: 2026-07-16T15:18:15.665Z
tags:
  - FolderNote
topic:
  - Data Persistence
subtopic:
  - NoSQL
summary: A family of non-relational and specialized data models chosen around concrete access, consistency, and scaling requirements.
level:
  - "4"
status: Creation
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

<nav style="--card-accent: 249, 115, 22;" class="folder-structure-map" aria-label="NoSQL section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Elasticsearch">Elasticsearch</span></span></div><p class="db-card-summary">How Elasticsearch maps and analyzes documents into Lucene segments, distributes shards, and serves search and aggregations.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Data Persistence/NoSQL/Elasticsearch.md" data-tooltip-position="top" aria-label="Elasticsearch">Elasticsearch</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="LSM-Tree">LSM-Tree</span></span></div><p class="db-card-summary">A write-optimized storage engine that buffers writes in memory and flushes immutable sorted files, trading read amplification for sequential-write throughput — the B-tree's counterpart.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Data Persistence/NoSQL/LSM-Tree.md" data-tooltip-position="top" aria-label="LSM-Tree">LSM-Tree</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="NoSQL Database Types">NoSQL Database Types</span></span></div><p class="db-card-summary">The four NoSQL families (document, key-value, wide-column, graph) and their access patterns.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Data Persistence/NoSQL/NoSQL Database Types.md" data-tooltip-position="top" aria-label="NoSQL Database Types">NoSQL Database Types</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Redis">Redis</span></span></div><p class="db-card-summary">Redis data structures, persistence, replication, clustering, and the failure contracts behind common use cases.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Data Persistence/NoSQL/Redis.md" data-tooltip-position="top" aria-label="Redis">Redis</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Time-Series Databases">Time-Series Databases</span></span></div><p class="db-card-summary">Storage engines for append-heavy series, time-range scans, retention, and rollups.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Data Persistence/NoSQL/Time-Series Databases.md" data-tooltip-position="top" aria-label="Time-Series Databases">Time-Series Databases</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

## Links

- [[Elasticsearch]]
- [[LSM-Tree]]
- [[NoSQL Database Types]]
- [[Redis]]
- [[Time-Series Databases]]

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
>
> - Key-value or document store, because the access pattern is dominated by point reads on a single id.
> - Use key-value if it is almost entirely get/put by id with no rich querying.
> - Use document if you read/update an aggregate (profile + preferences) and occasionally query a few indexed fields.
> - A key-value API keeps point lookup semantics narrow; a document engine commonly adds secondary-query options at some indexing and storage cost. Exact latency and query support depend on the product.

> [!QUESTION]- When is NoSQL a bad idea?
>
> - When the core use case needs relational constraints and multi-entity ACID transactions, or queries are fundamentally join-heavy.
> - Forcing those onto NoSQL pushes join logic and consistency into application code, which is error-prone.
> - Often the better move is to keep SQL and add caching, read replicas, or a denormalized read model.
> - If the specialized store cannot enforce the required joins, constraints, or transaction boundary, its access-pattern advantage does not pay for moving those guarantees into application code.

> [!QUESTION]- Why does NoSQL push you toward denormalization and data duplication?
>
> - When the chosen store cannot execute an efficient join across the required data, the cheapest read is often one that fetches a whole aggregate in a single hit.
> - You then model that read shape explicitly, sometimes duplicating fields across documents or rows instead of normalizing them once.
> - That makes reads fast and partition-friendly but means a single logical change may touch many copies.
> - You accept write-side duplication and a synchronization policy in exchange for cheaper reads; whether copies may be temporarily inconsistent is a separate consistency decision.

## References

- [Understand data store models](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-store-overview) — Microsoft taxonomy of relational, document, key-value, graph, search, time-series, and analytical store models with workload boundaries.
- [Relational versus NoSQL data](https://learn.microsoft.com/dotnet/architecture/cloud-native/relational-vs-nosql-data) — .NET architecture guidance on aggregate modeling, schema ownership, and consistency tradeoffs between relational and NoSQL stores.
- [Choose a data store](https://learn.microsoft.com/azure/architecture/guide/technology-choices/data-stores-getting-started) — decision guidance that starts from data shape, consistency, query, and operational requirements rather than a SQL/NoSQL binary.
- [Designing Data-Intensive Applications, Ch. 3: Storage and Retrieval](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781098119058/ch04.html) — comparison of hash indexes, SSTables, LSM trees, and B-trees that explains the storage mechanisms behind several database families.
