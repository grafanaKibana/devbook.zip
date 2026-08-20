---
publish: true
created: 2026-08-20T20:41:15.705Z
modified: 2026-08-20T20:41:15.705Z
published: 2026-08-20T20:41:15.705Z
topic:
  - Software Design
subtopic:
  - Paradigms
summary: Systems built around immutable events and reactions, decoupling producers from consumers.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Event-driven systems move work forward by representing that something happened and letting handlers react. An order service can publish `OrderPlaced` without calling inventory directly. Inventory handles the event under its own delivery and retry rules. The event should be treated as an immutable fact once published, even if its serialized payload is technically mutable.

The same control model appears inside one process and across services. In-process dispatch keeps handlers in the application's failure boundary and may run them synchronously. Distributed delivery crosses a durable broker, so acknowledgement, redelivery, ordering, and schema evolution become part of the design.

# Events vs. Commands

A command asks for a state change. An event reports a state change that already happened.

- A **command** targets one logical handler and can be refused because its preconditions do not hold. `ReserveStock` is a request, not a fact.
- An **event** is named in the past tense, such as `OrderPlaced`, and can have zero or many interested handlers. A consumer may reject a malformed message, but it cannot undo the fact represented by a valid event.

Routing a command to one handler fits the [[Software Architecture/Patterns/Design Patterns/Behavioral/Mediator]] pattern. Fan-out uses an [[Software Architecture/Patterns/Event Bus]] and, across services, commonly relies on a [[Software Architecture/Distributed Systems/Message Queues/Message Queues|message broker]].

# Four Styles of "Event-Driven" (Fowler)

The label covers several designs with different consistency and ownership rules:

1. **Event Notification** carries a reference such as an order ID. A consumer fetches current details from the source, which keeps the event small but adds a runtime dependency on that source.
2. **Event-Carried State Transfer** includes the data needed to update a local projection. Consumers avoid a callback, at the cost of duplicated data and eventual consistency.
3. **[[Software Architecture/Patterns/Architectural Patterns/Event Sourcing|Event Sourcing]]** stores events as the source of truth and reconstructs current state from them.
4. **[[Software Architecture/Patterns/Architectural Patterns/CQRS]]** separates the write model from one or more read models, which are often updated from events.

The first two describe message content between components. Event sourcing and CQRS change how state is modeled. They can be combined, but neither is required for ordinary event publication.

# In-Process Domain Events

An in-process event separates the publisher from its handlers, but it does not create a durability boundary. If the process stops before a handler finishes, the event and the unfinished work disappear unless they were persisted elsewhere. The following example also publishes after the repository call without making the state change and publication atomic. It demonstrates dispatch shape, not reliable integration delivery.

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

# Distributed Events and the Outbox Pattern

A database commit and a broker publish are two separate operations. If the commit succeeds and publication fails, downstream consumers never see the change.

The **Outbox pattern** stores an outgoing message in the same local transaction as the domain change. A relay reads committed outbox rows and publishes them. This closes the lost-message gap, though the relay can publish more than once when it crashes between broker acknowledgement and marking a row complete. Consumers still need idempotency.

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

# Pitfalls

## Publishing Before Persisting

Publishing near the end of an application flow can still happen before the database confirms the transaction. If the event reaches the broker and the commit fails, consumers react to a state change that is absent from the source system.

Publish only facts backed by committed state. When the database update and broker publish must form one reliable handoff, persist an outbox record in the database transaction and relay it afterward.

## Ignoring Consumer Idempotency

Common queue and broker configurations provide at-least-once delivery across failures. If processing succeeds but acknowledgement is lost, the next delivery can repeat a charge or reservation. An outbox relay creates the same possibility on the publishing side.

Make the consumer's state change idempotent. A processed-message record must commit atomically with that change, or the deduplication check has its own failure gap. Naturally idempotent operations, such as setting a versioned value, can avoid a separate record.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| In-process events (MediatR) | No broker. Handlers share the application boundary | No durable handoff. A slow handler can delay the publisher | Domain reactions that belong to one application boundary |
| Distributed broker (Service Bus, Kafka) | Durable handoff and independent consumers | Redelivery, partial ordering, schema evolution, and broker operations | Cross-service workflows or fan-out that must survive restarts |

Keep an event in-process when its handlers share the publisher's deployment and failure boundary. Use a broker when the handoff must survive restarts or cross service ownership. Add an outbox when a local database commit and broker publication must remain consistent. Systems that publish from an already durable log may use that log as the handoff instead.

# References

- [What do you mean by Event-Driven?](https://martinfowler.com/articles/201701-event-driven.html)
- [MediatR](https://github.com/jbogard/MediatR)
