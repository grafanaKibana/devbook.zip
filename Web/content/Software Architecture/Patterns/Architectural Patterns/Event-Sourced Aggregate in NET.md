---
publish: true
created: 2026-07-16T17:40:51.089Z
modified: 2026-07-16T17:40:51.089Z
published: 2026-07-16T17:40:51.089Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: A concrete .NET aggregate that records domain events and reconstructs state by replaying an ordered stream.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

An event-sourced aggregate validates commands against current state, records immutable domain events, and rebuilds that state by replaying the stream in order. The aggregate never writes its fields directly from a command. It raises an event, applies the same event handler used during replay, and exposes the new events for an event store to append with an expected stream version.

The example keeps persistence outside the aggregate. [[Event Store Operations]] owns optimistic append, snapshots, schema evolution, projection checkpoints, and replay safety; [[Event Sourcing]] owns the architectural decision.

## Aggregate

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

public interface IDomainEvent
{
    DateTime OccurredUtc { get; }
}

public sealed record OrderPlaced(
    Guid OrderId,
    Guid CustomerId,
    DateTime OccurredUtc) : IDomainEvent;

public sealed record ItemAdded(
    Guid OrderId,
    string Sku,
    int Quantity,
    decimal UnitPrice,
    DateTime OccurredUtc) : IDomainEvent;

public sealed record OrderShipped(
    Guid OrderId,
    DateTime ShippedUtc,
    DateTime OccurredUtc) : IDomainEvent;

public sealed class Order
{
    private readonly List<IDomainEvent> _uncommitted = [];
    private readonly List<(string Sku, int Quantity, decimal UnitPrice)> _items = [];

    public Guid Id { get; private set; }
    public Guid CustomerId { get; private set; }
    public bool IsPlaced { get; private set; }
    public bool IsShipped { get; private set; }
    public DateTime? ShippedUtc { get; private set; }
    public decimal Total => _items.Sum(item => item.Quantity * item.UnitPrice);
    public IReadOnlyCollection<IDomainEvent> UncommittedEvents => _uncommitted;

    public static Order FromHistory(IEnumerable<IDomainEvent> history)
    {
        var order = new Order();

        foreach (var @event in history)
        {
            order.Apply(@event);
        }

        return order;
    }

    public void Place(Guid orderId, Guid customerId, DateTime utcNow)
    {
        if (IsPlaced)
        {
            throw new InvalidOperationException("Order already placed.");
        }

        Raise(new OrderPlaced(orderId, customerId, utcNow));
    }

    public void AddItem(string sku, int quantity, decimal unitPrice, DateTime utcNow)
    {
        if (!IsPlaced)
        {
            throw new InvalidOperationException("Place order before adding items.");
        }

        if (IsShipped)
        {
            throw new InvalidOperationException("Cannot add items to a shipped order.");
        }

        if (quantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity));
        }

        if (unitPrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(unitPrice));
        }

        Raise(new ItemAdded(Id, sku, quantity, unitPrice, utcNow));
    }

    public void Ship(DateTime shippedUtc, DateTime utcNow)
    {
        if (!IsPlaced || _items.Count == 0)
        {
            throw new InvalidOperationException("Cannot ship an empty or unplaced order.");
        }

        if (IsShipped)
        {
            throw new InvalidOperationException("Order already shipped.");
        }

        Raise(new OrderShipped(Id, shippedUtc, utcNow));
    }

    public void ClearUncommittedEvents() => _uncommitted.Clear();

    private void Raise(IDomainEvent @event)
    {
        Apply(@event);
        _uncommitted.Add(@event);
    }

    private void Apply(IDomainEvent @event)
    {
        switch (@event)
        {
            case OrderPlaced placed:
                Id = placed.OrderId;
                CustomerId = placed.CustomerId;
                IsPlaced = true;
                break;
            case ItemAdded added:
                _items.Add((added.Sku, added.Quantity, added.UnitPrice));
                break;
            case OrderShipped shipped:
                IsShipped = true;
                ShippedUtc = shipped.ShippedUtc;
                break;
            default:
                throw new NotSupportedException($"Unknown event type: {@event.GetType().Name}");
        }
    }
}
```

`FromHistory` applies events without adding them to `UncommittedEvents`. Command methods call `Raise`, which applies the event and records it for append. An event-store repository must append those events with the stream version observed at load time; otherwise two writers can both validate against stale state and overwrite the aggregate's intended order.

## Concrete flow

1. Load stream `Order-42` at version 7.
2. Replay events into `Order.FromHistory`.
3. Call `AddItem("SSD-1TB", 1, 89.00m, utcNow)`.
4. Append the resulting `ItemAdded` with expected version 7.
5. If another writer already produced version 8, reject the append and retry the command against fresh history.
6. After a successful append, call `ClearUncommittedEvents`.

The expected-version check belongs at the event-store boundary, not inside the aggregate. The aggregate decides whether a command is valid for the state it was given; the store proves that state was still current when the event was appended.

## References

- [Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) - Microsoft guidance on append-only event stores, replay, snapshots, and optimistic concurrency.
- [EventStoreDB optimistic concurrency](https://developers.eventstore.com/clients/grpc/appending-events.html#handling-concurrency) - Expected stream revision behavior when appending events.
- [Implementing Domain-Driven Design](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/) - Vaughn Vernon treatment of aggregates, domain events, and consistency boundaries.
