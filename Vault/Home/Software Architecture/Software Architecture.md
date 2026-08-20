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
---

Software architecture decides which code changes together, which state has one authority, and which failures can be isolated. Those boundaries range from in-process modules to independently deployed services. A boundary is useful when it contains a real change, scaling, or failure cost. Splitting a system without that pressure only adds coordination.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- What factors determine whether a system should use a monolith, a modular monolith, or microservices?
> A monolith keeps one deployment and local transactions, so it usually fits a small team while domain boundaries are still changing. A modular monolith adds enforced module boundaries without introducing network failures or separate operations. It is a safer default when one deployment is not slowing delivery.
>
> Microservices fit stable boundaries that repeatedly need independent deployment, scaling, or ownership. That independence comes with remote calls, separate data ownership, eventual-consistency workflows, and distributed observability. Strong module boundaries make a later extraction safer, but they do not remove those costs.

# References

- [Software architecture guide](https://martinfowler.com/architecture/)
