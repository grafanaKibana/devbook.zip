---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/kiss/","noteIcon":"1"}
---


# Intro

KISS means prefer the simplest solution that meets the actual requirements, so the system stays easy to change and operate.
Simple is different from "quick hack." Simple means fewer moving parts, fewer hidden assumptions, and clear failure modes.
You reach for KISS when complexity is added "just in case" or when abstractions obscure the real behavior.

## Deeper Explanation

### Mental Model

- Complexity has ongoing cost: bugs, onboarding time, testing, operations
- Prefer boring, well understood building blocks
- Add complexity only to solve a proven problem (measured pain)

### Pitfalls

- Oversimplifying and ignoring requirements like security, scaling, or compliance
- "Simple" might become code with no structure, no tests, and no boundaries
- Avoiding necessary abstractions and then duplicating work everywhere

### Tradeoffs

- A simpler design may push complexity to operations (manual runbooks) unless you automate
- Too much abstraction hides details; too little abstraction creates duplication

## Questions

> [!QUESTION]- How do you decide whether a design is too complex?
> If it adds moving parts without a proven need, or if the team cannot explain the failure modes.
> Prefer a measured approach: build the simple thing, then evolve when you hit real constraints.

> [!QUESTION]- Give an example where KISS is the wrong choice.
> When a naive solution fails important non-functional requirements like security or correctness.
> Example: skipping input validation or rate limiting in a public API.

## Links

- [KISS principle](https://en.wikipedia.org/wiki/KISS_principle)
- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [The law of leaky abstractions](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY\|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/IoC (Holywood Principle)\|IoC (Holywood Principle)]]
> - [[Software Engineering/06 Development Practices/Principles/SOLID\|SOLID]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI\|YAGNI]]
<!-- whats-next:end -->
