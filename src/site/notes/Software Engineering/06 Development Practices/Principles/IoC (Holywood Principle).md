---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/io-c-holywood-principle/","noteIcon":""}
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


# Whats next

:LiArrowUpLeft: [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Principles/DRY.md" data-href="Software Engineering/06 Development Practices/Principles/DRY.md" href="Software Engineering/06 Development Practices/Principles/DRY.md" class="internal-link" target="_blank" rel="noopener nofollow">DRY</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Principles/KISS.md" data-href="Software Engineering/06 Development Practices/Principles/KISS.md" href="Software Engineering/06 Development Practices/Principles/KISS.md" class="internal-link" target="_blank" rel="noopener nofollow">KISS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Principles/SOLID.md" data-href="Software Engineering/06 Development Practices/Principles/SOLID.md" href="Software Engineering/06 Development Practices/Principles/SOLID.md" class="internal-link" target="_blank" rel="noopener nofollow">SOLID</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Principles/YAGNI.md" data-href="Software Engineering/06 Development Practices/Principles/YAGNI.md" href="Software Engineering/06 Development Practices/Principles/YAGNI.md" class="internal-link" target="_blank" rel="noopener nofollow">YAGNI</a></span></li></ul></div>
