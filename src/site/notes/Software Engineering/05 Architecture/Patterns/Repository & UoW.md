---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/repository-and-uo-w/","noteIcon":""}
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

# Whats next

:LiArrowUpLeft: [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" data-href="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" href="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" class="internal-link" target="_blank" rel="noopener nofollow">Circut Breaker</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/CQRS.md" data-href="Software Engineering/05 Architecture/Patterns/CQRS.md" href="Software Engineering/05 Architecture/Patterns/CQRS.md" class="internal-link" target="_blank" rel="noopener nofollow">CQRS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/CQS.md" data-href="Software Engineering/05 Architecture/Patterns/CQS.md" href="Software Engineering/05 Architecture/Patterns/CQS.md" class="internal-link" target="_blank" rel="noopener nofollow">CQS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Dependency Injection.md" data-href="Software Engineering/05 Architecture/Patterns/Dependency Injection.md" href="Software Engineering/05 Architecture/Patterns/Dependency Injection.md" class="internal-link" target="_blank" rel="noopener nofollow">Dependency Injection</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Design Patterns.md" data-href="Software Engineering/05 Architecture/Patterns/Design Patterns.md" href="Software Engineering/05 Architecture/Patterns/Design Patterns.md" class="internal-link" target="_blank" rel="noopener nofollow">Design Patterns</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" data-href="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" href="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" class="internal-link" target="_blank" rel="noopener nofollow">Domain-Driven Development</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" data-href="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" href="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" class="internal-link" target="_blank" rel="noopener nofollow">Event Sourcing</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" data-href="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" href="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" class="internal-link" target="_blank" rel="noopener nofollow">Event-Driven Architecture</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/GRASP.md" data-href="Software Engineering/05 Architecture/Patterns/GRASP.md" href="Software Engineering/05 Architecture/Patterns/GRASP.md" class="internal-link" target="_blank" rel="noopener nofollow">GRASP</a></span></li></ul></div>

