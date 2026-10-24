---
publish: true
created: 2026-10-17T18:11:50.102Z
modified: 2026-10-17T18:11:50.102Z
published: 2026-10-17T18:11:50.102Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: A style where services communicate by publishing and consuming events instead of calling each other directly.
level:
  - "2"
priority: High
status: Done
qard-deck: Software Architecture
qard-topic: System Architecture/Event-Driven Architecture
flashcard_uid: 784f3460
---

Event-driven architecture (EDA) moves coordination from direct calls to published facts. A producer emits `OrderPlaced`, `PaymentFailed`, or `InventoryReserved`. Consumers decide what those facts mean for their own state. The producer does not name them, and with asynchronous event communication it does not wait for them either. This removes temporal coupling when the reaction can happen later, while synchronous APIs still handle queries and decisions that need an immediate answer. In-process domain-event dispatch can be synchronous, in which case the producer waits for its handlers even though it does not name them.

The boundary matters. EDA is a communication model, not a synonym for "using a queue." Events describe state changes, subscribers own their reactions, and cross-service consistency usually becomes eventual.

Durable cross-process EDA often runs over [[Software Architecture/Distributed Systems/Message Queues/Message Queues|messaging]] or a retained log. But a broker is only one transport. In-process dispatch, database change streams, and HTTP webhooks also carry events, each with a different durability and coupling contract.

# Event Contracts

## Event Types

Domain and integration events differ by boundary and contract. Event notification describes payload and retrieval style instead, so it is orthogonal to that boundary: an integration event can use notification style.

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
- It is a payload style rather than a boundary, so an integration event can be a notification.

## Difference at a Glance

| Type | Classified by | Primary purpose | Payload style | Typical audience |
| --- | --- | --- | --- | --- |
| Domain Event | Boundary: stays inside one bounded context | Capture domain fact | Typically rich domain data; richness is not a defining requirement | Same bounded context |
| Integration Event | Boundary: crosses services as a contract | Cross-service contract | Stable DTO contract | Other services |
| Event Notification | Payload and retrieval style, orthogonal to boundary | Signal change happened | Minimal metadata | Many listeners that re-query; can be an integration event |

The domain fact is modeled first. Only the part that another service can safely depend on is published.

# Workflow Coordination

EDA supports both coordination styles. [[Software Architecture/Distributed Systems/Choreography|Choreography]] fits independent `OrderPlaced` reactions such as notification, analytics, or indexing. [[Software Architecture/Distributed Systems/Orchestration|Orchestration]] fits a checkout whose ordered steps and compensation state need one explicit owner. Those notes cover the broader tradeoff. Here the important point is that asynchronous communication does not force choreography.

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

The consumer has the inverse failure window. A handler may commit its business change and crash before acknowledging the message. The Entity Framework consumer outbox keeps inbox state and the consumer's changes in one local transaction. A business constraint still matters, such as one `PaymentIntent` per `OrderId`. Inbox state recognizes a message identity only while that identity is retained, within the configured `DuplicateDetectionWindow`. The domain constraint protects the invariant when the same fact is replayed after that window or arrives under a different identity.

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
| Broker redelivers after consumer commit | Consumer change and inbox state committed | Duplicate is suppressed while inbox state still retains its message identity within the `DuplicateDetectionWindow`; later replay relies on business idempotency |
| Consumer permanently rejects schema or data | Message remains unprocessed | Dead-letter with alert and replay procedure |

The outbox closes one local database-to-broker gap. It does not create a global exactly-once transaction across the broker and downstream databases.

# Governance and Data Pipelines

![[Assets/Software Architecture/Software Architecture-Event-Driven Architecture-18120000-1.png|theme-aware]]

The governance visual shows one organization's topology. Its useful boundary is simpler: the platform owns compatibility and telemetry guardrails, while domains own event meaning.

- A **registry** records schema versions, ownership, compatibility mode, lifecycle, and data classification.
- A narrow **SDK** standardizes envelopes, trace context, serialization, and telemetry without hiding broker behavior.
- A **gateway** can enforce authentication, quotas, or routing at external ingress. Internal producers do not need an extra hop by default.
- **Regional isolation** keeps local consumers running during a remote outage. Replication must declare its lag, ordering, conflict, residency, and failover behavior.

For `MenuItemPriceChanged`, the Restaurant domain owns the meaning and producer SLO. CI checks its schema against the registry. A global consumer must still accept delayed or duplicate records after regional replication.

![[Assets/Software Architecture/Software Architecture-Event-Driven Architecture-18120000.png|theme-aware]]

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

Ordering belongs only where the business rule needs it. Per-aggregate order comes from partitioning by aggregate key, carrying a version or sequence, and rejecting stale transitions. Global order is expensive and rarely the real requirement.

## Treating Duplicate Delivery as Exceptional

At-least-once delivery makes duplicates ordinary. Without a stable key, the same event can charge twice or decrement inventory again after a retry.

Each event carries a deterministic `EventId`. Processed identities are recorded when the effect cannot be made naturally idempotent, and conditional writes or unique constraints protect business state. Message deduplication and domain invariants solve different problems.

## Changing a Shared Schema in Place

An integration event outlives one producer release. Renaming or removing a field can break consumers that deploy weeks later or replay retained records from months earlier.

Additive changes are the safer default, and CI checks their compatibility. A breaking semantic change needs a new event version and a migration window where producers and consumers can overlap safely.

## Losing the Story Across Hops

There is no single request thread through an asynchronous flow. Incidents become guesswork when events lack correlation and causation IDs or when the broker, consumer, and business operation use unrelated telemetry.

