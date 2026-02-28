---
{"dg-publish":true,"permalink":"/software-engineering/03-data-persistence/sql/indexes/","noteIcon":"3"}
---


# Intro

An index is a sorted auxiliary structure that helps the SQL engine avoid full table scans for many read queries. In SQL Server, indexes are implemented as B+ trees, so lookup cost grows much slower than row count (`O(log n)` instead of `O(n)` for many lookup patterns). The tradeoff is write overhead and extra storage.

## When indexes help and when they hurt

- Indexes help when queries filter, join, or sort on selective columns.
- Indexes hurt write-heavy tables because inserts, updates, and deletes also maintain index pages.
- Indexes consume extra disk space; wider keys and many indexes increase storage and memory pressure.

![03 Data Persistence-Indexes-20260210205141994](/img/user/Assets/03%20Data%20Persistence/03%20Data%20Persistence-Indexes-20260210205141994.png)

## Mental model: how index pages are organized

### Heap

**A heap** is a table without a clustered index. Rows are not kept in key order, so search typically requires scanning pages sequentially.

### Index structure

An index is a tree-like, sorted on-disk structure where key values guide navigation to smaller and smaller ranges of data.

The B+ tree has three logical levels:

1. Root node
    1. Stores key ranges and pointers to intermediate nodes
2. Intermediate level
    1. Stores key ranges and pointers to leaf nodes
3. Leaf level
    1. Contains the final entries for the range (data rows for clustered indexes, row locators for nonclustered indexes)

### Clustered index

In a clustered index, leaf pages are the table's real data pages.

- Root rows store key values and pointers to intermediate pages.
- Intermediate rows store key values and pointers further down.
- Pages at each level are linked as a doubly linked list for range scans.
- A table can have only one clustered index because table rows can be physically ordered only one way at a time.

#### Diagram: Clustered index page hierarchy

![03 Data Persistence-Indexes-20260218030128746.png](/img/user/Assets/03%20Data%20Persistence/03%20Data%20Persistence-Indexes-20260218030128746.png)

This diagram shows the clustered index B+ tree shape: one root page points to intermediate index pages, and the leaf level contains the actual table rows linked left-to-right for range scans.

#### Diagram: Clustered index seek path

![03 Data Persistence-Indexes-20260218023449265.png](/img/user/Assets/03%20Data%20Persistence/03%20Data%20Persistence-Indexes-20260218023449265.png)

This diagram shows an index seek path through key ranges: the engine starts at the root, chooses the matching intermediate branch, and reaches the leaf page that holds the target row.

### Nonclustered index

The leaf level of a nonclustered index stores key columns plus a pointer to actual table data.

#### With a clustered index on the table

Leaf entries store the clustered key value (key lookup path).

![03 Data Persistence-Indexes-20260218023920650.png](/img/user/Assets/03%20Data%20Persistence/03%20Data%20Persistence-Indexes-20260218023920650.png)

#### Without a clustered index (heap)

Leaf entries store a row identifier (RID): file, page, and slot location.

![03 Data Persistence-Indexes-20260218024130357.png](/img/user/Assets/03%20Data%20Persistence/03%20Data%20Persistence-Indexes-20260218024130357.png)

## Simplified seek example

Assume a clustered index on `ID` with values from `1` to `5000`. We need `ID = 1456`.

1. At the root, pick the branch for `1251..2500`.
2. In that intermediate page, pick the leaf page for `1251..1500`.
3. Scan inside that leaf page to find `1456`.

The search space drops from 5000 rows to one small page range (illustrative page sizing).

## Tradeoffs

- **Benefits**: faster lookups, faster ordered reads, better range filtering.
- **Costs**: slower writes, extra storage, low-selectivity columns often give little benefit.

## Design recommendations

- Keep indexes minimal on frequently updated tables.
- Add more indexes on large, read-heavy tables after measuring query plans.
- Prefer short, stable, and selective clustered keys (often the primary key).
- Put high-impact `WHERE` columns first in composite indexes.
- Prefer high-cardinality columns where possible.
- Index computed columns only when expressions are deterministic.

## Questions

> [!QUESTION]- What is an index and what types exist?
> An index is an additional on-disk/in-memory structure (often a B-tree/B+ tree) that speeds up access via seeks and ordered scans. Common types are clustered and nonclustered indexes, plus unique, composite, filtered/partial, and full-text indexes depending on DB engine.

> [!QUESTION]- How does ordering work for clustered vs nonclustered indexes?
> In a clustered index, the leaf level is the table data itself, physically ordered by the clustered key. In a nonclustered index, the leaf level is ordered by nonclustered key and stores locators to data rows.

> [!QUESTION]- Why cannot a table have two clustered indexes?
> A clustered index defines physical row order. One table can be physically ordered only one way at a time.

> [!QUESTION]- If clustered tables are often faster for reads, why would you still use a heap?
> Use this for bulk-load/staging scenarios and append-heavy transient data where ordered access is not required.

> [!QUESTION]- How do fill factor and page splits affect write performance?
> Lower fill factor leaves room on pages and can reduce splits, but increases storage and read IO.

> [!QUESTION]- Can a clustered index key contain duplicates?
> Yes. SQL Server makes keys unique internally by adding a hidden uniquifier when needed.

> [!QUESTION]- How are rows located from a nonclustered index when the base table is a heap?
> The nonclustered leaf stores a RID pointing to file/page/slot.

> [!QUESTION]- Why not index every column?
> Extra indexes increase write cost, memory pressure, and maintenance; some low-selectivity indexes are not useful.

> [!QUESTION]- Do you always make the primary key clustered?
> No. It is common, but choose clustered key by access patterns, size, and update behavior.

> [!QUESTION]- What is the difference between composite and covering indexes?
> Composite defines key columns used for seek/order. Covering also includes non-key columns to avoid lookups.

> [!QUESTION]- Can you index only a subset of rows?
> Yes, with filtered indexes (where supported by engine).

## Links

- [SQL Server and Azure SQL index architecture and design guide](https://learn.microsoft.com/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17)
- [Clustered and nonclustered indexes described](https://learn.microsoft.com/sql/relational-databases/indexes/clustered-and-nonclustered-indexes-described?view=sql-server-ver17)
- [Clustered Index Structures](https://learn.microsoft.com/en-us/previous-versions/sql/sql-server-2008-r2/ms177443(v=sql.105))
- [Interview question list on indexes](https://habr.com/ru/post/247373/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/03 Data Persistence/03 Data Persistence\|03 Data Persistence]]
>
> **Pages**
> - [[Software Engineering/03 Data Persistence/SQL/Normalization Denormalization\|Normalization Denormalization]]
<!-- whats-next:end -->
