---
publish: true
created: 2026-07-11T18:14:59.938Z
modified: 2026-07-11T18:14:59.938Z
published: 2026-07-11T18:14:59.938Z
tags:
  - FolderNote
topic:
  - Data Persistence
subtopic:
  - SQL
summary: The relational model and SQL's declarative query language, plus how the engine executes a query versus the order you write it.
priority: High
level:
  - "4"
status: Done
---

# Intro

The relational model organizes data into tables of rows and columns, with relationships expressed through keys rather than nesting. SQL (Structured Query Language) is the declarative standard for querying and manipulating that data: you describe _what_ you want, and the engine decides _how_ to get it. For backend engineers, SQL fluency is non-negotiable because most production systems store critical state in a relational database, and understanding how the engine actually executes queries is what separates correct code from performant code. Relational databases enforce a schema and provide ACID transactions by default across relational workloads; this lets you express complex multi-table queries without denormalizing your data model upfront.

<nav style="--map-accent: 249, 115, 22;" class="folder-structure-map" aria-label="SQL section map"><div class="folder-map-children"><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Indexes">Indexes</span></span></div><p>An index is a sorted B+ tree structure that lets the engine avoid full table scans, trading write overhead and storage.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Data Persistence/SQL/Indexes.md" data-tooltip-position="top" aria-label="Indexes">Indexes</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Normalization Denormalization">Normalization Denormalization</span></span></div><p>Normalization structures a relational schema to eliminate redundancy and prevent update anomalies, trading read performance since normalized data requires joins.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Data Persistence/SQL/Normalization Denormalization.md" data-tooltip-position="top" aria-label="Normalization Denormalization">Normalization Denormalization</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Replication">Replication</span></span></div><p>Replication keeps copies of the same data on multiple nodes to spread read load, survive failures, and recover from disasters.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Data Persistence/SQL/Replication.md" data-tooltip-position="top" aria-label="Replication">Replication</a></span></article><article class="folder-map-node"><div class="folder-map-node-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="folder-map-entry-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="folder-map-node-title" title="Sharding">Sharding</span></span></div><p>Sharding is horizontal partitioning that splits a database's rows across independent instances to scale writes and data volume beyond one node.</p></div><span class="folder-map-hit"><a class="internal-link" href="Home/Data Persistence/SQL/Sharding.md" data-tooltip-position="top" aria-label="Sharding">Sharding</a></span></article></div><style>
.folder-structure-map {
  --map-accent: 16, 185, 129;
  --map-gap: 0.75rem;
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 0.75rem;
  container-name: folder-map;
  container-type: inline-size;
}
.folder-map-children {
  /* Flex (not grid) so each card sizes to its own title — a long title widens
     its card and pushes to another row instead of being truncated, and rows
     grow to fill the width with no empty tracks when there are few cards. */
  display: flex;
  flex-wrap: wrap;
  gap: var(--map-gap);
}
.folder-map-node {
  position: relative;
  /* No overflow:hidden here: on a flex item that collapses min-width:auto to 0,
     letting the card shrink below its title + note-count and clip them. Without
     it, the card's min size is its content, so long titles widen the card (and
     wrap to another row) instead of being cut off. The accent gradient gets its
     own border-radius below to stay inside the rounded corners. */
  flex: 1 1 12rem;
  min-height: 2.75rem;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.folder-map-node::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--map-accent), 0.09) 0%,
    rgba(var(--map-accent), 0.04) 38%,
    rgba(var(--map-accent), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.folder-map-node:hover,
.folder-map-node:focus-within {
  border-color: rgba(var(--map-accent), 0.55);
  background-color: color-mix(in srgb, rgb(var(--map-accent)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.folder-map-node:hover::before,
.folder-map-node:focus-within::before {
  opacity: 1;
}
.folder-map-node-body {
  position: relative;
  z-index: 0;
  display: flex;
  min-height: 2.75rem;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  padding: 0.5rem 0.75rem;
}
.folder-map-node-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.folder-map-node-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.folder-map-entry-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--map-accent));
}
.folder-map-entry-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}
.folder-map-node-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
}
.folder-map-node p {
  display: none;
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.folder-map-node-count {
  display: block;
  flex: 0 0 auto;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  white-space: nowrap;
}
.folder-map-hit {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.folder-map-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.folder-map-hit a:focus-visible {
  outline: 2px solid rgb(var(--map-accent));
  outline-offset: -0.3rem;
}
.folder-map-empty {
  margin: 1rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
}
@container folder-map (min-width: 40rem) {
  .folder-map-node {
    min-height: 6rem;
  }
  .folder-map-node-body {
    min-height: 6rem;
    justify-content: flex-start;
    padding: 0.85rem 0.9rem;
  }
  .folder-map-node p { display: block; }
}
@container folder-map (min-width: 64rem) {
  .folder-map-node,
  .folder-map-node-body { min-height: 6.75rem; }
}
@media (prefers-reduced-motion: reduce) {
  .folder-map-node { transition: none; }
  .folder-map-node::before { transition: none; }
  .folder-map-node:hover,
  .folder-map-node:focus-within { transform: none; }
}
</style></nav>

## Logical Query Execution Order

SQL is written in one order but executed in another.

- **How you WRITE it**

```mermaid
graph LR
    W1["1 SELECT name total"] --- W2["2 FROM orders"] --- W3["3 JOIN customers"] --- W4["4 WHERE year = 2025"] --- W5["5 GROUP BY name"] --- W6["6 HAVING total over 100"] --- W7["7 ORDER BY total"]
```

- **How the engine EXECUTES it**

```mermaid
graph LR
    L1["1 FROM orders"] --> L2["2 JOIN customers ON id"] --> L3["3 WHERE year = 2025"] --> L4["4 GROUP BY name"] --> L5["5 HAVING total over 100"] --> L6["6 SELECT name total"] --> L7["7 ORDER BY total"]
```

### Rules of Thumb

Think of it as: **"The engine builds a table first, then decorates it."**

1. **FROM/JOIN first, SELECT near last.** The engine needs to know _which tables_ before it can do anything.
2. **WHERE before GROUP BY.** Filter rows _before_ grouping. Cheaper to discard rows early.
3. **HAVING is WHERE for groups.** Use it only when filtering on an aggregate; otherwise use `WHERE`.
4. **SELECT runs late.** Column aliases from `SELECT` are invisible to `WHERE` and `GROUP BY`, but visible to `ORDER BY`.
5. **ORDER BY then TOP/LIMIT last.** Sorting is expensive. Slicing happens only after everything else is settled.

A concrete example showing the difference between write order and execution order:

```sql
-- You write SELECT first, but the engine starts at FROM
SELECT department, COUNT(*) AS headcount
FROM employees
WHERE hire_date >= '2024-01-01'
GROUP BY department
HAVING COUNT(*) > 5
ORDER BY headcount DESC;

-- Engine order: FROM employees -> WHERE hire_date filter -> GROUP BY department
-- -> HAVING count filter -> SELECT columns -> ORDER BY headcount
-- The alias 'headcount' works in ORDER BY because SELECT runs before it.
-- The same alias fails in WHERE because SELECT hasn't run yet.
```

## Questions

> [!QUESTION]- What is the difference between WHERE and HAVING?
> `WHERE` filters rows before grouping and cannot reference aggregate functions. `HAVING` filters groups after `GROUP BY` and can use aggregates like `COUNT(*)` or `SUM(amount)`. If a condition doesn't depend on an aggregate, always put it in `WHERE` because it reduces the rows that enter the grouping step.

> [!QUESTION]- What is a stored procedure and how is it different from a function?
> A stored procedure executes multi-step logic, can modify data, and returns result sets or output parameters. A function returns a value (scalar or table) and is designed to be called inline in a query. In SQL Server, legacy (non-inlined) scalar UDFs are evaluated row-by-row and can inhibit parallel query plans. SQL Server 2019+ may inline eligible scalar UDFs, avoiding this. Inline table-valued functions (iTVFs) are expanded like macros and don't have the parallelism problem.

> [!QUESTION]- What is a Common Table Expression (CTE) and when should you use a temp table instead?
> A CTE is a named temporary result set defined with `WITH`, scoped to a single statement. It improves readability and enables recursive queries for hierarchical data. A CTE is generally treated like an inline view; don't assume it's materialized or reused across multiple references. If you reference the same CTE twice in a query, the optimizer may execute the underlying query twice. For guaranteed reuse of an expensive result, use a temp table instead.

> [!QUESTION]- What are SQL Server transaction isolation levels?
> The five isolation levels are: `READ UNCOMMITTED` (dirty reads allowed), `READ COMMITTED` (default, reads only committed data), `REPEATABLE READ` (re-reading a row returns the same data), `SERIALIZABLE` (full isolation, highest blocking), and `SNAPSHOT` (transaction-level consistent snapshot via row versioning in tempdb). Separately, Read Committed Snapshot Isolation (RCSI) is a database-level option (`ALTER DATABASE ... SET READ_COMMITTED_SNAPSHOT ON`) that makes `READ COMMITTED` use statement-level row versioning instead of shared locks, eliminating most reader-writer blocking without changing the isolation level name. Switching to `READ UNCOMMITTED` or `NOLOCK` is a common anti-pattern: you can read rolled-back, partially-written, or duplicate data.

> [!QUESTION]- How do you diagnose and optimize a slow query?
> Start with the execution plan (`SET STATISTICS IO ON` or the graphical plan in SSMS). Look for table scans on large tables (missing index), key lookups (a non-clustered index was used but the engine must go back to the clustered index, or the heap via RID lookup, for extra columns; fix by including those columns in the index), and fat arrows indicating large row estimates. Check for stale statistics (`UPDATE STATISTICS`) when cardinality estimates are wildly off. For repeated slow queries, investigate parameter sniffing: a plan compiled for one parameter value may be terrible for another, fixable with `OPTION (RECOMPILE)` or `OPTIMIZE FOR`.

## References

- [Query processing architecture guide (Microsoft Learn)](https://learn.microsoft.com/sql/relational-databases/query-processing-architecture-guide?view=sql-server-ver16)
- [WITH common\_table\_expression (T-SQL)](https://learn.microsoft.com/sql/t-sql/queries/with-common-table-expression-transact-sql?view=sql-server-ver16)
- [Joins — Microsoft Learn](https://learn.microsoft.com/sql/relational-databases/performance/joins?view=sql-server-ver16)
- [Execution plans overview](https://learn.microsoft.com/sql/relational-databases/performance/execution-plans?view=sql-server-ver16)
- [SQL Server index design guide](https://learn.microsoft.com/sql/relational-databases/sql-server-index-design-guide?view=sql-server-ver17)
- [Use The Index, Luke](https://use-the-index-luke.com/)
