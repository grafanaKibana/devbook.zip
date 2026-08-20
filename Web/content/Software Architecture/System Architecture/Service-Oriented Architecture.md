---
publish: true
created: 2026-08-20T20:41:15.704Z
modified: 2026-08-20T20:41:15.704Z
published: 2026-08-20T20:41:15.704Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: Structures a system as loosely coupled services communicating over standardized protocols, historically integrated through an Enterprise Service Bus.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Service-Oriented Architecture (SOA) exposes business capabilities through explicit network contracts. It became common in enterprise integration because SAP, mainframes, custom applications, and later SaaS products could cooperate without sharing an implementation stack.

The service contract is the durable idea. SOAP and WSDL were common, and an Enterprise Service Bus (ESB) often handled protocol translation or routing. Neither technology is required for an architecture to be service-oriented.

SOA can separate development and ownership, but it does not guarantee independent deployment, data ownership, or scaling. Those properties depend on the service boundaries and governance model.

# SOA and Microservices

| Concern | Typical enterprise SOA | Typical microservices system |
| --- | --- | --- |
| Primary pressure | Integrate heterogeneous systems | Give bounded capabilities independent ownership |
| Service size | Often coarse business services | Usually smaller bounded services |
| Communication | SOAP, messaging, or mediated integration | HTTP, gRPC, or lightweight messaging |
| Integration logic | May live in an ESB or orchestration layer | Usually stays near service endpoints or a workflow engine |
| Data | Shared enterprise stores are common | Service-owned data is strongly preferred |
| Governance | Central contracts and schemas | Team-owned contracts within platform guardrails |
| Deployment | May share infrastructure and release coordination | Independent deployment is a core goal |

The useful distinction is where change is controlled. Traditional SOA often centralizes integration policy. Microservices push more responsibility into independently owned services and keep transport infrastructure comparatively simple.

The ESB's responsibilities did not disappear. Edge routing and rate limits often moved to an [[Software Architecture/Distributed Systems/API Gateway]], asynchronous transport to a [[Software Architecture/Distributed Systems/Message Queues/Message Queues|message broker]], and long-running coordination to services or workflow engines. Trouble starts when business decisions collect in the integration layer and every domain change needs its approval.

# When SOA Still Fits

SOA remains practical when the main job is integrating systems that cannot be changed together. A coarse customer or order service can give several business units one stable contract without forcing each legacy application into a new deployment model.

Central governance also has a place when contracts require formal audit, schema review, or protocol mediation. The trade is slower local autonomy in exchange for controlled interoperability.

# Service Contract

A classic service can publish a WSDL contract. Consumers depend on that contract rather than the implementation:

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

A REST-based service can use OpenAPI for the same boundary. Generated clients reduce hand-written protocol code, although compatibility still depends on disciplined schema evolution.

```csharp
// Consumer: generated client from OpenAPI spec
// dotnet openapi add url https://orders-service/swagger/v1/swagger.json
var client = new OrderServiceClient(httpClient);
var response = await client.PlaceOrderAsync(new PlaceOrderRequest
{
    CustomerId = customerId,
    Items = items
});
```

The consumer should not import the service's internal assemblies or reach into its tables. Once it does, the published contract is no longer the real boundary.

# How Central Integration Goes Wrong

## Business Logic in the ESB

Routing and transformation are integration concerns. Pricing rules, eligibility decisions, and order state transitions belong to the service that owns the domain. Putting them in the bus creates a second application whose ownership is usually less clear.

## Shared Data Without Ownership

A shared database can be unavoidable during legacy integration. The dangerous part is shared write authority. Give each service explicit ownership of its tables or stored procedures, then expose cross-boundary behavior through contracts. Direct writes from several services turn a schema change into a coordinated release.

## Contract Version Sprawl

Rigid consumers can make a harmless additive field behave like a breaking change. Prefer tolerant readers and additive evolution, record deprecation dates, and measure remaining consumers before retiring a version. A permanent collection of `/v1` through `/v6` endpoints is not a versioning strategy.

## Central Governance as a Queue

A central contract review can protect interoperability, but it can also serialize every team behind one group. Standardize the parts that must interoperate and leave service implementation decisions with the owning team.

# Coexisting with Microservices

Many estates use both styles. Existing systems meet through governed integration services, while newer product capabilities use smaller independently deployed services. The dividing line is whether stable cross-system contracts or independent product-team delivery is the stronger constraint.

# Questions

> [!QUESTION]- Which part of SOA remains useful without SOAP, WSDL, or an ESB?
> The durable part is the explicit service contract around a business capability. Consumers depend on that contract instead of importing the service's internal code or writing directly to its database. This allows systems built on different technology stacks to change independently as long as the contract stays compatible. SOAP, WSDL, and ESBs were common ways to implement or govern that boundary, but the boundary still matters when the transport is HTTP, gRPC, or messaging.

# References

- [SOA Manifesto](https://soa-manifesto.org/)
- [Azure Integration Services reference architecture](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/enterprise-integration/basic-enterprise-integration)
- [Microservices and SOA](https://martinfowler.com/articles/microservices.html#MicroservicesAndSOA)
