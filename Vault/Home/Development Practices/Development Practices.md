---
icon: ruler-dimension-line
order: 60
color: "#84cc16"
topic:
  - Development Practices
subtopic: []
summary: "Habits and processes like testing, reviews, and refactoring that keep software shippable."
tags:
  - FolderNote
publish: true
status: Done
level:
  - '4'
priority: High
---

# Intro

Development practices are the habits and processes that keep software shippable: testing, reviews, refactoring, and feedback loops. Most teams do not fail because of syntax; they fail because quality work is not systematic. Example: a small investment in CI and code review prevents entire classes of regressions from reaching production.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Questions

> [!QUESTION]- How much testing is enough, and what kind?
> - Match the test to the risk: unit tests for logic-heavy code, integration tests for wiring and boundaries, a few end-to-end tests for critical user paths — not 100% coverage for its own sake
> - The test pyramid is a cost model: many fast unit tests, fewer slow integration tests, minimal brittle E2E — inverting it makes the suite slow and flaky
> - TDD is a design tool as much as a verification one: writing the test first pressures you toward decoupled, testable code
> - A test that never fails teaches nothing; a test that fails randomly teaches you to ignore it — invest in determinism

## References

- [The Pragmatic Programmer (Hunt & Thomas)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — practitioner guide to the habits that keep software maintainable.
- [Continuous Integration (Martin Fowler)](https://martinfowler.com/articles/continuousIntegration.html) — the foundational article on CI and the fast-feedback discipline behind it.
- [Refactoring (Martin Fowler)](https://refactoring.com/) — the reference on safe, incremental code improvement backed by tests.
