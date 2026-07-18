---
publish: true
created: 2026-07-15T11:47:55.653Z
modified: 2026-07-18T11:59:15.672Z
published: 2026-07-18T11:59:15.672Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: Event Sourcing stores each aggregate's state as an ordered stream of domain events instead of only the latest snapshot.
level:
  - "2"
priority: High
status: Done
---

Event Sourcing stores each aggregate's state as an ordered stream of domain events instead of saving only the latest row snapshot. That event history gives you a built-in audit trail, enables temporal queries like "what did we believe at 10:15 yesterday", and allows replay when you need to rebuild read models or recover from projection bugs. You usually reach for it when business value depends on immutable history, traceability, and intent-level debugging, not just current state reads. In .NET systems, it often appears together with [[Software Architecture/Patterns/Architectural Patterns/CQRS]] so writes persist events and reads consume projections optimized for query use cases.

# Mechanism

## Core flow

1. A command reaches the write model (`PlaceOrder`, `AddItem`, `ShipOrder`).
2. The aggregate loads its prior event stream and replays events to rebuild current in-memory state.
3. Business invariants are validated against that rebuilt state.
4. New domain event(s) are appended to an append-only event store.
5. Projection handlers consume appended events and update one or more read models.

## Why append-only matters

- **Immutability**: old facts are never updated in place, so history stays trustworthy.
- **Auditability**: every state transition is explainable by concrete business events.
- **Temporal analysis**: you can rehydrate state as-of a version or timestamp.
- **Operational recovery**: if a projection is corrupted, rebuild it by replaying events.

## State reconstruction by replay

At load time, you fetch events for a stream (for example `order-123`) and apply them in sequence.

- `OrderPlaced` creates base state.
- `ItemAdded` mutates line items and totals.
- `OrderShipped` flips lifecycle status and shipment metadata.
  Your aggregate is deterministic if applying the same ordered events always yields the same state.

## Projections and read models

Write-side aggregates enforce invariants; read-side models optimize querying.

- A projection can build `OrderSummary` for dashboard lookups.
- Another projection can build `RevenueByDay` for analytics.
- A third can drive search indexing.
  Read models are disposable when they are derived only from replayable event history and can be rebuilt deterministically.

## Snapshots

Snapshots cache aggregate state at a known stream version so loading can replay only the tail. They are disposable performance artifacts, not the source of truth. Validate the snapshot type and version, then replay the tail; if it is incompatible, discard it and rebuild from the stream.

Preserve old event meaning. Prefer additive schema changes, upcasters from historical representations, or new event types. Never rewrite history merely to make today's class deserialize.

## Append and projection operations

Load stream `order-123` at version 17, rebuild the aggregate, and append new events with expected version 17. The store atomically accepts the batch as versions 18 and 19 or rejects it because another writer already advanced the stream. Every stored event needs a stable event ID, stream version, event type, schema version, and occurred-at timestamp.

```csharp
public interface IEventStore
{
    Task<IReadOnlyList<StoredEvent>> ReadAsync(
        string streamId,
        long fromVersion,
        CancellationToken ct);

    Task AppendAsync(
        string streamId,
        long expectedVersion,
        IReadOnlyList<DomainEvent> events,
        CancellationToken ct);
}
```

A projector stores its checkpoint separately from the read model or commits both atomically when the storage technology allows it. Handlers must be deterministic and idempotent because a crash can replay the last batch. During a rebuild, write to a new projection version, validate counts and business invariants, then switch readers. Do not delete the working projection first.

Replay must not call today's payment provider, send email, or read the current clock. Isolate external effects behind live-delivery handlers that are disabled during rebuild.

## Request-to-projection sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant H as Command Handler
    participant A as Aggregate
    participant ES as Event Store
    participant P as Projector
    participant RM as Read Model

    C->>H: Command PlaceOrder
    H->>A: Load stream and rebuild state
    A->>A: Validate business rules
    A-->>H: New events
    H->>ES: Append events
    ES-->>P: Event published
    P->>RM: Upsert projection
