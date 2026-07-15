---
publish: true
created: 2026-07-15T11:47:55.747Z
modified: 2026-07-15T11:47:55.748Z
published: 2026-07-15T11:47:55.748Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Coordinating a change across multiple services or databases so all participants commit or roll back together, via 2PC or Saga.
level:
  - "2"
priority: High
status: Ready to Repeat
---

# Distributed Transactions

A distributed transaction coordinates a change that spans multiple services or databases, ensuring all participants either commit or roll back together. The challenge: unlike a local database transaction, there is no single transaction manager that can atomically commit across network boundaries. A network partition or crash between steps leaves the system in an inconsistent state unless you design for it explicitly.

Two main approaches exist: **Two-Phase Commit (2PC)** for strong consistency with synchronous coordination, and **Saga** for eventual consistency with compensating transactions. The Outbox pattern is a reliability primitive used alongside both.

## Two-Phase Commit (2PC)

2PC uses a coordinator to drive all participants through two phases:

1. **Prepare**: coordinator asks each participant "can you commit?" — each locks resources and votes yes/no.
2. **Commit/Abort**: if all vote yes, coordinator sends commit; if any vote no, coordinator sends abort to all.

```text
Coordinator → Participant A: PREPARE
Coordinator → Participant B: PREPARE
Participant A → Coordinator: VOTE YES (locks row)
Participant B → Coordinator: VOTE YES (locks row)
Coordinator → Participant A: COMMIT
Coordinator → Participant B: COMMIT
```

**When it works**: tightly coupled systems where all participants support XA transactions (e.g., two SQL databases in the same data center). MSDTC on Windows implements 2PC for SQL Server.

**Why it fails in microservices**: the coordinator is a single point of failure. If it crashes after sending PREPARE but before COMMIT, participants hold locks indefinitely. Network latency between services makes the prepare-to-commit window long, increasing lock contention. Most modern services (HTTP APIs, NoSQL stores) don't support XA.

## Saga Pattern

A Saga breaks a distributed transaction into a sequence of local transactions, each with a **compensating transaction** that undoes its effect if a later step fails.

```text
Step 1: Order Service → PlaceOrder (local commit)
Step 2: Payment Service → ChargeCard (local commit)
Step 3: Inventory Service → ReserveStock (local commit)

If Step 3 fails:
  Compensate Step 2: RefundCard
  Compensate Step 1: CancelOrder
```

Two coordination styles:

**Choreography** — each service publishes events and reacts to others' events. No central coordinator.

```csharp
// OrderService publishes after local commit
await bus.PublishAsync(new OrderPlaced(orderId, amount), ct);

// PaymentService subscribes and reacts
public async Task HandleAsync(OrderPlaced evt, CancellationToken ct)
{
    await _payments.ChargeAsync(evt.OrderId, evt.Amount, ct);
    await _bus.PublishAsync(new PaymentCharged(evt.OrderId), ct);
}
```

**Orchestration** — a central saga orchestrator sends commands and tracks state.

```csharp
public class OrderSaga : ISaga
{
    public async Task StartAsync(PlaceOrderCommand cmd, CancellationToken ct)
    {
        await _payments.SendAsync(new ChargeCardCommand(cmd.OrderId, cmd.Amount), ct);
    }

    public async Task HandleAsync(PaymentCharged evt, CancellationToken ct)
    {
        await _inventory.SendAsync(new ReserveStockCommand(evt.OrderId), ct);
    }

    public async Task HandleAsync(PaymentFailed evt, CancellationToken ct)
    {
        await _orders.SendAsync(new CancelOrderCommand(evt.OrderId), ct);
    }
}
```

## Outbox Pattern

The Outbox pattern solves the "publish after commit" reliability problem: writing an event to the database in the same transaction as the domain change, then publishing from the outbox asynchronously.

```csharp
// Single transaction: domain change + outbox entry
await using var tx = await db.Database.BeginTransactionAsync(ct);
db.Orders.Add(order);
db.OutboxMessages.Add(new OutboxMessage
{
    Type    = nameof(OrderPlaced),
    Payload = JsonSerializer.Serialize(new OrderPlaced(order.Id, order.Total))
});
await db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
// Background worker reads OutboxMessages and publishes to broker, retrying until acknowledged
```

Without the Outbox: if the broker publish fails after the DB commit, the event is lost. With the Outbox: the event is durable in the DB and will be published eventually.

## Sagas Sacrifice Isolation

