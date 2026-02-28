---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/repository-and-uo-w/","noteIcon":"3"}
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

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Topics**
> - [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/Architectural Patterns\|Architectural Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns/Design Patterns\|Design Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Resilience/Resilience\|Resilience]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/CQS\|CQS]]
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]]
<!-- whats-next:end -->
