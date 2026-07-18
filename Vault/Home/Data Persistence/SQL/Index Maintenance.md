---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "Diagnosing SQL Server index density, fragmentation, and statistics before choosing maintenance."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

Index maintenance should repair a measured problem, not run from a universal fragmentation threshold. Page density, logical fragmentation, statistics quality, query shape, storage, and maintenance cost all matter. Start with the slow plan and its I/O; then choose the smallest operation that changes the failing boundary.

## Diagnose Before Rebuilding

Logical fragmentation measures whether leaf pages follow key order. Page density measures how full the pages are. On SSD and cloud storage, out-of-order reads often matter less than sparse pages for a large range scan because low density increases the number of pages read.

A rebuild can improve a plan because it recreates index statistics, not because reordered pages mattered. Test that hypothesis first:

```sql
UPDATE STATISTICS dbo.Orders IX_Orders_Customer_CreatedAt
WITH FULLSCAN;
```

If estimates and the plan improve after the statistics update, a rebuild was not needed to prove the cause.

## Operations

| Operation | What it changes | Cost or limit |
|---|---|---|
| `REORGANIZE` | Incrementally compacts and orders leaf pages | Does not refresh statistics |
| `REBUILD` | Recreates the index and refreshes its statistics | Log, CPU, I/O, locking, and edition/index-type limits for online work |
| `UPDATE STATISTICS` | Refreshes cardinality distribution | Does not repair page density or ordering |

Fill factor leaves free space when an index is built or rebuilt. Lower it only when measured page splits on non-sequential insert keys justify permanently reading and caching more pages. Sequential keys usually do not benefit from reserved space throughout the index.

## Decision Sequence

1. Capture the slow execution plan and logical/physical reads.
2. Compare estimated and actual rows.
3. Refresh the relevant statistics if estimates are stale.
4. Measure page density and fragmentation for the index and partition used by the query.
5. Reorganize or rebuild only when the expected read benefit exceeds the operation's log, blocking, CPU, and I/O cost.

## References

- [Optimize index maintenance](https://learn.microsoft.com/sql/relational-databases/indexes/reorganize-and-rebuild-indexes?view=sql-server-ver17) — official decision guidance for page density, fragmentation, reorganize, rebuild, and resource cost.
- [Statistics](https://learn.microsoft.com/sql/relational-databases/statistics/statistics?view=sql-server-ver17) — primary explanation of histograms, density, automatic updates, and optimizer estimates.
- [Specify fill factor](https://learn.microsoft.com/sql/relational-databases/indexes/specify-fill-factor-for-an-index?view=sql-server-ver17) — official tradeoff between page splits and permanently lower page density.
