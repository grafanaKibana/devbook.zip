---
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: "A style where services communicate by publishing and consuming events instead of calling each other directly."
level:
  - "2"
priority: High
status: Done

publish: true
---

Event-driven architecture (EDA) moves coordination from direct calls to published facts. A producer emits `OrderPlaced`, `PaymentFailed`, or `InventoryReserved`. Consumers decide what those facts mean for their own state. The producer does not name or wait for them. This removes temporal coupling when the reaction can happen later, while synchronous APIs still handle queries and decisions that need an immediate answer.

The boundary matters. EDA is a communication model, not a synonym for "using a queue." Events describe state changes, subscribers own their reactions, and cross-service consistency usually becomes eventual.

Durable cross-process EDA often runs over [[Home/Software Architecture/Distributed Systems/Message Queues/Message Queues|messaging]] or a retained log. But a broker is only one transport. In-process dispatch, database change streams, and HTTP webhooks also carry events, each with a different durability and coupling contract.

# Event Contracts

## Event Types

**Domain event**

- Records a business fact inside one bounded context, such as `InvoiceIssued` or `OrderConfirmed`.
- Domain logic raises it because local business state changed.
- It normally stays inside the service. An explicit mapping can promote the externally useful part into an integration event.

**Integration event**

- Publishes a stable contract for other services, for example `OrderPlacedIntegrationEvent`.
- It leaves the service only after the local transaction succeeds, usually through an outbox and publisher.
- Independent consumers make versioning and backward compatibility part of the contract.

**Event notification**

- Carries a small signal such as `CatalogItemChanged { ItemId, ChangedAt }`.
- Consumers fetch current state when they need more detail.
- It suits cache invalidation and broad fan-out, but it couples consumers back to the source's availability and read API.

## Difference at a Glance

| Type | Primary purpose | Payload style | Typical audience |
| --- | --- | --- | --- |
| Domain Event | Capture domain fact | Rich domain data | Same bounded context |
| Integration Event | Cross-service contract | Stable DTO contract | Other services |
| Event Notification | Signal change happened | Minimal metadata | Many listeners that re-query |

Model the domain fact first. Publish only the part that another service can safely depend on.

# Workflow Coordination

EDA supports both coordination styles. [[Home/Software Architecture/Distributed Systems/Choreography|Choreography]] fits independent `OrderPlaced` reactions such as notification, analytics, or indexing. [[Home/Software Architecture/Distributed Systems/Orchestration|Orchestration]] fits a checkout whose ordered steps and compensation state need one explicit owner. Those notes cover the broader tradeoff. Here the important point is that asynchronous communication does not force choreography.

# .NET Messaging Boundary

A broker cannot deliver an event it never receives. Saving business state and publishing in separate operations leaves a gap: the database may commit while the publish fails. A transactional outbox writes the business change and outgoing message in one local `DbContext` transaction. A delivery service forwards the committed message afterward.

```csharp
public sealed record OrderPlacedIntegrationEvent(
    Guid EventId,
    Guid OrderId,
    Guid CustomerId,
    decimal Total,
    DateTime OccurredAtUtc);
```

```csharp
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

With `UseBusOutbox`, a scoped `IPublishEndpoint` writes the event through `OrdersDbContext`. One `SaveChangesAsync` commits the order and outbox row together. Broker delivery can then retry independently.

The consumer has the inverse failure window. A handler may commit its business change and crash before acknowledging the message. The Entity Framework consumer outbox keeps inbox state and the consumer's changes in one local transaction. A business constraint still matters, such as one `PaymentIntent` per `OrderId`. Inbox state recognizes one message identity. The domain constraint protects the invariant when the same fact arrives under a different identity.

```csharp
bus.AddConsumer<OrderPlacedConsumer>();
bus.AddEntityFrameworkOutbox<BillingDbContext>(outbox =>
    outbox.UsePostgres());

