---
topic:
  - Development Practices
subtopic:
  - Paradigms
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

# Event-Driven Development

Event-driven development builds systems around *events* — immutable facts that something happened — and reactions to those events. Producers publish events without knowing who will consume them; consumers subscribe and handle events independently. This decouples components: the order service doesn't call the inventory service directly, it publishes `OrderPlaced` and the inventory service reacts on its own schedule.

The pattern appears at two scales: **in-process** (domain events within a single application, dispatched via MediatR or a simple in-memory bus) and **distributed** (events published to a message broker like RabbitMQ, Azure Service Bus, or Kafka, consumed by separate services).

## Events vs Commands

A distinction "event-driven" tends to blur:

- A **command** is an instruction to *one* handler to *do* something — imperative, present tense (`ReserveStock`); the sender expects it carried out, and it **can be rejected**.
- An **event** is a notification that something *already happened* — a past-tense immutable fact (`OrderPlaced`), broadcast to *zero-to-many* subscribers who each decide how to react. It can't be rejected — it's history.

Routing a command to one handler is the [[05 Architecture/Patterns/Design Patterns/Behavioral/Mediator|Mediator]] pattern; fanning an event out to many is an [[05 Architecture/Patterns/Event Bus|Event Bus]] over a [[05 Architecture/Distributed Systems/Message Queues/Message Queues|message broker]].

## Four Styles of "Event-Driven" (Fowler)

The term covers four distinct patterns that are often conflated — naming which one you mean avoids a lot of confusion:

1. **Event Notification** — the event carries just an ID/reference ("order 42 placed"); consumers call *back* to the source for details. Lowest coupling, but chatty and the source must stay available.
2. **Event-Carried State Transfer** — the event carries *all* the data a consumer needs ("order 42: items, total, address"), so consumers keep a local copy and never call back. More decoupled and resilient, at the cost of data duplication and eventual consistency.
3. **Event Sourcing** — events are the **source of truth**; current state is *derived* by replaying the log. See [[05 Architecture/Patterns/Architectural Patterns/Event Sourcing|Event Sourcing]].
4. **CQRS** — separate the write model (commands) from read models (queries), often kept in sync via events. See [[05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]].

The first two are *communication* styles (how services talk); the last two are *architectural* patterns (how you store and model state). Most systems use event notification or state transfer **without** event sourcing.

## In-Process Domain Events

```csharp
// Event: an immutable fact
public sealed record OrderPlaced(string OrderId, decimal Total, DateTimeOffset OccurredAt);

// Publisher: raises the event after persisting state
public sealed class OrderService(IEventBus bus, IOrderRepository repo)
{
    public async Task PlaceAsync(string orderId, decimal total, CancellationToken ct)
    {
        await repo.SaveAsync(new Order(orderId, total), ct);
        // Publish AFTER save — event reflects committed state
        await bus.PublishAsync(new OrderPlaced(orderId, total, DateTimeOffset.UtcNow), ct);
    }
}

// Consumer: reacts without being called directly
public sealed class InventoryHandler : IEventHandler<OrderPlaced>
{
    public Task HandleAsync(OrderPlaced evt, CancellationToken ct)
    {
        // Reserve stock for the placed order
        return Task.CompletedTask;
    }
}
```

## Distributed Events and the Outbox Pattern

Publishing to a message broker after a database write introduces a reliability gap: the DB write succeeds but the broker publish fails, leaving the event lost.

The **Outbox pattern** solves this by writing the event to an `OutboxMessages` table in the same database transaction as the domain change. A background worker then reads the outbox and publishes to the broker, retrying until acknowledged:

```csharp
// In the same transaction: save order + write outbox entry
await using var tx = await db.Database.BeginTransactionAsync(ct);
await repo.SaveAsync(order, ct);
await db.OutboxMessages.AddAsync(new OutboxMessage
{
    Type    = nameof(OrderPlaced),
    Payload = JsonSerializer.Serialize(new OrderPlaced(order.Id, order.Total, DateTimeOffset.UtcNow))
}, ct);
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
// Background worker publishes OutboxMessages to the broker
```

## Pitfalls

### Publishing Before Persisting

**What goes wrong**: the event is published to the broker before the database transaction commits. If the commit fails, consumers react to an event that never happened.

**Why it happens**: publishing feels like a natural "last step" after business logic, but it happens before the DB confirms success.

**Mitigation**: always publish events *after* a successful commit, or use the Outbox pattern for guaranteed delivery.

### Ignoring Consumer Idempotency

**What goes wrong**: the broker delivers the same event twice (at-least-once delivery is the default for most brokers). The consumer processes it twice, double-charging a customer or double-reserving stock.

**Why it happens**: most message brokers guarantee at-least-once delivery, not exactly-once.

**Mitigation**: make consumers idempotent. Track processed event IDs in a `ProcessedEvents` table and skip duplicates. Design operations to be naturally idempotent where possible (e.g., `SET stock = X` instead of `stock -= Y`).

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| In-process events (MediatR) | Simple, no infrastructure, synchronous option | Lost on process crash, no cross-service delivery | Domain events within one bounded context |
| Distributed broker (Service Bus, Kafka) | Durable, cross-service, scalable | Operational complexity, at-least-once delivery, ordering challenges | Cross-service workflows, audit trails, high-throughput pipelines |

**Decision rule**: start with in-process events for domain logic within a single service. Move to a distributed broker when you need cross-service communication, durability across restarts, or fan-out to multiple consumers. Always pair distributed events with the Outbox pattern for reliability.

## Questions

> [!QUESTION]- How does event-driven architecture differ from event sourcing?
> Event-driven architecture is a communication style: components publish events and others react asynchronously. Event sourcing is a persistence pattern: the state of an entity is derived by replaying its event history rather than storing current state. You can use event-driven communication without event sourcing (most systems do). Event sourcing requires event-driven communication but adds the constraint that events are the source of truth for state.

> [!QUESTION]- How do you guarantee ordering of events in a distributed event-driven system?
> Most message brokers guarantee ordering only within a partition or queue. Kafka guarantees ordering within a partition (use a consistent partition key, e.g., order ID). Azure Service Bus sessions guarantee ordering within a session. Cross-partition ordering is not guaranteed — design consumers to be idempotent and handle out-of-order delivery. If strict global ordering is required, use a single partition (which limits throughput) or a sequencer service.

> [!QUESTION]- Why must event consumers be idempotent in an at-least-once delivery system?
> Most message brokers guarantee at-least-once delivery: a message may be delivered more than once if the consumer crashes after processing but before acknowledging. Without idempotency, duplicate delivery causes double-charging, double-reserving, or duplicate records. Mitigation: track processed event IDs in a `ProcessedEvents` table and skip duplicates, or design operations to be naturally idempotent (SET stock = X instead of stock -= Y).

## References

- [Event-driven architecture style (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven) — Microsoft's overview of event-driven patterns, broker topologies, and when to apply them in distributed systems.
- [Outbox pattern (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transactional-outbox-cosmos) — detailed explanation of the Outbox pattern for reliable event publishing with transactional guarantees.
- [MediatR (GitHub)](https://github.com/jbogard/MediatR) — the standard .NET in-process mediator library used for domain events, commands, and queries; supports both synchronous and asynchronous handlers.
- [Event-Driven Architecture (Martin Fowler)](https://martinfowler.com/articles/201701-event-driven.html) — practitioner article distinguishing event notification, event-carried state transfer, event sourcing, and CQRS — four patterns often confused under the "event-driven" label.
