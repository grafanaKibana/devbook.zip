---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "4"
priority: High
status: Ready To Repeat

dg-publish: true
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
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Circut Breaker|Circut Breaker]]
> - [[Software Engineering/05 Architecture/Patterns/CQRS|CQRS]]
> - [[Software Engineering/05 Architecture/Patterns/CQS|CQS]]
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection|Dependency Injection]]
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns|Design Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Domain-Driven Development|Domain-Driven Development]]
> - [[Software Engineering/05 Architecture/Patterns/Event Sourcing|Event Sourcing]]
> - [[Software Engineering/05 Architecture/Patterns/Event-Driven Architecture|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/Patterns/GRASP|GRASP]]
> - [[Software Engineering/05 Architecture/Patterns/Rate Limiting|Rate Limiting]]
<!-- whats-next:end -->
