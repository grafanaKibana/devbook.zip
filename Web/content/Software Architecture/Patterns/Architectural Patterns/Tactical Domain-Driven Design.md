---
publish: true
created: 2026-07-16T16:57:20.863Z
modified: 2026-07-16T16:57:20.863Z
published: 2026-07-16T16:57:20.863Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: DDD entities, value objects, aggregates, domain services, events, and repositories inside one bounded context.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

Tactical Domain-Driven Design supplies modeling patterns inside one bounded context. [[Domain-Driven Design]] owns strategic questions such as subdomains, ubiquitous language, context boundaries, and context maps. Tactical patterns make one context's invariants explicit in code; they are useful only when the domain behavior is richer than CRUD validation.

## Building blocks

- **Entity:** identified across time, such as `Order` with `OrderId`.
- **Value object:** identified by its values and normally immutable, such as `Money(Amount, Currency)`.
- **Aggregate:** a consistency boundary reached through one root.
- **Domain service:** domain behavior that does not fit one entity or value object.
- **Domain event:** a fact produced by a successful domain transition.
- **Repository:** a collection-like boundary for loading and saving aggregate roots.

## Aggregate example

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

Prefer changing one aggregate per transaction because it keeps lock and consistency boundaries local. This is a design guideline, not a law. A transaction spanning several aggregates can be correct when one immediate invariant truly crosses them and the storage model supports atomic commit. If it happens frequently, reconsider whether the aggregate or bounded-context boundary is wrong.

## Failure modes

An anemic model exposes setters while application services implement every rule; the domain vocabulary disappears into orchestration. An oversized aggregate loads and locks too much state, making unrelated changes contend. An undersized aggregate pushes a truly immediate invariant into unreliable coordination. Draw the boundary around facts that must be consistent at commit time, then use events for consequences that can follow later.

## References

- [Domain-Driven Design Reference](https://www.domainlanguage.com/ddd/reference/) — Eric Evans' concise definitions of entities, value objects, services, aggregates, factories, repositories, and events.
- [Implementing Domain-Driven Design](https://vaughnvernon.com/?page_id=168) — Vaughn Vernon's detailed aggregate and tactical-pattern guidance.
- [Domain events: design and implementation](https://learn.microsoft.com/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation) — Microsoft .NET guidance for domain events and transaction boundaries.
