---
{"dg-publish":true,"permalink":"/software-engineering/03-data-persistence/or-ms/or-ms/","tags":["FolderNote"]}
---


# Intro

Object-Relational Mappers bridge the gap between in-memory objects and relational tables, translating LINQ or method calls into SQL so developers work with domain models instead of raw queries. The convenience is real, but the abstraction leaks: understanding what SQL your ORM generates is the difference between a fast query and a full table scan. Example: chaining multiple `Include()` calls on separate collection navigations in Entity Framework produces a Cartesian explosion — the SQL JOIN cross-multiplies both collections, returning thousands of duplicate rows from what looks like a simple eager-load.

## Links

- [Object-relational mapping (Wikipedia)](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/03 Data Persistence/03 Data Persistence\|03 Data Persistence]]
>
> **Pages**
> - [[Software Engineering/03 Data Persistence/ORMs/Entity Framework\|Entity Framework]]
<!-- whats-next:end -->
