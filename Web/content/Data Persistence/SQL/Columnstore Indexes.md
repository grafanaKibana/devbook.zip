---
publish: true
created: 2026-07-16T14:50:22.923Z
modified: 2026-07-16T14:50:22.924Z
published: 2026-07-16T14:50:22.924Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: SQL Server's compressed column storage for large analytical scans and aggregates.
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

A SQL Server columnstore index stores each column separately in compressed rowgroups and can execute eligible operators in batches. Queries that scan millions of rows but project only a few columns read less data and process it with less per-row overhead. Point lookups, narrow range seeks, and frequent single-row updates still fit rowstore B+ tree indexes better.

## Storage Shape

A clustered columnstore index is the table's primary storage. A nonclustered columnstore index is an analytical copy over a rowstore table. Both organize rows into rowgroups and compress each column segment independently, so a query over `OrderDate` and `Revenue` does not need to read wide text or JSON columns from the same rows.

```sql
CREATE CLUSTERED COLUMNSTORE INDEX CCI_SalesFact
ON dbo.SalesFact;

SELECT ProductCategory, SUM(Revenue)
FROM dbo.SalesFact
WHERE OrderDate >= '2026-01-01'
GROUP BY ProductCategory;
```

Segment metadata can eliminate rowgroups whose value ranges cannot satisfy the predicate. Batch mode then moves groups of values through eligible operators. Neither mechanism makes a one-row lookup faster than a selective rowstore seek.

## Workload Boundary

| Workload | Better default | Reason |
|---|---|---|
| Warehouse fact table, large scans | Clustered columnstore | Compression, segment elimination, batch aggregates |
| OLTP table with occasional analytics | Rowstore plus selective nonclustered columnstore | Keeps point-write path while adding an analytical copy |
| Primary-key lookup and small update | Rowstore B+ tree | Direct seek and cheaper single-row maintenance |

Columnstore adds write and operational costs: delta stores absorb small inserts, background tuple movement compresses closed rowgroups, and updates become delete-plus-insert work. Use it when measured analytical savings pay those costs.

## References

- [Columnstore indexes overview](https://learn.microsoft.com/sql/relational-databases/indexes/columnstore-indexes-overview?view=sql-server-ver17) — official architecture, clustered and nonclustered variants, rowgroups, delta stores, and workload guidance.
- [Columnstore index architecture](https://learn.microsoft.com/sql/relational-databases/indexes/columnstore-indexes-described?view=sql-server-ver17) — describes segments, dictionaries, rowgroups, and the delete bitmap.
- [Get started with columnstore for operational analytics](https://learn.microsoft.com/sql/relational-databases/indexes/get-started-with-columnstore-for-real-time-operational-analytics?view=sql-server-ver17) — primary guidance for adding nonclustered columnstore to a transactional rowstore table.
