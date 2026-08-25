---
publish: true
created: 2026-08-20T20:41:15.619Z
modified: 2026-08-25T13:45:27.873Z
published: 2026-08-25T13:45:27.873Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: Index structures across database engines and the operators, storage layouts, and mutation costs each structure serves.
level:
  - "4"
priority: High
status: Ready to Repeat
---

An index trades storage and write work for a cheaper access path. It can locate or order data without scanning every base row, but “add an index” is still incomplete advice: B+ trees, hash tables, inverted indexes, spatial trees, block summaries, LSM-based layouts, and columnstores accelerate different operators and impose different costs.

The measured query plan supplies the starting point. Equality probes, ordered ranges, text terms, containment, nearest-neighbor search, and large analytical scans do not share one best structure. Rowstore favors selective navigation and ordering. Columnstore compresses columns for broad analytical work. Statistics or physical maintenance matter only after the plan identifies the failing boundary.

# Structure Inventory

| Structure | Physical idea | Strong query fit | Cost or boundary |
|---|---|---|---|
| B-tree / B+ tree | Balanced, ordered pages | Equality, ranges, prefix order, ordered scans | Page splits and write amplification across every maintained index |
| Hash | Key-to-bucket mapping | Equality probes when the engine and workload support it | No useful key ordering or range scan. Collisions and resizing still cost work |
| Inverted index / GIN | Term or element to posting list | Full text, arrays, document containment | Larger posting structures and expensive updates |
| GiST / SP-GiST | Extensible spatial or partitioned search tree | Geometry, nearest neighbor, ranges, tries | Behavior depends on the operator class. Candidates may require recheck |
| BRIN | Summary per consecutive heap-page range | Very large tables correlated with physical order | Weak pruning when row order is uncorrelated with the indexed value |
| LSM tree | Buffer, flush, and compact sorted runs | Sustained writes with point/range reads through run indexes and filters | Compaction and read amplification. It is a storage organization, not a PostgreSQL index method |
| Columnstore | Compressed values grouped by column | Large scans and aggregates over a subset of columns | Point updates and single-row OLTP access |

![[Assets/Data Persistence/Data Persistence-Indexes-18120000.jpg|theme-aware]]

The image is a vocabulary map, not a universal engine diagram. A Bloom filter answers probable membership rather than locating a row. An LSM tree combines several structures, while spatial and inverted indexes expose engine-specific operators.

# B+ Tree Boundary

Conventional SQL Server disk-based clustered and nonclustered rowstore indexes use B+ trees. Root and intermediate pages contain separator keys and child-page pointers. Leaf pages contain the table rows for a clustered index, or nonclustered keys plus row locators and included values for a nonclustered index. A heap has no clustered key order. Its nonclustered indexes locate base rows by RID.

An index on `(TenantId, CreatedAt)` is ordered first by tenant and then by time within each tenant. It can seek an equality tenant and scan a time range without sorting the entire table. It is not an efficient general index for `CreatedAt` across all tenants because the leading key is missing.

PostgreSQL also defaults to B-tree for equality and ordering operators, but its heap and index implementation differs from SQL Server's clustered-rowstore model. SQL Server leaf-layout and key-lookup claims therefore do not transfer automatically to another engine.

# Rowstore Indexes

Rowstore design translates a recurring query shape into an ordered B+ tree. Key columns control navigation and order, included columns cover output from the nonclustered leaf, and a filter limits which rows enter the index. The useful design is the smallest one that supports the required predicates and ordering while earning its write cost.

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

## SARGability and Key Order

SARGability means the optimizer can turn a predicate into a search argument. `CreatedAt >= @from` normally supplies a range. `YEAR(CreatedAt) = @year` usually does not unless the expression is rewritten as a date interval or exposed through an indexable computed column.

- Columns that bound a seek or preserve required order belong in the key.
- Equality predicates usually precede the first range predicate.
- “Most selective first” is not universal. Reusable query prefixes, tenant or partition boundaries, and required ordering can matter more. Estimates and actual plans settle the choice.
- A `GROUP BY`, `ORDER BY`, or join column belongs in the key only when its position supplies useful navigation or order.

