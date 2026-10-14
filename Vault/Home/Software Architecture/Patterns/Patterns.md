---
title: Software Architecture Patterns
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Reusable solutions to recurring design problems around boundaries, dependencies, and change."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Done
qard-deck: "Software Architecture"
qard-topic: "Patterns/Patterns"
flashcard_uid: "cfaa4058"
---

Patterns name recurring design pressures and the tradeoffs of a known response. They give a team shared language for boundaries, dependencies, and change. A useful pattern makes variation easier to see. A premature one hides simple control flow behind indirection.

> [!IMPORTANT]
> A pattern earns its place when the problem already exists. Dependency injection helps when composition or substitution is real. One concrete dependency with no variation usually needs only a direct call.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: 66d6574d-0bb3-4d17-b1e0-53177c19b42f -->
> [!qard]- What evidence justifies introducing a pattern?
> Introduce a pattern when code shows recurring variation, a responsibility boundary, or a failure mode that the pattern makes cheaper to handle than the direct design. Without visible design pressure, the extra indirection is speculative. [GoF: Design Patterns](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)

# References

- [Software design pattern](https://en.wikipedia.org/wiki/Software_design_pattern)
