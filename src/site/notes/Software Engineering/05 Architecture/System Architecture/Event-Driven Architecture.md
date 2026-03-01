---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/system-architecture/event-driven-architecture/"}
---

# Intro

Event-Driven Architecture (EDA) is a style where services communicate by publishing and consuming events instead of calling each other directly through synchronous APIs. The core idea is that a producer emits a fact (`OrderPlaced`, `PaymentFailed`, `InventoryReserved`) and does not need to know who reacts to it. This matters because it reduces runtime coupling, allows services to scale independently, and improves resilience when one downstream component is temporarily unavailable. You reach for EDA when workflows cross service boundaries, when processing can be asynchronous, and when you specifically need durable retained events for audit or replay.

In interview terms: EDA is not "just using a queue". It is a contract-driven communication model where events represent state changes, subscribers own their reaction logic, and consistency is typically eventual rather than immediate.

For related foundations, connect this page with [[Software Engineering/05 Architecture/Distributed Systems/Message Queues\|Message Queues]], [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/RabbitMQ\|RabbitMQ]], and [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Kafka\|Kafka]].

## Core Concepts

### Event Types

**Domain Event**

- Describes something meaningful that happened inside a bounded context.
- Produced by domain logic because business state changed.
- Examples: `InvoiceIssued`, `OrderConfirmed`, `CustomerUpgradedToPremium`.
- Scope: primarily internal to the service/domain, though some may later be promoted externally.

**Integration Event**

- A stable, explicit contract published for other services to consume.
- Usually emitted after local transaction success and often via an outbox/publisher pipeline.
- Examples: `OrderPlacedIntegrationEvent`, `PaymentCapturedIntegrationEvent`.
- Scope: cross-service communication. Versioning and backward compatibility matter.

**Event Notification**

- Lightweight signal saying "something changed", often with minimal payload (ID + timestamp + type).
- Consumers fetch full state separately when needed.
- Example: `CatalogItemChanged { ItemId, ChangedAt }`.
- Scope: low payload fan-out scenarios, cache invalidation, or trigger-based processing.

### Difference at a Glance

| Type | Primary purpose | Payload style | Typical audience |
| --- | --- | --- | --- |
| Domain Event | Capture domain fact | Rich domain data | Same bounded context |
| Integration Event | Cross-service contract | Stable DTO contract | Other services |
| Event Notification | Signal change happened | Minimal metadata | Many listeners that re-query |

Practical rule: model domain events first, then map only the externally relevant subset into integration events.

## Patterns

### Choreography

In choreography, each service reacts to events independently. No central coordinator tells services what to do next.

```mermaid
flowchart LR
    O[Order Service] -->|OrderPlaced| B[Broker]
    B --> P[Payment Service]
    B --> I[Inventory Service]
    P -->|PaymentSucceeded or PaymentFailed| B
    I -->|InventoryReserved or InventoryRejected| B
    B --> N[Notification Service]
```

Use when teams want autonomy and workflows can be decomposed into independent reactions.

### Orchestration

In orchestration, a central component (process manager/saga orchestrator) directs the workflow and issues commands.

```mermaid
sequenceDiagram
    participant OR as Order API
    participant OC as Order Orchestrator
    participant PA as Payment Service
    participant IN as Inventory Service
    participant NO as Notification Service

    OR->>OC: Start checkout orderId
    OC->>PA: Charge payment
    PA-->>OC: PaymentSucceeded
    OC->>IN: Reserve inventory
    IN-->>OC: InventoryReserved
    OC->>NO: Send confirmation
```

Use when workflow visibility, explicit state handling, and compensation logic are first-class requirements.

### Tradeoffs

- **Choreography**: looser coupling and easier service autonomy, but harder to trace global flow and reason about emergent behavior as subscriptions grow.
- **Orchestration**: clearer process control, easier audit/debug per workflow instance, but introduces a central dependency that can become a bottleneck or single point of operational complexity.

## .NET Example (ASP.NET Core + MassTransit + RabbitMQ)

This example publishes an integration event when an order is placed, then consumes it in a separate service. The publisher does not know who subscribes.

### Shared Contract

```csharp
namespace Contracts;

public record OrderPlacedIntegrationEvent(
    Guid EventId,
    Guid OrderId,
    Guid CustomerId,
    decimal Total,
    DateTime OccurredAtUtc
);
```

### Publisher (Order Service)

```csharp
using Contracts;
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMassTransit(x =>
{
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
    });
});

var app = builder.Build();

app.MapPost("/orders", async (IPublishEndpoint publish) =>
{
    var orderId = Guid.NewGuid();

    // Imagine local DB transaction succeeded before this publish.
    var evt = new OrderPlacedIntegrationEvent(
        EventId: Guid.NewGuid(),
        OrderId: orderId,
        CustomerId: Guid.NewGuid(),
        Total: 129.90m,
        OccurredAtUtc: DateTime.UtcNow
    );

    await publish.Publish(evt);
    return Results.Accepted($"/orders/{orderId}", new { orderId });
});

app.Run();
```

