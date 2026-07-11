---
topic:
  - Architecture
subtopic:
  - System Architecture
summary: "High-level styles for organizing systems (monolith, microservices, serverless, SOA), each with predictable strengths and failure modes."
tags:
  - FolderNote
publish: true
level:
  - '4'
priority: High
status: Done
---

# Intro

Architecture styles are high-level ways to organize systems: monoliths, microservices, serverless, SOA, and hybrids. Each style has predictable strengths and failure modes; the right choice depends on constraints more than hype. Example: serverless can reduce ops for spiky workloads, but observability and local testing become more important.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## References

- [Architectural pattern (Wikipedia)](https://en.wikipedia.org/wiki/Architectural_pattern)
