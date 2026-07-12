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

## Choosing an Architecture

These six are competing ways to structure the same system. The first four are a decomposition spectrum (one process to many services); Event-Driven and Serverless are cross-cutting styles you layer on top.

| Style | Deployment unit | Coupling & communication | Scaling model | Operational complexity | Reach for it when |
| --- | --- | --- | --- | --- | --- |
| [[Monolith Architecture]] | One process, one artifact, one shared database | In-process function calls; components share mutable state and one schema | Scale the whole app as N identical copies behind a load balancer; no per-component scaling | Low — one thing to deploy, monitor, debug; no distributed tracing | Small team, early product, boundaries still evolving; you want speed and ACID simplicity |
| [[Modular Monolith]] | Single deployment, strict internal module boundaries | In-process, but only through module contracts (interfaces, commands, events); schema/`DbContext` per module | Same as monolith — scale the whole deployment together | Low to medium — boundary discipline (architecture tests) but one runtime | Growing product with clearer domains, limited ops capacity; you want clean boundaries and a cheap path to extraction |
| [[Microservices]] | Independently deployable services, database per service | Network calls over versioned APIs \| events; loose coupling, eventual consistency | Scale hot paths independently, per service | High — service mesh, tracing, retries, sagas, per-service pipelines | Many teams blocked by shared deploys, or specific components need independent scale/release cadence |
| [[Service-Oriented Architecture]] | Coarse-grained services, often deployed together on shared infra | ESB or SOAP/WSDL (REST today); shared databases acceptable; centralized governance | Services scale independently but at coarse granularity | Medium to high — the ESB itself becomes a complex, governed component | Integrating heterogeneous legacy/enterprise systems (SAP, ERP, mainframe) or regulated audit/governance needs |
| [[Event-Driven Architecture]] | Producers and consumers around a message broker (Kafka \| RabbitMQ) | Async publish/subscribe of facts; producers don't know consumers; eventual consistency | Consumers scale independently (competing consumers), partition by aggregate key | Medium to high — broker ops, idempotency, ordering, distributed-flow debugging | Workflows cross service boundaries, processing can be async, or you need durable retained events for audit/replay |
| [[Serverless Architecture]] | Stateless, short-lived functions (or serverless containers) managed by the provider | Trigger/binding driven; stateless, so all state is externalized | Auto-scales per invocation and to zero when idle | Low infra management, but local testing, cold starts, and observability get harder | Event-driven, bursty, or infrequent workloads where idle cost matters more than steady-state latency |

Default to a [[Monolith Architecture|monolith]] — ideally a [[Modular Monolith]] — while boundaries are still forming, then extract [[Microservices]] only when independent deployment or asymmetric scaling repeatedly blocks delivery; [[Service-Oriented Architecture|SOA]] is the enterprise-integration variant of that same "split into services" move, trading team autonomy for centralized governance over legacy systems. [[Event-Driven Architecture]] is not a rung on this ladder but a communication style you adopt once services need temporal decoupling and resilience, and [[Serverless Architecture|serverless]] is a hosting model that pairs naturally with event-driven, bursty workloads. Choose from real constraints — team size, release pressure, domain volatility, ops maturity — not from hype, and re-evaluate as those constraints change.

## References

- [Architectural pattern (Wikipedia)](https://en.wikipedia.org/wiki/Architectural_pattern)
