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

The relational model organizes data into tables, relates rows through keys, and enforces constraints at the database boundary. SQL describes the result you want; the optimizer chooses scans, seeks, join order, and physical operators that preserve that result. Relational databases are the default when integrity constraints, multi-row transactions, and ad-hoc joins matter more than storing one access pattern in its final read shape.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Relational Boundary

Keep data relational when the database must reject invalid relationships, commit several row changes atomically, or support new query combinations without rebuilding the storage model. Denormalization can remove expensive joins from a hot path, but it creates duplicate state and a write-side consistency obligation; [[Home/Data Persistence/SQL/Normalization Denormalization|normalization and denormalization]] owns that decision.

# Query Processing and Joins

SQL has a logical meaning and a separate physical plan. The common logical order is `FROM`/`JOIN` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`/`TOP`. The optimizer may push predicates or reorder joins physically only when duplicates, `NULL`, and the final result remain equivalent.

```sql
SELECT department, COUNT(*) AS headcount
FROM employees
WHERE hire_date >= DATE '2024-01-01'
GROUP BY department
HAVING COUNT(*) > 5
ORDER BY headcount DESC;
```

`WHERE` cannot see `headcount` because projection happens later; `ORDER BY` generally can. Alias visibility is dialect-specific: PostgreSQL permits a simple output alias in `GROUP BY`, while SQL Server requires the original expression. Portable SQL repeats the grouped or aggregate expression.

```mermaid
graph LR
    P1["Parse syntax to tree"] --> P2["Bind names and types"] --> P3["Optimize candidate plans"] --> P4["Execute physical operators"] --> P5["Read pages and indexes"]
```

Cardinality estimates connect the optimizer to storage. If a predicate is estimated at 10 rows but returns 1,000,000, a nested loop or join order that looked cheap can spill or repeat millions of probes. The SQL remains correct while the plan is expensive.

# Join Semantics

Assume `customers` contains Ada and Lin, while `orders` contains two rows for Ada and none for Lin. A left join returns Ada twice and extends Lin's missing order columns with `NULL`; joins do not deduplicate.

```sql
SELECT c.name, o.total
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
ORDER BY c.id, o.total;
```

```text
name | total
Ada  | 40
Ada  | 70
Lin  | NULL
```

Putting `o.total >= 50` in `ON` preserves Lin as an unmatched left row. Putting it in `WHERE` removes Lin because `NULL >= 50` is unknown.

![[System Design 101/69d04f55628d30c022877891da37ee4804fccff9add65065e6573d63f24483e5.png]]

| Physical join | Strong fit | Cost to watch |
| --- | --- | --- |
| Nested loop | Small outer input with indexed inner probes | Repeated inner work when estimates are wrong |
| Hash join | Large equality joins with enough memory | Build memory and spills |
| Merge join | Inputs already ordered on the join key | Sorting when order is absent |

No join operator is universally fastest. Row counts, ordering, widths, indexes, memory, and cache state determine the plan.

# Transactions and Scale

[[Home/Data Persistence/SQL/Database Locks|Database locks]] and MVCC enforce isolation inside one database; the same note contrasts pessimistic locks with optimistic version predicates for stale application writes. [[Home/Data Persistence/SQL/Replication|Replication]] copies data for availability and read scale, while [[Home/Data Persistence/SQL/Sharding|sharding]] partitions ownership when one primary can no longer handle the write or storage load.

# Questions

> [!QUESTION]- What is the difference between WHERE and HAVING?
> `WHERE` filters rows before grouping and cannot use aggregate results. `HAVING` filters groups after `GROUP BY` and can use aggregates such as `COUNT(*)`. Put non-aggregate predicates in `WHERE` so fewer rows enter grouping.

> [!QUESTION]- What is a stored procedure and how is it different from a function?
> A stored procedure can run multi-step data-changing logic and return result sets or output parameters. A function returns a scalar or table value for use in a query and is constrained by the engine's function rules. In SQL Server, eligible scalar UDFs can be inlined; older or ineligible scalar UDFs may execute row by row and inhibit parallel plans.

> [!QUESTION]- What is a Common Table Expression (CTE) and when should you use a temp table instead?
> A CTE is a statement-scoped named query expression. Do not assume it is materialized or reused. Use a temp table when you need a stable intermediate result, indexes on that result, or guaranteed reuse across several operations.

> [!QUESTION]- What are SQL Server transaction isolation levels?
> SQL Server provides `READ UNCOMMITTED`, `READ COMMITTED`, `REPEATABLE READ`, `SERIALIZABLE`, and `SNAPSHOT`. Read Committed Snapshot Isolation changes `READ COMMITTED` reads to statement-level row versions. `NOLOCK` is not a performance switch: it permits rolled-back, missing, and duplicate observations.

# References

- [Relational database design](https://learn.microsoft.com/azure/architecture/data-guide/relational-data/) — Microsoft guidance on relational structure, integrity, transactions, and workload fit.
- [Query processing architecture guide](https://learn.microsoft.com/sql/relational-databases/query-processing-architecture-guide?view=sql-server-ver17) — SQL Server's parse, bind, optimize, and execute pipeline.
- [PostgreSQL table expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html) — primary reference for joined tables, filtering, grouping, and outer-join semantics.
- [PostgreSQL query path](https://www.postgresql.org/docs/current/query-path.html) — primary overview of parsing, planning, and execution.
- [PostgreSQL SELECT](https://www.postgresql.org/docs/current/sql-select.html) — documents output-name visibility in `ORDER BY` and `GROUP BY`.
- [SQL Server SELECT: GROUP BY](https://learn.microsoft.com/sql/t-sql/queries/select-group-by-transact-sql?view=sql-server-ver17) — documents SQL Server's restriction on aliases defined in the same select list.
- [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) — shows how estimates and costs drive physical scan and join choices.
- [How SQL joins work (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-sql-joins-work.md) — concise join-shape visual, reconciled here with duplicate and `NULL` semantics.
- [Visualizing a SQL query (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/visualizing-a-sql-query.md) — editorial logical-pipeline overview; its incorrect clause-order image remains intentionally omitted.
