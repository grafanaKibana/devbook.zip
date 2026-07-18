---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "The relational model, SQL's declarative query language, and the engine concepts behind it."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

# Intro

The relational model organizes data into tables, relates rows through keys, and enforces constraints at the database boundary. SQL describes the result you want; the optimizer chooses scans, seeks, join order, and physical operators that preserve that result. Relational databases are the default when integrity constraints, multi-row transactions, and ad-hoc joins matter more than storing one access pattern in its final read shape.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Relational Boundary

Keep data relational when the database must reject invalid relationships, commit several row changes atomically, or support new query combinations without rebuilding the storage model. Denormalization can remove expensive joins from a hot path, but it creates duplicate state and a write-side consistency obligation; [[Normalization Denormalization]] owns that decision.

## Query Processing and Joins

SQL has a logical meaning and a separate physical plan. `FROM` and `JOIN` establish rows before `WHERE`, grouping, projection, and ordering, while the optimizer may reorder physical work when the result remains equivalent. Alias visibility is dialect-specific: `WHERE` cannot use a `SELECT` alias and `ORDER BY` generally can, but PostgreSQL permits a simple output alias in `GROUP BY` whereas SQL Server requires the original expression. [[SQL Query Processing and Joins]] owns the complete pipeline, outer-join `NULL` behavior, the join diagram, and plan selection.

## Transactions and Scale

[[Database Locks]] and MVCC enforce isolation inside one database. [[Optimistic Concurrency Control]] handles stale application writes with conditional versions. [[Replication]] copies data for availability and read scale, while [[Sharding]] partitions ownership when one primary can no longer handle the write or storage load.

## Questions

> [!QUESTION]- What is the difference between WHERE and HAVING?
> `WHERE` filters rows before grouping and cannot use aggregate results. `HAVING` filters groups after `GROUP BY` and can use aggregates such as `COUNT(*)`. Put non-aggregate predicates in `WHERE` so fewer rows enter grouping.

> [!QUESTION]- What is a stored procedure and how is it different from a function?
> A stored procedure can run multi-step data-changing logic and return result sets or output parameters. A function returns a scalar or table value for use in a query and is constrained by the engine's function rules. In SQL Server, eligible scalar UDFs can be inlined; older or ineligible scalar UDFs may execute row by row and inhibit parallel plans.

> [!QUESTION]- What is a Common Table Expression (CTE) and when should you use a temp table instead?
> A CTE is a statement-scoped named query expression. Do not assume it is materialized or reused. Use a temp table when you need a stable intermediate result, indexes on that result, or guaranteed reuse across several operations.

> [!QUESTION]- What are SQL Server transaction isolation levels?
> SQL Server provides `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`, and `SNAPSHOT`. Read Committed Snapshot Isolation changes `READ COMMITTED` reads to statement-level row versions. `NOLOCK` is not a performance switch: it permits rolled-back, missing, and duplicate observations.

## References

- [Relational database design](https://learn.microsoft.com/azure/architecture/data-guide/relational-data/) — Microsoft guidance on relational structure, integrity, transactions, and workload fit.
- [Query processing architecture guide](https://learn.microsoft.com/sql/relational-databases/query-processing-architecture-guide?view=sql-server-ver17) — SQL Server's parse, bind, optimize, and execute pipeline.
- [PostgreSQL table expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html) — primary reference for joined tables, filtering, grouping, and outer-join semantics.
- [How SQL joins work (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-sql-joins-work.md) — concise join-shape visual, corrected in the focused sibling with duplicate and `NULL` semantics.
- [Visualizing a SQL query (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/visualizing-a-sql-query.md) — editorial logical-pipeline overview; its incorrect clause-order image remains intentionally omitted.
