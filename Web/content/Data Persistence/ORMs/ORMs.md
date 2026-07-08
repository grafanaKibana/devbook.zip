---
publish: true
created: 2026-07-08T16:14:17.352+03:00
modified: 2026-07-08T16:14:17.352+03:00
published: 2026-07-08T16:14:17.352+03:00
tags:
  - FolderNote
topic:
  - Data Persistence
subtopic:
  - ORMs
priority: High
level:
  - "4"
status: Creation
---

# Intro

Object-Relational Mappers bridge the gap between in-memory objects and relational tables, translating LINQ or method calls into SQL so developers work with domain models instead of raw queries. The convenience is real, but the abstraction leaks: understanding what SQL your ORM generates is the difference between a fast query and a full table scan. Example: chaining multiple `Include()` calls on separate collection navigations in Entity Framework produces a Cartesian explosion — the SQL JOIN cross-multiplies both collections, returning thousands of duplicate rows from what looks like a simple eager-load.

## Links

- [Object-relational mapping (Wikipedia)](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)
