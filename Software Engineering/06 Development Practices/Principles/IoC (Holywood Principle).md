---
topic:
  - Development Practices
subtopic:
  - Principles
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is Inversion of Control (IoC)?
> IoC is a principle where the flow of control is inverted: instead of your code creating and managing its dependencies directly, an external mechanism (framework/container) coordinates object creation and composition.
> A common IoC technique is [[Dependency Injection]]: dependencies are provided to a class (constructor/setter/parameter) rather than created inside it.

> [!QUESTION]- What is the Dependency Inversion Principle (DIP)?
> DIP (the "D" in SOLID) says:
> - High-level modules should not depend on low-level modules. Both should depend on abstractions.
> - Abstractions should not depend on details. Details should depend on abstractions.
>
> Practically: depend on interfaces/contracts, keep implementation details behind them, and wire concrete implementations via DI.

## Further Reading
