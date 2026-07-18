---
topic:
  - Data Persistence
subtopic: []
summary: "Four properties (Atomicity, Consistency, Isolation, Durability) guaranteeing reliable database transactions."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

ACID names four properties a database transaction can provide: Atomicity, Consistency, Isolation, and Durability. A **transaction** groups reads and writes behind one commit decision. The engine can roll the group back, constrain concurrent histories, and recover committed state after a crash, but only within the database and durability settings actually used.

Understanding ACID is essential for designing systems that handle money, inventory, or any data where partial updates are unacceptable.

## The Four Properties

### Atomicity

All operations in a transaction succeed together, or none of them take effect. There is no partial commit.

**Example**: transferring $100 from Account A to Account B requires two writes: debit A and credit B. If the debit succeeds but the credit fails (crash, constraint violation), the transaction rolls back — Account A is not debited.

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
| Process crashes before crediting B | A stays at $400; $100 disappeared | Recovery aborts the uncommitted transaction; A returns to $500 |
| Both writes finish and `COMMIT` succeeds | Two unrelated writes happened to finish | Debit and credit become one committed outcome |

Atomicity does not make the transfer request safe to repeat. If the client times out after the server commits, retrying the same transaction can transfer another $100. Store an idempotency key or transfer ID under a uniqueness constraint so a retry returns the first result instead of applying the business operation again.

### Consistency

A committed transaction moves the database from one valid state to another according to the invariants the system enforces. The database can enforce a `CHECK (balance >= 0)`, a foreign key, a uniqueness constraint, or a trigger. It cannot infer application rules that were never encoded, such as "the sum of the two ledger entries must be zero" or "only one active booking may exist across these rows." Those invariants need constraints, locked rows or predicates, or a serializable transaction that performs the complete check and write.

**Note**: consistency in ACID is about database-level rules (constraints, foreign keys, triggers). It is different from the "C" in CAP theorem, which refers to distributed consistency.

### Isolation

Isolation controls which effects of concurrent transactions may be observed and which histories the engine permits. It is not an absolute ban on intermediate states: SQL Read Uncommitted may expose uncommitted writes, while stronger levels restrict dirty reads, non-repeatable reads, phantom reads, and broader serialization anomalies. The configured **isolation level** and engine implementation define the contract:

| SQL level | Dirty read | Non-repeatable read | Phantom read | Serialization anomaly |
| --- | --- | --- | --- | --- |
| Read Uncommitted | Possible | Possible | Possible | Possible |
| Read Committed | Prevented | Possible | Possible | Possible |
| Repeatable Read | Prevented | Prevented | Possible | Possible |
| Serializable | Prevented | Prevented | Prevented | Prevented |

- **Dirty read**: reading uncommitted data from another transaction (which may roll back).
- **Non-repeatable read**: reading the same row twice in a transaction and getting different values because another transaction committed a change between reads.
- **Phantom read**: a query returns different rows on two executions because another transaction inserted or deleted rows.

This table states the SQL standard's minimum guarantees, not a portable prediction of every engine. PostgreSQL maps Read Uncommitted to Read Committed and its Repeatable Read implementation also prevents phantoms, yet still permits serialization anomalies. SQL Server can implement Read Committed with locks or row versioning depending on configuration. Always read the target engine's isolation documentation before choosing a level.

#### MVCC and snapshot isolation

Isolation is implemented with **locking**, **MVCC/versioning**, or both. See [[Home/Data Persistence/SQL/Database Locks|Database Locks]] for lock modes, granularity, and escalation. Under MVCC, writes create row versions and a snapshot decides which versions a statement may see. PostgreSQL Read Committed takes a new snapshot per statement; Repeatable Read and Serializable use a transaction snapshot. SQL Server uses row versioning for `READ_COMMITTED_SNAPSHOT` and `SNAPSHOT` when configured.

MVCC reduces ordinary reader-writer blocking; it does not mean reads and writes can never block. Writers still conflict with writers, explicit locks can block readers, schema changes need stronger locks, and old versions must be retained while a snapshot can still see them. PostgreSQL reclaims dead tuples through `VACUUM`; SQL Server stores row versions in its version store.

#### Write skew — the anomaly the table misses

The dirty/non-repeatable/phantom list does not capture every bad history. **Snapshot isolation can permit write skew**:

