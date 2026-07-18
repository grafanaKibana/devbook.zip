---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "Index structures across database engines and the operators, storage layouts, and mutation costs each structure serves."
publish: true
level:
  - "4"
priority: High
status: Ready to Repeat
---

An index is an auxiliary access structure that lets a database locate or order data without scanning every base row. “Add an index” is incomplete advice: B+ trees, hash tables, inverted indexes, spatial trees, block summaries, LSM-based layouts, and columnstores accelerate different operators and impose different write, memory, and maintenance costs.

Start from the operator in the measured query plan. Equality probes, ordered ranges, text terms, containment, nearest-neighbor search, and large analytical scans do not share one best structure. Rowstore and columnstore designs therefore remain parallel sections: one optimizes selective navigation and ordering, while the other compresses columns for broad analytical work. Statistics and physical maintenance follow only after the plan identifies which boundary is failing.

# Structure Inventory

| Structure | Physical idea | Strong query fit | Cost or boundary |
|---|---|---|---|
| B-tree / B+ tree | Balanced, ordered pages | Equality, ranges, prefix order, ordered scans | Page splits and write amplification across every maintained index |
| Hash | Key-to-bucket mapping | Equality probes when the engine and workload support it | No useful key ordering or range scan; collisions and resizing still cost work |
| Inverted index / GIN | Term or element to posting list | Full text, arrays, document containment | Larger posting structures and expensive updates |
| GiST / SP-GiST | Extensible spatial or partitioned search tree | Geometry, nearest neighbor, ranges, tries | Behavior depends on the operator class; candidates may require recheck |
| BRIN | Summary per consecutive heap-page range | Very large tables correlated with physical order | Weak pruning when row order is uncorrelated with the indexed value |
| LSM tree | Buffer, flush, and compact sorted runs | Sustained writes with point/range reads through run indexes and filters | Compaction and read amplification; it is a storage organization, not a PostgreSQL index method |
| Columnstore | Compressed values grouped by column | Large scans and aggregates over a subset of columns | Point updates and single-row OLTP access |

![[Data Persistence/Data Persistence-Indexes-18120000.jpg]]

The image is a vocabulary map, not a universal engine diagram. Bloom filters answer probable membership rather than locating a row; an LSM tree includes several cooperating structures; and products expose spatial and inverted behavior through engine-specific operator classes.

# B+ Tree Boundary

Conventional SQL Server disk-based clustered and nonclustered rowstore indexes use B+ trees. Root and intermediate pages contain separator keys and child-page pointers. Leaf pages contain the table rows for a clustered index, or nonclustered keys plus row locators and included values for a nonclustered index. A heap has no clustered key order; its nonclustered indexes locate base rows by RID.

An index on `(TenantId, CreatedAt)` is ordered first by tenant and then by time within each tenant. It can seek an equality tenant and scan a time range without sorting the entire table. It is not an efficient general index for `CreatedAt` across all tenants because the leading key is missing.

PostgreSQL also defaults to B-tree for equality and ordering operators, but its heap and index implementation differs from SQL Server's clustered-rowstore model. Do not transfer SQL Server leaf-layout or key-lookup claims to another engine without checking that engine's plan and storage documentation.

# Rowstore Indexes

Rowstore index design translates a recurring query shape into an ordered B+ tree. Key columns determine navigation and order; included columns exist at the nonclustered leaf to cover output; a filter limits which rows exist in the index. The target is the smallest index that supports the required predicates and ordering while paying for its write cost.

```sql
SELECT OrderNumber, Total, CreatedAt
FROM Orders
WHERE TenantId = @tenantId
  AND Status = @status
  AND CreatedAt >= @from
ORDER BY CreatedAt DESC;

CREATE INDEX IX_Orders_Tenant_Status_CreatedAt
    ON Orders (TenantId, Status, CreatedAt DESC)
    INCLUDE (OrderNumber, Total);
```

The equality predicates establish a tenant/status prefix, `CreatedAt` bounds the range and supplies output order, and the included values cover the projection without widening upper tree levels. The index cannot efficiently serve a general `Status` query because that query omits the leading tenant key.

## SARGability and key order

SARGability means the optimizer can turn a predicate into a search argument. `CreatedAt >= @from` normally supplies a range; `YEAR(CreatedAt) = @year` usually does not unless the expression is rewritten as a date interval or exposed through an indexable computed column.

