---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Reusable solutions to recurring design problems around boundaries, dependencies, and change."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Done
---

Patterns are reusable solutions to recurring design problems, especially around boundaries, dependencies, and change management. Used well, patterns reduce cognitive load; used blindly, they add accidental complexity. Example: dependency injection is useful when it makes composition and testing simpler, not when it hides control flow.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# References

- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.pearson.com/en-us/subject-catalog/p/Gamma-Design-Patterns-Elements-of-Reusable-Object-Oriented-Software/P200000009480/9780321700698) — the original Gang of Four catalog, including pattern intent, applicability, structure, consequences, and relationships.
- [Software design pattern (Wikipedia)](https://en.wikipedia.org/wiki/Software_design_pattern)
