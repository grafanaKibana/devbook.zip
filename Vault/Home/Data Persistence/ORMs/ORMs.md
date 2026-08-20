---
topic:
  - Data Persistence
subtopic:
  - ORMs
summary: "Mappers that translate object graphs and LINQ into SQL, a leaky abstraction to understand."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Creation
---

An Object-Relational Mapper connects an object model to a relational database. It translates queries, materializes rows as objects, tracks changes, and turns those changes into SQL. This removes repetitive data-access code. It does not remove the database's query, transaction, and schema rules.

Inspect the SQL and round trips EF Core generates. One LINQ expression may become a selective query, an unsupported translation, or a row-multiplying join. Loading two sibling collections in one query can multiply their rows before materialization. The application still owns query plans, indexes, transaction scope, and migration safety.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- When is raw SQL a better boundary than an ORM query?
> Raw SQL fits a provider-specific query, bulk operation, or execution-plan requirement that the ORM cannot express predictably. It should be parameterized, tested against the production database engine, and kept behind a narrow data-access boundary.

> [!QUESTION]- Why can eager loading several collections be expensive?
> Sibling collection joins can multiply rows, duplicating parent data across the result. Split queries or purpose-built projections avoid that multiplication, but split queries add commands and may need an explicit consistency boundary.

# References

- [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html)
