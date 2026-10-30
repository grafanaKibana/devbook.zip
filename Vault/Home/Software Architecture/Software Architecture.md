---
icon: landmark
order: 50
color: "#eab308"
topic: [Software Architecture]
subtopic: []
summary: "Structuring software with clear boundaries and explicit tradeoffs so it can evolve sustainably."
tags: [FolderNote]
publish: true
priority: High
level: ["4"]
status: Creation
qard-deck: "Software Architecture"
qard-topic: "Software Architecture"
flashcard_uid: "bffcd2eb"
created: "2026-02-10T01:40:47.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

Software architecture decides which code changes together, which state has one authority, and which failures can be isolated. Those boundaries range from in-process modules to independently deployed services. A boundary is useful when it contains a real change, scaling, or failure cost. Splitting a system without that pressure only adds coordination.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

<!-- qard-id: baf1b1a6-d1cc-41a7-84d7-2681791ef03a -->
> [!qard]- What factors determine whether a system should use a monolith, a modular monolith, or microservices?
> The choice depends on whether real boundaries repeatedly need independent deployment, scaling or ownership, and whether the system can carry the cost of distribution. Without that pressure, one deployment is usually the better fit. A modular monolith adds clear internal boundaries without the cost of a distributed system.
>
> | Aspect | Monolith | Modular monolith | Microservices |
> |---|---|---|---|
> | Deployment | One deployable unit, so every change ships with the whole application. | Still one deployable unit, so all modules release together. | Each service deploys on its own, so one service can change without redeploying the others. |
> | Internal boundaries | Code can reach across areas directly, so boundaries rely on discipline. | Module boundaries are explicit and enforced, so modules use each other only through public contracts. | Boundaries are service APIs or messages over the network. |
> | Calls, transactions and data | In-process calls over a shared data layer; one local transaction can cover a whole operation. | The same in-process calls and local transactions as a monolith. | Each service owns its data. Calls cross the network and can fail or slow down. No single local transaction spans services, so consistency between them is usually eventual. |
> | Scaling | The whole application scales as one unit. | The whole application scales as one unit. | Each service scales according to its own load. |
> | Operational cost | Lowest: one build, deployment and runtime to monitor. | Close to a monolith, plus the effort of keeping boundaries enforced. | Highest: many deployments, network failure handling, contract versioning and monitoring across services. |
>
> Microservices fit when stable boundaries repeatedly need independent releases, independent scaling or separate team ownership, and the organization can operate the resulting distributed system. System size or expected growth alone does not justify the split.
>
> [Microservices architecture style (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices)

# References

- [Software architecture guide](https://martinfowler.com/architecture/)
