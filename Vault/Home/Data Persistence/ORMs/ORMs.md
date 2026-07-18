---
topic:
  - Data Persistence
subtopic:
  - ORMs
summary: "Mappers that translate object graphs and LINQ into SQL, a leaky abstraction to understand."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Creation
---

Object-Relational Mappers bridge the gap between in-memory objects and relational tables, translating LINQ or method calls into SQL so developers work with domain models instead of raw queries. The convenience is real, but the abstraction leaks: understanding what SQL your ORM generates is the difference between a fast query and a full table scan. Example: chaining multiple `Include()` calls on separate collection navigations in Entity Framework produces a Cartesian explosion — the SQL JOIN cross-multiplies both collections, returning thousands of duplicate rows from what looks like a simple eager-load.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# References

- [Entity Framework Core documentation](https://learn.microsoft.com/ef/core/) — Microsoft's ORM documentation covering entity mapping, querying, change tracking, and persistence.
- [Object-relational mapping (Wikipedia)](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)
