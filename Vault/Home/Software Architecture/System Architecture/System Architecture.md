---
topic:
  - Software Architecture
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

Architecture styles are high-level ways to organize systems: monoliths, microservices, serverless, SOA, and hybrids. Each style has predictable strengths and failure modes; the right choice depends on constraints more than hype. Example: a consumption-hosted function can reduce idle cost for spiky work by scaling to zero, while provisioned or always-ready capacity trades that saving for steadier startup latency.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Choosing an Architecture

These six are competing ways to structure the same system. The first four are a decomposition spectrum (one process to many services); Event-Driven and Serverless are cross-cutting styles you layer on top.

| Style | Deployment unit | Coupling & communication | Scaling model | Operational complexity | Reach for it when |
| --- | --- | --- | --- | --- | --- |
| [[Home/Software Architecture/System Architecture/Monolith Architecture]] | One coordinated deployment unit, commonly one artifact | Usually in-process or collocated calls; data stores may be shared or separated | Scale the deployment together; no independent per-module scaling | Low — one release unit to deploy, monitor, and debug | Small team, early product, boundaries still evolving; you want delivery speed and simple local transactions |
| [[Home/Software Architecture/System Architecture/Modular Monolith]] | Single deployment, strict internal module boundaries | In-process, but only through module contracts (interfaces, commands, events); schema/`DbContext` per module | Same as monolith — scale the whole deployment together | Low to medium — boundary discipline (architecture tests) but one runtime | Growing product with clearer domains, limited ops capacity; you want clean boundaries and a cheap path to extraction |
| [[Home/Software Architecture/System Architecture/Microservices]] | Independently deployable services, database per service | Network calls over versioned APIs \| events; loose coupling, eventual consistency | Scale hot paths independently, per service | High — service mesh, tracing, retries, sagas, per-service pipelines | Many teams blocked by shared deploys, or specific components need independent scale/release cadence |
| [[Home/Software Architecture/System Architecture/Service-Oriented Architecture]] | Coarse-grained services, often deployed together on shared infra | ESB or SOAP/WSDL (REST today); shared databases acceptable; centralized governance | Services scale independently but at coarse granularity | Medium to high — the ESB itself becomes a complex, governed component | Integrating heterogeneous legacy/enterprise systems (SAP, ERP, mainframe) or regulated audit/governance needs |
| [[Home/Software Architecture/System Architecture/Event-Driven Architecture]] | Producers and consumers around a message broker (Kafka \| RabbitMQ) | Async publish/subscribe of facts; producers don't know consumers; eventual consistency | Consumers scale independently (competing consumers), partition by aggregate key | Medium to high — broker ops, idempotency, ordering, distributed-flow debugging | Workflows cross service boundaries, processing can be async, or you need durable retained events for audit/replay |
| [[Home/Software Architecture/System Architecture/Serverless Architecture]] | Stateless, short-lived functions (or serverless containers) managed by the provider | Trigger/binding driven; stateless, so all state is externalized | Demand-driven scaling; consumption modes can scale to zero, while provisioned or always-ready capacity keeps instances warm at added cost | Less host management, but quotas, cold starts, retries, local testing, and distributed observability remain | Event-driven, bursty, or infrequent workloads where idle cost matters more than steady-state latency |

Default to a [[Home/Software Architecture/System Architecture/Monolith Architecture|monolith]] — ideally a [[Home/Software Architecture/System Architecture/Modular Monolith]] — while boundaries are still forming, then extract [[Home/Software Architecture/System Architecture/Microservices]] only when independent deployment or asymmetric scaling repeatedly blocks delivery; [[Home/Software Architecture/System Architecture/Service-Oriented Architecture|SOA]] is the enterprise-integration variant of that same "split into services" move, trading team autonomy for centralized governance over legacy systems. [[Home/Software Architecture/System Architecture/Event-Driven Architecture]] is not a rung on this ladder but a communication style you adopt once services need temporal decoupling and resilience, and [[Home/Software Architecture/System Architecture/Serverless Architecture|serverless]] is a hosting model that pairs naturally with event-driven, bursty workloads. Choose from real constraints — team size, release pressure, domain volatility, ops maturity — not from hype, and re-evaluate as those constraints change.

# References

- [Architectural pattern (Wikipedia)](https://en.wikipedia.org/wiki/Architectural_pattern) — overview of recurring architecture-level solution forms and their scope.
- [Azure Functions scale and hosting](https://learn.microsoft.com/azure/azure-functions/functions-scale) — official comparison of Consumption scale-to-zero, Flex always-ready instances, Premium prewarmed capacity, cold starts, and billing.
- [AWS Lambda provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html) — official behavior and cost of keeping pre-initialized execution environments ready for latency-sensitive functions.
- [AWS Lambda event-driven architectures](https://docs.aws.amazon.com/lambda/latest/dg/concepts-event-driven-architectures.html) — official guidance on event sources, asynchronous decoupling, scaling, error handling, and workload fit.
