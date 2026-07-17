---
publish: true
created: 2026-07-16T15:14:44.878Z
modified: 2026-07-16T15:14:44.878Z
published: 2026-07-16T15:14:44.878Z
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

# Intro

An index is an auxiliary access structure that lets a database locate or order data without scanning every base row. “Add an index” is incomplete advice: B+ trees, hash tables, inverted indexes, spatial trees, block summaries, LSM-based layouts, and columnstores accelerate different operators and impose different write, memory, and maintenance costs.

Start from the operator in the measured query plan. Equality probes, ordered ranges, text terms, containment, nearest-neighbor search, and large analytical scans do not share one best structure. [[Rowstore Index Design]] owns the query-shape decisions for SQL Server covering, composite, and filtered B+ tree indexes. [[Columnstore Indexes]] and [[Index Maintenance]] own their separate storage and operational boundaries.

## Structure Inventory

| Structure | Physical idea | Strong query fit | Cost or boundary |
|---|---|---|---|
| B-tree / B+ tree | Balanced, ordered pages | Equality, ranges, prefix order, ordered scans | Page splits and write amplification across every maintained index |
| Hash | Key-to-bucket mapping | Equality probes when the engine and workload support it | No useful key ordering or range scan; collisions and resizing still cost work |
| Inverted index / GIN | Term or element to posting list | Full text, arrays, document containment | Larger posting structures and expensive updates |
| GiST / SP-GiST | Extensible spatial or partitioned search tree | Geometry, nearest neighbor, ranges, tries | Behavior depends on the operator class; candidates may require recheck |
| BRIN | Summary per consecutive heap-page range | Very large tables correlated with physical order | Weak pruning when row order is uncorrelated with the indexed value |
| LSM tree | Buffer, flush, and compact sorted runs | Sustained writes with point/range reads through run indexes and filters | Compaction and read amplification; it is a storage organization, not a PostgreSQL index method |
| Columnstore | Compressed values grouped by column | Large scans and aggregates over a subset of columns | Point updates and single-row OLTP access |

![[Assets/System Design 101/1405b68c4f060961d25aa5a629a060c516cb1e10f0aac41b4358037ed3065cdb.jpg]]

The image is a vocabulary map, not a universal engine diagram. Bloom filters answer probable membership rather than locating a row; an LSM tree includes several cooperating structures; and products expose spatial and inverted behavior through engine-specific operator classes.

## B+ Tree Boundary

Conventional SQL Server disk-based clustered and nonclustered rowstore indexes use B+ trees. Root and intermediate pages contain separator keys and child-page pointers. Leaf pages contain the table rows for a clustered index, or nonclustered keys plus row locators and included values for a nonclustered index. A heap has no clustered key order; its nonclustered indexes locate base rows by RID.

An index on `(TenantId, CreatedAt)` is ordered first by tenant and then by time within each tenant. It can seek an equality tenant and scan a time range without sorting the entire table. It is not an efficient general index for `CreatedAt` across all tenants because the leading key is missing. The complete design workflow—including SARGability, key order, covering, and filtered predicates—belongs in [[Rowstore Index Design]].

PostgreSQL also defaults to B-tree for equality and ordering operators, but its heap and index implementation differs from SQL Server's clustered-rowstore model. Do not transfer SQL Server leaf-layout or key-lookup claims to another engine without checking that engine's plan and storage documentation.

## Choose from the Operator

Use the narrowest structure that supports the dominant operator and proves a net workload benefit:

1. Capture the actual plan, row estimates, logical reads, elapsed time, and write rate.
2. Identify the operator that dominates cost: scan, lookup, sort, text match, containment, or aggregation.
3. Choose an engine-supported structure for that operator.
4. Re-measure reads and writes. An index that speeds one query but doubles write cost or duplicates an existing prefix may be a net loss.

Low cardinality alone does not disqualify an index. A filtered index on a rare status, a covering ordered scan, or a bitmap-capable plan can still be useful. Conversely, a high-cardinality column is not automatically useful when queries do not filter, join, or order by it. Distribution, correlation, result size, and the surrounding plan determine whether the optimizer prefers the index.

## Tradeoffs

- Every secondary index consumes storage and makes inserts, deletes, and indexed-column updates maintain another structure.
- A narrow index may require base-row lookups; a wide covering index reduces lookups but increases leaf size, cache pressure, and write cost.
- Statistics and physical condition affect plan choice. A rebuild can appear to fix a query because it refreshed statistics; verify the cause before scheduling maintenance.
- Specialized structures narrow the supported operator set. The advantage is worthwhile only when the workload repeatedly uses that operator.

## Questions

> [!QUESTION]- Why is “use a hash index because lookup is O(1)” incomplete database advice?
> The engine must support the hash index for the target table and operator, equality is the only useful ordering relation, and collisions, bucket growth, concurrency, durability, and cache behavior still affect cost. A B+ tree often wins for mixed equality and range work because one structure supports both.

> [!QUESTION]- Why can a low-cardinality column still participate in a useful index?
> A filtered index can store only the rare subset, a composite key can use the column after a useful leading prefix, and a covering index can avoid base-row reads. Measure the complete query plan; cardinality is evidence, not a standalone rule.

## References

- [SQL Server and Azure SQL index architecture and design guide](https://learn.microsoft.com/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17) — primary guide to SQL Server rowstore layout, clustered and nonclustered keys, included columns, filtered indexes, and workload-driven design.
- [PostgreSQL index types](https://www.postgresql.org/docs/current/indexes-types.html) — primary reference for PostgreSQL B-tree, hash, GiST, SP-GiST, GIN, and BRIN operator support.
- [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html) — explains leading-column behavior and skip-scan boundaries for PostgreSQL index methods.
- [SQL Server columnstore indexes overview](https://learn.microsoft.com/sql/relational-databases/indexes/columnstore-indexes-overview?view=sql-server-ver17) — primary description of rowgroups, segments, compression, and analytical execution.
- [Eight data structures that power databases (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/8-data-structures-that-power-your-databases.md) — broad structure inventory, bounded here by concrete engine and operator semantics.
