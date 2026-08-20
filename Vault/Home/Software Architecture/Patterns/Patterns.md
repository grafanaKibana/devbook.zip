---
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
---

Patterns name recurring design pressures and the tradeoffs of a known response. They give a team shared language for boundaries, dependencies, and change. A useful pattern makes variation easier to see. A premature one hides simple control flow behind indirection.

> [!IMPORTANT]
> A pattern earns its place when the problem already exists. Dependency injection helps when composition or substitution is real. One concrete dependency with no variation usually needs only a direct call.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- What evidence justifies introducing a pattern?
> A recurring variation, responsibility boundary, or failure mode must be visible in the code. The pattern should make that pressure cheaper to handle than the direct design. Without that evidence, the extra indirection is speculative complexity.

# References

- [Software design pattern](https://en.wikipedia.org/wiki/Software_design_pattern)
