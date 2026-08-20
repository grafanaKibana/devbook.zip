---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Centers software design on the business domain, its language, rules, and boundaries, rather than on technical infrastructure."
level:
  - "2"
priority: High
status: Ready to Repeat
publish: true
---

Domain-Driven Design (DDD) organizes software around business language and rules. Its strategic patterns separate models that assign different meanings to the same words. Tactical patterns express one model's invariants in code.

DDD earns its cost when the domain contains difficult rules, competing vocabularies, or several teams changing the same model. A CRUD service with little domain behavior rarely needs the full pattern set.

# Strategic Patterns

## Ubiquitous Language

A ubiquitous language is the working vocabulary shared by domain experts and engineers. The same terms appear in discussion and code, so a rule does not change meaning as it crosses between them.

If the rule says, "an order is fulfilled when every line item has shipped," an `Order.Fulfill()` operation should express that rule. A generic `ProcessOrderStatusUpdate()` that assigns `StatusId = 3` hides the domain decision.

## Bounded Context

A Bounded Context defines where one domain model and its language apply. "Customer" may mean a prospect with contact history in Sales, while Billing uses the word for an account with payment terms. Forcing both meanings into one type creates optional fields and rules that belong to neither model.

Each context owns its model. Separate schemas and aligned team ownership often reinforce the boundary, though neither is required. Contexts may share a deployment or physical database when table ownership prevents direct model leakage. Communication still crosses an explicit contract or translation boundary.

```text
Sales Context          Billing Context
─────────────          ───────────────
Customer               Customer
  - Name                 - PaymentMethod
  - ContactInfo          - CreditLimit
  - DealHistory          - InvoiceAddress

OrderPlaced event ──→  BillingService.CreateInvoice()
```

## Subdomains: where to Invest

DDD classifies subdomains so modeling effort follows business value:

- The **core domain** differentiates the business and deserves the strongest modeling effort.
- A **supporting subdomain** is necessary but does not create differentiation, so a simpler model is usually enough.
- A **generic subdomain** solves a common problem that can often be bought or adopted rather than designed from scratch.

Elaborate aggregates in a generic subdomain are wasted effort when the core domain remains a collection of procedural scripts.

## Context Mapping

**Context maps** record how bounded contexts depend on and translate for one another:

- An **Anti-Corruption Layer (ACL)** translates an upstream model into local concepts and keeps foreign assumptions out of the domain.
- A **Shared Kernel** is a small model jointly owned by two contexts. Changes require coordination, so its coupling is deliberate.
- In a **Customer/Supplier** relationship, downstream needs influence the upstream plan.
- A **Conformist** adopts the upstream model as-is. Integration is cheaper, but upstream concepts become local constraints.
- An **Open Host Service** exposes a stable protocol, often paired with a **Published Language** understood by many consumers.

The map makes coordination cost visible. It identifies translation boundaries and the relationships where a model change requires agreement between teams.

# Tactical Modeling

- **Entity:** identified across time, such as `Order` with `OrderId`.
- **Value object:** identified by its values and normally immutable, such as `Money(Amount, Currency)`.
- **Aggregate:** a consistency boundary reached through one root.
- **Domain service:** domain behavior that does not fit one entity or value object.
- **Domain event:** a fact produced by a successful domain transition.
- **Repository:** a collection-like boundary for loading and saving aggregate roots.

The aggregate root protects invariants before state can change:

```csharp
public sealed class Order
{
    private readonly List<OrderLine> _lines = [];
    private readonly ReadOnlyCollection<OrderLine> _readOnlyLines;

    public Guid Id { get; }
    public IReadOnlyList<OrderLine> Lines => _readOnlyLines;

    public Order() => _readOnlyLines = _lines.AsReadOnly();

    public void AddLine(Guid productId, int quantity, Money unitPrice)
    {
        if (quantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity));
        }

        if (unitPrice.Amount < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(unitPrice));
        }

        _lines.Add(new OrderLine(productId, quantity, unitPrice));
    }
}
```

Changing one aggregate per transaction keeps consistency and lock boundaries local. A transaction spanning several aggregates can still be correct when an immediate invariant crosses them and storage supports atomic commit. If that happens often, the aggregate boundary may be wrong.

An anemic model exposes state while application services carry every rule, so the domain vocabulary disappears into orchestration. An oversized aggregate loads and locks unrelated state. An undersized one pushes an immediate invariant into coordination between transactions. The boundary belongs around facts that must agree at commit time. Later consequences can follow through events.

When query needs diverge from the aggregate's command model, [[Home/Software Architecture/Patterns/Architectural Patterns/CQRS]] can keep invariant enforcement on the write side while serving purpose-built read models.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Full DDD (Aggregates, Bounded Contexts) | Makes domain language and invariants explicit | High modeling and coordination cost | Complex business rules and competing models |
| Transaction Script | Simple, fast to write | Logic scattered in services, hard to maintain as complexity grows | Simple CRUD, scripts, prototypes |
| Anemic model + services | Familiar to most developers | Invariants are procedural and dispersed across services, so they are easier to bypass or duplicate | Short-lived projects, simple domains |

Use tactical patterns where invariants need a clear consistency boundary. Use Bounded Contexts when one shared model has become ambiguous or a coordination bottleneck. Simple CRUD can stay simple.

# Questions

> [!QUESTION]- When is full DDD the wrong choice?
> A system with straightforward CRUD and little business behavior gains little from aggregates, repositories, and context mapping. Strategic boundaries may still help a large organization, but tactical machinery should follow real invariants rather than project size alone.

# References

- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/)
- [Domain-Driven Design: Tackling Complexity in the Heart of Software](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/)
- [Domain events: design and implementation](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation)
