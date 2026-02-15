---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/paradigms/event-driven/","noteIcon":""}
---


# Intro

Event-driven development builds systems around events (facts that something happened) and reactions to those events.

In practice, it means producers publish events (often asynchronously) and consumers subscribe and handle them, which helps decouple components and enables scalable, resilient workflows.

## Example

An order service publishes `OrderPlaced`. Other services react without the order service calling them directly.

```csharp
public sealed record OrderPlaced(string OrderId, DateTimeOffset OccurredAt);

public interface IEventBus
{
    Task PublishAsync<T>(T evt, CancellationToken ct);
}

public sealed class Orders
{
    private readonly IEventBus _bus;

    public Orders(IEventBus bus) => _bus = bus;

    public async Task PlaceAsync(string orderId, CancellationToken ct)
    {
        // Persist order state first (often with an Outbox for reliability)
        await _bus.PublishAsync(new OrderPlaced(orderId, DateTimeOffset.UtcNow), ct);
    }
}
```


## Questions

> [!QUESTION]- What is Event-driven?
> Event-driven development builds systems around events (facts that something happened) and reactions to those events.

## Links

- [Event-driven architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven)
