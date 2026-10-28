---
publish: true
created: 2026-10-28T12:27:03.038Z
modified: 2026-10-28T12:27:33.338Z
published: 2026-10-28T12:27:33.338Z
topic:
  - Software Architecture
subtopic:
  - Application Architecture
summary: Structures an application into layers with clear responsibilities and strict dependency directions, isolating business rules from infrastructure details.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Software Architecture
qard-topic: Application Architecture/Layered Architecture
flashcard_uid: 90fb828a
---

Layered architecture groups code by responsibility and defines which groups may depend on which. Traditional layering points dependencies downward, usually from presentation through business logic to data access. Onion and Clean variants reverse selected edges so infrastructure depends on inner policy. The useful part is the boundary: business rules stop drifting into controllers and persistence code.

# Layer Responsibilities

A common four-layer split looks like this:

| Layer | Responsibility | Examples |
|-------|---------------|---------|
| **Presentation** | Handle input, render output | ASP.NET Core controllers, Razor views, Blazor components |
| **Application** | Orchestrate use cases, coordinate domain + infrastructure | Service classes, CQRS handlers, DTOs |
| **Domain** | Business rules, entities, invariants | Entities, value objects, domain events, domain services |
| **Infrastructure** | Technical details: persistence, messaging, external APIs | EF Core `DbContext`, HTTP clients, email senders |

# Dependency Rule

In an inward-facing layered design, the Domain knows nothing about databases, frameworks, or UI. Infrastructure implements interfaces owned by inner layers. Traditional N Layer uses a different rule, shown in the next comparison: dependencies move down the stack, often including a business-layer dependency on data access.

```mermaid
graph TD
    subgraph OUTER[Infrastructure and Presentation - outermost]
        UI[Controllers and Views]
        DB[EF Core and SQL Server]
        EXT[HTTP clients and Email and File system]
    end

    subgraph MIDDLE[Application Layer]
        UC[Use Cases and Services]
        IPORT[[IOrderRepository]]
        OPORT[[IEmailSender]]
    end

    subgraph CORE[Domain Layer - innermost and zero dependencies]
        ENT[Entities and Value Objects]
        RULES[Business Rules]
        DEVT[Domain Events]
    end

    UI --> UC
    UC --> ENT
    UC --> RULES

    DB -.->|implements| IPORT
    EXT -.->|implements| OPORT
    IPORT --> ENT
    UC --> IPORT
    UC --> OPORT
```

# Traditional Vs Onion/Clean

```mermaid
graph LR
    subgraph TRADITIONAL[Traditional Layered - dependencies go down]
        direction TB
        T_UI[UI] --> T_BL[Business Logic]
        T_BL --> T_DA[Data Access]
        T_DA --> T_DB[(Database)]
    end

    subgraph ONION[Onion and Clean - dependencies go inward]
        direction TB
        O_INFRA[Infrastructure] --> O_APP[Application]
        O_UI[Presentation] --> O_APP
        O_APP --> O_DOM[Domain]
    end
```

Traditional layering makes the business layer a client of the data-access layer. A change to that lower layer's public contract can therefore ripple upward, even when the database engine itself remains hidden. Onion and Clean designs invert ownership of the boundary: an inner layer defines the persistence capability it needs, and Infrastructure implements it. Database-specific changes can then stay behind the adapter.

# Layered, Hexagonal, Onion, and Clean

These names overlap, but they are not synonyms. Layered architecture is the broad structure. Hexagonal, Onion, and Clean describe stronger ways to protect policy from outer details.

- **Traditional layered (N Layer)** uses a top-down chain: UI → Business → Data. It is easy to read, but the business layer remains a client of data access.
- **Hexagonal (Ports and Adapters, Alistair Cockburn)** separates the application from outside actors. The application exposes or consumes **ports**, and adapters connect HTTP, persistence, tests, or other technologies. The `IOrderRepository` and `IEmailSender` interfaces in the diagrams are ports.
- **Onion (Jeffrey Palermo)** draws dependencies as concentric rings with the domain model at the center. Outer infrastructure depends on inner interfaces.
- **Clean (Robert C. Martin)** names the rings Entities, Use Cases, Interface Adapters, and Frameworks, then applies the Dependency Rule across every boundary.

