---
icon: ruler
order: 60
color: "#84cc16"
topic:
  - Software Design
subtopic: []
summary: "How code is structured at the module and class scale — the principles, paradigms, and testing discipline that shape good design."
tags: [FolderNote]
publish: true
status: Not-Started
level:
  - "4"
priority: High
---

Software design determines how far a code change travels. If adding a payment method requires edits in checkout, invoicing, and unrelated tests, the code has put behavior or dependencies in the wrong places. A useful design gives each change a clear home, keeps state close to the rules that use it, and makes collaboration and failure visible in the code.

The subject has four complementary views. **Principles** such as SOLID, DRY, KISS, and YAGNI are heuristics for judging a decision. **Paradigms** such as object-oriented, functional, and event-driven programming provide different models for state and collaboration. **Testing** exposes coupling and verifies behaviour, but testability is evidence rather than proof of good design. **UML class diagrams** make selected static relationships discussable before or alongside code.

Splitting an overloaded service helps when the pieces change for different reasons. Smaller classes and easier tests may show that coupling fell, but neither property is the goal. A fragmented model with behavior in the wrong class can be small and testable while still forcing one change through many files.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```
