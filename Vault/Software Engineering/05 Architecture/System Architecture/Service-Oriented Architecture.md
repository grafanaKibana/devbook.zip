---
topic:
  - Architecture
subtopic:
  - System Architecture
level:
  - "3"
priority: Medium
status: Creation
dg-publish: true
---

# Service-Oriented Architecture

Service-Oriented Architecture (SOA) structures a system as a collection of loosely coupled services that communicate over a network, typically via standardized protocols (SOAP/WSDL historically, REST or messaging today). Each service exposes a well-defined interface and can be developed, deployed, and scaled independently. SOA emerged in the 2000s as a way to integrate heterogeneous enterprise systems without tight coupling.

SOA and microservices share the same decomposition philosophy but differ in scope, governance, and communication style. Understanding the distinction matters for interviews and architecture decisions.

## SOA vs Microservices

| Dimension | SOA | Microservices |
|---|---|---|
| Service size | Larger, coarser-grained (e.g., "Order Management Service") | Smaller, fine-grained (e.g., "Order Placement", "Order Status") |
| Communication | Enterprise Service Bus (ESB) or SOAP/WSDL | Direct HTTP/REST, gRPC, or lightweight message broker |
| Data sharing | Services may share a database | Each service owns its data store |
| Governance | Centralized (ESB, shared schemas) | Decentralized (each team owns their service) |
| Deployment | Often deployed together on shared infrastructure | Independently deployable, often containerized |
| Typical context | Enterprise integration (ERP, CRM, legacy systems) | Cloud-native, greenfield, high-scale |

**Key distinction**: SOA uses an ESB as a central integration hub; microservices prefer "smart endpoints, dumb pipes" — the services contain the logic, the message broker is just a transport.

## When SOA Still Applies

SOA remains relevant in enterprise contexts where:

- **Legacy integration**: connecting SAP, Salesforce, and custom systems via a shared integration layer (Azure Integration Services, MuleSoft).
- **Shared services**: a single "Customer Service" used by multiple business units, where the overhead of microservice decomposition isn't justified.
- **Regulated industries**: where centralized governance, audit trails, and schema contracts are required.

## Pitfalls

### ESB as a God Object

**What goes wrong**: the Enterprise Service Bus accumulates business logic — routing rules, data transformations, orchestration. The ESB becomes the most complex and fragile component in the system.

**Why it happens**: ESBs are designed to be configurable integration hubs, and it's tempting to put "just one more transformation" in the bus.

**Mitigation**: keep the ESB as a dumb transport. Business logic belongs in the services. If the ESB is doing domain decisions, refactor them into the services.

## References

- [Service-oriented architecture (Wikipedia)](https://en.wikipedia.org/wiki/Service-oriented_architecture) — historical context, ESB patterns, and the evolution from SOA to microservices.
- [Microservices vs SOA (Martin Fowler)](https://martinfowler.com/articles/microservices.html#MicroservicesAndSOA) — Fowler's comparison of the two approaches, explaining why microservices emerged as a reaction to SOA's centralized governance model.
- [[Software Engineering/05 Architecture/System Architecture/Microservices|Microservices]] — the modern evolution of SOA: fine-grained services, decentralized data, independent deployment, and "smart endpoints, dumb pipes."

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/System Architecture/Event-Driven Architecture|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Microservices|Microservices]]
> - [[Software Engineering/05 Architecture/System Architecture/Monolith Architecture|Monolith Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Serverless Architecture|Serverless Architecture]]
<!-- whats-next:end -->
