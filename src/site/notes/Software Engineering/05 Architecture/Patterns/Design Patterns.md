---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/design-patterns/","noteIcon":""}
---

# Intro

Design patterns are reusable, named solutions to recurring design problems. They provide a shared vocabulary and help keep code flexible and maintainable.

## Deeper Explanation

## Questions

> [!QUESTION]- What are design patterns and why do we need them?
> Design patterns are proven, repeatable approaches to common design problems (not copy-paste code). They help you communicate intent, reduce accidental complexity, and improve maintainability by encouraging good separation of concerns and loose coupling.

> [!QUESTION]- What categories of patterns exist?
> For GoF design patterns, the classic categories are:
> - Creational: object creation (how instances are constructed)
> - Structural: object composition (how classes/objects are arranged)
> - Behavioral: object interaction (how responsibilities and communication are organized)

> [!QUESTION]- What is an anti-pattern?
> An anti-pattern is a common, recurring solution to a problem that looks reasonable at first but leads to negative consequences (for example, high coupling, poor testability, or performance issues).

> [!QUESTION]- Name a few patterns from each category and the basic idea behind them.
> Creational:
> - Factory Method: delegate creation to subclasses / factories to decouple callers from concrete types.
> - Builder: construct complex objects step-by-step, separating construction from representation.
>
> Structural:
> - Adapter: make incompatible interfaces work together.
> - Decorator: add behavior by wrapping objects instead of subclassing.
>
> Behavioral:
> - Strategy: swap algorithms behind a common interface.
> - Observer: publish/subscribe notifications to keep components loosely coupled.

## Links

- [Refactoring.Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Wikipedia - Design pattern](https://en.wikipedia.org/wiki/Design_pattern)
- [C# Bridge Design Pattern](https://www.dofactory.com/net/bridge-design-pattern)

# Whats next

:LiArrowUpLeft: [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" data-href="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" href="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" class="internal-link" target="_blank" rel="noopener nofollow">Circut Breaker</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/CQRS.md" data-href="Software Engineering/05 Architecture/Patterns/CQRS.md" href="Software Engineering/05 Architecture/Patterns/CQRS.md" class="internal-link" target="_blank" rel="noopener nofollow">CQRS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/CQS.md" data-href="Software Engineering/05 Architecture/Patterns/CQS.md" href="Software Engineering/05 Architecture/Patterns/CQS.md" class="internal-link" target="_blank" rel="noopener nofollow">CQS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Dependency Injection.md" data-href="Software Engineering/05 Architecture/Patterns/Dependency Injection.md" href="Software Engineering/05 Architecture/Patterns/Dependency Injection.md" class="internal-link" target="_blank" rel="noopener nofollow">Dependency Injection</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" data-href="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" href="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" class="internal-link" target="_blank" rel="noopener nofollow">Domain-Driven Development</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" data-href="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" href="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" class="internal-link" target="_blank" rel="noopener nofollow">Event Sourcing</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" data-href="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" href="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" class="internal-link" target="_blank" rel="noopener nofollow">Event-Driven Architecture</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/GRASP.md" data-href="Software Engineering/05 Architecture/Patterns/GRASP.md" href="Software Engineering/05 Architecture/Patterns/GRASP.md" class="internal-link" target="_blank" rel="noopener nofollow">GRASP</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Repository &amp; UoW.md" data-href="Software Engineering/05 Architecture/Patterns/Repository &amp; UoW.md" href="Software Engineering/05 Architecture/Patterns/Repository &amp; UoW.md" class="internal-link" target="_blank" rel="noopener nofollow">Repository &amp; UoW</a></span></li></ul></div>

