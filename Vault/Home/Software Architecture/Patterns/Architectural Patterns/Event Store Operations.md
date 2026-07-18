---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Operating event streams, projections, snapshots, schema evolution, and replay in an event-sourced system."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

[[Event Sourcing]] makes an ordered event stream the source of truth. Event store operations keep that history appendable, readable, evolvable, and replayable without repeating external side effects. The difficult work starts after the first aggregate example: concurrency, projection checkpoints, snapshots, and historical schema compatibility.

## Append contract

Load stream `order-123` at version 17, rebuild the aggregate, and append new events with expected version 17. The store atomically accepts the batch as versions 18 and 19 or rejects it because another writer already advanced the stream.

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

Expected-version checking is the optimistic concurrency boundary. Give every event a stable event ID, stream version, event type, schema version, and occurred-at timestamp.

## Projection replay

A projector stores its checkpoint separately from the read model or commits both atomically when the storage technology allows it. Handlers must be deterministic and idempotent because crashes can replay the last batch. During a rebuild, write to a new projection version, validate counts and business invariants, then switch readers. Do not delete the working projection first.

Replay must not call today's payment provider, send email, or read the current clock. Isolate side effects behind live-delivery handlers that are disabled during rebuild.

## Snapshots and evolution

A snapshot is cached aggregate state at a known stream version. Validate its type/version, then replay the tail. If the snapshot is incompatible, discard it and rebuild from events; the stream remains authoritative.

Preserve old event meaning. Prefer additive schema changes, upcasters from historical representations, or new event types. Never rewrite history merely to make today's class deserialize.

## References

- [Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) — Martin Fowler's pattern definition, replay model, and external-event considerations.
- [EventStoreDB streams](https://developers.eventstore.com/clients/grpc/appending-events.html) — official expected-revision and append behavior for an event store.
- [Azure CQRS pattern](https://learn.microsoft.com/azure/architecture/patterns/cqrs) — official read-model, projection, and consistency guidance.
- [Apache Samza state management](https://samza.apache.org/learn/documentation/latest/container/state-management.html) — operational checkpoint and replay concepts for stateful stream processing.
