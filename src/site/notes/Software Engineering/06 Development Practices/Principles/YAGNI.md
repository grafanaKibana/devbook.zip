---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/yagni/","noteIcon":"3"}
---


# Intro

YAGNI means do not build a feature until you have a real, current need for it.
It protects you from speculative complexity, wasted work, and locking in the wrong abstraction.
You reach for YAGNI when design discussions are driven by hypothetical future requirements.

## Deeper Explanation

### Mental Model

- Future requirements are guesses; build flexibility where it is cheap and proven
- Keep options open by keeping the design small and testable
- Prefer reversible decisions (config, feature flags, adapters) over big frameworks

## Questions

> [!QUESTION]- What is the best signal that a feature is no longer YAGNI?
> You have at least one real user and a clear requirement with acceptance criteria.
> Ideally you also have a second similar need showing a pattern.

## Links

- [Extreme Programming explained](https://www.oreilly.com/library/view/extreme-programming-explained/0201616416/)
- [YAGNI](https://en.wikipedia.org/wiki/You_aren%27t_gonna_need_it)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)

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
> - [[Software Engineering/06 Development Practices/Principles/SOLID\|SOLID]]
<!-- whats-next:end -->
