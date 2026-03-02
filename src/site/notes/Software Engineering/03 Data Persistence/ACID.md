---
{"dg-publish":true,"permalink":"/software-engineering/03-data-persistence/acid/"}
---


# ACID

ACID is a set of four properties that guarantee database transactions are processed reliably. A **transaction** is a unit of work that either completes fully or has no effect at all. ACID properties ensure that even under concurrent access, hardware failures, or application crashes, the database remains in a valid, consistent state.

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

### Durability

Once a transaction commits, its changes survive crashes. The database achieves this through write-ahead logging (WAL): changes are written to a durable log before being applied to data pages. On recovery, the log is replayed to restore committed state.

## Pitfalls

### Choosing the Wrong Isolation Level

**What goes wrong**: using Read Committed for financial calculations allows non-repeatable reads — a balance check and a debit in the same transaction can see different values if another transaction commits between them.

**Why it happens**: Read Committed is the default and feels "safe enough."

**Mitigation**: use Serializable or Repeatable Read for transactions that read and then write based on what they read (read-modify-write patterns). Use optimistic concurrency (row version/timestamp) as a lighter alternative to Serializable.

### Long-Running Transactions

**What goes wrong**: a transaction holds locks for seconds or minutes, blocking other transactions and causing timeouts.

**Why it happens**: application code performs slow operations (HTTP calls, file I/O) inside a transaction.

**Mitigation**: keep transactions short. Do all I/O outside the transaction. Only open the transaction for the database operations themselves.

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

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering\|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/03 Data Persistence/NoSQL/NoSQL\|NoSQL]]
> - [[Software Engineering/03 Data Persistence/ORMs/ORMs\|ORMs]]
> - [[Software Engineering/03 Data Persistence/SQL/SQL\|SQL]]
>
> **Pages**
> - [[Software Engineering/03 Data Persistence/Caching\|Caching]]
<!-- whats-next:end -->
