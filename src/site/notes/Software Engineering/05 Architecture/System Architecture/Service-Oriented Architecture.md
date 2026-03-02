---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/system-architecture/service-oriented-architecture/"}
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

### ESB as a God Object

**What goes wrong**: the Enterprise Service Bus accumulates business logic — routing rules, data transformations, orchestration. The ESB becomes the most complex and fragile component in the system.

**Why it happens**: ESBs are designed to be configurable integration hubs, and it's tempting to put "just one more transformation" in the bus.

**Mitigation**: keep the ESB as a dumb transport. Business logic belongs in the services. If the ESB is doing domain decisions, refactor them into the services.

## Questions

> [!QUESTION]- What is the key architectural difference between SOA and microservices?
> SOA uses an Enterprise Service Bus (ESB) as a central integration hub — services communicate through the bus, which handles routing, transformation, and orchestration. Microservices use 'smart endpoints, dumb pipes': services contain the logic and communicate directly via HTTP/REST, gRPC, or lightweight message brokers. The ESB becomes a bottleneck and single point of failure in SOA; microservices distribute that responsibility into the services themselves.

> [!QUESTION]- When is SOA still the right choice over microservices?
> SOA remains appropriate for enterprise integration scenarios: connecting heterogeneous legacy systems (SAP, Salesforce, custom ERP) via a shared integration layer, shared services used by multiple business units where microservice decomposition overhead isn't justified, and regulated industries requiring centralized governance and audit trails. Microservices are better for greenfield cloud-native systems where teams can own independent services end-to-end.


## References

- [Service-oriented architecture (Wikipedia)](https://en.wikipedia.org/wiki/Service-oriented_architecture) — historical context, ESB patterns, and the evolution from SOA to microservices.
- [Microservices vs SOA (Martin Fowler)](https://martinfowler.com/articles/microservices.html#MicroservicesAndSOA) — Fowler's comparison of the two approaches, explaining why microservices emerged as a reaction to SOA's centralized governance model.
- [[Software Engineering/05 Architecture/System Architecture/Microservices\|Microservices]] — the modern evolution of SOA: fine-grained services, decentralized data, independent deployment, and "smart endpoints, dumb pipes."
- [Azure Integration Services overview (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/enterprise-integration/basic-enterprise-integration) — Microsoft's modern SOA integration reference architecture using API Management, Logic Apps, and Service Bus as the integration layer.
- [SOA Manifesto](http://www.soa-manifesto.org/) — the original SOA design principles: service contracts, loose coupling, abstraction, reusability, autonomy, statelessness, discoverability, and composability.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/System Architecture/Event-Driven Architecture\|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Microservices\|Microservices]]
> - [[Software Engineering/05 Architecture/System Architecture/Monolith Architecture\|Monolith Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Serverless Architecture\|Serverless Architecture]]
<!-- whats-next:end -->
