---
topic:
  - Architecture
subtopic:
  - Patterns
summary: "Reusable solutions to recurring design problems around boundaries, dependencies, and change — valuable when they reduce cognitive load, harmful when applied blindly."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Done
---

# Intro

Patterns are reusable solutions to recurring design problems, especially around boundaries, dependencies, and change management. Used well, patterns reduce cognitive load; used blindly, they add accidental complexity. Example: dependency injection is useful when it makes composition and testing simpler, not when it hides control flow.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Software design pattern (Wikipedia)](https://en.wikipedia.org/wiki/Software_design_pattern)
