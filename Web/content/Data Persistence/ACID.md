---
publish: true
created: 2026-07-11T21:46:58.426Z
modified: 2026-07-11T21:46:58.426Z
published: 2026-07-11T21:46:58.426Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: Four properties (Atomicity, Consistency, Isolation, Durability) guaranteeing reliable database transactions.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# ACID

ACID is a set of four properties that guarantee database transactions are processed reliably. A **transaction** is a unit of work that either completes fully or has no effect at all. ACID properties ensure that even under concurrent access, hardware failures, or application crashes, the database remains in a valid, consistent state.

Understanding ACID is essential for designing systems that handle money, inventory, or any data where partial updates are unacceptable.

## The Four Properties

### Atomicity

All operations in a transaction succeed together, or none of them take effect. There is no partial commit.

**Example**: transferring \$100 from Account A to Account B requires two writes: debit A and credit B. If the debit succeeds but the credit fails (crash, constraint violation), the transaction rolls back — Account A is not debited.

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;  -- both succeed, or ROLLBACK undoes both
```

### Consistency

A committed transaction moves the database from one valid state to another. All constraints, triggers, and rules are enforced. A transaction that would violate a constraint (e.g., a negative balance check constraint) is rejected.

**Note**: consistency in ACID is about database-level rules (constraints, foreign keys, triggers). It is different from the "C" in CAP theorem, which refers to distributed consistency.

### Isolation

Concurrent transactions do not observe each other's intermediate (uncommitted) states. The degree of isolation is controlled by **isolation levels**:

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| Read Uncommitted | ✓ possible | ✓ possible | ✓ possible |
| Read Committed | ✗ prevented | ✓ possible | ✓ possible |
| Repeatable Read | ✗ prevented | ✗ prevented | ✓ possible |
| Serializable | ✗ prevented | ✗ prevented | ✗ prevented |

- **Dirty read**: reading uncommitted data from another transaction (which may roll back).
- **Non-repeatable read**: reading the same row twice in a transaction and getting different values because another transaction committed a change between reads.
- **Phantom read**: a query returns different rows on two executions because another transaction inserted or deleted rows.

**Default in most databases**: Read Committed (SQL Server, PostgreSQL). Serializable is the strongest but has the highest lock contention.

#### MVCC and snapshot isolation

Modern databases mostly avoid read locks via **MVCC (Multi-Version Concurrency Control)**: each write creates a new _version_ of a row, and a transaction reads the version that was committed when it began. The headline benefit is **readers never block writers and writers never block readers** — a long report doesn't stall the write path. PostgreSQL is MVCC throughout; SQL Server's `SNAPSHOT` / `READ_COMMITTED_SNAPSHOT` is its MVCC mode (that's why the table above lists Snapshot as low-contention). The cost is version bookkeeping: PostgreSQL needs `VACUUM` to reclaim dead row versions; SQL Server keeps versions in `tempdb`.

#### Write skew — the anomaly the table misses

The dirty/non-repeatable/phantom list covers the SQL-standard anomalies, but **Snapshot isolation still permits _write skew_**: two transactions each read an overlapping set, each makes a decision that's valid in isolation, and together they break an invariant. Classic example: two doctors are on call; each transaction reads "2 on call, safe to leave" and each takes themselves off — leaving zero on call. Only true **Serializable** (e.g. PostgreSQL's Serializable Snapshot Isolation, or materializing the conflict with `SELECT ... FOR UPDATE`) prevents it. If your logic is "read X, then conditionally write Y," Snapshot/Repeatable Read is not enough.

### Durability

Once a transaction commits, its changes survive crashes. The database achieves this through write-ahead logging (WAL): changes are written to a durable log before being applied to data pages. On recovery, the log is replayed to restore committed state.

> [!NOTE]
> Durability is not binary. `fsync`-on-commit is the strict default, but databases offer weaker modes (PostgreSQL `synchronous_commit = off`, group commit) that trade a few milliseconds of crash-window data loss for throughput. In replicated setups, **durability also means "acknowledged by N replicas"** — see [[Replication]] (synchronous vs asynchronous commit).

## Beyond a Single Database

ACID guarantees are easy _within one database engine_. The moment a unit of work spans **two databases or services**, atomicity is no longer free:

- **Two-Phase Commit (2PC)** — a coordinator asks every participant to _prepare_ (vote), then _commit_ or _abort_ all together. It preserves atomicity across resources but is slow and **blocks if the coordinator dies mid-protocol** (participants hold locks waiting), so it's avoided in high-scale systems.
- **Saga pattern** — instead of one distributed transaction, run a sequence of _local_ ACID transactions, each with a **compensating action** to undo it if a later step fails. You trade atomicity for eventual consistency and explicit rollback logic. This is the dominant approach in microservices. See [[Distributed Transactions]].

Also note that lock-based isolation can produce **deadlocks** (two transactions each holding a lock the other needs); the engine picks a victim and rolls it back, so transactional code must be retry-safe — see [[Deadlocks]].

## Pitfalls

### Choosing the Wrong Isolation Level

**What goes wrong**: using Read Committed for financial calculations allows non-repeatable reads — a balance check and a debit in the same transaction can see different values if another transaction commits between them.

**Why it happens**: Read Committed is the default and feels "safe enough."

**Mitigation**: use Serializable or Repeatable Read for transactions that read and then write based on what they read (read-modify-write patterns). Use optimistic concurrency (row version/timestamp) as a lighter alternative to Serializable.

### Long-Running Transactions

**What goes wrong**: a transaction holds locks for seconds or minutes, blocking other transactions and causing timeouts.

**Why it happens**: application code performs slow operations (HTTP calls, file I/O) inside a transaction.

**Mitigation**: keep transactions short. Do all I/O outside the transaction. Only open the transaction for the database operations themselves.

## Tradeoffs

**ACID vs BASE**

| Dimension | ACID | BASE |
|-----------|------|------|
| Consistency | Strong (every commit is valid) | Eventual (replicas converge over time) |
| Availability | Lower under partition (must reject or delay) | Higher (accept writes, reconcile later) |
| Latency | Higher (coordination, locking) | Lower (no global coordination) |
| Use case | Financial transactions, inventory, bookings | Caches, DNS, social feeds, analytics |

**Decision rule**: use ACID for any data where partial updates are unacceptable (money, inventory, reservations). Use BASE (eventual consistency) for data where temporary divergence is tolerable and throughput matters more than strict correctness.

**Isolation level cost**

| Level | Anomalies prevented | Lock contention | When to use |
|-------|---------------------|-----------------|-------------|
| Read Committed | Dirty reads | Low | Default; safe for most reads |
| Repeatable Read | Dirty + non-repeatable | Medium | Read-modify-write patterns |
| Serializable | All anomalies | High | Financial calculations, inventory decrement |
| Snapshot (SQL Server) | All anomalies | Low (optimistic) | High-read, low-conflict workloads |

**Decision rule**: start with Read Committed (the default). Upgrade to Repeatable Read or Serializable only for transactions that read and then write based on what they read. Use Snapshot isolation when you need Serializable semantics without the lock contention.

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
> Use Serializable or Repeatable Read. Read Committed (the default in SQL Server and PostgreSQL) allows non-repeatable reads: a balance check and a debit in the same transaction can see different values if another transaction commits between them. For financial calculations or inventory updates, this causes incorrect results. Serializable prevents all anomalies but has the highest lock contention. Repeatable Read prevents non-repeatable reads with lower overhead. Optimistic concurrency (row version/timestamp) is a lighter alternative to Serializable for low-conflict workloads.

> [!QUESTION]- How does write-ahead logging (WAL) implement durability?
> Before applying any change to data pages, the database writes the change to a sequential log file (WAL). The log write is synchronous — the transaction does not commit until the log entry is flushed to durable storage. On crash recovery, the database replays the log to restore all committed transactions and undo any uncommitted ones. WAL makes durability cheap: sequential log writes are fast; the actual data page updates can be deferred (write-behind). This is why databases can commit thousands of transactions per second despite disk I/O.

## References

- [ACID (Wikipedia)](https://en.wikipedia.org/wiki/ACID) — comprehensive overview of all four properties with historical context and database implementation details.
- [Transaction isolation levels (PostgreSQL docs)](https://www.postgresql.org/docs/current/transaction-iso.html) — PostgreSQL's implementation of isolation levels with concrete examples of each anomaly.
- [Transaction isolation in SQL Server (Microsoft Learn)](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide) — SQL Server's locking and row versioning guide; covers all isolation levels including the SNAPSHOT isolation level unique to SQL Server.
- [Designing Data-Intensive Applications (Martin Kleppmann)](https://dataintensive.net/) — Chapter 7 covers transactions in depth: ACID semantics, isolation levels, and the tradeoffs between consistency and performance in distributed systems.
