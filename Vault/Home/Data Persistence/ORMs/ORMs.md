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
qard-deck: "Data Persistence"
qard-topic: "ORMs/ORMs"
flashcard_uid: "e49dfe63"
---

An Object-Relational Mapper connects an object model to a relational database. It translates queries, materializes rows as objects, tracks changes, and turns those changes into SQL. This removes repetitive data-access code. It does not remove the database's query, transaction, and schema rules.

Inspect the SQL and round trips EF Core generates. One LINQ expression may become a selective query, an unsupported translation, or a row-multiplying join. Loading two sibling collections in one query can multiply their rows before materialization. The application still owns query plans, indexes, transaction scope, and migration safety.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: d86af7cc-5d66-4a64-a922-47d16ca7ce63 -->
> [!qard]- When is raw SQL a better boundary than an ORM query?
> Use raw SQL when a required provider-specific operation or measured query-plan problem cannot be expressed predictably through the ORM. Parameterize data values. SQL identifiers or fragments cannot be supplied as ordinary parameters, so validate and allow-list any dynamic pieces. Keep the query tested against the production database engine. [EF Core: SQL queries](https://learn.microsoft.com/en-us/ef/core/querying/sql-queries)

<!-- qard-id: 254a62e1-7311-4a83-8029-4ff00d16f442 -->
> [!qard]- Why can eager-loading sibling collections be expensive?
> Joining sibling collections at the same level can multiply rows: each parent row is repeated for combinations of matching children. A split query or projection can reduce that payload, but split queries add round trips and may observe changes between commands. Use a transaction/isolation boundary when the assembled result must represent one consistent database view. [EF Core: Single vs. split queries](https://learn.microsoft.com/en-us/ef/core/querying/single-split-queries)

# References

- [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html)
