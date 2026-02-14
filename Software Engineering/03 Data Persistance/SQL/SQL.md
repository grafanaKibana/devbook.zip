---
topic:
  - Data Persistance
subtopic:
  - SQL
level: ["1"]
priority: Medium
status: Not-Started
tags:
  - FolderNote
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

```dataviewjs
const cur = dv.current();
const curFolder = cur.file.folder;
const curPath = cur.file.path;

const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const children = dv.pages()
  .where(p => p.file.folder.startsWith(curFolder + "/"))
  .where(p => p.file.folder.split("/").length === curFolder.split("/").length + 1)
  .where(p => p.file.name === p.file.folder.split("/").slice(-1)[0])
  .where(p => isFolderNote(p))
  .sort(p => p.file.folder, "asc");

if (children.length) {
  dv.header(2, "Children");
  dv.list(children.map(p => p.file.link));
}

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");

if (pages.length) {
  dv.header(2, "Pages");
  dv.list(pages.map(p => p.file.link));
}
```
---
## Intro

## Deeper Explanation

[[Indexes]]

[[Normalization Denormalization|Normalization/Denormalization]]

## CommonTableExpression - CTE

### Questions

> [!QUESTION]- What is normalization? What are its first three normal forms?
> Answer is not provided in the source interview list; see Further Reading.

> [!QUESTION]- What is denormalization? When is it useful?
> Answer is not provided in the source interview list; see Further Reading.

> [!QUESTION]- What is the logical SQL query execution order?
> 1. FROM
> 2. ON
> 3. JOIN
> 4. WHERE
> 5. GROUP BY
> 6. WITH CUBE or WITH ROLLUP
> 7. HAVING
> 8. SELECT
> 9. DISTINCT
> 10. ORDER BY
> 11. TOP
> A common logical order is: `FROM` (incl. `JOIN`/`ON`) -> `WHERE` -> `GROUP BY` -> `HAVING` -> `SELECT` -> `DISTINCT` -> `ORDER BY` -> `TOP`/`LIMIT`/`OFFSET` (exact details vary by engine).
    
## Questions

> [!QUESTION]- In what structure is data stored in SQL?
> In the relational model, data is stored as relations: tables with columns (attributes) and rows (tuples). Tables are grouped into schemas/databases, and relationships are represented via keys (primary/foreign) rather than by nesting objects.

> [!QUESTION]- What is a primary key?
> A primary key is a constraint that uniquely identifies each row in a table. It must be unique and not null, can be single-column or composite, and is typically backed by an index (implementation depends on the DB engine).

> [!QUESTION]- What is a foreign key?
> A foreign key is a constraint that enforces a relationship between tables by requiring values in one table to reference existing values in a primary/unique key of another table. It protects referential integrity and can define cascading actions on update/delete.

> [!QUESTION]- What is a unique key?
> A unique key (UNIQUE constraint) enforces that values in a column (or set of columns) are unique across the table. Unlike a primary key, a table can have multiple unique constraints; null handling varies by DB engine.

> [!QUESTION]- What table constraints exist?
> Typical constraints include: `NOT NULL`, `CHECK`, `DEFAULT`, `UNIQUE`, `PRIMARY KEY`, and `FOREIGN KEY`. They are used to enforce domain rules, uniqueness, and referential integrity at the database level.

> [!QUESTION]- What JOIN types exist?
> Common JOINs are: `INNER JOIN`, `LEFT OUTER JOIN`, `RIGHT OUTER JOIN`, `FULL OUTER JOIN`, and `CROSS JOIN`. A self-join is when you join a table to itself; semi/anti joins are often expressed via `EXISTS`/`NOT EXISTS`.

> [!QUESTION]- What does DISTINCT do?
> `DISTINCT` removes duplicate rows from the result set (uniqueness is evaluated across the selected columns). It is applied after `SELECT` projection in the logical processing order.

> [!QUESTION]- What is the difference between WHERE and HAVING?
> `WHERE` filters rows before grouping/aggregation. `HAVING` filters groups after `GROUP BY` and can use aggregate expressions like `COUNT(*)` or `SUM(amount)`.

> [!QUESTION]- What is the difference between CHAR and VARCHAR?
> `CHAR(n)` is fixed-length: values are padded to length `n`. `VARCHAR(n)` is variable-length: it stores only the actual length (plus small overhead). Use `NCHAR`/`NVARCHAR` when you need Unicode (engine-specific).

> [!QUESTION]- What is a stored procedure and how is it different from a function?
> A stored procedure is server-side code stored in the database and executed by name; it can encapsulate multi-step logic, perform data modifications, and return result sets. Functions usually return a value (scalar/table) and are often more restricted in side effects (varies by DB engine).

> [!QUESTION]- What is a trigger?
> A trigger is database code that automatically runs in response to events (e.g., `INSERT`, `UPDATE`, `DELETE`, sometimes DDL events). It is commonly used for enforcing rules, auditing, and maintaining derived data.

> [!QUESTION]- What is a subquery?
> A subquery is a query nested inside another query (in `SELECT`, `FROM`, or `WHERE`/`HAVING`). It can be correlated (depends on outer row) or non-correlated, and can be used for filtering, projection, or building derived tables.

> [!QUESTION]- What is a transaction?
> A transaction groups multiple operations into a single unit of work that either fully commits or rolls back. Transactions provide guarantees like atomicity and isolation, controlled by the database's transaction and isolation model.

> [!QUESTION]- What is a Common Table Expression?
> A CTE (Common Table Expression) is a named, temporary result set defined with `WITH` and used within a single statement. It improves readability, enables query composition, and supports recursion for hierarchical data.

## Further Reading
