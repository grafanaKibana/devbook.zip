---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Architectural patterns define how a system's components are organized, how data flows between them, and where responsibility boundaries lie."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "3"
status: Done
---

Architectural patterns define how a system's components are organized, how data flows between them, and where the boundaries of responsibility lie. They matter because choosing the wrong boundary or data flow shape creates problems that no amount of refactoring within a component can fix — the pain shows up as coupling, consistency bugs, and scaling walls.

The three patterns here compose naturally: [[Home/Software Architecture/Patterns/Architectural Patterns/Domain-Driven Design]] establishes bounded contexts and a shared language so the code matches the business domain. [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS]] separates the read path from the write path so each can be optimized independently. [[Home/Software Architecture/Patterns/Architectural Patterns/Event Sourcing]] stores state as an immutable event stream, giving you audit trails, temporal queries, and the ability to rebuild read models from history. You can use DDD without CQRS, and CQRS without Event Sourcing, but in complex domains teams often adopt all three because each one solves a problem the others expose.

# Integration and data-flow patterns by failure and coupling

First identify what must vary. An API gateway, request-response call, and publish-subscribe topology decide how components interact. Streaming, batching, and ETL decide how data moves and when it becomes visible. Event Sourcing decides how state is recorded and reconstructed. Orchestration decides who owns a multi-step workflow. They can coexist; treating the nine labels below as mutually exclusive choices mixes different design layers.

![[Software Architecture/Software Architecture-Architectural Patterns-18120000-1.png]]

| Need | Prefer | Coupling and ordering | Failure owner | Operational cost |
|---|---|---|---|---|
| Immediate answer from one dependency | Request-response | Caller knows the callee; ordering follows the call | Caller owns timeout, retry budget, and fallback | Low until fan-out or tail latency grows |
| One fact delivered to many consumers | Publish-subscribe | Producers know the contract, not consumers; per-key ordering is broker-specific | Broker and each consumer own delivery, lag, and idempotency | Medium: topics, schemas, replay, and dead letters |
| Continuous high-volume processing | Streaming | Consumers depend on stream contracts and partitioning | Pipeline owns checkpoints, backpressure, and replay | High: state stores, lag, and repartitioning |
| Periodic bounded processing | Batching or ETL | Jobs couple to input/output schemas, not request latency | Scheduler owns retries and partial-run recovery | Medium: windows, staging, and reruns |
| Auditable state reconstructed from history | [[Home/Software Architecture/Patterns/Architectural Patterns/Event Sourcing]] | Aggregate depends on ordered immutable events | Event store owns append order; projectors own replay | High: schema evolution and projections |
| Coordinated multi-step business process | Orchestration | Steps couple to an explicit workflow contract | Orchestrator owns compensation and progress | Medium to high: durable state and recovery |

The selection rule is failure ownership: choose the shape whose operator can explain where a failed item waits, who retries it, whether order matters, and how processing resumes without duplicating side effects.

# Architecture selection matrix

The families below also overlap. A service can use hexagonal boundaries internally, publish events, expose a client-server API, and deploy as one monolith or several services. A diagram labels a dominant organizing idea; it does not grant independent deployment or fault tolerance by itself.

![[Software Architecture/Software Architecture-Architectural Patterns-18120000.png]]

| Pattern | Primary boundary | Change cost it reduces | Cost it introduces | Use when |
|---|---|---|---|---|
| Layered | Technical responsibility | Replacing presentation or persistence behind stable interfaces | Cross-layer changes and pass-through code | Domain is straightforward and team boundaries follow layers |
| Microservices | Independently owned business capability | Deploying and scaling one capability without the whole system | Network failure, data ownership, and platform overhead | Team autonomy and uneven scaling justify distributed operations |
| Event-driven | Event contract and asynchronous consumer | Adding consumers without changing the producer | Eventual consistency, ordering, and replay work | Producers should not wait for every downstream reaction |
| Client-server | Request contract between consumer and service | Evolving clients and server behind a stable protocol | Compatibility and availability coupling | A central service owns data or policy for many clients |
| Plugin | Stable host extension point | Adding optional capabilities without changing the core | Versioned extension contracts and isolation | Features are independently installable or supplied by third parties |
| Hexagonal | Domain ports versus infrastructure adapters | Replacing databases, transports, and frameworks around domain logic | More interfaces and mapping code | Domain rules must remain testable and independent of infrastructure |

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# References

- [Patterns of Enterprise Application Architecture -- foundational catalog of enterprise patterns covering domain logic, data source, and distribution patterns (Martin Fowler)](https://martinfowler.com/eaaCatalog/)
- [Cloud design patterns -- Azure architecture center catalog covering CQRS, Event Sourcing, and related cloud-native patterns (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/patterns/)
- [Top 9 architectural patterns for data and communication flow -- ByteByteGo orientation to interaction and processing shapes; compare the labels by layer before combining them](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-9-architectural-patterns-for-data-and-communication-flow.md)
- [6 software architectural patterns you must know -- ByteByteGo overview of dominant system organization patterns; use the matrix above for the missing selection costs](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/6-software-architectural-patterns-you-must-know.md)