| Transaction A | Transaction B |
| --- | --- |
| Reads Alice and Bob: both are on call | Reads the same snapshot: both are on call |
| Sets Alice off call | Sets Bob off call |
| Commits because it changed only Alice | Commits because it changed only Bob |

Each transaction preserved "someone else is on call" in its snapshot; together they leave nobody on call. Lock every row or range that carries the invariant, encode the invariant as a database constraint where possible, or use true Serializable isolation. In PostgreSQL, Serializable detects a dangerous read/write dependency and aborts one transaction with SQLSTATE `40001`. Retry the **whole** transaction—including the reads and decisions—with bounded backoff; retrying only the final `UPDATE` reuses a decision made from a stale snapshot.

### Durability

Once a transaction commits under the engine's durable configuration, its changes survive a database or operating-system crash. With write-ahead logging (WAL), the engine records enough redo information before the corresponding data pages are written. A strict commit waits until the commit record reaches durable storage; recovery replays committed WAL after a crash.

> [!NOTE]
> Durability is a configured contract. Group commit can preserve local durability while several transactions share one log flush. PostgreSQL `synchronous_commit = off` may acknowledge before local WAL is flushed and accepts a bounded crash-loss window for lower commit latency. Replication is a separate choice about surviving node loss and availability: asynchronous replicas may lag, while synchronous replication adds a remote acknowledgement to the commit path. See [[Home/Data Persistence/SQL/Replication|Replication]].

A committed row can still disappear when storage hardware lies about flush completion, the filesystem or controller is misconfigured, or the operator restores an older backup. ACID describes the database protocol; the end-to-end durability claim also depends on the storage stack and recovery procedure.

## Beyond a Single Database

ACID guarantees are easy *within one database engine*. The moment a unit of work spans **two databases or services**, atomicity is no longer free:

- **Two-Phase Commit (2PC)** — a coordinator asks every participant to *prepare* (vote), then *commit* or *abort* all together. A participant that has prepared but cannot learn the coordinator's decision may have to retain locks and recovery state until the decision becomes available. Presumed-abort/commit variants, replicated coordinators, and timeout policies change the operational boundary but do not let a prepared participant decide independently.
- **Saga pattern** — instead of one distributed transaction, run a sequence of *local* ACID transactions, each with a compensating action or forward-recovery step when later work fails. You trade one atomic commit for explicit intermediate states, idempotency, compensation limits, and eventual completion. Choose it only when the business operation can tolerate those semantics. See [[Home/Software Architecture/Distributed Systems/Distributed Transactions|Distributed Transactions]].

Also note that concurrent transactions can produce **deadlocks** (two transactions each holding a lock the other needs); the engine picks a victim and rolls it back, so transactional code must be retry-safe — see [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks|Deadlocks]]. Retrying is safe only when the application can also resolve an ambiguous commit result without applying the business operation twice.

## Pitfalls

### Choosing the Wrong Isolation Level

**What goes wrong**: using Read Committed for financial calculations allows non-repeatable reads — a balance check and a debit in the same transaction can see different values if another transaction commits between them.

**Why it happens**: Read Committed is the default and feels "safe enough."

**Mitigation**: Repeatable Read stabilizes repeated reads and, depending on the engine, may protect a same-row update. For a decision spanning multiple rows or a predicate, use Serializable, explicitly lock every row or range that carries the invariant, or validate optimistic version tokens for every protected record before committing.

### Long-Running Transactions

**What goes wrong**: a transaction holds locks for seconds or minutes, blocking other transactions and causing timeouts.

**Why it happens**: application code performs slow operations (HTTP calls, file I/O) inside a transaction.

**Mitigation**: keep transactions short. Do all I/O outside the transaction. Only open the transaction for the database operations themselves.

## Tradeoffs

**Transaction semantics**

ACID describes behavior inside a transaction boundary. Use one transaction when several reads and writes must commit or abort together and when their invariants can be enforced by that database. Choose the weakest isolation level that still prevents the anomalies that would violate those invariants; stronger isolation adds coordination, retries, or blocking. When the boundary spans services, decide separately between a distributed commit protocol and explicit local transactions with messages, idempotency, and compensation.

**Replication, consistency, and availability**

