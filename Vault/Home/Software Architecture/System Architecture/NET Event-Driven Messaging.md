---
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: "A production-legible .NET event publishing and consumption path using MassTransit with transactional outbox and inbox semantics."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

A broker can deliver an integration event only after the producer places it on the transport. Saving business state and publishing in two independent operations leaves a failure gap: the database can commit while the publish fails. A transactional outbox stores the business change and outgoing message through the same local `DbContext` transaction, then a delivery service forwards the message to the broker.

Consumers face the inverse problem. A handler can commit its business change and crash before acknowledging the message, so the broker redelivers it. Inbox or consumer-outbox state records the message identity in the same local transaction as the consumer's work. This produces at-least-once delivery with effectively-once local state transitions, not global exactly-once execution.

## Contract

```csharp
public sealed record OrderPlacedIntegrationEvent(
    Guid EventId,
    Guid OrderId,
    Guid CustomerId,
    decimal Total,
    DateTime OccurredAtUtc);
```

The contract uses a stable `EventId` for tracing and application-level deduplication. Schema evolution must remain backward compatible while old consumers and retained messages exist.

## Producer with a bus outbox

```csharp
builder.Services.AddDbContext<OrdersDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Orders")));

builder.Services.AddMassTransit(bus =>
{
    bus.AddEntityFrameworkOutbox<OrdersDbContext>(outbox =>
    {
        outbox.UsePostgres();
        outbox.UseBusOutbox();
    });

    bus.UsingRabbitMq((context, rabbit) =>
        rabbit.ConfigureEndpoints(context));
});
```

```csharp
app.MapPost("/orders", async (
    PlaceOrderRequest request,
    OrdersDbContext db,
    IPublishEndpoint publish,
    CancellationToken cancellationToken) =>
{
    var order = Order.Place(request.CustomerId, request.Total);
    db.Orders.Add(order);

    await publish.Publish(
        new OrderPlacedIntegrationEvent(
            Guid.NewGuid(),
            order.Id,
            order.CustomerId,
            order.Total,
            DateTime.UtcNow),
        cancellationToken);

    await db.SaveChangesAsync(cancellationToken);
    return Results.Accepted($"/orders/{order.Id}", new { order.Id });
});
```

With `UseBusOutbox`, `Publish` is captured by the scoped `OrdersDbContext`. `SaveChangesAsync` commits the order and outbox rows together. Delivery to RabbitMQ happens afterward and may retry without losing the event.

## Consumer with durable deduplication

```csharp
builder.Services.AddDbContext<BillingDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Billing")));

builder.Services.AddMassTransit(bus =>
{
    bus.AddConsumer<OrderPlacedConsumer>();
    bus.AddEntityFrameworkOutbox<BillingDbContext>(outbox =>
        outbox.UsePostgres());

    bus.UsingRabbitMq((context, rabbit) =>
    {
        rabbit.ReceiveEndpoint("billing-order-placed", endpoint =>
        {
            endpoint.UseEntityFrameworkOutbox<BillingDbContext>(context);
            endpoint.ConfigureConsumer<OrderPlacedConsumer>(context);
        });
    });
});
```

```csharp
public sealed class OrderPlacedConsumer(BillingDbContext db)
    : IConsumer<OrderPlacedIntegrationEvent>
{
    public async Task Consume(ConsumeContext<OrderPlacedIntegrationEvent> context)
    {
        var message = context.Message;

        db.PaymentIntents.Add(
            PaymentIntent.Create(message.EventId, message.OrderId, message.Total));

        await db.SaveChangesAsync(context.CancellationToken);
    }
}
```

Put a unique constraint on the business idempotency key used by `PaymentIntent.Create`, such as `OrderId` for one intent per order. Transport inbox state suppresses duplicate handler completion for the message, while the domain constraint protects the business invariant if the same fact arrives under another message identity.

## Failure boundaries

| Failure | Durable state | Recovery |
|---|---|---|
| Process stops before producer save | Neither order nor message committed | Client may retry with an idempotency key |
| Process stops after producer save | Order and outbox row committed | Outbox delivery service publishes later |
| Broker redelivers after consumer commit | Billing change and inbox state committed | Duplicate delivery is suppressed |
| Consumer permanently rejects schema or data | Message remains unprocessed | Dead-letter with alert and replay procedure |

The outbox closes the local database-to-broker gap. It does not make the broker and every downstream database one distributed transaction. [[Event-Driven Architecture]] still requires explicit ordering, idempotency, compatibility, and workflow recovery decisions.

## References

- [MassTransit transactional outbox](https://masstransit.io/documentation/patterns/transactional-outbox) - Bus outbox and consumer outbox behavior with Entity Framework Core.
- [MassTransit Entity Framework outbox](https://masstransit.io/documentation/configuration/middleware/outbox) - Storage configuration, delivery service, and inbox state.
- [Transactional Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html) - Failure gap closed by persisting messages with local business state.
- [Idempotent Consumer pattern](https://microservices.io/post/microservices/patterns/2020/10/16/idempotent-consumer.html) - Why at-least-once delivery requires durable duplicate handling.
