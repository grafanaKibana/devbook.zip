---
publish: true
created: 2026-07-15T11:47:56.302Z
modified: 2026-07-18T11:38:38.753Z
published: 2026-07-18T11:38:38.753Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: Centers software design on the business domain, its language, rules, and boundaries, rather than on technical infrastructure.
level:
  - "2"
priority: High
status: Ready to Repeat
---

Domain-Driven Design (DDD) centers software design on the business domain — its language, rules, and boundaries — rather than on technical infrastructure. Strategic patterns such as Bounded Contexts and Ubiquitous Language prevent one ambiguous shared model from forcing different business meanings into the same type. Tactical patterns then make one context's invariants explicit in code.

DDD is most valuable in complex domains with rich business rules. For CRUD-heavy systems with little domain logic, the overhead is not justified.

# Strategic Patterns

## Ubiquitous Language

A shared vocabulary used by both developers and domain experts in conversations, code, and documentation. When the code uses the same terms as the business ("Order", "Shipment", "Fulfillment"), there is no translation layer where meaning gets lost.

**In practice**: if a domain expert says "an order is fulfilled when all line items are shipped," the code should have an `Order` with a `Fulfill()` method that checks `LineItems.All(li => li.IsShipped)` — not a `ProcessOrderStatusUpdate()` method that sets `StatusId = 3`.

## Bounded Context

A Bounded Context is an explicit boundary within which a particular domain model applies. The same word can mean different things in different contexts: "Customer" in the Sales context (prospect, contact info, deal history) is different from "Customer" in the Billing context (payment method, invoice address, credit limit).

Each Bounded Context owns its model and language. A separate schema and aligned team ownership are common ways to reinforce that boundary, not requirements of the pattern: contexts can share a deployment or physical database when table ownership and access rules prevent model leakage. Communication crosses an explicit translation or contract boundary rather than treating another context's tables as a shared domain model.

```text
Sales Context          Billing Context
─────────────          ───────────────
Customer               Customer
  - Name                 - PaymentMethod
  - ContactInfo          - CreditLimit
  - DealHistory          - InvoiceAddress

OrderPlaced event ──→  BillingService.CreateInvoice()
```

## Subdomains: where to invest

Not all of the domain deserves equal effort. DDD classifies subdomains so you spend modeling energy where it pays off:

- **Core domain** — the part that differentiates the business (your competitive advantage). Invest your best people and rich modeling here.
- **Supporting subdomain** — necessary but not differentiating; build it simply.
- **Generic subdomain** — a solved problem (auth, billing, notifications); **buy or use off-the-shelf**, don't hand-craft.

The mistake is lavishing DDD tactical patterns on a generic subdomain while under-modeling the core.

## Context Mapping

Bounded contexts don't live in isolation — **context maps** describe the _relationships_ between them and how their models integrate:

- **Anti-Corruption Layer (ACL)** — a translation layer that protects your model from a messy/legacy upstream one, converting their concepts into yours so their model can't "leak" in. The single most important integration pattern when wrapping legacy or third-party systems.
- **Shared Kernel** — two contexts share a small, jointly-owned model subset (high coupling; change requires both teams to agree).
- **Customer/Supplier** — downstream context's needs influence the upstream's roadmap.
- **Conformist** — downstream simply adopts the upstream model as-is (no ACL); cheap but you inherit their concepts.
- **Open Host Service / Published Language** — upstream publishes a stable, well-documented API/schema (e.g. an event contract) for many consumers.

The map is a _strategic_ deliverable: it tells you where to put ACLs, which integrations are risky (Shared Kernel), and where team coordination is required.

# Tactical modeling

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

    public Guid Id { get; }
    public IReadOnlyList<OrderLine> Lines => _lines;

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

Prefer changing one aggregate per transaction because it keeps lock and consistency boundaries local. This is a design guideline, not a law: a transaction spanning several aggregates can be correct when one immediate invariant truly crosses them and the storage model supports atomic commit. If it happens frequently, reconsider whether the aggregate or bounded-context boundary is wrong.

An anemic model exposes setters while application services implement every rule; the domain vocabulary disappears into orchestration. An oversized aggregate loads and locks too much state, while an undersized aggregate pushes a truly immediate invariant into unreliable coordination. Draw the boundary around facts that must be consistent at commit time, then use events for consequences that can follow later.

When query needs diverge from the aggregate's command model, [[Software Architecture/Patterns/Architectural Patterns/CQRS]] can keep invariant enforcement on the write side while serving purpose-built read models.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Full DDD (Aggregates, Bounded Contexts) | Rich domain model, enforces invariants, scales with complexity | High upfront investment, overkill for simple domains | Complex business rules, multiple teams, long-lived systems |
| Transaction Script | Simple, fast to write | Logic scattered in services, hard to maintain as complexity grows | Simple CRUD, scripts, prototypes |
| Anemic model + services | Familiar to most developers | Invariants are procedural and dispersed across services, so they are easier to bypass or duplicate | Short-lived projects, simple domains |

**Decision rule**: apply DDD tactical patterns (Aggregates, Value Objects, Domain Events) when the domain has non-trivial invariants and multiple teams. Apply strategic patterns (Bounded Contexts) when the system is large enough that a single shared model becomes a coordination bottleneck. For simple CRUD, skip DDD — the overhead is not justified.

# Questions

> [!QUESTION]- What makes a Bounded Context boundary real?
> A context owns a coherent model and language. Integrations translate through explicit contracts or an anti-corruption layer rather than sharing one ambiguous domain model. Separate schemas, deployments, and aligned teams can reinforce that boundary, but none is mandatory by itself.

# References

- [Domain-Driven Design (Martin Fowler)](https://martinfowler.com/tags/domain%20driven%20design.html) — Fowler's collection of DDD articles covering Aggregates, Bounded Contexts, and the Ubiquitous Language with practical examples.
- [Domain-Driven Design: Tackling Complexity in the Heart of Software (Eric Evans)](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/) — the original DDD book; dense but authoritative. Read Part II (Building Blocks) for tactical patterns.
- [Implementing Domain-Driven Design (Vaughn Vernon)](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/) — more practical than Evans; covers Aggregate design, Domain Events, and Bounded Context integration with code examples.
- [CQRS.nu DDD FAQ](https://cqrs.nu/faq/Domain%20Driven%20Design) — concise Q\&A on DDD concepts, Aggregates, and how DDD relates to CQRS and Event Sourcing.
- [8 key concepts in DDD -- ByteByteGo vocabulary overview; the table above tightens its entity, repository, and aggregate-boundary definitions](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/8-key-concepts-in-ddd.md)
- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/) — Eric Evans' concise definitions of entities, value objects, services, aggregates, factories, repositories, and events.
- [Implementing Domain-Driven Design](https://vaughnvernon.com/?page_id=168) — Vaughn Vernon's detailed aggregate and tactical-pattern guidance.
- [Domain events: design and implementation](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation) — Microsoft .NET guidance for domain events and transaction boundaries.
