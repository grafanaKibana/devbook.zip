---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/paradigms/integration-testing/","noteIcon":""}
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


# Whats next

:LiArrowUpLeft: [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Event-driven.md" data-href="Software Engineering/06 Development Practices/Paradigms/Event-driven.md" href="Software Engineering/06 Development Practices/Paradigms/Event-driven.md" class="internal-link" target="_blank" rel="noopener nofollow">Event-driven</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Functional Programming.md" data-href="Software Engineering/06 Development Practices/Paradigms/Functional Programming.md" href="Software Engineering/06 Development Practices/Paradigms/Functional Programming.md" class="internal-link" target="_blank" rel="noopener nofollow">Functional Programming</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/OOP.md" data-href="Software Engineering/06 Development Practices/Paradigms/OOP.md" href="Software Engineering/06 Development Practices/Paradigms/OOP.md" class="internal-link" target="_blank" rel="noopener nofollow">OOP</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Test-Driven Development.md" data-href="Software Engineering/06 Development Practices/Paradigms/Test-Driven Development.md" href="Software Engineering/06 Development Practices/Paradigms/Test-Driven Development.md" class="internal-link" target="_blank" rel="noopener nofollow">Test-Driven Development</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/06 Development Practices/Paradigms/Unit Testing.md" data-href="Software Engineering/06 Development Practices/Paradigms/Unit Testing.md" href="Software Engineering/06 Development Practices/Paradigms/Unit Testing.md" class="internal-link" target="_blank" rel="noopener nofollow">Unit Testing</a></span></li></ul></div>
