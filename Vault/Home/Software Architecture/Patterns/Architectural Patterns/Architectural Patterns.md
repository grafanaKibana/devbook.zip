---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Architectural patterns define how a system's components are organized, how data flows between them, and where responsibility boundaries lie."
tags: [FolderNote]
publish: true
priority: High
level:
  - "3"
status: Done
---

Architectural patterns set the large-scale shape of a system: where responsibilities sit, how components communicate, and how data moves. A poor choice is expensive because local refactoring cannot repair a boundary that cuts through the wrong business capability or gives failure recovery to the wrong component.

The three notes in this folder address different boundaries. [[Home/Software Architecture/Patterns/Architectural Patterns/Domain-Driven Design]] separates business models whose words and rules differ. [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS]] lets writes and reads use models shaped for their own jobs. [[Home/Software Architecture/Patterns/Architectural Patterns/Event Sourcing]] makes an ordered event stream authoritative instead of storing only current state. None requires the others. Combining them is justified only when the domain needs each benefit and can carry each cost.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Integration and Data-flow Patterns by Failure and Coupling

Start with the decision being made. Request-response and publish-subscribe describe interaction. Streaming, batching, and ETL describe movement and visibility of data. Event Sourcing governs how state is recorded. Orchestration assigns ownership of a multi-step process. These choices can coexist because they operate at different layers.

![[Software Architecture/Software Architecture-Architectural Patterns-18120000-1.png|theme-aware]]

| Need | Prefer | Coupling and ordering | Failure owner | Operational cost |
|---|---|---|---|---|
| Immediate answer from one dependency | Request-response | Caller knows the callee. Ordering follows the call | Caller owns timeout, retry budget, and fallback | Low until fan-out or tail latency grows |
| One fact delivered to many consumers | Publish-subscribe | Producers know the contract, not consumers. Per-key ordering is broker-specific | Broker and each consumer own delivery, lag, and idempotency | Medium: topics, schemas, replay, and dead letters |
| Continuous high-volume processing | Streaming | Consumers depend on stream contracts and partitioning | Pipeline owns checkpoints, backpressure, and replay | High: state stores, lag, and repartitioning |
| Periodic bounded processing | Batching or ETL | Jobs couple to input/output schemas, not request latency | Scheduler owns retries and partial-run recovery | Medium: windows, staging, and reruns |
| Auditable state reconstructed from history | [[Home/Software Architecture/Patterns/Architectural Patterns/Event Sourcing]] | Aggregate depends on ordered immutable events | Event store owns append order. Projectors own replay | High: schema evolution and projections |
| Coordinated multi-step business process | Orchestration | Steps couple to an explicit workflow contract | Orchestrator owns compensation and progress | Medium to high: durable state and recovery |

Failure ownership is the useful selection test. A workable design can say where a failed item waits, which component retries it, whether order matters, and how work resumes without repeating side effects.

# Architecture Selection Matrix

The families below overlap too. One service may use hexagonal boundaries internally, publish events, expose a client-server API, and still deploy inside a monolith. Naming a pattern says little about independent deployment or fault isolation unless the runtime boundaries support it.

![[Software Architecture/Software Architecture-Architectural Patterns-18120000.png|theme-aware]]

| Pattern | Primary boundary | Change cost it reduces | Cost it introduces | Use when |
|---|---|---|---|---|
| Layered | Technical responsibility | Replacing presentation or persistence behind stable interfaces | Cross-layer changes and pass-through code | Domain is straightforward and team boundaries follow layers |
| Microservices | Independently owned business capability | Deploying and scaling one capability without the whole system | Network failure, data ownership, and platform overhead | Team autonomy and uneven scaling justify distributed operations |
| Event-driven | Event contract and asynchronous consumer | Adding consumers without changing the producer | Eventual consistency, ordering, and replay work | Producers should not wait for every downstream reaction |
| Client-server | Request contract between consumer and service | Evolving clients and server behind a stable protocol | Compatibility and availability coupling | A central service owns data or policy for many clients |
| Plugin | Stable host extension point | Adding optional capabilities without changing the core | Versioned extension contracts and isolation | Features are independently installable or supplied by third parties |
| Hexagonal | Domain ports versus infrastructure adapters | Replacing databases, transports, and frameworks around domain logic | More interfaces and mapping code | Domain rules must remain testable and independent of infrastructure |

# References

- [Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/)
- [Azure Architecture Center design patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
