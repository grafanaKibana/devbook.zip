---
icon: ruler
order: 60
color: "#84cc16"
topic:
  - Software Design
subtopic: []
summary: "How code is structured at the module and class scale — the principles, paradigms, and testing discipline that shape good design."
tags:
  - FolderNote
publish: true
status: Done
level:
  - '4'
priority: High
---

Software design is how code is structured at the module and class scale — the counterpart to system-scale architecture. It rests on three families: **principles** (SOLID, DRY, KISS, YAGNI — heuristics that keep code understandable), **paradigms** (OOP, functional, event-driven — the mental models you build within), and **testing** (unit, integration, TDD — the discipline that verifies behaviour and pressures the design toward decoupling). Example: applying single responsibility to split a fat service into focused classes is a design decision, and the fact that those classes are now trivial to unit-test is the feedback loop confirming it.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- Where does software design end and architecture begin?
> - Software design operates at the module and class scale: naming, responsibilities, coupling, and the contracts between objects — decisions you can refactor cheaply
> - Architecture operates at the system scale: service boundaries, data ownership, and communication styles — decisions that are expensive to reverse once other teams depend on them
> - The line is fuzzy and shifts with scope: a class boundary in a monolith becomes a service boundary once it is extracted, so good design habits (clear responsibilities, low coupling) are what make that promotion possible
> - Principles, paradigms, and testing are the levers of design; they show up in architecture too, but the blast radius of getting them wrong grows with the scale

# References

- [The Pragmatic Programmer (Hunt & Thomas)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — practitioner guide to the design sensibilities and habits that keep code understandable and changeable.
- [Is Design Dead? (Martin Fowler)](https://martinfowler.com/articles/designDead.html) — how principles, refactoring, and tests turn design into a continuous, evolutionary discipline rather than an up-front phase.
- [Refactoring (Martin Fowler)](https://refactoring.com/) — improving the internal design of existing code safely, in small steps backed by tests.
