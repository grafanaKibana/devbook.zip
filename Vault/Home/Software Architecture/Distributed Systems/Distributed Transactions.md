---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Coordinates multi-participant change through atomic 2PC or independently committed saga steps with semantic compensation."
level:
  - "2"
priority: High
status: Ready to Repeat
publish: true
---

A distributed transaction coordinates a change across independently failing services or databases. Local atomic commit stops at each participant. A crash or partition between commits can therefore expose a partial result unless the protocol defines recovery.

Two approaches cover most designs. **Two-Phase Commit (2PC)** coordinates one atomic outcome synchronously. A **Saga** commits local steps and uses compensation after a later failure. The Outbox pattern solves a narrower problem: publishing a durable message after a local state change.

# Two-Phase Commit (2PC)

2PC uses a coordinator to drive every participant through two phases:

1. **Prepare:** each participant makes its tentative work durable, holds the required resources, and votes yes or no.
2. **Commit/Abort:** the coordinator records the decision. It sends commit only after every yes vote. Any no vote produces abort.

```text
Coordinator → Participant A: PREPARE
Coordinator → Participant B: PREPARE
Participant A → Coordinator: VOTE YES (locks row)
Participant B → Coordinator: VOTE YES (locks row)
Coordinator → Participant A: COMMIT
Coordinator → Participant B: COMMIT
```

**Where it fits:** tightly coupled systems in which every participant supports the same transaction protocol, such as XA-capable databases under one operational boundary. MSDTC provides this coordination for supported Windows resource managers.

**Why it is uncommon in microservices:** a prepared participant may have to wait for the coordinator's durable decision while holding locks. Network delay stretches that window and raises contention. Many participants, including ordinary HTTP APIs and cloud queues, do not support XA at all.

# Saga Pattern

A Saga breaks the workflow into local transactions. Completed compensable steps have **compensating transactions** that semantically reverse their effects after a later failure. The design also identifies its pivot: the first noncompensable transaction, or the point after which the workflow must finish. A failure before the pivot commits triggers compensation for completed reversible steps. After the pivot commits, subsequent idempotent and retryable steps use forward recovery until the workflow completes.

```text
Step 1: Order Service → PlaceOrder (local commit)
Step 2: Payment Service → ChargeCard (local commit)
Step 3: Inventory Service → ReserveStock (local commit)

If Step 3 fails:
  Compensate Step 2: RefundCard
  Compensate Step 1: CancelOrder
```

A saga can use [[Home/Software Architecture/Distributed Systems/Choreography|choreography]], where the order, payment, and inventory services advance this flow through events, or [[Home/Software Architecture/Distributed Systems/Orchestration|orchestration]], where a durable process manager records each outcome and issues the next command. The sequence stays the same. Decision ownership changes.

# Outbox Pattern

The Outbox pattern closes the gap between a database commit and message publication. It writes the message beside the domain change in one local transaction, then publishes from the outbox asynchronously.

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

Without an outbox, a broker failure after the database commit can lose the event. With one, the event remains durable in the database and can be retried. A crash after publish but before marking the row processed can still create a duplicate.

# Sagas Sacrifice Isolation

A Saga gives up isolation across the workflow. Each local step commits immediately, so intermediate state is visible before the saga finishes. Another transaction may read an order that is later cancelled after payment fails. 2PC can keep resources locked through the decision. A saga cannot.

The usual controls are **semantic locks**, such as a `PENDING` status that other operations must respect, plus commutative updates or a version check immediately before acting. Every step and compensation must tolerate retries. [[Home/Software Architecture/Distributed Systems/Idempotency]] explains how a repeated step produces one durable effect. Compensation restores a business outcome, but the window of observable inconsistency remains because the local steps committed separately.

# Where Sagas Fail

## Compensation Is a New Business Action

A compensation can fail, and some side effects cannot be undone. An email cannot be unsent, and a payment provider without a refund operation cannot reverse a charge.

Define compensation before the forward step. Irreversible effects need a corrective action, such as sending a cancellation notice, rather than a fictional inverse. Some outcomes require manual recovery.

## Saga State Must Survive a Crash

If saga state exists only in process memory, a restarted orchestrator cannot tell which steps completed.

Persist the workflow state and each outcome. A saga framework such as MassTransit or NServiceBus can supply durable state and retry behavior, but the application still defines idempotency and compensation semantics.

# Tradeoffs

| Approach | Consistency | Complexity | Latency | When to use |
|---|---|---|---|---|
| 2PC | Strong (ACID) | Medium | High (locks held during coordination) | Same data center, XA-capable stores, low throughput |
| Saga ([[Home/Software Architecture/Distributed Systems/Choreography|choreography]]) | Eventual | Distributed subscription and recovery logic | Low call-path latency | Simple flows and independent reactions |
| Saga ([[Home/Software Architecture/Distributed Systems/Orchestration|orchestration]]) | Eventual | Durable orchestrator state | Medium | Ordered multi-step flows with explicit visibility |

Use 2PC only when every participant supports it and blocking during recovery fits the availability and throughput budget. A saga with [[Home/Software Architecture/Distributed Systems/Choreography|choreography]] fits simple flows or independent reactions. A saga with [[Home/Software Architecture/Distributed Systems/Orchestration|orchestration]] is easier to operate when the flow needs explicit state, retries, deadlines, or long-running visibility. Event publication still needs an outbox.

# Questions

> [!QUESTION]- Why is 2PC problematic in microservices?
> Prepared participants can hold locks while waiting for the coordinator's durable decision, so network faults reduce availability and throughput. Many common service boundaries do not support XA, which prevents them from joining the protocol.

> [!QUESTION]- How does the Outbox pattern support at-least-once event delivery?
> The message commits in the same local transaction as the domain change. A relay retries publication until acknowledged. A crash between broker acknowledgement and marking the row processed can publish twice, so consumers remain idempotent.

# References

- [Two-Phase Commit](https://martinfowler.com/articles/patterns-of-distributed-systems/two-phase-commit.html)
- [Transactional Outbox pattern](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transactional-outbox-cosmos)
- [MassTransit saga documentation](https://masstransit.io/documentation/patterns/saga)