```

# Event Sourcing vs CRUD

CRUD stores the latest accepted state. Event Sourcing stores the ordered facts that produced it. For an order changing from `Pending` to `Paid` to `Shipped`, a CRUD row answers "what is the status now?" An event stream also answers when each transition happened, which command caused it, and what the state was at an earlier revision.

![[Assets/Software Architecture/Software Architecture-Event Sourcing-18120000.jpg]]

The image's rebuild arrow is conditional, not automatic. Replay is trustworthy only when events have a stable order, handlers are deterministic, historical schemas remain readable through versioning or upcasters, and projections isolate external side effects. If replay calls today's tax API or reads the current clock, the same stream can produce a different result. Snapshots shorten replay but do not replace the event stream as the source of truth.

| Question | CRUD state store | Event-sourced store |
|---|---|---|
| What is persisted? | Current row or document | Ordered immutable domain events |
| How is current state loaded? | Read the latest value | Replay events, usually from a snapshot plus the tail |
| How is history obtained? | Separate audit/history mechanism | Native stream, if events preserve business meaning |
| How is a read model repaired? | Recompute from available current data or backups | Replay into a new deterministic projection |
| Main operational risk | Lost history and in-place update mistakes | Schema evolution, replay cost, and projection lag |

# .NET aggregate example

An event-sourced aggregate never mutates fields directly from a command. It raises an event, applies the same handler used during replay, and records that event for the store to append.

```csharp
public sealed class Order
{
    private readonly List<IDomainEvent> _uncommitted = [];
    private readonly List<(string Sku, int Quantity, decimal UnitPrice)> _items = [];

    public Guid Id { get; private set; }
    public bool IsPlaced { get; private set; }
    public bool IsShipped { get; private set; }
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

