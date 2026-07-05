---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "2"
priority: High
status: Ready to Repeat
publish: true
---

# Domain-Driven Design

Domain-Driven Design (DDD) is an approach to software development that centers the design on the business domain — its language, rules, and boundaries — rather than on technical infrastructure. The core idea: complex software fails not because of bad technology but because the code doesn't reflect how the business actually works. DDD provides a set of tactical patterns (Entities, Value Objects, Aggregates, Domain Events, Repositories) and strategic patterns (Bounded Contexts, Ubiquitous Language) to close that gap. In an insurance claims platform, introducing Bounded Contexts between Underwriting and Claims Processing eliminated a class of bugs where claim status updates silently overwrote underwriting decisions — the two contexts had different definitions of "approved" that a shared `Policy` model conflated.

DDD is most valuable in complex domains with rich business rules. For CRUD-heavy systems with little domain logic, the overhead is not justified.

## Strategic Patterns

### Ubiquitous Language

A shared vocabulary used by both developers and domain experts in conversations, code, and documentation. When the code uses the same terms as the business ("Order", "Shipment", "Fulfillment"), there is no translation layer where meaning gets lost.

**In practice**: if a domain expert says "an order is fulfilled when all line items are shipped," the code should have an `Order` with a `Fulfill()` method that checks `LineItems.All(li => li.IsShipped)` — not a `ProcessOrderStatusUpdate()` method that sets `StatusId = 3`.

### Bounded Context

A Bounded Context is an explicit boundary within which a particular domain model applies. The same word can mean different things in different contexts: "Customer" in the Sales context (prospect, contact info, deal history) is different from "Customer" in the Billing context (payment method, invoice address, credit limit).

Each Bounded Context has its own model, its own database schema, and its own team ownership. Communication between contexts happens via well-defined contracts (events, APIs) — not shared database tables.

```text
Sales Context          Billing Context
─────────────          ───────────────
Customer               Customer
  - Name                 - PaymentMethod
  - ContactInfo          - CreditLimit
  - DealHistory          - InvoiceAddress

OrderPlaced event ──→  BillingService.CreateInvoice()
```

### Subdomains: where to invest

Not all of the domain deserves equal effort. DDD classifies subdomains so you spend modeling energy where it pays off:

- **Core domain** — the part that differentiates the business (your competitive advantage). Invest your best people and rich modeling here.
- **Supporting subdomain** — necessary but not differentiating; build it simply.
- **Generic subdomain** — a solved problem (auth, billing, notifications); **buy or use off-the-shelf**, don't hand-craft.

The mistake is lavishing DDD tactical patterns on a generic subdomain while under-modeling the core.

### Context Mapping

Bounded contexts don't live in isolation — **context maps** describe the *relationships* between them and how their models integrate:

- **Anti-Corruption Layer (ACL)** — a translation layer that protects your model from a messy/legacy upstream one, converting their concepts into yours so their model can't "leak" in. The single most important integration pattern when wrapping legacy or third-party systems.
- **Shared Kernel** — two contexts share a small, jointly-owned model subset (high coupling; change requires both teams to agree).
- **Customer/Supplier** — downstream context's needs influence the upstream's roadmap.
- **Conformist** — downstream simply adopts the upstream model as-is (no ACL); cheap but you inherit their concepts.
- **Open Host Service / Published Language** — upstream publishes a stable, well-documented API/schema (e.g. an event contract) for many consumers.

The map is a *strategic* deliverable: it tells you where to put ACLs, which integrations are risky (Shared Kernel), and where team coordination is required.

## Tactical Patterns

### Entity

An object with a unique identity that persists over time. Two entities with the same data are still different objects if their IDs differ.

```csharp
public sealed class Order
{
    public OrderId Id { get; }
    public CustomerId CustomerId { get; }
    private readonly List<LineItem> _lineItems = new();

    public Order(OrderId id, CustomerId customerId)
    {
        Id = id;
        CustomerId = customerId;
    }

    public void AddItem(ProductId productId, int quantity, Money price)
    {
        _lineItems.Add(new LineItem(productId, quantity, price));
    }
}
```

