---
topic:
  - Software Design
subtopic:
  - Testing
summary: Testing as a design and verification discipline — unit vs integration, the test pyramid as a cost model, and TDD.
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Creation
---

# Intro

Testing is both a verification discipline and a design tool. **Unit tests** exercise a single class or method in isolation, fast and deterministically; **integration tests** wire real dependencies together to catch the bugs that isolation hides. The **test pyramid** is a cost model, not a rule: prefer many cheap unit tests, fewer slow integration tests, and a thin layer of end-to-end checks — inverting it makes the suite slow and flaky. TDD closes the loop by writing the test first, which pressures the code toward small, decoupled units before any implementation exists.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Questions

> [!QUESTION]- Why is the test pyramid shaped the way it is?
> - It is a cost model: unit tests are fast, isolated, and cheap to run and maintain, so you can afford thousands of them; integration and end-to-end tests are slower, flakier, and more expensive, so you keep them few and targeted
> - Inverting it (an "ice-cream cone" of mostly E2E tests) yields a suite that is slow to run and brittle to change, eroding the fast feedback that makes tests worth having
> - The point is coverage of *risk*, not lines: push logic-heavy verification down to units and reserve higher tiers for wiring, contracts, and critical user paths

## References

- [The Practical Test Pyramid (Martin Fowler / Ham Vocke)](https://martinfowler.com/articles/practical-test-pyramid.html) — the canonical explanation of the pyramid as a cost/feedback model, with unit vs service vs UI tiers.
- [UnitTest (Martin Fowler)](https://martinfowler.com/bliki/UnitTest.html) — clarifies the sociable-vs-solitary distinction and what "unit" actually means in practice.
- [Test-Driven Development: By Example (Kent Beck)](https://www.oreilly.com/library/view/test-driven-development/0321146530/) — the foundational text on Red-Green-Refactor and test-first as a design technique.