rabbit.ReceiveEndpoint("billing-order-placed", endpoint =>
{
    endpoint.UseEntityFrameworkOutbox<BillingDbContext>(context);
    endpoint.ConfigureConsumer<OrderPlacedConsumer>(context);
});
```

| Failure | Durable state | Recovery |
| --- | --- | --- |
| Process stops before producer save | Neither order nor message committed | Client may retry with an idempotency key |
| Process stops after producer save | Order and outbox row committed | Outbox delivery service publishes later |
| Broker redelivers after consumer commit | Consumer change and inbox state committed | Duplicate delivery is suppressed |
| Consumer permanently rejects schema or data | Message remains unprocessed | Dead-letter with alert and replay procedure |

The outbox closes one local database-to-broker gap. It does not create a global exactly-once transaction across the broker and downstream databases.

# Governance and Data Pipelines

![[Software Architecture/Software Architecture-Event-Driven Architecture-18120000-1.png|theme-aware]]

The governance visual shows one organization's topology. Its useful boundary is simpler: the platform owns compatibility and telemetry guardrails, while domains own event meaning.

- A **registry** records schema versions, ownership, compatibility mode, lifecycle, and data classification.
- A narrow **SDK** standardizes envelopes, trace context, serialization, and telemetry without hiding broker behavior.
- A **gateway** can enforce authentication, quotas, or routing at external ingress. Internal producers do not need an extra hop by default.
- **Regional isolation** keeps local consumers running during a remote outage. Replication must declare its lag, ordering, conflict, residency, and failover behavior.

For `MenuItemPriceChanged`, the Restaurant domain owns the meaning and producer SLO. CI checks its schema against the registry. A global consumer must still accept delayed or duplicate records after regional replication.

![[Software Architecture/Software Architecture-Event-Driven Architecture-18120000.png|theme-aware]]

The pipeline visual names conceptual stages. A real batch or streaming path may combine them. For `checkout-42`, the record moves through these boundaries:

1. **Collect:** checkout emits an event ID, trace ID, schema ID, tenant, and event time.
2. **Ingest:** the broker assigns a partition and offset, then exposes consumer lag.
3. **Store:** object storage keeps immutable raw records partitioned by event date and schema version.
4. **Compute:** a stateful job checkpoints offsets and derives `DailyRevenue`. Malformed records enter an owned quarantine path.
5. **Consume:** warehouse and alerting outputs declare separate freshness and correctness SLOs.

Derived records keep the source event IDs, and lineage connects the input dataset to the job and output. Low broker lag does not prove that a warehouse table is fresh or correct. An "exactly once" claim must name its boundary. A stream processor may atomically checkpoint offsets and write one managed sink. An external email or payment call remains at-least-once and needs its own idempotency contract.

# Pitfalls

## Ordering Beyond the Required Scope

Parallel consumers and separate partitions do not preserve global order. `OrderCancelled` can reach a consumer before `OrderPlaced`, even when the producer emitted them in the opposite sequence.

Order only where the business rule needs it. Partition by aggregate key for per-aggregate order, include a version or sequence, and reject stale transitions. Global order is expensive and rarely the real requirement.

## Treating Duplicate Delivery as Exceptional

At-least-once delivery makes duplicates ordinary. Without a stable key, the same event can charge twice or decrement inventory again after a retry.

Carry a deterministic `EventId`, record processed identities when the effect cannot be made naturally idempotent, and protect business state with conditional writes or unique constraints. Message deduplication and domain invariants solve different problems.

## Changing a Shared Schema in Place

An integration event outlives one producer release. Renaming or removing a field can break consumers that deploy weeks later or replay retained records from months earlier.

Prefer additive changes and check compatibility in CI. A breaking semantic change needs a new event version and a migration window where producers and consumers can overlap safely.

## Losing the Story Across Hops

There is no single request thread through an asynchronous flow. Incidents become guesswork when events lack correlation and causation IDs or when the broker, consumer, and business operation use unrelated telemetry.

Propagate trace context, record event identity at operation boundaries, and keep a searchable audit trail. Logs should reveal which fact triggered which reaction without storing sensitive payloads by default.

# Questions

> [!QUESTION]- What determines whether an event-driven workflow uses orchestration or choreography?
> The main question is whether one component must own the process from start to finish. An ordered checkout with compensation steps fits [[Home/Software Architecture/Distributed Systems/Orchestration|orchestration]] because the current step and recovery state need one visible owner. Independent reactions to `OrderPlaced`, such as email, analytics, or indexing, fit [[Home/Software Architecture/Distributed Systems/Choreography|choreography]] because no subscriber controls the others. Asynchronous messaging supports both styles; it does not force choreography.

# References

- [What do you mean by Event-Driven?](https://martinfowler.com/articles/201701-event-driven.html)
- [Event-driven architecture style](https://learn.microsoft.com/azure/architecture/guide/architecture-styles/event-driven)
- [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/latest)
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