### Value Object

An object defined entirely by its attributes, with no identity. Two Value Objects with the same data are equal. Value Objects are immutable.

```csharp
public sealed record Money(decimal Amount, string Currency)
{
    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");
        return new Money(Amount + other.Amount, Currency);
    }
}
```

`Money(10, "USD")` equals `Money(10, "USD")` — no identity needed.

### Aggregate

An Aggregate is a cluster of Entities and Value Objects treated as a single unit for data changes. The **Aggregate Root** is the only entry point — external code cannot modify internal objects directly.

```csharp
public sealed class Order  // Aggregate Root
{
    private readonly List<LineItem> _lineItems = new();
    public IReadOnlyList<LineItem> LineItems => _lineItems.AsReadOnly();
    public OrderStatus Status { get; private set; } = OrderStatus.Draft;

    public void Confirm()
    {
        if (!_lineItems.Any())
            throw new DomainException("Cannot confirm an empty order");
        Status = OrderStatus.Confirmed;
        AddDomainEvent(new OrderConfirmed(Id, DateTimeOffset.UtcNow));
    }
}
```

The Aggregate enforces invariants: you cannot confirm an empty order. External code calls `order.Confirm()` — it never sets `order.Status` directly.

Two design rules make aggregates work:

- **Reference other aggregates by ID, not by object reference.** An `Order` holds a `CustomerId`, not a `Customer` object. This keeps each aggregate a small, independently-loadable consistency boundary (and avoids loading half the database to confirm one order).
- **One aggregate per transaction.** A single transaction should modify exactly one aggregate instance; changes that span aggregates are made *eventually consistent* via [[Software Engineering/05 Architecture/Distributed Systems/Distributed Transactions|domain events / sagas]], not a big multi-aggregate transaction. The aggregate *is* the transactional consistency boundary.

Keep aggregates **as small as invariants allow** — a too-large aggregate (see Pitfalls) serializes unrelated updates and causes contention.

### Domain Service

When a piece of behavior doesn't naturally belong to any single Entity or Value Object — typically because it **coordinates several aggregates** or expresses a domain concept that isn't a "thing" — put it in a **Domain Service**: a stateless object named in the ubiquitous language (e.g. `FundsTransferService.Transfer(from, to, amount)` where the logic belongs to neither account alone). Don't confuse it with an *application* service (which orchestrates use cases, transactions, and I/O) — a domain service contains **business rules** and lives in the domain layer with no infrastructure dependencies. Reach for it sparingly; most behavior should still live on the aggregate that owns the data (Information Expert).

### Domain Events

Facts that something happened in the domain, published after a state change. Other parts of the system react without the originating aggregate knowing about them.

```csharp
public sealed record OrderConfirmed(OrderId OrderId, DateTimeOffset OccurredAt)
    : IDomainEvent;
```

Domain Events are raised inside the Aggregate and dispatched after the transaction commits (see [[Software Engineering/06 Development Practices/Paradigms/Event-driven|Event-driven Development]] for the dispatch mechanism).

### Repository

An abstraction over persistence that provides a collection-like interface for Aggregates. The domain layer depends on the `IOrderRepository` interface; the infrastructure layer provides the EF Core implementation.

```csharp
public interface IOrderRepository
{
    Task<Order?> FindAsync(OrderId id, CancellationToken ct);
    Task SaveAsync(Order order, CancellationToken ct);
}
```

See [[Software Engineering/05 Architecture/Patterns/Repository & UoW|Repository & Unit of Work]] for the full pattern.

## Pitfalls

### Anemic Domain Model

**What goes wrong**: Entities are data bags with only getters/setters. All business logic lives in service classes. The domain model doesn't enforce invariants.

**Why it happens**: developers familiar with CRUD patterns treat domain objects as DTOs and put logic in "service" or "manager" classes.

