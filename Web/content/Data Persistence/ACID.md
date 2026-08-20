---
publish: true
created: 2026-08-20T20:41:15.612Z
modified: 2026-08-20T20:41:15.612Z
published: 2026-08-20T20:41:15.612Z
topic:
  - Data Persistence
subtopic: []
summary: Four properties (Atomicity, Consistency, Isolation, Durability) guaranteeing reliable database transactions.
level:
  - "3"
priority: High
status: Ready to Repeat
---

ACID describes what a database transaction protects. A **transaction** groups reads and writes behind one commit decision. Atomicity prevents partial commit, consistency preserves declared invariants, isolation constrains concurrent histories, and durability defines what survives after commit.

These guarantees stop at the participating database and the isolation and durability settings it uses. They do not make a retried business operation idempotent, turn asynchronous replication into synchronous durability, or extend one local commit across other services.

# The Four Properties

## Atomicity

Atomicity gives the transaction one final outcome: all of its writes commit, or none of them do. A failed transaction must not leave a subset of its writes committed. Whether another transaction can observe tentative writes before that outcome is an isolation question, not an atomicity guarantee.

**Example**: transferring \$100 from Account A to Account B requires two writes: debit A and credit B. If the debit succeeds but the credit fails (crash, constraint violation), the transaction rolls back — Account A is not debited.

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;  -- both succeed, or ROLLBACK undoes both
```

The useful test is a failure trace, not the happy path:

| Event | Without one transaction | With one transaction |
| --- | --- | --- |
| Debit A from $500 to $400 | Visible immediately | Tentative change owned by the transaction |
| Process crashes before crediting B | A stays at $400; $100 disappeared | Recovery aborts the uncommitted transaction. A returns to \$500 |
| Both writes finish and `COMMIT` succeeds | Two unrelated writes happened to finish | Debit and credit become one committed outcome |

Atomicity does not make the transfer request safe to repeat. If the client times out after the server commits, retrying the same transaction can transfer another \$100. Store an idempotency key or transfer ID under a uniqueness constraint so a retry returns the first result instead of applying the business operation again.

## Consistency

A committed transaction preserves the invariants the system actually enforces. A database can check `CHECK (balance >= 0)`, foreign keys, uniqueness, and trigger logic. It cannot infer a rule that exists only in application code. Cross-row rules such as "only one active booking may exist" need a constraint where one is expressible, or a transaction that protects the full predicate while it checks and writes.

ACID consistency is the validity of state before and after a transaction. The "C" in CAP concerns whether clients observe one current value across replicas during failures. They are different properties.

## Isolation

Isolation controls what concurrent transactions may observe and which combined histories may commit. The name alone is not enough. The configured **isolation level** and the engine's implementation define the contract:

| SQL level | Dirty read | Non-repeatable read | Phantom read | Serialization anomaly |
| --- | --- | --- | --- | --- |
| Read Uncommitted | Possible | Possible | Possible | Possible |
| Read Committed | Prevented | Possible | Possible | Possible |
| Repeatable Read | Prevented | Prevented | Possible | Possible |
| Serializable | Prevented | Prevented | Prevented | Prevented |

- **Dirty read**: reading uncommitted data from another transaction (which may roll back).
- **Non-repeatable read**: reading the same row twice in a transaction and getting different values because another transaction committed a change between reads.
- **Phantom read**: a query returns different rows on two executions because another transaction inserted or deleted rows.

The table gives the SQL standard's minimum guarantees. Engines may provide more. PostgreSQL maps Read Uncommitted to Read Committed, and its Repeatable Read prevents phantoms while still allowing serialization anomalies. SQL Server Read Committed can use locks or row versions, depending on configuration. Check the product documentation before relying on the generic table.

### MVCC and Snapshot Isolation

Engines implement isolation with **locking**, **MVCC/versioning**, or a combination. [[Data Persistence/SQL/Database Locks|Database Locks]] covers lock modes and escalation. Under MVCC, writes create versions and a snapshot determines which version a statement can see. PostgreSQL Read Committed takes a new snapshot for each statement. Repeatable Read and Serializable keep a transaction snapshot. SQL Server uses row versioning for `READ_COMMITTED_SNAPSHOT` and `SNAPSHOT` when those modes are enabled.

MVCC removes much ordinary reader-writer blocking. It does not remove contention. Writers still conflict with writers, explicit locks can block, and schema changes may need stronger protection. Old versions also remain until no active snapshot needs them. PostgreSQL cleans dead tuples through `VACUUM`. SQL Server keeps row versions in its version store.

### Write Skew — the Anomaly the Table Misses

The familiar dirty-read, non-repeatable-read, and phantom list misses some invalid histories. **Snapshot isolation can permit write skew**:

| Transaction A | Transaction B |
| --- | --- |
| Reads Alice and Bob: both are on call | Reads the same snapshot: both are on call |
| Sets Alice off call | Sets Bob off call |
| Commits because it changed only Alice | Commits because it changed only Bob |

Each transaction sees another doctor on call, then updates a different row. Both local decisions look valid. The combined result is not. Protect the complete invariant with a constraint, explicit row or predicate protection, or Serializable isolation. PostgreSQL Serializable detects dangerous read/write dependencies and aborts one transaction with SQLSTATE `40001`. Retry the **whole** transaction, including every read and decision. Repeating only the final `UPDATE` reuses stale reasoning.

## Durability

Durability begins when the engine acknowledges commit under its configured policy. With write-ahead logging (WAL), redo information reaches the log before the corresponding data pages. A strict commit waits for the commit record to reach durable storage. Recovery can then replay committed changes whose data pages were not written before the crash.

> [!NOTE]
> Durability is a configured contract. Group commit can preserve local durability while several transactions share one log flush. PostgreSQL `synchronous_commit = off` may acknowledge before local WAL is flushed and accepts a bounded crash-loss window for lower commit latency. Replication is a separate choice about surviving node loss and availability: asynchronous replicas may lag, while synchronous replication adds a remote acknowledgement to the commit path. See [[Data Persistence/SQL/Replication|Replication]].

A committed row can still disappear when storage hardware lies about flush completion, a controller is misconfigured, or an operator restores an older backup. ACID defines the database protocol; the end-to-end durability claim also depends on the storage stack and recovery procedure.

# Beyond a Single Database

A local database owns its commit decision. Once one operation spans **two databases or services**, no participant can provide atomicity by itself:

- **Two-Phase Commit (2PC)** — a coordinator asks every participant to _prepare_ (vote), then _commit_ or _abort_ all together. A participant that has prepared but cannot learn the coordinator's decision may have to retain locks and recovery state until the decision becomes available. Presumed-abort/commit variants, replicated coordinators, and timeout policies change the operational boundary but do not let a prepared participant decide independently.
- **Saga pattern** — instead of one distributed transaction, run a sequence of _local_ ACID transactions, each with a compensating action or forward-recovery step when later work fails. This trades one atomic commit for explicit intermediate states, idempotency, compensation limits, and eventual completion. It fits only when the business operation can tolerate those semantics. See [[Software Architecture/Distributed Systems/Distributed Transactions|Distributed Transactions]].

Concurrent transactions can also deadlock when each holds a resource the other needs. The engine chooses a victim and rolls it back, so transactional code needs a bounded retry policy. [[Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks|Deadlocks]] covers the wait cycle. A retry is safe only when an ambiguous commit result cannot apply the business operation twice.

# Pitfalls

## Choosing the Wrong Isolation Level

**What goes wrong**: a decision reads several rows under Read Committed, then a later statement acts after another transaction has changed part of that input. The transaction commits a decision that was never valid for one consistent view.

**Why it happens**: Read Committed is a common default, and the absence of dirty reads is mistaken for full transaction isolation.

**Mitigation**: match the mechanism to the invariant. Repeatable Read generically keeps repeated row reads stable, but its implementation is engine-specific: PostgreSQL uses a transaction snapshot and prevents phantoms, while lock-based implementations can protect reread rows yet still permit phantoms. Either model may still allow serialization anomalies such as write skew. A decision spanning rows or a predicate needs Serializable isolation, complete lock coverage, an enforceable constraint, or optimistic version checks over every record that informed the decision.

## Long-Running Transactions

**What goes wrong**: a transaction holds locks or retains old versions for seconds or minutes. Other work blocks, aborts, or accumulates cleanup pressure.

**Why it happens**: application code performs an HTTP call, file operation, or user wait inside the transaction.

**Mitigation**: keep the transaction around only the database work that must share one commit decision. Perform unrelated external I/O before or after it, with an outbox or another explicit handoff when later work must be reliable.

# Tradeoffs

**Transaction semantics**

Use one transaction when several reads and writes share one invariant and one database can enforce it. Pick the weakest isolation level that prevents the histories capable of breaking that invariant. Stronger isolation spends coordination through blocking, dependency tracking, or retries. For a workflow across services, choose between distributed commit and explicit local transactions with messages and compensation.

**Replication, consistency, and availability**

ACID does not determine replica freshness or behavior during a partition. An ACID database can serve stale reads from asynchronous replicas or acknowledge a locally durable write before any replica has it. A leader or quorum can provide stronger read consistency. During a partition, topology and configuration determine which side accepts writes and whether conflicts can arise.

| Distributed decision | Stricter coordination | Less-coordinated alternative | Cost to make explicit |
| --- | --- | --- | --- |
| Read freshness | Leader, quorum, or linearizable read | Replica read with bounded staleness or eventual convergence | Latency and availability versus stale results |
| Write behavior during partition | Reject or delay writes without the required leader/quorum | Accept writes in multiple partitions and reconcile | Reduced write availability versus conflict semantics |
| Node-loss durability | Wait for synchronous replica acknowledgement | Acknowledge after local durability and replicate asynchronously | Commit latency versus acknowledged-write loss on failover |

**Isolation level cost**

| Level | Anomalies prevented | Lock contention | When to use |
|-------|---------------------|-----------------|-------------|
| Read Committed | Dirty reads | Low | Independent point reads and writes whose invariants are enforced by constraints |
| Repeatable Read | Dirty + non-repeatable. Vendor implementations may prevent more | Medium | Stable transaction snapshots whose cross-row invariants have separate protection |
| Serializable | Serialization anomalies | Highest coordination or abort rate | Predicate-spanning financial, inventory, and booking invariants |
| Snapshot (SQL Server) | Dirty, non-repeatable, and phantom reads. Write skew remains possible | Low read-write contention (versioned) | High-read workloads whose cross-row invariants have separate protection |

Read Committed is a common starting point for independent point operations, though it is not every engine's default. Repeatable Read fits work that needs stable rereads. A snapshot-based implementation such as PostgreSQL's also gives one transaction snapshot, while a lock-based implementation may expose a different phantom boundary. Explicit Snapshot isolation provides a stable versioned view but can still allow write skew. Use Serializable when a predicate-spanning invariant must hold across concurrent transactions, and design the complete transaction for retries.

```csharp
// Optimistic concurrency as a lighter alternative to Serializable
// EF Core: rowversion column prevents lost updates without table locks
public sealed class Account
{
    public int Id { get; set; }
    public decimal Balance { get; set; }
    [Timestamp]
    public byte[] RowVersion { get; set; } = [];  // EF Core concurrency token
}

// If another transaction committed between our read and write,
// EF throws DbUpdateConcurrencyException — retry or surface conflict to user
await db.SaveChangesAsync();
```

# Questions

> [!QUESTION]- What determines the isolation level needed for a read-modify-write transaction?
> The required protection depends on the invariant and on every row or predicate used to make the decision. Repeatable Read stabilizes repeated reads and may protect an update to the same row under the database engine's rules, but it does not generally prevent write skew. A financial or inventory decision that spans rows or a predicate needs Serializable isolation or explicit locks over the full set. Optimistic row-version checks reduce contention only when the transaction validates every record that influenced the decision.

# References

- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
