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

> [!QUESTION]- How do you choose between a monolith, a modular monolith, and microservices?
> - A monolith keeps one deployment and local transactions, which suits a small team while domain boundaries are still moving.
> - A modular monolith adds enforced module seams without adding network failure or separate operations. It is the safer default when one deployment is not blocking delivery.
> - Microservices fit stable boundaries that repeatedly need independent deployment, scaling, or ownership. The split adds remote calls, separate data ownership, eventual-consistency workflows, and distributed observability.
> Good module seams make later extraction safer, but they do not remove those costs.

# References

- [Software architecture guide](https://martinfowler.com/architecture/)
