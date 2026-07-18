---
publish: true
created: 2026-07-16T15:14:45.064Z
modified: 2026-07-16T15:14:45.064Z
published: 2026-07-16T15:14:45.064Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: Designing SQL Server composite, covering, and filtered rowstore indexes from the query shape and measured plan.
level:
  - "4"
priority: High
status: Creation
---

# Intro

Rowstore index design translates one recurring query shape into an ordered SQL Server B+ tree. Key columns determine navigation and order; included columns exist only at the nonclustered leaf to cover output; a filter limits which rows exist in the index. The target is not “maximum selectivity.” It is the smallest index that supports the required predicates and ordering, avoids expensive lookups when justified, and still pays for its write cost.

[[Indexes]] owns the cross-engine structure inventory. This note stays inside conventional SQL Server disk-based clustered and nonclustered rowstore indexes.

## Start from the Query Shape

Consider a tenant-scoped order screen:

```sql
SELECT OrderNumber, Total, CreatedAt
FROM Orders
WHERE TenantId = @tenantId
  AND Status = @status
  AND CreatedAt >= @from
ORDER BY CreatedAt DESC;
```

One candidate is:

```sql
CREATE INDEX IX_Orders_Tenant_Status_CreatedAt
    ON Orders (TenantId, Status, CreatedAt DESC)
    INCLUDE (OrderNumber, Total);
```

The two equality predicates establish a tenant/status prefix, `CreatedAt` bounds the range and provides output order, and the two selected values cover the query without widening upper B+ tree levels. This index is not a general solution for `WHERE Status = @status` because that query omits the leading `TenantId` key.

## SARGability and Key Order

SARGability describes a predicate expression the optimizer can turn into a useful search argument. It is not a permanent property of a column. `CreatedAt >= @from` is normally SARGable; `YEAR(CreatedAt) = @year` usually cannot seek the same ordinary key range unless the expression is rewritten as a date interval or exposed through an indexable computed column.

Choose key columns from the operations the index must support:

- Put columns needed to bound a seek or preserve required ordering in the key.
- Equality predicates usually precede the first range predicate so later ordering and range navigation remain useful.
- Among equality columns constrained together, “most selective first” is not a universal rule. Lead with the prefix reused by important queries, partition or tenant boundaries, and required order. Selectivity matters when a prefix is queried independently and when the optimizer compares the cost of a seek plus lookups with a scan.
- A column in `GROUP BY`, `ORDER BY`, or a join is not automatically a key. Add it only when its position supplies useful ordering, grouping, or navigation for the actual plan.

For `(TenantId, Status, CreatedAt)`, a query on `TenantId` can use the leading prefix. A query on `TenantId` and `CreatedAt` can seek the tenant range and apply `CreatedAt` as a residual condition because the key skips `Status`. Whether a second index is justified depends on that query's frequency and cost.

## Covering and Included Columns

A nonclustered index covers a query when the engine can return every required value from the index. Without coverage, a seek may perform a Key Lookup into the clustered index for each qualifying row. Ten lookups may be cheap; hundreds of thousands may dominate the plan.

Use `INCLUDE` for values needed only for output or residual evaluation when their order does not help navigation. Included values do not participate in key ordering and do not belong in upper B+ tree levels, but they still widen leaf rows, consume cache, and add write work. Do not cover every projection by default. Compare logical reads and write cost, and remember that the clustered key is already carried by a nonunique nonclustered index.

## Filtered Indexes

A filtered index stores only rows satisfying a stable predicate:

```sql
CREATE INDEX IX_Orders_Open_CreatedAt
    ON Orders (TenantId, CreatedAt DESC)
    INCLUDE (OrderNumber, Total)
    WHERE Status = 'Open';
```

This can be much smaller than indexing every status when open orders are a small, frequently queried subset. The query predicate must imply the filter, and parameterization can prevent the optimizer from proving that implication. Inspect the actual plan rather than assuming the filtered index is eligible.

## Verification

Compare the candidate with the current plan under representative parameter values:

- actual versus estimated rows at each operator;
- seek, residual predicate, scan, sort, and Key Lookup operators;
- logical reads and elapsed time for both selective and broad inputs;
- insert/update/delete rate, index size, and overlap with existing prefixes.

Keep the index only when the read improvement pays the ongoing write and storage cost. Consolidate overlapping indexes when one ordered prefix can safely serve both workloads, but do not merge them into a wide catch-all that costs more than the lookups it removes.

## Questions

> [!QUESTION]- Should the most selective equality column always lead a composite index?
> No. If all equality columns are constrained, their internal order often matters less than which leading prefix other important queries can reuse. Choose from the workload's prefix and ordering requirements, then verify selectivity and estimates in the actual plan.

> [!QUESTION]- When should a selected column be included instead of keyed?
> Include it when the query needs the value but its ordering does not help a seek, join, grouping, or required sort. Keep it in the key when its position supplies navigation or order. Either choice still has storage and write cost.

## References

- [SQL Server and Azure SQL index architecture and design guide](https://learn.microsoft.com/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17) — primary guidance for query considerations, key order, included columns, filtered indexes, and clustered-key design.
- [Create indexes with included columns](https://learn.microsoft.com/sql/relational-databases/indexes/create-indexes-with-included-columns?view=sql-server-ver17) — official `INCLUDE` semantics, limitations, and covering-index design guidance.
- [Create filtered indexes](https://learn.microsoft.com/sql/relational-databases/indexes/create-filtered-indexes?view=sql-server-ver17) — official requirements, benefits, and predicate limitations for SQL Server filtered indexes.
- [Tune nonclustered indexes with missing-index suggestions](https://learn.microsoft.com/sql/relational-databases/indexes/tune-nonclustered-missing-index-suggestions?view=sql-server-ver17) — explains how equality, inequality, and included-column suggestions must be reconciled with existing indexes and workload evidence.
