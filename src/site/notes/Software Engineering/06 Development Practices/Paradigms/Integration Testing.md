---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/paradigms/integration-testing/"}
---


# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is the difference between unit tests and integration tests?
> - Scope: unit tests cover a small unit (method/class); integration tests cover interactions between multiple components.
> - Dependencies: unit tests replace external dependencies (DB, filesystem, HTTP) with test doubles; integration tests use real dependencies (or realistic test instances/containers).
> - Speed and determinism: unit tests are typically fast and stable; integration tests are slower and can be more brittle due to environment and I/O.
> - Purpose: unit tests validate logic and design boundaries; integration tests validate wiring, configuration, contracts, and real behavior across boundaries.

## Links

- [Integration testing (Wikipedia)](https://en.wikipedia.org/wiki/Integration_testing)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Paradigms/Event-driven\|Event-driven]]
> - [[Software Engineering/06 Development Practices/Paradigms/Functional Programming\|Functional Programming]]
> - [[Software Engineering/06 Development Practices/Paradigms/OOP\|OOP]]
> - [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development\|Test-Driven Development]]
> - [[Software Engineering/06 Development Practices/Paradigms/Unit Testing\|Unit Testing]]
<!-- whats-next:end -->
