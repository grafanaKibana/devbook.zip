---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/paradigms/unit-testing/","noteIcon":""}
---


# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What types of testing do you know?
> Common categories:
> - Unit: test a small piece of code in isolation
> - Integration: test how multiple components work together (DB, filesystem, HTTP, queues)
> - Functional / End-to-end: test user-visible behavior through public APIs/UI
> - System / Acceptance: validate the whole system against requirements
> - Regression / Smoke: quick checks to catch breakages
> - Non-functional: performance (load/stress), security, reliability, usability
>
> The exact taxonomy varies by team; the key is the test scope, dependencies involved, and feedback speed.

> [!QUESTION]- What are unit tests, why do we need them, and what frameworks exist?
> Unit tests verify a small unit of behavior (usually a method/class) quickly and deterministically.
> They help prevent regressions, enable safe refactoring, document expected behavior, and improve design by forcing good boundaries.
>
> Popular .NET unit test frameworks: xUnit, NUnit, MSTest.

> [!QUESTION]- What are the Arrange Act Assert blocks?
> - Arrange: set up the test data and dependencies
> - Act: execute the behavior under test
> - Assert: verify the outcome (result, state, or interactions)
>
> This is also known as Given When Then.

> [!QUESTION]- What is Moq and why is it used?
> Moq is a popular .NET mocking framework used to create test doubles for interfaces (and virtual/abstract members) so you can:
> - isolate the unit under test from external dependencies
> - stub return values / throw exceptions
> - verify interactions (for example, that a dependency method was called with specific arguments)

> [!QUESTION]- What is the difference between mocks and stubs?
> A stub provides canned answers (returns fixed data) to let the test proceed.
> A mock is usually used for verification: it can record calls and assert expectations about interactions (which methods were called, with what arguments, and how many times).

## Links

- [Unit testing (Wikipedia)](https://en.wikipedia.org/wiki/Unit_testing)
- [xUnit.net docs](https://xunit.net/)


# Whats next

:LiArrowUpLeft: [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Event-driven.md" data-href="Software Engineering/06 Development Practices/Paradigms/Event-driven.md" href="Software Engineering/06 Development Practices/Paradigms/Event-driven.md" class="internal-link" target="_blank" rel="noopener nofollow">Event-driven</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Functional Programming.md" data-href="Software Engineering/06 Development Practices/Paradigms/Functional Programming.md" href="Software Engineering/06 Development Practices/Paradigms/Functional Programming.md" class="internal-link" target="_blank" rel="noopener nofollow">Functional Programming</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Integration Testing.md" data-href="Software Engineering/06 Development Practices/Paradigms/Integration Testing.md" href="Software Engineering/06 Development Practices/Paradigms/Integration Testing.md" class="internal-link" target="_blank" rel="noopener nofollow">Integration Testing</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/OOP.md" data-href="Software Engineering/06 Development Practices/Paradigms/OOP.md" href="Software Engineering/06 Development Practices/Paradigms/OOP.md" class="internal-link" target="_blank" rel="noopener nofollow">OOP</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Test-Driven Development.md" data-href="Software Engineering/06 Development Practices/Paradigms/Test-Driven Development.md" href="Software Engineering/06 Development Practices/Paradigms/Test-Driven Development.md" class="internal-link" target="_blank" rel="noopener nofollow">Test-Driven Development</a></span></li></ul></div>
