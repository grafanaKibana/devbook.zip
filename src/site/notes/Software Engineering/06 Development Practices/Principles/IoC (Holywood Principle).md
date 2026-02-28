---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/io-c-holywood-principle/","noteIcon":"3"}
---


# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is Inversion of Control (IoC)?
> IoC is a principle where the flow of control is inverted: instead of your code creating and managing its dependencies directly, an external mechanism (framework/container) coordinates object creation and composition.
> A common IoC technique is [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]]: dependencies are provided to a class (constructor/setter/parameter) rather than created inside it.

> [!QUESTION]- What is the Dependency Inversion Principle (DIP)?
> DIP (the "D" in SOLID) says:
> - High-level modules should not depend on low-level modules. Both should depend on abstractions.
> - Abstractions should not depend on details. Details should depend on abstractions.
>
> Practically: depend on interfaces/contracts, keep implementation details behind them, and wire concrete implementations via DI.

## Links

- [Inversion of Control and Dependency Injection (Fowler)](https://martinfowler.com/articles/injection.html)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY\|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/KISS\|KISS]]
> - [[Software Engineering/06 Development Practices/Principles/SOLID\|SOLID]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI\|YAGNI]]
<!-- whats-next:end -->
