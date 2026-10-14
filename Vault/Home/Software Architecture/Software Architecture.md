---
icon: landmark
order: 50
color: "#eab308"
topic:
  - Software Architecture
subtopic: []
summary: "Structuring software with clear boundaries and explicit tradeoffs so it can evolve sustainably."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Creation
qard-deck: "Software Architecture"
qard-topic: "Software Architecture"
flashcard_uid: "bffcd2eb"
---

Software architecture decides which code changes together, which state has one authority, and which failures can be isolated. Those boundaries range from in-process modules to independently deployed services. A boundary is useful when it contains a real change, scaling, or failure cost. Splitting a system without that pressure only adds coordination.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: baf1b1a6-d1cc-41a7-84d7-2681791ef03a -->
> [!qard]- What factors determine whether a system should use a monolith, a modular monolith, or microservices?
> A monolith keeps one deployment and local calls/transactions. A modular monolith adds enforced internal boundaries while retaining one deployment. Microservices fit when stable boundaries repeatedly need independent deployment, scaling, or ownership and the system can carry network failure, separate data ownership, and distributed operations. Prefer the simpler boundary while independent deployment is not solving a concrete problem. [Azure Architecture Center: architecture styles](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)

# References

- [Software architecture guide](https://martinfowler.com/architecture/)
