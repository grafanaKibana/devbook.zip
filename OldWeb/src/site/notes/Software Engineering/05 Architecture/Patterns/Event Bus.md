---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/event-bus/","dg-note-properties":{"topic":["Architecture"],"subtopic":["Patterns"],"level":["2"],"priority":"Medium","status":"Ready to Repeat"}}
---


# Event Bus

An event bus is a centralized publish/subscribe dispatcher: publishers emit events into the bus without knowing who listens, and subscribers register handlers by event type without knowing who publishes. The bus resolves handlers at runtime and invokes all of them when an event arrives. The core value is **double decoupling** — neither side knows the other exists, and adding a new subscriber means registering a handler, not editing the publisher.

This sits between two related concepts. The [[Software Engineering/05 Architecture/Patterns/Design Patterns/Behavioral/Observer\|Observer]] pattern couples subscribers to a specific subject instance — you subscribe to *this* order's `StatusChanged` event. An event bus removes that coupling: you subscribe to *any* `OrderPlaced` event regardless of which object publishes it. The [[Software Engineering/05 Architecture/Patterns/Design Patterns/Behavioral/Mediator\|Mediator]] pattern (MediatR `Send`) routes one request to one handler. An event bus routes one event to *many* handlers — `Publish(OrderPlaced)` fans out to inventory, billing, and notification handlers simultaneously.

In .NET, the most common in-process event bus is **MediatR's `INotification` / `INotificationHandler<T>`** pipeline. For cross-service communication, [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Message Queues\|message brokers]] (RabbitMQ, Azure Service Bus, Kafka) serve as the distributed event bus, often abstracted through MassTransit or NServiceBus. The [[Software Engineering/06 Development Practices/Paradigms/Event-driven\|Event-driven]] page covers the broader paradigm and the Outbox pattern for reliable distributed publishing.

## MediatR Notification Bus

MediatR's `IPublisher.Publish()` is the simplest in-process event bus in .NET. You define an event as an `INotification`, register handlers as `INotificationHandler<T>`, and the container resolves all handlers at publish time:

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

Adding analytics tracking means creating `AnalyticsHandler : INotificationHandler<OrderPlaced>` — `OrderService` never changes.

## Custom Event Bus

When you need control over execution strategy (parallel vs sequential, error isolation, ordering), a custom `IEventBus` backed by DI gives you that with explicit control over execution semantics that MediatR's default configuration doesn't expose:

```csharp
// Contract
public interface IEvent;
public interface IEventHandler<in TEvent> where TEvent : IEvent
{
    Task HandleAsync(TEvent evt, CancellationToken ct);
}
public interface IEventBus
{
    Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct) where TEvent : IEvent;
}

// Implementation — resolves handlers from DI, runs in parallel with error isolation
// Implementation — creates a scope per publish, runs handlers in parallel with error isolation
public sealed class EventBus(IServiceScopeFactory scopeFactory) : IEventBus
{
    public async Task PublishAsync<TEvent>(TEvent evt, CancellationToken ct) where TEvent : IEvent
    {
        // Create a child scope to resolve scoped handlers correctly
        await using var scope = scopeFactory.CreateAsyncScope();
        var handlers = scope.ServiceProvider.GetServices<IEventHandler<TEvent>>();
        var tasks = handlers.Select(h => ExecuteSafe(h, evt, ct));
        await Task.WhenAll(tasks);
    }

    private static async Task ExecuteSafe<TEvent>(
        IEventHandler<TEvent> handler, TEvent evt, CancellationToken ct) where TEvent : IEvent
    {
        try
        {
            await handler.HandleAsync(evt, ct);
        }
        catch (Exception ex)
        {
            // Log but don't let one handler failure stop others
            Log.Error(ex, "Handler {Handler} failed for {Event}", handler.GetType().Name, typeof(TEvent).Name);
        }
    }
}

// Registration — bus is singleton (stateless), handlers are scoped (resolved per-publish via child scope)
builder.Services.AddSingleton<IEventBus, EventBus>();
builder.Services.AddScoped<IEventHandler<OrderPlaced>, ReserveStockHandler>();
builder.Services.AddScoped<IEventHandler<OrderPlaced>, SendConfirmationHandler>();
```

The tradeoff is explicit: you own the execution strategy but you own the registration and error handling too.

## Pitfalls

### Handler Exception Swallowing the Entire Publish

**What goes wrong**: MediatR's default `Publish` behavior runs handlers sequentially. If the first handler throws, remaining handlers never execute — the stock reservation fails and the confirmation email is never sent.

**Why it happens**: MediatR's default `ForeachAwaitPublisher` awaits each handler in sequence and doesn't catch exceptions between handlers. The exception propagates to the caller, short-circuiting the rest.

**Mitigation**: Replace MediatR's publisher strategy with `TaskWhenAllPublisher` (runs all handlers in parallel, aggregates exceptions) or implement a custom `INotificationPublisher` that wraps each handler in try/catch. In a custom event bus, use `Task.WhenAll` with per-handler error isolation as shown in the example above.

### Implicit Handler Ordering Dependencies

**What goes wrong**: handler A assumes handler B has already run — the billing handler reads a `StockReserved` flag that the inventory handler sets. In practice, execution order depends on DI registration order, which is fragile and undocumented.

**Why it happens**: the event bus contract promises fan-out, not sequencing. Developers introduce ordering assumptions without realizing the bus doesn't guarantee them.