## Covering and Filtered Indexes

A nonclustered index covers a query when all required values can be returned from the index. `INCLUDE` fits output or residual values whose order does not help a seek, join, grouping, or sort. Included values still widen leaf rows, consume cache, and add write work.

A filtered index stores only rows satisfying a stable predicate:

```sql
CREATE INDEX IX_Orders_Open_CreatedAt
    ON Orders (TenantId, CreatedAt DESC)
    INCLUDE (OrderNumber, Total)
    WHERE Status = 'Open';
```

This works when open orders are a small, frequently queried subset. The query predicate must imply the filter, and parameterization can prevent the optimizer from proving that implication. Actual and estimated rows, logical reads, lookups, sorts, write rate, size, and overlap with existing prefixes determine whether the index stays.

# Columnstore Indexes

A SQL Server columnstore stores each column separately in compressed rowgroups and can execute eligible operators in batches. Broad queries that scan millions of rows but project a few columns read less data. Point lookups, narrow seeks, and frequent single-row changes usually favor rowstore, although columnstore supports transactional changes and mixed operational-analytics designs.

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

Small inserts first land in delta stores, background tuple movement compresses closed rowgroups, and updates become delete-plus-insert work. Columnstore pays off when the measured analytical savings exceed those maintenance costs.

# Index Maintenance

Maintenance repairs a measured problem. It does not follow a universal fragmentation threshold. Page density, logical fragmentation, statistics quality, query shape, storage, and the operation's own cost all matter.

Logical fragmentation measures whether leaf pages follow key order. Page density measures how full those pages are. On SSD and cloud storage, sparse pages can matter more than out-of-order reads because a range scan must read more pages. A rebuild may appear to fix a plan only because it refreshed statistics. Test that hypothesis first:

```sql
UPDATE STATISTICS dbo.Orders IX_Orders_Tenant_Status_CreatedAt
WITH FULLSCAN;
```

| Operation | What it changes | Cost or limit |
| --- | --- | --- |
| `REORGANIZE` | Incrementally compacts and orders leaf pages | Does not refresh statistics |
| `REBUILD` | Recreates the index and refreshes its statistics | Log, CPU, I/O, locking, and online-operation limits |
| `UPDATE STATISTICS` | Refreshes cardinality distribution | Does not repair page density or ordering |

Fill factor reserves free space during build or rebuild. A lower value is justified only when measured page splits on non-sequential inserts outweigh the permanent cost of reading and caching more pages. The decision sequence is: capture the slow plan and reads, compare estimates with actuals, refresh relevant statistics, measure density and fragmentation for the used partition, then reorganize or rebuild only when the expected read benefit exceeds log, blocking, CPU, and I/O cost.

# Choose by Operator

The right index is the narrowest structure that supports the dominant operator and produces a net workload benefit:

1. The baseline captures the actual plan, row estimates, logical reads, elapsed time, and write rate.
2. The expensive operator is identified: scan, lookup, sort, text match, containment, or aggregation.
3. The candidate structure must support that operator in the target engine.
4. Reads and writes are measured again. An index that speeds one query but doubles write cost or duplicates an existing prefix may be a net loss.

Low cardinality alone does not disqualify an index. A filtered index on a rare status, a covering ordered scan, or a bitmap-capable plan can still be useful. Conversely, a high-cardinality column is not automatically useful when queries do not filter, join, or order by it. Distribution, correlation, result size, and the surrounding plan determine whether the optimizer prefers the index.

# Tradeoffs

- Every secondary index consumes storage and makes inserts, deletes, and indexed-column updates maintain another structure.
- A narrow index may require base-row lookups. A wide covering index reduces lookups but increases leaf size, cache pressure, and write cost.
- Statistics and physical condition affect plan choice. A rebuild can appear to fix a query because it refreshed statistics, so the cause needs evidence before maintenance becomes scheduled work.
- Specialized structures narrow the supported operator set. The advantage is worthwhile only when the workload repeatedly uses that operator.

# References

- [SQL Server index architecture and design guide](https://learn.microsoft.com/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17)
- [PostgreSQL index types](https://www.postgresql.org/docs/current/indexes-types.html)
