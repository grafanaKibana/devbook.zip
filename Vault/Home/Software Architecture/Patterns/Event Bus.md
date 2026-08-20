---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "A centralized publish/subscribe dispatcher where publishers emit events and subscribers register handlers, with neither side knowing the other exists."
level:
  - "2"
priority: Medium
status: Ready to Repeat
publish: true
---

An event bus dispatches a published event to every registered handler for its type. Publishers depend on the event contract rather than concrete subscribers. A new reaction can be registered without changing the publisher.

The [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Observer]] pattern attaches observers to a subject. An event bus moves subscription to a shared dispatcher, so a handler can react to any `OrderPlaced` published through that bus. The [[Home/Software Architecture/Patterns/Design Patterns/Behavioral/Mediator]] pattern usually routes one request to one handler. Event publication fans one fact out to zero or more handlers.

In-process dispatch can use MediatR's `INotification` pipeline or a small custom dispatcher. Once events must cross a process boundary or survive a crash, [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|message brokers]] provide transport and durability. Libraries such as MassTransit add handler conventions and recovery behavior over that infrastructure. The [[Home/Software Design/Paradigms/Event-driven]] page covers the broader paradigm and reliable publication through an outbox.

# MediatR Notification Bus

MediatR's `IPublisher.Publish()` provides an in-process version of the pattern. An event implements `INotification`. The container supplies every registered `INotificationHandler<T>` at publish time.

```csharp
// Event — immutable fact
public sealed record OrderPlaced(string OrderId, decimal Total, DateTimeOffset At) : INotification;

// Handler 1: reserve inventory
public sealed class ReserveStockHandler(IInventoryService inventory) : INotificationHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced evt, CancellationToken ct)
    {
        await inventory.ReserveAsync(evt.OrderId, ct);
    }
}

// Handler 2: send confirmation email
public sealed class SendConfirmationHandler(IEmailService email) : INotificationHandler<OrderPlaced>
{
    public async Task Handle(OrderPlaced evt, CancellationToken ct)
    {
        await email.SendOrderConfirmationAsync(evt.OrderId, ct);
    }
}

// Publisher — doesn't know about handlers
public sealed class OrderService(IOrderRepository repo, IPublisher publisher)
{
    public async Task PlaceAsync(CreateOrderRequest request, CancellationToken ct)
    {
        var order = Order.Create(request);
        await repo.SaveAsync(order, ct);
        // Fan-out: MediatR resolves and calls all INotificationHandler<OrderPlaced>
        await publisher.Publish(new OrderPlaced(order.Id, order.Total, DateTimeOffset.UtcNow), ct);
    }
}

// Registration — one line, handlers auto-discovered
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Program).Assembly));
```

An analytics reaction can be added as another handler without editing `OrderService`.

# Custom Event Bus

A custom DI-backed bus makes execution and failure policy part of local code. The sample runs handlers sequentially inside one scope so scoped dependencies are never used concurrently.

```csharp
// Contract
public interface IEvent { }
public interface IEventHandler<in TEvent> where TEvent : IEvent
{
    Task HandleAsync(TEvent evt, CancellationToken ct);
}
public interface IEventBus
{
    Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct) where TEvent : IEvent;
}

// Implementation — creates one scope per publish and runs handlers sequentially
public sealed class EventBus(IServiceScopeFactory scopeFactory) : IEventBus
{
    public async Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct) where TEvent : IEvent
    {
        // Create a child scope to resolve scoped handlers correctly
        await using var scope = scopeFactory.CreateAsyncScope();
        var handlers = scope.ServiceProvider.GetServices<IEventHandler<TEvent>>();

        foreach (var handler in handlers)
        {
            await Execute(handler, evt, ct);
        }
    }

    private static async Task Execute<TEvent>(
        IEventHandler<TEvent> handler, TEvent evt, CancellationToken ct) where TEvent : IEvent
    {
        try
        {
            await handler.HandleAsync(evt, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Handler {Handler} failed for {Event}", handler.GetType().Name, typeof(TEvent).Name);
            throw;
        }
    }
}

// Registration — bus is singleton (stateless), handlers are scoped (resolved per-publish via child scope)
builder.Services.AddSingleton<IEventBus, EventBus>();
builder.Services.AddScoped<IEventHandler<OrderPlaced>, ReserveStockHandler>();
builder.Services.AddScoped<IEventHandler<OrderPlaced>, SendConfirmationHandler>();
```

The implementation now owns registration, scoping, and error policy. Caller cancellation and the first ordinary handler failure both stop the publish. The DI scope shares scoped object lifetimes; it does not begin a transaction or roll back an earlier handler's committed effects. If every handler uses one transactional resource, the publisher must begin that transaction explicitly and commit only after all handlers succeed. Otherwise partial effects remain possible, and independent required work needs durable delivery.

# Pitfalls

## One Handler Stops the Remaining Publish

MediatR's `ForeachAwaitPublisher` awaits handlers sequentially and propagates the first exception, so later handlers never run after one fails.

Choose a publisher strategy that matches the dependency. `TaskWhenAllPublisher` invokes handlers concurrently, but it does not make their side effects durable. Required independent work belongs on a durable queue or needs an explicit retry record.

## Implicit Handler Ordering Dependencies

Registration order can look stable enough to use as sequencing, but an event contract describes independent reactions. Once one handler expects state from another, the fan-out has become an undocumented workflow.

Keep fan-out handlers independent. A genuine dependency should be an explicit workflow whose next step follows a recorded outcome.

## Scope Leaking Across Handlers

Handlers resolved from one DI scope share scoped services. In the HTTP request scope or the sample's per-publish child scope, tracked changes in one handler can affect what another observes before commit.

Handlers that share one `DbContext` transaction must run sequentially in the same scope. Concurrent handlers need separate scopes and context instances, which also means they cannot share that database transaction.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| MediatR `INotification` | Existing DI integration and configurable publishers | Process-local delivery and shared-scope behavior unless customized | In-process notifications when MediatR is already present |
| Custom `IEventBus` | Full control over sequencing, failure propagation, and scoping strategy | More code to maintain, no pipeline behavior ecosystem | When execution or scope policy must be explicit |
| MassTransit / NServiceBus | Durable, cross-service, retry policies, saga orchestration, dead-letter queues | Infrastructure dependency (broker), serialization overhead, operational complexity | Cross-service event communication where durability and retry matter |

Reuse an in-process dispatcher already in the application. Write a custom bus only for an execution policy the existing dispatcher cannot express. Use a broker-backed bus when delivery must cross processes or survive restarts.

# References

- [MediatR notifications](https://github.com/jbogard/MediatR/wiki#notifications)
- [MassTransit documentation](https://masstransit.io/documentation/concepts)
- [Event Aggregator](https://martinfowler.com/eaaDev/EventAggregator.html)