Trace context is propagated across hops, event identity is recorded at operation boundaries, and a searchable audit trail is kept. Logs should reveal which fact triggered which reaction without storing sensitive payloads by default.

# Questions

> [!qard]- What is event-driven architecture?
> Event-driven architecture (EDA) is a style in which components coordinate by publishing and consuming events. An event records a fact that has already happened, such as `OrderPlaced`. A producer publishes the fact without naming the consumers, and each consumer decides what that fact means for its own state. When event communication is asynchronous, the producer also does not wait for the consumers.
>
> | Aspect | Synchronous direct call | Event-driven |
> |---|---|---|
> | Knowledge of the receiver | The caller names the service it calls. | The producer does not know which consumers exist, so new consumers can subscribe without changing it. |
> | Timing | The caller waits for the response, so both sides must be available at the same time. | With asynchronous delivery, consumers can react later, which removes that temporal coupling when an immediate answer is not needed. |
> | Outcome | The caller learns the result before continuing. | With asynchronous delivery, the producer continues without learning the consumers' results. Other services update their state after processing the event, so cross-service consistency is usually eventual. |
>
> Not naming consumers does not by itself mean not waiting. In-process domain events can be dispatched synchronously, so the producing code waits for its handlers even though it does not name them.
>
> EDA is a communication model, not a synonym for using a queue. A message broker or retained log is a common transport for durable cross-process events. In-process dispatch, database change streams and HTTP webhooks can also carry events, each with different durability and coupling. Synchronous APIs remain the better fit for queries and decisions that need an immediate answer.
>
> [Event-driven architecture style (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven) · [Microsoft: Domain events: design and implementation](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation)

<!-- qard-id: f0a2c8b0-c242-478a-aa17-246db688b537 -->

> [!qard]- What determines whether an event-driven workflow uses orchestration or choreography?
> The choice depends on whether one component must own the workflow's order, state and recovery. Choreography fits when services can react to published events independently and no component needs to own the whole workflow. Orchestration fits when ordered steps, current progress and failure recovery must be tracked and controlled in one place. Asynchronous messaging supports both styles, so using events does not force choreography.
>
> | Aspect | Choreography | Orchestration |
> |---|---|---|
> | Who decides the next step | Each service decides how to react to the events it receives; no component directs the others. | A coordinator decides which step runs next and tells the participant to perform it. |
> | Workflow state | Spread across the participants, so no single component knows the overall progress. | Held by the coordinator, which knows which steps have completed. |
> | Failure and recovery | Each participant reacts to failure events itself, so recovery logic is distributed. | The coordinator detects a failed step and triggers retries or compensating actions. |
> | Adding a reaction | A new subscriber can start consuming an event without any change to the producer. | A new step usually means changing the coordinator's workflow. |
>
> **Example:** after `OrderPlaced`, sending a confirmation email and updating analytics are independent reactions, so choreography fits. A checkout reserves stock, then takes payment, and releases the stock if payment fails. Ordered steps and compensation alone do not require an orchestrator, because a choreographed saga can also chain local transactions and compensations through events. Orchestration fits this checkout when one component must explicitly own its order, progress and recovery. Both styles can exist in one system.
>
> The number of events or services does not decide the style by itself; ownership of order, state and recovery does.
>
> [Event-driven architecture style (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/event-driven) · [Saga distributed transactions pattern (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/patterns/saga)

> [!qard]- How do domain events, integration events, and event notifications differ?
> Domain and integration events differ by boundary and contract. A domain event records a business fact inside one bounded context, while an integration event publishes a stable contract that other services depend on. Event notification is a different axis: it describes a payload and retrieval style in which the event only signals that something changed and consumers fetch the details themselves. An integration event can therefore be notification-style.
>
> | Aspect | Domain event | Integration event |
> |---|---|---|
> | Purpose | Records a business fact inside one bounded context, such as `InvoiceIssued`. | Shares a fact with other services as a published contract, such as `OrderPlacedIntegrationEvent`. |
> | Audience | Handlers in the same bounded context. | Other services. |
> | When it is raised or published | Raised by domain logic when local business state changes. It can be dispatched synchronously in process. | Published only after the local transaction succeeds, usually through an outbox and publisher. |
> | Payload | Can follow the internal model. It typically carries rich domain data, but that richness is not what makes it a domain event. | A stable DTO, so consumers do not depend on the internal model. |
> | Main constraint | Normally stays inside the service; leaving it requires an explicit mapping to an integration event. | Versioning and backward compatibility become part of the contract, because consumers deploy independently. |
>
> **Event notification** describes what an event carries, not where it travels:
>
> - It carries minimal identifiers and metadata, such as `CatalogItemChanged { ItemId, ChangedAt }`.
> - Consumers fetch current state from the source when they need more detail.
> - It suits cache invalidation and broad fan-out, but couples consumers to the source's availability and read API.
> - An integration event can use this style when other services only need to know that something changed.
>
> The domain fact is modeled first. Only the part that another service can safely depend on is mapped into an integration event.
>
> [Microsoft: Domain events: design and implementation](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation) · [Martin Fowler: What do you mean by "Event-Driven"?](https://martinfowler.com/articles/201701-event-driven.html)

# References

- [What do you mean by Event-Driven?](https://martinfowler.com/articles/201701-event-driven.html)
- [Event-driven architecture style](https://learn.microsoft.com/azure/architecture/guide/architecture-styles/event-driven)
- [AsyncAPI specification](https://www.asyncapi.com/docs/reference/specification/latest)
- [CloudEvents specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
