---
topic:
  - Data Persistence
subtopic:
  - ORMs
summary: "Object-Relational Mappers translate object graphs and LINQ into SQL so developers work with domain models, but the leaky abstraction must be understood."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Creation
---

# Intro

Object-Relational Mappers bridge the gap between in-memory objects and relational tables, translating LINQ or method calls into SQL so developers work with domain models instead of raw queries. The convenience is real, but the abstraction leaks: understanding what SQL your ORM generates is the difference between a fast query and a full table scan. Example: chaining multiple `Include()` calls on separate collection navigations in Entity Framework produces a Cartesian explosion — the SQL JOIN cross-multiplies both collections, returning thousands of duplicate rows from what looks like a simple eager-load.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Object-relational mapping (Wikipedia)](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)