Replication is a different design axis. An ACID database can serve stale reads from asynchronous replicas, acknowledge a locally durable write before replication, or provide linearizable reads through a leader or quorum. During a network partition, its topology and configuration—not the acronym ACID—determine whether a side rejects writes, routes them elsewhere, or accepts divergent writes that need conflict resolution.

| Distributed decision | Stricter coordination | Less-coordinated alternative | Cost to make explicit |
| --- | --- | --- | --- |
| Read freshness | Leader, quorum, or linearizable read | Replica read with bounded staleness or eventual convergence | Latency and availability versus stale results |
| Write behavior during partition | Reject or delay writes without the required leader/quorum | Accept writes in multiple partitions and reconcile | Reduced write availability versus conflict semantics |
| Node-loss durability | Wait for synchronous replica acknowledgement | Acknowledge after local durability and replicate asynchronously | Commit latency versus acknowledged-write loss on failover |

Choose transaction semantics from the invariants of one operation. Choose replica freshness, partition behavior, and failover durability from the distributed read/write contract of each data path. Neither decision substitutes for the other.

**Isolation level cost**

| Level | Anomalies prevented | Lock contention | When to use |
|-------|---------------------|-----------------|-------------|
| Read Committed | Dirty reads | Low | Independent point reads and writes whose invariants are enforced by constraints |
| Repeatable Read | Dirty + non-repeatable; vendor implementations may prevent more | Medium | Stable transaction snapshots whose cross-row invariants have separate protection |
| Serializable | Serialization anomalies | Highest coordination or abort rate | Predicate-spanning financial, inventory, and booking invariants |
| Snapshot (SQL Server) | Dirty, non-repeatable, and phantom reads; write skew remains possible | Low read-write contention (versioned) | High-read workloads whose cross-row invariants have separate protection |

**Decision rule**: start with Read Committed (the default). Use Repeatable Read when repeated row reads need a stable view. Use Snapshot isolation for a consistent transaction snapshot with low read-write contention, but protect cross-row invariants separately because write skew remains possible. Use Serializable when predicate-spanning invariants must hold under concurrency.

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


## Questions

> [!QUESTION]- What isolation level should you use for a read-modify-write transaction, and why?
> Match the protection to the invariant. Repeatable Read stabilizes repeated reads and may protect a same-row update under the engine's semantics, but it does not generically prevent write skew. For a financial or inventory decision spanning rows or a predicate, use Serializable or explicitly lock the full invariant set. Optimistic row-version checks are a lower-contention option only when the transaction validates every record whose version informed the decision.

> [!QUESTION]- How does write-ahead logging (WAL) implement durability?
> Before a changed data page may reach durable storage, the database must flush the WAL records needed to reconstruct it. Under a strict commit setting, the commit record is also flushed before success is acknowledged. Recovery replays WAL so committed changes missing from data pages are restored; engine-specific transaction metadata keeps uncommitted changes from becoming visible. Sequential log writes and group commit let data-page writes happen later without placing every commit behind a random page write.


## References

- [Transaction isolation (PostgreSQL docs)](https://www.postgresql.org/docs/current/transaction-iso.html) — SQL phenomena versus PostgreSQL's actual Read Committed, Repeatable Read, and Serializable behavior.
- [Serialization failure handling (PostgreSQL docs)](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html) — SQLSTATE `40001` and why the complete transaction must be retried.
- [WAL reliability (PostgreSQL docs)](https://www.postgresql.org/docs/current/wal-reliability.html) — the write-before-data rule, flush guarantees, and storage-stack assumptions behind crash recovery.
- [Asynchronous commit (PostgreSQL docs)](https://www.postgresql.org/docs/current/wal-async-commit.html) — the latency versus recent-transaction-loss boundary of `synchronous_commit = off`.
- [Transaction isolation in SQL Server (Microsoft Learn)](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide) — SQL Server's locking and row versioning guide; covers all isolation levels including the SNAPSHOT isolation level unique to SQL Server.
- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) — Chapter 7 covers transactions in depth: ACID semantics, isolation levels, and the tradeoffs between consistency and performance in distributed systems.
- [Database isolation levels (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-are-database-isolation-levels.md) — source taxonomy reconciled here against vendor-specific MVCC, anomaly, and retry behavior; its diagram is excluded because it presents one implementation as universal.
- [What does ACID mean? (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-does-acid-mean.md) — editorial source for the four-property overview; its replication-as-durability visual is excluded because local commit durability does not require replication.