- Put columns that bound a seek or preserve required order in the key.
- Equality predicates usually precede the first range predicate.
- “Most selective first” is not universal. Prefer prefixes reused by important queries, tenant or partition boundaries, and required ordering, then verify estimates.
- A `GROUP BY`, `ORDER BY`, or join column belongs in the key only when its position supplies useful navigation or order.

## Covering and filtered indexes

A nonclustered index covers a query when all required values can be returned from the index. Use `INCLUDE` for output or residual values whose order does not help a seek, join, grouping, or sort. Included values still widen leaf rows, consume cache, and add write work.

A filtered index stores only rows satisfying a stable predicate:

```sql
CREATE INDEX IX_Orders_Open_CreatedAt
    ON Orders (TenantId, CreatedAt DESC)
    INCLUDE (OrderNumber, Total)
    WHERE Status = 'Open';
```

This works when open orders are a small, frequently queried subset. The query predicate must imply the filter, and parameterization can prevent the optimizer from proving that implication. Verify actual and estimated rows, logical reads, lookups, sorts, write rate, size, and overlap with existing prefixes before keeping the index.

# Columnstore Indexes

A SQL Server columnstore stores each column separately in compressed rowgroups and can execute eligible operators in batches. Broad queries that scan millions of rows but project a few columns read less data; point lookups, narrow seeks, and frequent single-row updates remain rowstore work.

```sql
CREATE CLUSTERED COLUMNSTORE INDEX CCI_SalesFact
ON dbo.SalesFact;

SELECT ProductCategory, SUM(Revenue)
FROM dbo.SalesFact
WHERE OrderDate >= '2026-01-01'
GROUP BY ProductCategory;
```

A clustered columnstore is the table's primary storage. A nonclustered columnstore is an analytical copy over a rowstore table. Segment metadata can eliminate rowgroups whose value ranges cannot satisfy a predicate, and batch mode moves groups of values through eligible operators.

| Workload | Better default | Reason |
| --- | --- | --- |
| Warehouse fact table with large scans | Clustered columnstore | Compression, segment elimination, and batch aggregates |
| OLTP table with occasional analytics | Rowstore plus selective nonclustered columnstore | Preserves the point-write path while adding an analytical copy |
| Primary-key lookup and small update | Rowstore B+ tree | Direct seek and cheaper single-row maintenance |

Small inserts first land in delta stores, background tuple movement compresses closed rowgroups, and updates become delete-plus-insert work. Use columnstore only when measured analytical savings pay those costs.

# Index Maintenance

Maintenance should repair a measured problem, not follow a universal fragmentation threshold. Page density, logical fragmentation, statistics quality, query shape, storage, and the maintenance operation's own cost all matter.

Logical fragmentation measures whether leaf pages follow key order. Page density measures how full those pages are. On SSD and cloud storage, sparse pages can matter more than out-of-order reads because a range scan must read more pages. A rebuild may appear to fix a plan only because it refreshed statistics; test that hypothesis first:

```sql
UPDATE STATISTICS dbo.Orders IX_Orders_Customer_CreatedAt
WITH FULLSCAN;
```

| Operation | What it changes | Cost or limit |
| --- | --- | --- |
| `REORGANIZE` | Incrementally compacts and orders leaf pages | Does not refresh statistics |
| `REBUILD` | Recreates the index and refreshes its statistics | Log, CPU, I/O, locking, and online-operation limits |
| `UPDATE STATISTICS` | Refreshes cardinality distribution | Does not repair page density or ordering |

Fill factor reserves free space during build or rebuild. Lower it only when measured page splits on non-sequential inserts justify permanently reading and caching more pages. The decision sequence is: capture the slow plan and reads, compare estimates with actuals, refresh relevant statistics, measure density and fragmentation for the used partition, then reorganize or rebuild only when the expected read benefit exceeds log, blocking, CPU, and I/O cost.

# Choose from the Operator

Use the narrowest structure that supports the dominant operator and proves a net workload benefit:

1. Capture the actual plan, row estimates, logical reads, elapsed time, and write rate.
2. Identify the operator that dominates cost: scan, lookup, sort, text match, containment, or aggregation.
3. Choose an engine-supported structure for that operator.
4. Re-measure reads and writes. An index that speeds one query but doubles write cost or duplicates an existing prefix may be a net loss.