### Consumer (Billing Service)

```csharp
using Contracts;
using MassTransit;

public sealed class OrderPlacedConsumer : IConsumer<OrderPlacedIntegrationEvent>
{
    public async Task Consume(ConsumeContext<OrderPlacedIntegrationEvent> context)
    {
        var message = context.Message;

        // Idempotency key: message.EventId (store processed IDs in durable storage).
        // Business action: create payment intent, emit PaymentRequested event, etc.
        await Task.CompletedTask;
    }
}
```

```csharp
using MassTransit;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<OrderPlacedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("billing-order-placed", e =>
        {
            e.ConfigureConsumer<OrderPlacedConsumer>(context);
        });
    });
});

var app = builder.Build();
app.Run();
```

Production note: pair publish with the transactional outbox pattern to avoid "DB commit succeeded but event publish failed" gaps.

## Pitfalls

### 1) Event Ordering

- **What goes wrong**: consumers may process `OrderCancelled` before `OrderPlaced` (or receive updates in different order across partitions/queues).
- **Why**: distributed brokers and parallel consumers do not guarantee global ordering.
- **Mitigation**: design handlers for per-aggregate ordering where needed (partition by aggregate key), include version/sequence in events, and detect stale events.

### 2) Idempotency

- **What goes wrong**: duplicate delivery causes duplicate side effects (double charge, duplicate email, repeated inventory decrement).
- **Why**: at-least-once delivery is common in real systems.
- **Mitigation**: use deterministic idempotency keys (`EventId`), store processed-message fingerprints, and make state transitions conditional.

### 3) Event Schema Evolution

- **What goes wrong**: a producer ships a breaking payload change and multiple consumers fail.
- **Why**: integration events are shared contracts with independent deployment cycles.
- **Mitigation**: version events, evolve contracts backward-compatibly (additive first), and validate in contract tests before release.

### 4) Distributed Flow Debugging

- **What goes wrong**: incidents are hard to reconstruct across many async hops.
- **Why**: no single request thread shows full workflow.
- **Mitigation**: propagate correlation/causation IDs, instrument with OpenTelemetry traces/metrics/logs, and keep searchable event audit logs.

## Questions

> [!QUESTION]- Order service publishes `OrderPlaced`. Payment and Inventory both consume it. Payment fails. How do you handle compensation without tight coupling?
> **Expected answer**
> - Prefer saga/process manager or choreography with explicit failure events (`PaymentFailed`).
> - Avoid direct service-to-service rollback calls as the primary mechanism.
> - Emit compensating commands/events (`ReleaseInventory`, `CancelOrder`) based on workflow state.
> - Keep operations idempotent because retries and duplicates are expected.
> - Track workflow with correlation ID for observability and replay.
> **Why this is asked**
> - It tests whether the candidate understands eventual consistency and compensation in distributed systems.

> [!QUESTION]- When would you choose orchestration over choreography in an event-driven workflow?
> **Expected answer**
> - Choose orchestration when the process is long-running, has strict step ordering, and requires explicit compensation/state visibility.
> - Choreography is better when services can react independently and team autonomy is a top priority.
> - Orchestration centralizes control (easier reasoning) but adds coordinator complexity and potential bottleneck risk.
> - Choreography reduces central coupling but raises tracing and governance complexity as fan-out grows.
> **Why this is asked**
> - It tests architectural judgment under operational constraints, not just pattern definitions.

> [!QUESTION]- How do you evolve integration event contracts without breaking consumers?
> **Expected answer**
> - Use additive changes first; avoid removing/renaming fields abruptly.
> - Version contracts (`v1`, `v2`) and support dual publishing during migrations.
> - Add consumer-driven contract tests in CI.
> - Monitor deserialization failures and rollout with staged deployments.
> **Why this is asked**
> - It tests real-world ownership of compatibility, release safety, and producer-consumer decoupling.

## References

- [Martin Fowler - What do you mean by Event-Driven?](https://martinfowler.com/articles/201701-event-driven.html)
- [Microsoft Learn - Asynchronous messaging options](https://learn.microsoft.com/azure/architecture/guide/technology-choices/messaging)
- [Microsoft Learn - Event-driven architecture style](https://learn.microsoft.com/azure/architecture/guide/architecture-styles/event-driven)
- [Microsoft Learn - Competing consumers pattern](https://learn.microsoft.com/azure/architecture/patterns/competing-consumers)
- [MassTransit Documentation](https://masstransit.io/)
- [Cloud Design Patterns - Idempotent Consumer](https://learn.microsoft.com/azure/architecture/patterns/idempotent-consumer)
- [Particular Blog - Banish ghost messages and zombie records from your web tier](https://particular.net/blog/transactional-session)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/System Architecture/Microservices\|Microservices]]
> - [[Software Engineering/05 Architecture/System Architecture/Monolith Architecture\|Monolith Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Serverless Architecture\|Serverless Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Service-Oriented Architecture\|Service-Oriented Architecture]]
<!-- whats-next:end -->