The choice is less about diagram shape than the dependency contract the code actually enforces. [[Software Architecture/Application Architecture/Clean Architecture]] covers the most explicit inward rule. The same module-boundary discipline also matters inside a [[Software Architecture/System Architecture/Modular Monolith]], where compile-time references determine whether modules remain independent.

# .NET Example

```csharp
// Domain layer — no dependencies on EF Core or ASP.NET
public class Order
{
    public int Id { get; private set; }
    public Money Total { get; private set; } = Money.Zero;

    public void AddItem(Product product, int quantity)
    {
        // Business rule: enforce invariants here
        if (quantity <= 0) throw new DomainException("Quantity must be positive");
        Total = Total.Add(product.Price.Multiply(quantity));
    }
}

// Application layer — depends on domain + abstractions
public class PlaceOrderHandler(IOrderRepository orders, IEmailSender email)
{
    public async Task HandleAsync(PlaceOrderCommand cmd, CancellationToken ct)
    {
        var order = new Order();
        foreach (var item in cmd.Items)
            order.AddItem(item.Product, item.Quantity);

        await orders.SaveAsync(order, ct);
        await email.SendConfirmationAsync(cmd.CustomerEmail, order, ct);
    }
}

// Infrastructure layer — implements application abstractions
public class EfOrderRepository(AppDbContext db) : IOrderRepository
{
    public async Task SaveAsync(Order order, CancellationToken ct)
        => await db.Orders.AddAsync(order, ct);
}
```

This sketch only stages the entity in EF Core. A complete transaction or Unit of Work must call `SaveChangesAsync(ct)` before sending the external confirmation. Otherwise the email can describe an order that was never committed.

# Pitfalls

**Anemic domain model.** Service classes accumulate the rules while Domain objects become data bags. The project references may be correct, yet there is little policy at the center for the architecture to protect.

**Layer bypass.** A controller that calls repositories directly now coordinates application behavior at the HTTP boundary. Routing that operation through an application use case restores the separation; removing the unused layer instead makes the smaller structure explicit. A ceremonial boundary is worse than an honest, smaller structure.

**Over-engineering small apps.** Four projects and an interface for every class add ceremony to a three-endpoint CRUD API. A thin structure is enough until behavior becomes complex enough to need isolation.

# Questions

<!-- qard-id: 6f3ec2a2-8880-4ee1-b5a3-03f00f167401 -->

> [!qard]- What is the difference between traditional layered and Onion/Clean Architecture?
> In traditional layering, source dependencies usually follow the call chain downward, so business logic depends on data access. In Onion and Clean Architecture, dependencies point toward the business rules. The business and application code defines the interfaces it needs, and infrastructure implements them.
>
> In the table, A → B means that code in A refers to types in B.
>
> | Aspect | Traditional layered | Onion/Clean |
> |---|---|---|
> | Typical source dependencies | UI → business logic → data access. Business logic compiles against the data layer. | UI → core, and infrastructure → core. The business and application core refers to nothing outside itself. |
> | How business rules reach storage | Business logic calls classes or interfaces that the data-access layer owns. | The core declares the interface it needs, such as IOrderRepository. Infrastructure implements it, and dependency injection supplies it at runtime. |
> | Testing business rules | Isolating the rules is harder because they refer to data-access types. | The rules can be tested with simple fakes of core-owned interfaces, without a database. |
> | Changing infrastructure | Changes to data-access types can ripple into business code. | Changes stay behind the core's interfaces unless the core's needs change. |
>
> Layered designs can also use dependency inversion. For example, business logic can own a repository interface that the data layer implements. Onion and Clean make that inward direction a defining rule rather than an optional technique. Onion and Clean share this rule but name their layers differently, and neither requires a particular number of projects.
>
> [Common web application architectures (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) · [The Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

# References

- [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures)
- [Onion Architecture](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)
