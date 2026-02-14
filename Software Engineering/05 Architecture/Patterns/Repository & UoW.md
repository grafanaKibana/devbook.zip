---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

Repository and Unit of Work are patterns for structuring data access and coordinating changes to persistent storage.

## Deeper Explanation

## Questions

> [!QUESTION]- What are the Unit of Work and Repository patterns, and when are they needed?
> A Repository provides a collection-like interface for working with aggregates/entities (querying and saving) while hiding persistence details. A Unit of Work (UoW) tracks changes and commits them as a single atomic operation (transaction).
>
> They are most useful when you need to coordinate multiple changes that must succeed or fail together, or when you want to decouple the domain/application layers from a specific data access technology.
>
> Note: in EF Core, `DbContext` already acts as both a repository-like gateway and a unit of work (change tracking + `SaveChanges`).

## Links

- [Martin Fowler - Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- [Martin Fowler - Repository](https://martinfowler.com/eaaCatalog/repository.html)
