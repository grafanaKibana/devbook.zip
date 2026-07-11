---
topic:
  - Development Practices
subtopic:
  - Principles
summary: "Design heuristics like SOLID, DRY, KISS, and YAGNI that keep systems understandable as they grow, balancing purity against real constraints."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

# Intro

Principles like SOLID, DRY, KISS, and YAGNI are guardrails for keeping systems understandable as they grow. They are not laws; they are heuristics to balance design purity against real constraints. Example: applying single responsibility usually means splitting modules at stable boundaries, not splitting every method.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Software design principles (Wikipedia)](https://en.wikipedia.org/wiki/Software_design#Design_principles)
