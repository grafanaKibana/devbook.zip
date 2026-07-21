---
icon: landmark
order: 50
color: "#eab308"
topic:
  - Software Architecture
subtopic: []
summary: "Structuring software with clear boundaries and explicit tradeoffs so it can evolve sustainably."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

Software architecture is about structuring software so it can evolve: clear boundaries, explicit tradeoffs, and sustainable complexity. It spans every scale — from in-process application structure and design patterns up to distributed, system-level architecture — and good architecture makes the "next change" cheaper without over-engineering the current one. Example: choosing between a modular monolith and microservices is mainly about team boundaries, deployment independence, and operational cost.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Questions

> [!QUESTION]- How do you choose between a monolith, a modular monolith, and microservices?
> - The decision is mainly organizational: microservices buy independent deployment and team autonomy at the cost of network calls, distributed failure modes, and operational overhead
> - A modular monolith captures most of the boundary benefits — clear module seams, enforced dependencies — while keeping one deployable and in-process calls; it's the right default for most teams
> - Reach for microservices when independent scaling or deployment or team boundaries genuinely demand it, not because it's fashionable, and rarely before you understand the domain boundaries
> - Migration is one-directional and cheap the right way round: a well-structured modular monolith can later be carved into services along its existing seams

# References

- [Architecture styles (Microsoft Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/) — a decision-oriented survey of monolith, microservices, event-driven, and other styles.
- [Patterns of Enterprise Application Architecture (Martin Fowler)](https://martinfowler.com/eaaCatalog/) — the canonical catalog of application-architecture patterns.
- [Fallacies of distributed computing (Wikipedia)](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) — the assumptions that break every distributed architecture; essential before splitting a system.