**Mitigation**: design handlers to be independent. If a handler genuinely depends on another's result, that's a workflow, not a fan-out — model it as a saga or a chain of commands where each step explicitly triggers the next.

### Scope Leaking Across Handlers

**What goes wrong**: all handlers resolved within a single publish call share the same DI scope. One handler's `DbContext` state change leaks into another handler's query, producing stale or corrupted reads.

**Why it happens**: scoped services injected into handlers share the same container scope — whether that's the HTTP request scope (MediatR) or the per-publish scope (custom bus as shown above). A `DbContext` modified in handler A is the same instance in handler B within that scope.

**Mitigation**: for full handler isolation, create a child scope per handler rather than per publish. In a custom bus, move `scopeFactory.CreateAsyncScope()` inside `ExecuteSafe` so each handler resolves its own `DbContext` instance. In MediatR, implement a custom `INotificationPublisher` that wraps each handler in its own scope. Alternatively, handlers that need isolation can inject `IServiceScopeFactory` and create their own scope explicitly — this keeps the bus simple at the cost of pushing isolation responsibility to the handler.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| MediatR `INotification` | Zero boilerplate, DI auto-discovery, pipeline behaviors for cross-cutting concerns | Sequential by default, no per-handler scope isolation, opaque handler ordering | In-process domain events in a single bounded context when you already use MediatR for CQRS |
| Custom `IEventBus` | Full control over parallelism, error isolation, and scoping strategy | More code to maintain, no pipeline behavior ecosystem | When you need parallel execution, per-handler error isolation, or child scope per handler |
| MassTransit / NServiceBus | Durable, cross-service, retry policies, saga orchestration, dead-letter queues | Infrastructure dependency (broker), serialization overhead, operational complexity | Cross-service event communication where durability and retry matter |

**Decision rule**: start with MediatR `INotification` if you already use MediatR — it's the least code. Switch to a custom bus when you hit a concrete problem (exception swallowing, scope leaks, parallelism needs). Move to MassTransit/NServiceBus when events must survive process restarts or cross service boundaries.

## Questions

> [!QUESTION]- How does an event bus differ from a message broker?
> - Event bus is a **dispatch mechanism** — resolves handlers and invokes them, typically in-process
> - Message broker is **infrastructure** — durable middleware (RabbitMQ, Kafka, Service Bus) that persists and delivers messages across processes
> - In-process bus loses unprocessed events on crash; broker persists them
> - Bus abstraction can sit on top of a broker (MassTransit does this) — bus adds handler resolution and retry semantics, broker provides transport and durability
> - Cost of broker: operational complexity, network latency, serialization overhead
> - Cost of in-process bus: no durability, no cross-service delivery
> - A broker guarantees delivery at the cost of operational complexity; the in-process bus is simple but ephemeral

> [!QUESTION]- Why should event handlers be independent rather than ordered?
> - Event bus contract is fan-out — "these N things happen when X occurs" — not a sequential pipeline
> - If handler B depends on handler A's side effect, you have a hidden workflow disguised as fan-out
> - Execution order depends on DI registration order, which is fragile and undocumented
> - Breaks when: order changes (new handler inserted), parallelism enabled, or handler moved to another service
> - Fix: model the dependency as a saga or command chain where A publishes a new event that triggers B
> - This makes the dependency visible, testable, and deployable independently
> - You end up with more events and handlers, but each is self-contained and the workflow is explicit in the codebase

> [!QUESTION]- When is MediatR INotification insufficient as an event bus?
> - **Exception isolation**: default MediatR stops at the first handler failure — unacceptable when independent side effects (email, analytics, inventory) must not block each other
> - **Scope isolation**: all handlers share the same DI scope, so DbContext mutations in handler A leak into handler B
> - **Execution strategy**: default is sequential; parallel execution requires custom `INotificationPublisher`
> - Each fix requires either replacing MediatR's publisher or building a custom bus
> - A custom bus gives you control over all three concerns, but you lose MediatR's pipeline-behavior ecosystem (validation, logging, caching) and auto-discovery

## References

- [MediatR Notifications — GitHub Wiki](https://github.com/jbogard/MediatR/wiki#notifications) — official documentation for MediatR's `INotification` / `INotificationHandler` publish/subscribe mechanism, including custom publisher strategies.
- [Implementing event-based communication between microservices — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/multi-container-microservice-net-applications/integration-event-based-microservice-communications) — Microsoft's reference architecture for event bus implementations in .NET microservices, covering both in-process and distributed patterns with RabbitMQ and Azure Service Bus.
- [Event-driven architecture style — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven) — architectural overview of event-driven patterns, broker topologies, and when to apply them; provides the broader context for where an event bus fits.
- [MassTransit Documentation](https://masstransit.io/documentation/concepts) — production-grade .NET event bus abstraction over RabbitMQ, Azure Service Bus, and Amazon SQS; covers sagas, retry policies, and outbox patterns.
- [Event Aggregator vs Mediator (Martin Fowler)](https://martinfowler.com/eaaDev/EventAggregator.html) — practitioner explanation of the Event Aggregator pattern (the formal name for event bus), distinguishing it from Mediator and Observer; clarifies when centralized event routing helps vs when direct references are simpler.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Topics**
> - [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/Architectural Patterns\|Architectural Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns/Design Patterns\|Design Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Resilience Patterns/Resilience Patterns\|Resilience Patterns]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/CQS\|CQS]]
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]]
> - [[Software Engineering/05 Architecture/Patterns/Repository & UoW\|Repository & UoW]]
<!-- whats-next:end -->