    public void AddItem(string sku, int quantity, decimal unitPrice, DateTime utcNow)
    {
        if (!IsPlaced || IsShipped || quantity <= 0 || unitPrice < 0)
        {
            throw new InvalidOperationException("Item cannot be added.");
        }

        Raise(new ItemAdded(Id, sku, quantity, unitPrice, utcNow));
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
                IsPlaced = true;
                break;
            case ItemAdded added:
                _items.Add((added.Sku, added.Quantity, added.UnitPrice));
                break;
            case OrderShipped:
                IsShipped = true;
                break;
            default:
                throw new NotSupportedException(@event.GetType().Name);
        }
    }
}
```

`FromHistory` applies events without adding them to `UncommittedEvents`; command methods call `Raise`, which applies and records the new fact. A concrete write loads `Order-42` at version 7, replays it, calls `AddItem("SSD-1TB", 1, 89.00m, utcNow)`, and appends `ItemAdded` with expected version 7. If another writer already produced version 8, the store rejects the append and the command retries against fresh history. After a successful append, clear the uncommitted collection. The aggregate validates the state it was given; the store proves that state was still current.

# Event Sourcing + CQRS

Event Sourcing and [[Software Architecture/Patterns/Architectural Patterns/CQRS]] solve different concerns and complement each other well.

- **Write side**: command handlers persist validated domain events to the event store.
- **Bridge**: those events become the integration boundary between write and read models.
- **Read side**: projectors consume events and maintain query-optimized denormalized views.
  You can do CQRS without Event Sourcing, and Event Sourcing without strict CQRS separation, but pairing them usually gives the cleanest model when auditability and replay are first-class requirements.

# Where Event Sourcing Fits

Use Event Sourcing at an aggregate boundary when the event stream is the authoritative record of state transitions. Do not infer Event Sourcing merely because a system publishes events:

- **Event Sourcing** appends domain facts such as `OrderPlaced` and rebuilds aggregate state from that ordered stream.
- **Change Data Capture** reads mutations from a conventional database log. The database row remains the source of truth; the log is an integration feed.
- **Event notification** tells consumers that something changed, often requiring a callback to fetch current state.
- **Event-carried state transfer** includes enough state for consumers to update local copies, but the producer may still persist ordinary CRUD rows.
- **Integration events** cross bounded contexts. They are stable public contracts and need not match the finer-grained events used inside an event-sourced aggregate.

For a payment ledger, immutable state transitions and temporal reconstruction can justify Event Sourcing. For a product description edited occasionally, CRUD plus an audit table is usually cheaper. For a CRUD order service that emits `OrderUpdated` through an outbox, the outbox makes delivery reliable; it does not change the order database into an event store.

# Operating boundary

Event schema evolution, stream growth, projection lag, checkpoints, and replay side effects are part of the pattern, not later storage details. The core rule is that the ordered event stream remains authoritative, aggregate replay remains deterministic, and rebuilt projections cannot repeat live external effects.

# Tradeoffs

| Concern | Event Sourcing | Traditional CRUD |
|---|---|---|
| Source of truth | Immutable event history | Latest row/document state |
| Auditability | Native, complete timeline | Usually add separate audit table/log |
| Temporal queries | Natural via replay/as-of version | Hard, often requires custom history model |
| Write complexity | Higher: events, versions, projections | Lower: direct update/insert/delete |
| Read complexity | Higher with projection pipeline | Lower for straightforward queries |
| Operational model | Needs idempotency/replay tooling | Simpler operational story |
Decision rule: prefer CRUD by default; choose Event Sourcing only when immutable audit history, temporal reconstruction, or replay-based recovery are explicit and valuable requirements.

# Questions

> [!QUESTION]- When does Event Sourcing justify its complexity over CRUD plus an audit-log table?
>
> - CRUD + audit table can satisfy compliance for many systems with lower operational overhead.
> - Event Sourcing is justified when domain behavior depends on historical intent and replay, not only final values.
> - If you need deterministic rebuild of multiple read models, Event Sourcing is stronger.
> - If temporal queries are frequent and core to product value, Event Sourcing can pay off.
> - If team maturity for schema evolution and projection operations is low, choose CRUD first.
> - The honest default is CRUD plus an audit table; Event Sourcing earns its cost only when replay and historical intent are core to the product, not merely compliance.

> [!QUESTION]- How do you evolve event schemas safely without breaking old streams?
>
> - Use explicit event versioning strategy.
> - Prefer backward-compatible additive changes.
> - Introduce upcasters/adapters for old payloads.
> - Keep integration tests that replay production-like historical streams.
> - Treat event contracts as long-lived public interfaces.
> - Schema evolution is a common production failure mode in event-sourced systems — especially when teams skip compatibility testing across historical streams.

# References

- [Event Sourcing - Greg Young FAQ](https://cqrs.nu/faq/event-sourcing) — primary practitioner FAQ on streams, replay, and event-sourced aggregates.
- [SimpleCQRS - Greg Young sample repository](https://github.com/gregoryyoung/m-r) — compact reference implementation of command handling, aggregates, event streams, and projections.
- [Event Sourcing pattern - Azure Architecture Center](https://learn.microsoft.com/azure/architecture/patterns/event-sourcing) — Microsoft guidance on append-only events, projections, snapshots, and consistency costs.
- [CQRS pattern - Azure Architecture Center](https://learn.microsoft.com/azure/architecture/patterns/cqrs) — official separation of command and query models and their consistency consequences.
- [Event Sourcing - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html) — foundational definition and discussion of replay, temporal queries, and external updates.
- [Turning the database inside out with Apache Samza - Martin Kleppmann](https://www.confluent.io/blog/turning-the-database-inside-out-with-apache-samza/) — practitioner explanation of logs, materialized views, replay, and state reconstruction.
- [Differences in Event Sourcing system design -- ByteByteGo comparison of current-state persistence and event-history reconstruction](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/differences-in-event-sourcing-system-design.md)
- [How do we incorporate Event Sourcing into systems? -- ByteByteGo flow used here to distinguish an authoritative event store from CDC and integration messaging](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-incorporate-event-sourcing-into-the-systems.md)
- [EventStoreDB streams](https://developers.eventstore.com/clients/grpc/appending-events.html) — official expected-revision and append behavior for an event store.
- [Apache Samza state management](https://samza.apache.org/learn/documentation/latest/container/state-management.html) — operational checkpoint and replay concepts for stateful stream processing.
- [Implementing Domain-Driven Design](https://www.oreilly.com/library/view/implementing-domain-driven-design/9780133039900/) - Vaughn Vernon's treatment of aggregates, domain events, and consistency boundaries.