Low cardinality alone does not disqualify an index. A filtered index on a rare status, a covering ordered scan, or a bitmap-capable plan can still be useful. Conversely, a high-cardinality column is not automatically useful when queries do not filter, join, or order by it. Distribution, correlation, result size, and the surrounding plan determine whether the optimizer prefers the index.

# Tradeoffs

- Every secondary index consumes storage and makes inserts, deletes, and indexed-column updates maintain another structure.
- A narrow index may require base-row lookups; a wide covering index reduces lookups but increases leaf size, cache pressure, and write cost.
- Statistics and physical condition affect plan choice. A rebuild can appear to fix a query because it refreshed statistics; verify the cause before scheduling maintenance.
- Specialized structures narrow the supported operator set. The advantage is worthwhile only when the workload repeatedly uses that operator.

# Questions

> [!QUESTION]- Why is “use a hash index because lookup is O(1)” incomplete database advice?
> The engine must support the hash index for the target table and operator, equality is the only useful ordering relation, and collisions, bucket growth, concurrency, durability, and cache behavior still affect cost. A B+ tree often wins for mixed equality and range work because one structure supports both.

> [!QUESTION]- Why can a low-cardinality column still participate in a useful index?
> A filtered index can store only the rare subset, a composite key can use the column after a useful leading prefix, and a covering index can avoid base-row reads. Measure the complete query plan; cardinality is evidence, not a standalone rule.

# References

- [SQL Server and Azure SQL index architecture and design guide](https://learn.microsoft.com/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17) — primary guide to SQL Server rowstore layout, clustered and nonclustered keys, included columns, filtered indexes, and workload-driven design.
- [PostgreSQL index types](https://www.postgresql.org/docs/current/indexes-types.html) — primary reference for PostgreSQL B-tree, hash, GiST, SP-GiST, GIN, and BRIN operator support.
- [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html) — explains leading-column behavior and skip-scan boundaries for PostgreSQL index methods.
- [SQL Server columnstore indexes overview](https://learn.microsoft.com/sql/relational-databases/indexes/columnstore-indexes-overview?view=sql-server-ver17) — primary description of rowgroups, segments, compression, and analytical execution.
- [Columnstore index architecture](https://learn.microsoft.com/sql/relational-databases/indexes/columnstore-indexes-described?view=sql-server-ver17) — describes segments, dictionaries, rowgroups, and the delete bitmap.
- [Create indexes with included columns](https://learn.microsoft.com/sql/relational-databases/indexes/create-indexes-with-included-columns?view=sql-server-ver17) — official `INCLUDE` semantics, limitations, and covering-index guidance.
- [Create filtered indexes](https://learn.microsoft.com/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver17) — official requirements, benefits, and predicate limitations for SQL Server filtered indexes.
- [Get started with columnstore for operational analytics](https://learn.microsoft.com/sql/relational-databases/indexes/get-started-with-columnstore-for-real-time-operational-analytics?view=sql-server-ver17) — adding nonclustered columnstore to a transactional rowstore table.
- [Optimize index maintenance](https://learn.microsoft.com/sql/relational-databases/indexes/reorganize-and-rebuild-indexes?view=sql-server-ver17) — decision guidance for page density, fragmentation, reorganize, rebuild, and resource cost.
- [Statistics](https://learn.microsoft.com/sql/relational-databases/statistics/statistics?view=sql-server-ver17) — histograms, density, automatic updates, and optimizer estimates.
- [Specify fill factor](https://learn.microsoft.com/sql/relational-databases/indexes/specify-fill-factor-for-an-index?view=sql-server-ver17) — tradeoff between page splits and permanently lower page density.
- [Tune nonclustered indexes with missing-index suggestions](https://learn.microsoft.com/sql/relational-databases/indexes/tune-nonclustered-missing-index-suggestions?view=sql-server-ver17) — explains how equality, inequality, and included-column suggestions must be reconciled with existing indexes and workload evidence.
- [Eight data structures that power databases (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/8-data-structures-that-power-your-databases.md) — broad structure inventory, bounded here by concrete engine and operator semantics.
