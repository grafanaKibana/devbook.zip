---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/design-patterns/","noteIcon":"1"}
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

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Circut Breaker\|Circut Breaker]]
> - [[Software Engineering/05 Architecture/Patterns/CQRS\|CQRS]]
> - [[Software Engineering/05 Architecture/Patterns/CQS\|CQS]]
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]]
> - [[Software Engineering/05 Architecture/Patterns/Domain-Driven Development\|Domain-Driven Development]]
> - [[Software Engineering/05 Architecture/Patterns/Event Sourcing\|Event Sourcing]]
> - [[Software Engineering/05 Architecture/Patterns/Event-Driven Architecture\|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/Patterns/GRASP\|GRASP]]
> - [[Software Engineering/05 Architecture/Patterns/Repository & UoW\|Repository & UoW]]
<!-- whats-next:end -->