The subtlety most people miss: a Saga trades away the **I** in ACID, not just the easy atomicity. Because each step commits its _local_ transaction immediately, a saga's **intermediate state is visible to everyone else** before the saga finishes — another transaction can read an order that's been placed but whose payment will later be compensated (a "dirty read" across the saga). 2PC holds locks to prevent exactly this; sagas can't. The countermeasures from the saga literature are **semantic locks** (a status flag like `PENDING` that other operations must check), **commutative updates**, and **re-read/version before acting**. Idempotent, retry-safe steps are mandatory — see [[Idempotency]]. Net: a saga buys atomicity-via-compensation and availability at the cost of isolation and a window of observable inconsistency ([[CAP theorem|CAP/PACELC]]).

## Pitfalls

### Compensating Transactions That Cannot Undo

**What goes wrong**: a compensation step fails or is impossible — e.g., you cannot "un-send" an email or "un-charge" a card if the payment provider has no refund API.

**Why it happens**: compensations are designed as happy-path reversals without considering external system limitations.

**Mitigation**: design compensations before implementing the forward path. For irreversible side effects (emails, SMS), use idempotent "cancel" semantics (send a cancellation email) rather than true undo. Accept that some compensations are best-effort.

### Saga State Lost on Crash

**What goes wrong**: the orchestrator crashes mid-saga. On restart, it doesn't know which steps completed and which need compensation.

**Why it happens**: saga state is held in memory rather than persisted.

**Mitigation**: persist saga state to a database after each step. Use a saga framework (MassTransit, NServiceBus) that handles state persistence and retry automatically.

## Tradeoffs

| Approach | Consistency | Complexity | Latency | When to use |
|---|---|---|---|---|
| 2PC | Strong (ACID) | Medium | High (locks held during coordination) | Same data center, XA-capable stores, low throughput |
| Saga (choreography) | Eventual | Low (no coordinator) | Low | Loosely coupled services, simple flows |
| Saga (orchestration) | Eventual | High (orchestrator state) | Medium | Complex multi-step flows, explicit visibility needed |

**Decision rule**: avoid 2PC in microservices — the lock contention and coordinator SPOF make it impractical. Use Saga with choreography for simple 2-3 step flows. Use Saga with orchestration when you need explicit state tracking, retries, and visibility into long-running workflows. Always pair with the Outbox pattern for reliable event publishing.

## Questions

> [!QUESTION]- Why is 2PC problematic in microservices?
>
> - 2PC requires all participants to hold locks during the prepare-to-commit window. In microservices, this window spans network calls, making lock duration unpredictable.
> - The coordinator is a single point of failure. A crash after PREPARE but before COMMIT leaves participants locked indefinitely.
> - Most microservice infrastructure (HTTP APIs, NoSQL, cloud queues) doesn't support XA transactions.
> - Tradeoff: 2PC gives strong consistency but at the cost of availability and throughput. CAP theorem: under a partition, you must choose consistency or availability — 2PC chooses consistency.

> [!QUESTION]- How does the Outbox pattern guarantee at-least-once event delivery?
>
> - The event is written to an `OutboxMessages` table in the same DB transaction as the domain change. If the transaction commits, the event is durable.
> - A background worker reads unprocessed outbox entries and publishes them to the broker, retrying until the broker acknowledges.
> - This guarantees at-least-once delivery (the event may be published more than once if the worker crashes after publishing but before marking the entry as processed).
> - Consumers must be idempotent to handle duplicate events.
> - Tradeoff: adds a background worker and an extra DB table. The cost is worth it for any event that must not be lost.

## References

- [Saga distributed transactions pattern (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga) — Microsoft's reference architecture for Saga with choreography and orchestration examples, including failure handling.
- [Transactional Outbox pattern (Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transactional-outbox-cosmos) — detailed Outbox pattern explanation with implementation guidance and reliability guarantees.
- [MassTransit Saga documentation](https://masstransit.io/documentation/patterns/saga) — the leading .NET message bus library; includes state machine sagas with automatic persistence and retry.
- [Pattern: Saga (microservices.io)](https://microservices.io/patterns/data/saga.html) — Chris Richardson's canonical description of the Saga pattern with choreography vs orchestration comparison and failure scenarios.
- [Two-Phase Commit (Martin Fowler)](https://martinfowler.com/articles/patterns-of-distributed-systems/two-phase-commit.html) — detailed explanation of 2PC mechanics, failure modes, and why it's rarely used in modern distributed systems.
