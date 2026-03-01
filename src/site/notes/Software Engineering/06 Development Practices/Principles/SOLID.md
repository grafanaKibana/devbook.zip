---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/solid/"}
---


# Intro

SOLID is a mnemonic for five object-oriented design principles that help keep code modular, testable, and easy to change.

## Deeper Explanation

[SOLID](https://habr.com/ru/articles/348286/)

## Questions

> [!QUESTION]- What is SOLID? Explain each letter.
> SOLID is a set of design principles for maintainable OO code:
> 
> - S, Single Responsibility: a module has one reason to change.
> - O, Open Closed: open for extension, closed for modification.
> - L, Liskov Substitution: derived types must be substitutable for their base types.
> - I, Interface Segregation: prefer small, focused interfaces over "fat" ones.
> - D, Dependency Inversion: depend on abstractions, not concretions.

> [!QUESTION]- Which SOLID principles does Singleton violate?
> Not "by definition", but the typical Singleton usage often leads to:
> 
> - DIP: code depends on a concrete global instance instead of an abstraction injected via DI.
> - SRP: the singleton often mixes business logic with lifecycle and global access concerns.
> - OCP: replacing/extending behavior usually requires changing call sites or the singleton itself.
> 
> A common alternative is to expose an interface and let a DI container manage a singleton lifetime.

## Links

- [SOLID (Habr)](https://habr.com/ru/articles/348286/)
- [SOLID (Wikipedia)](https://en.wikipedia.org/wiki/SOLID)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY\|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/IoC (Holywood Principle)\|IoC (Holywood Principle)]]
> - [[Software Engineering/06 Development Practices/Principles/KISS\|KISS]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI\|YAGNI]]
<!-- whats-next:end -->