**Mitigation**: business rules belong in the Aggregate. If you find yourself writing `if (order.Status == OrderStatus.Draft) order.Status = OrderStatus.Confirmed;` in a service, move that logic into `order.Confirm()`.

### Aggregate Boundaries Too Large

**What goes wrong**: one Aggregate contains dozens of Entities. Every operation loads the entire graph, causing performance problems and contention. A `Customer` Aggregate that included `Orders`, `Addresses`, `PaymentMethods`, and `ActivityLog` loaded 15MB of data on every update — a simple address change took 4 seconds and held a database lock that blocked concurrent writes to the same customer.

**Why it happens**: developers model "what belongs together conceptually" rather than "what must change together transactionally."

**Mitigation**: Aggregate boundaries should be defined by transactional consistency requirements, not conceptual grouping. If `Order` and `Customer` don't need to change in the same transaction, they should be separate Aggregates referenced by ID.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Full DDD (Aggregates, Bounded Contexts) | Rich domain model, enforces invariants, scales with complexity | High upfront investment, overkill for simple domains | Complex business rules, multiple teams, long-lived systems |
| Transaction Script | Simple, fast to write | Logic scattered in services, hard to maintain as complexity grows | Simple CRUD, scripts, prototypes |
| Anemic model + services | Familiar to most developers | No invariant enforcement, business rules leak everywhere | Short-lived projects, simple domains |

**Decision rule**: apply DDD tactical patterns (Aggregates, Value Objects, Domain Events) when the domain has non-trivial invariants and multiple teams. Apply strategic patterns (Bounded Contexts) when the system is large enough that a single shared model becomes a coordination bottleneck. For simple CRUD, skip DDD — the overhead is not justified.

## Questions

> [!QUESTION]- What is the difference between an Entity and a Value Object?
> - Entity: has a unique identity that persists over time. Two entities with the same data are different if their IDs differ. Example: `Order` with `OrderId`.
> - Value Object: defined entirely by its attributes, no identity. Two Value Objects with the same data are equal. Immutable. Example: `Money(10, "USD")`.
> - Rule of thumb: if you care about *which* instance it is, it's an Entity. If you only care about *what* it contains, it's a Value Object.
> - Tradeoff: Value Objects are simpler to reason about (immutable, no identity tracking) but require copying on mutation. Use them for concepts like Money, Address, DateRange, Coordinates.

> [!QUESTION]- Why should external code only interact with an Aggregate through its root?
> - The Aggregate Root enforces all invariants for the cluster. If external code modifies a `LineItem` directly, it bypasses the `Order`'s consistency checks.
> - Example: adding a line item after an order is confirmed should be rejected. If `LineItem` is modified directly, the `Order` never gets a chance to enforce this rule.
> - Practical implication: repositories load and save entire Aggregates, not individual child entities. EF Core's change tracking makes this natural.
> - Tradeoff: loading the full Aggregate for every operation can be expensive if the Aggregate is large. This is a signal that the Aggregate boundary is too wide.

## References

- [Domain-Driven Design (Martin Fowler)](https://martinfowler.com/tags/domain%20driven%20design.html) — Fowler's collection of DDD articles covering Aggregates, Bounded Contexts, and the Ubiquitous Language with practical examples.
- [Domain-Driven Design: Tackling Complexity in the Heart of Software (Eric Evans)](https://www.oreilly.com/library/view/domain-driven-design-tackling/0321125215/) — the original DDD book; dense but authoritative. Read Part II (Building Blocks) for tactical patterns.
- [Implementing Domain-Driven Design (Vaughn Vernon)](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/) — more practical than Evans; covers Aggregate design, Domain Events, and Bounded Context integration with code examples.
- [CQRS.nu DDD FAQ](https://cqrs.nu/faq/Domain%20Driven%20Design) — concise Q&A on DDD concepts, Aggregates, and how DDD relates to CQRS and Event Sourcing.
- [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]] — architectural pattern that pairs naturally with DDD: commands map to Aggregate operations, queries bypass the domain model for read efficiency.
