---
topic: [Data Persistence]
subtopic: [ORMs]
summary: "Mappers that translate object graphs and LINQ into SQL, a leaky abstraction to understand."
tags: [FolderNote]
publish: true
priority: High
level: ["4"]
status: Creation
qard-deck: "Data Persistence"
qard-topic: "ORMs/ORMs"
flashcard_uid: "e49dfe63"
---

An Object-Relational Mapper connects an object model to a relational database. It translates queries, materializes rows as objects, tracks changes, and turns those changes into SQL. This removes repetitive data-access code. It does not remove the database's query, transaction, and schema rules.

The SQL and round trips that EF Core generates reveal the actual database work. One LINQ expression may become a selective query, an unsupported translation, or a row-multiplying join. Loading two sibling collections in one query can multiply their rows before materialization. The application still owns query plans, indexes, transaction scope, and migration safety.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: d86af7cc-5d66-4a64-a922-47d16ca7ce63 -->
> [!qard]- When is raw SQL a better boundary than an ORM query?
> Raw SQL is a better boundary when a query needs something the ORM cannot express, such as a provider-specific database feature. It is also a better boundary when the SQL the ORM generates has a measured performance problem that cannot be fixed predictably through the ORM. Raw SQL is not automatically faster. The reason to use it is a missing capability or a measured plan problem.
>
> Moving a query into SQL text brings its own obligations:
>
> - **Data values:** values are passed as database parameters, never concatenated into the SQL text. In EF Core, `FromSql` turns interpolated values into parameters (EF Core 7.0 and later; earlier versions use `FromSqlInterpolated`). A `FromSqlRaw` string built by concatenating values reintroduces SQL injection risk.
> - **Identifiers and SQL fragments:** databases do not accept column names, table names or other parts of the SQL structure as parameters. Any dynamic piece is checked against an allow-list of known values before it enters the SQL text.
> - **Provider dependence:** the SQL is written for one database engine, so its tests run against that same engine.
> 
> [EF Core: SQL queries](https://learn.microsoft.com/en-us/ef/core/querying/sql-queries)

<!-- qard-id: 254a62e1-7311-4a83-8029-4ff00d16f442 -->
> [!qard]- Why can eager-loading sibling collections be expensive?
> Loading two collections of the same parent in one SQL query joins both of them to the parent. Each parent row is then repeated for every combination of its matching children, so the row count multiplies instead of adding up. EF Core's documentation calls this a cartesian explosion.
>
> For example, `Include(b => b.Posts).Include(b => b.Contributors)` for one blog with 10 posts and 10 contributors returns 10 × 10 = 100 rows for that blog. Each row repeats the blog's columns together with one post and one contributor. The database, the network and EF Core all process the extra rows.
>
> Two mitigations trade this cost for others:
>
> - **Split query** (`AsSplitQuery()`): EF Core loads the blogs and each collection with separate SQL commands, returning about 1 + 10 + 10 rows. The cost is extra round trips. The commands also run at different moments, so an update between them can produce a combined result that never existed at a single point in time. Running them in a serializable or snapshot transaction gives one consistent view, at the cost of that isolation level's own overhead.
> - **Projection:** selecting only the needed columns makes each duplicated row smaller. It does not reduce the number of rows the join produces.
> 
> [EF Core: Single vs. split queries](https://learn.microsoft.com/en-us/ef/core/querying/single-split-queries)

# References

- [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html)
