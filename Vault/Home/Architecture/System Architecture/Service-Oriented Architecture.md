---
topic:
  - Architecture
subtopic:
  - System Architecture
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

# Service-Oriented Architecture

Service-Oriented Architecture (SOA) structures a system as a collection of loosely coupled services that communicate over a network, typically via standardized protocols (SOAP/WSDL historically, REST or messaging today). Each service exposes a well-defined interface and can be developed, deployed, and scaled independently. SOA emerged in the 2000s as a way to integrate heterogeneous enterprise systems — SAP, Salesforce, custom ERP, mainframe CICS — without rewriting them. The Enterprise Service Bus (ESB) acted as the central nervous system: routing messages, transforming schemas, and orchestrating workflows between services that knew nothing about each other.

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

> [!NOTE]
> The ESB didn't vanish — it **evolved and decomposed**. Its routing/auth/rate-limiting concerns moved to a thin edge **[[API Gateway]]**, its async transport to a **[[Home/Architecture/Distributed Systems/Message Queues/Message Queues|message broker]]** (Kafka/RabbitMQ), and its orchestration to either the services themselves (**choreography**) or a dedicated workflow engine. The microservices "dumb pipe" is the lesson learned from ESBs accreting too much logic.

## When SOA Still Applies

SOA remains relevant in enterprise contexts where:

- **Legacy integration**: connecting SAP, Salesforce, and custom systems via a shared integration layer (Azure Integration Services, MuleSoft).
- **Shared services**: a single "Customer Service" used by multiple business units, where the overhead of microservice decomposition isn't justified.
- **Regulated industries**: where centralized governance, audit trails, and schema contracts are required.

## Example: SOA Service Contract

In classic SOA, services expose contracts via WSDL (SOAP) or OpenAPI (REST). A service consumer depends only on the contract, not the implementation:

```xml
<!-- WSDL-style service contract (simplified) -->
<definitions name="OrderService">
  <portType name="OrderServicePort">
    <operation name="PlaceOrder">
      <input message="PlaceOrderRequest"/>
      <output message="PlaceOrderResponse"/>
    </operation>
  </portType>
</definitions>
```

In modern SOA using REST, the equivalent is an OpenAPI contract. The consumer generates a typed client from the contract and never imports the service's internal assemblies:

```csharp
// Consumer: generated client from OpenAPI spec
// dotnet-openapi add https://orders-service/swagger/v1/swagger.json
var client = new OrderServiceClient(httpClient);
var response = await client.PlaceOrderAsync(new PlaceOrderRequest
{
    CustomerId = customerId,
    Items = items
});
```

The contract boundary is the key SOA discipline: services communicate through published interfaces, not shared code or shared databases.


## Pitfalls

**ESB as a God Object** — the Enterprise Service Bus accumulates business logic: routing rules, data transformations, orchestration, error handling. A real example: a logistics company's ESB grew to 2,400 routing rules and 180 XSLT transformations over 5 years. A single schema change in the "Shipment" service required updating 47 ESB transformations, a 3-week effort. The ESB became the most complex and fragile component in the system — every change required the ESB team's involvement. Mitigation: keep the ESB as a dumb transport. Business logic belongs in the services. If the ESB is doing domain decisions, refactor them into the services.

**Shared database coupling** — classic SOA allows services to share a database, unlike microservices which mandate per-service data stores. In practice, shared databases create hidden coupling: the Order Service and Inventory Service both read/write the same `Products` table, and a schema migration by one team breaks the other. Mitigation: establish clear table ownership per service, use views or stored procedures as the service contract, and plan migration toward per-service databases when coupling pain exceeds migration cost.

**Contract versioning hell** — WSDL/SOAP contracts are rigid: adding an optional field can break consumers that validate strictly against the schema. After 3 years, a financial services SOA had 6 concurrent versions of the "Account" service contract, each with a different subset of consumers. Mitigation: design contracts for backward compatibility (additive-only changes), use versioned endpoints (`/v1/`, `/v2/`), and set sunset dates with deprecation warnings.

## Tradeoffs

| Decision | SOA | Microservices | When SOA | When Microservices |
| --- | --- | --- | --- | --- |
| **Service granularity** | Coarse-grained ("Order Management") | Fine-grained ("Order Placement", "Order Status") | Fewer teams, shared business domains, integration-heavy | Many teams with clear bounded contexts and independent deployment needs |
| **Communication** | ESB / centralized broker | Direct HTTP/gRPC / lightweight broker | Heterogeneous protocol translation needed (SOAP, CICS, MQ) | Homogeneous stack, latency-sensitive, team autonomy valued |
| **Data ownership** | Shared databases acceptable | Per-service data stores required | Legacy databases that can't be split without major re-architecture | Greenfield or after domain boundaries are well-understood |
| **Governance** | Centralized (shared schemas, ESB team) | Decentralized (team-owned contracts) | Regulated industries requiring audit trails and central schema control | Fast-moving product teams with strong DevOps culture |

**Decision rule**: start with SOA when integrating existing enterprise systems that can't be rewritten. Move to microservices when team autonomy and independent deployment velocity matter more than centralized governance. Many organizations run both — SOA for legacy integration, microservices for new product development.

## Questions

> [!QUESTION]- When is SOA still the right choice over microservices?
> SOA remains appropriate for enterprise integration scenarios: connecting heterogeneous legacy systems (SAP, Salesforce, custom ERP) via a shared integration layer, shared services used by multiple business units where microservice decomposition overhead isn't justified, and regulated industries requiring centralized governance and audit trails. Microservices are better for greenfield cloud-native systems where teams can own independent services end-to-end.


## References

- [Service-oriented architecture (Wikipedia)](https://en.wikipedia.org/wiki/Service-oriented_architecture) — historical context, ESB patterns, and the evolution from SOA to microservices.
- [Microservices vs SOA (Martin Fowler)](https://martinfowler.com/articles/microservices.html#MicroservicesAndSOA) — Fowler's comparison of the two approaches, explaining why microservices emerged as a reaction to SOA's centralized governance model.
- [[Microservices]] — the modern evolution of SOA: fine-grained services, decentralized data, independent deployment, and "smart endpoints, dumb pipes."
- [Azure Integration Services overview (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/enterprise-integration/basic-enterprise-integration) — Microsoft's modern SOA integration reference architecture using API Management, Logic Apps, and Service Bus as the integration layer.
- [SOA Manifesto](http://www.soa-manifesto.org/) — the original SOA design principles: service contracts, loose coupling, abstraction, reusability, autonomy, statelessness, discoverability, and composability.
