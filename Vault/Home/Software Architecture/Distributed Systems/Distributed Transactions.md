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
qard-deck: "Software Architecture"
qard-topic: "Distributed Systems/Distributed Transactions"
flashcard_uid: "c508afc9"
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

Each compensation should be defined before its forward step. Irreversible effects need a corrective action, such as sending a cancellation notice, rather than a fictional inverse. Some outcomes require manual recovery.

## Saga State Must Survive a Crash

If saga state exists only in process memory, a restarted orchestrator cannot tell which steps completed.

The workflow state and each step outcome must be persisted. A saga framework such as MassTransit or NServiceBus can supply durable state and retry behavior, but the application still defines idempotency and compensation semantics.

# Tradeoffs

| Approach | Consistency | Complexity | Latency | When to use |
|---|---|---|---|---|
| 2PC | Strong (ACID) | Medium | High (locks held during coordination) | Same data center, XA-capable stores, low throughput |
| Saga ([[Home/Software Architecture/Distributed Systems/Choreography|choreography]]) | Eventual | Distributed subscription and recovery logic | Low call-path latency | Simple flows and independent reactions |
| Saga ([[Home/Software Architecture/Distributed Systems/Orchestration|orchestration]]) | Eventual | Durable orchestrator state | Medium | Ordered multi-step flows with explicit visibility |

2PC is appropriate only when every participant supports it and blocking during recovery fits the availability and throughput budget. A saga with [[Home/Software Architecture/Distributed Systems/Choreography|choreography]] fits simple flows or independent reactions. A saga with [[Home/Software Architecture/Distributed Systems/Orchestration|orchestration]] is easier to operate when the flow needs explicit state, retries, deadlines, or long-running visibility. Event publication still needs an outbox.

# Questions

<!-- qard-id: 1f55b33c-29a0-4777-8e34-e43c6b00b881 -->
> [!qard]- Why is two-phase commit (2PC) problematic in microservices?
> Two-phase commit is a blocking protocol. Every participant that has prepared must wait for one coordinator's decision while still holding its locks, so a slow or failed coordinator or a network delay can stall other services. It also works only when every participant supports the same transaction protocol, which couples independently failing services to one shared coordinator.
> 
> How the blocking arises:
> 
> 1. **Prepare:** the coordinator asks each participant to make its tentative work durable and vote. A participant that votes yes keeps the locks that work needs and promises to follow the final decision.
> 2. **Decide:** the coordinator records commit only if every participant voted yes. Any no vote produces abort.
> 3. **Complete:** each participant commits or rolls back when the decision reaches it, and only then releases its locks.
> 
> Consequences for microservices:
> 
> - **Locks held across network delays:** between steps 1 and 3, a coordinator crash or network delay leaves prepared data locked. Requests that need those rows wait or time out, so one component's failure reduces the availability and throughput of others.
> - **Shared protocol requirement:** each database, broker or service in the transaction must take part in the same prepare-and-commit protocol under one coordinator. A participant that cannot join that protocol cannot share the atomic commit.
> 
> This is why microservice workflows more often commit locally in each service and coordinate the remaining steps through messages, as in a saga.
> 
> [PostgreSQL: PREPARE TRANSACTION](https://www.postgresql.org/docs/current/sql-prepare-transaction.html)

<!-- qard-id: 308353ee-bfa4-462c-8cf5-0bcd625b572b -->
> [!qard]- How does the Outbox pattern support at-least-once event delivery?
> The Outbox pattern makes an event as durable as the state change it describes, then publishes it with retries. After the change commits, the event can be delayed or published more than once, but it is not lost while the relay keeps retrying.
> 
> 1. **Write atomically:** the service saves the domain change and an outbox record for the event in one local database transaction. Either both commit or neither does.
> 2. **Relay:** a separate process reads committed outbox records and publishes them to the broker.
> 3. **Retry:** if publishing fails, the record stays pending and the relay tries again.
> 4. **Record progress:** after the broker accepts the event, the relay marks the record as published.
> 
> Without an outbox, the service writes to the database and to the broker as two separate operations. A failure between them can leave one done and the other missing, for example a committed order whose event was never published.
> 
> **Duplicates:** if the relay crashes after the broker accepts the event but before step 4, it publishes the event again. Consumers therefore need idempotent handling or deduplication, for example by recording the IDs of events they have already processed.
> 
> The atomicity covers only the local store, whose transaction must include both records. No single transaction spans the database and the broker. In Azure Cosmos DB, for example, the two writes go into one transactional batch, which must target a single logical partition.
> 
> [Microsoft: Transactional Outbox pattern with Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-out-box-cosmos)

# References

- [Two-Phase Commit](https://martinfowler.com/articles/patterns-of-distributed-systems/two-phase-commit.html)
- [Transactional Outbox pattern](https://learn.microsoft.com/en-us/azure/architecture/best-practices/transactional-outbox-cosmos)
- [MassTransit saga documentation](https://masstransit.io/documentation/patterns/saga)
