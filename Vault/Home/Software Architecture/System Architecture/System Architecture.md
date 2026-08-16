---
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: "High-level styles for organizing systems (monolith, microservices, serverless, SOA), each with predictable strengths and failure modes."
tags: [FolderNote]
publish: true
level:
  - "4"
priority: High
status: Done
---

System architecture decides which code deploys together, how components communicate, and where durable state survives instance failure. Those decisions sit on different axes: monoliths, modular monoliths, microservices, and SOA define decomposition and governance. Event-driven architecture defines communication. Serverless defines hosting and scaling.

Function runtimes are trigger-invoked, and providers may create or retire their instances. Container processes are usually longer-lived even when the platform scales them on demand. Execution lifetime differs, but neither process should own authoritative durable state. Horizontally scaled instances treat in-process state as disposable and keep durable data in external storage.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Choosing an Architecture

These six entries describe three axes rather than six competing options. A system selects a decomposition and governance model, a communication style, and a hosting model that fit together.

| Choice | Axis | Structural effect | Coupling and communication | Scaling model | Operational cost | Best fit |
| --- | --- | --- | --- | --- | --- | --- |
| [[Home/Software Architecture/System Architecture/Monolith Architecture]] | Decomposition and governance | One coordinated deployment unit, commonly one artifact | Usually in-process or collocated calls. Data stores may be shared or separated | Scale the deployment together. No independent per-module scaling | Low: one release unit to deploy, monitor, and debug | Small team or early product with evolving boundaries. Delivery speed and simple local transactions dominate |
| [[Home/Software Architecture/System Architecture/Modular Monolith]] | Decomposition and governance | Single deployment with strict internal module boundaries | In-process calls cross module contracts. Schema or `DbContext` ownership can remain per module | Scale the deployment together | Low to medium: boundary discipline with one runtime | Growing product with clearer domains and limited ops capacity. Module seams make later extraction safer, though still costly |
| [[Home/Software Architecture/System Architecture/Microservices]] | Decomposition and governance | Independently deployable services with service-owned data | Versioned network APIs or events. Loose coupling often brings eventual consistency | Scale hot paths independently by service | High: tracing, retries, consistency workflows, and per-service pipelines | Shared deployments repeatedly block teams, or one component needs independent scale and release cadence |
| [[Home/Software Architecture/System Architecture/Service-Oriented Architecture]] | Decomposition and governance | Coarse-grained services, often on shared infrastructure | ESB or service contracts with centralized governance. Shared databases may remain | Services scale independently at coarse granularity | Medium to high: the integration layer becomes a governed component | Heterogeneous legacy integration or regulated audit and governance requirements |
| [[Home/Software Architecture/System Architecture/Event-Driven Architecture]] | Communication | No required deployment shape. Producers emit facts and consumers react through a broker | Asynchronous publish/subscribe introduces temporal decoupling and eventual consistency | Consumer groups scale independently, often partitioned by aggregate key | Medium to high: broker operations, idempotency, ordering, and distributed-flow diagnosis | Cross-boundary workflows can complete asynchronously, or retained events support audit and replay |
| [[Home/Software Architecture/System Architecture/Serverless Architecture]] | Hosting and scaling | Provider-managed functions or containers whose instances may be created and retired | Trigger or request driven. Authoritative state remains external to disposable instances | Demand-driven scaling. Some consumption modes reach zero, while ready capacity reduces startup delay at added cost | Less host management, but quotas, cold starts, retries, and distributed observability remain | Bursty or infrequent workloads where idle cost matters more than steady startup latency |

A [[Home/Software Architecture/System Architecture/Monolith Architecture|monolith]], ideally a [[Home/Software Architecture/System Architecture/Modular Monolith]], is the default while boundaries are forming. [[Home/Software Architecture/System Architecture/Microservices]] become justified when independent deployment or asymmetric scaling repeatedly blocks delivery. [[Home/Software Architecture/System Architecture/Service-Oriented Architecture|SOA]] serves enterprise integration where centralized governance over heterogeneous systems matters more than team autonomy.

[[Home/Software Architecture/System Architecture/Event-Driven Architecture]] changes communication rather than decomposition. It fits workflows that need temporal decoupling and can accept explicit consistency rules.

The [[Home/Software Architecture/System Architecture/Serverless Architecture|serverless]] model changes hosting. It pairs naturally with bursty or event-driven work, but it does not decide service boundaries or remove the need for durable external state.

# References

- [Architecture styles](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/)
- [AWS event-driven architectures](https://docs.aws.amazon.com/lambda/latest/dg/concepts-event-driven-architectures.html)
