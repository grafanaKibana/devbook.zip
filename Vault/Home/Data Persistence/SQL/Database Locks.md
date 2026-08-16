---
topic:
  - Data Persistence
subtopic:
  - SQL
summary: "How the database engine serializes conflicting access to enforce isolation — lock modes, granularity, and escalation — and how locking differs from MVCC and from in-process locks."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A database lock is one mechanism a storage engine uses to serialize conflicting access so concurrent transactions satisfy the selected [[Home/Data Persistence/ACID|ACID]] isolation level. The lock manager records an owner, a logical resource, and an access mode. A compatible request proceeds; an incompatible request waits until the holder releases its lock or the waiter is cancelled, times out, or becomes a deadlock victim.

Locks are only one part of concurrency control. Three distinctions keep the layers straight:

- **Locks vs MVCC.** Locking blocks incompatible access to a logical resource. **MVCC** (Multi-Version Concurrency Control) keeps committed row versions so a reader can use an appropriate snapshot instead of blocking a writer (see [[Home/Data Persistence/ACID|ACID]]). MVCC is a version-management mechanism, not a synonym for optimistic concurrency: PostgreSQL still uses locks for write-write conflicts and `SELECT ... FOR UPDATE`, while SQL Server can combine row versioning for reads with locks for writes. Retained versions also need cleanup: PostgreSQL uses `VACUUM`; SQL Server stores them in `tempdb`, or in the Persistent Version Store when Accelerated Database Recovery is enabled.
- **Pessimistic vs optimistic conflict handling.** Pessimistic code acquires a lock before the protected change. Optimistic code proceeds without that preemptive lock, then detects a conflicting version at write or commit and retries or rejects the change. Either policy can run on an MVCC engine.
- **Engine locks vs in-process locks.** A database lock manager coordinates every client of the server. The in-process `lock`/`Monitor` mechanism in [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Locking|Locking]] coordinates access to memory inside one .NET process. A CLR lock cannot protect a database row from another process. The database lock appears to application code as waiting, timeout, cancellation, or a deadlock failure.

Release timing depends on the engine, isolation level, and configuration. In the conventional SQL Server model, exclusive data locks normally survive to transaction end. Locking `READ COMMITTED` usually releases read locks after the statement, while `REPEATABLE READ` and `SERIALIZABLE` retain the relevant protection to transaction end. SQL Server's optimized locking can release row and page X locks before commit while retaining a transaction-ID lock, and its lock-after-qualification path changes when row locks are taken. Row-versioned reads, PostgreSQL MVCC, and serializable schemes based on dependency detection do not follow the conventional shared-lock timeline.

# Lock Modes

A lock mode states the access a transaction needs. The engine grants it only when that mode is compatible with locks already held on the same resource. SQL Server's shared, update, and exclusive modes describe common data access, while intent modes connect row- or key-level locks to coarser resources.

- **Shared (S)** — taken by locking reads. Many transactions can hold S on the same resource simultaneously. S blocks a writer (X) until the lock is released, but an MVCC snapshot read may not request a row-level S lock at all.
- **Exclusive (X)** — taken to modify (insert/update/delete). Among the basic data modes on the same resource, X conflicts with S, U, and another X: while a transaction holds X on a row, no locking reader or other writer can take that row.
- **Update (U)** — In the conventional locking path, SQL Server uses U to prevent a specific deadlock in *read-then-write* operations. An `UPDATE` first scans to find the qualifying row, then modifies it. If that scan took S, two transactions could both hold S and then both try to upgrade S→X, each blocked by the other's S. Only one transaction may hold U on a resource, while U remains compatible with S during the search phase. It converts to X for the write, preventing the upgrade race. With optimized locking, RCSI, and default `READ COMMITTED`, SQL Server can qualify rows from the latest committed version without U locks, then acquire X only for qualifying rows. An explicit `UPDLOCK` still requests update locks.

The basic SQL Server compatibility that makes U work, in one matrix (rows = held, columns = requested):

| held \ requested | S | U | X |
| --- | --- | --- | --- |
| **S** | ✓ | ✓ | ✗ |
| **U** | ✓ | ✗ | ✗ |
| **X** | ✗ | ✗ | ✗ |

**Intent locks (IS / IX / SIX)** expose fine-grained ownership at a coarser resource. Before SQL Server takes an X lock on a row or key, it places IX above it in the hierarchy. A later table-level X request can conflict with that IX without enumerating every protected row. IS announces shared locks below. IX announces exclusive locks below. SIX combines a shared lock on the current resource with intent to update descendants.

PostgreSQL exposes a parallel but differently named vocabulary. Its **table-level** modes run from `ACCESS SHARE` (taken by a plain `SELECT`) up to `ACCESS EXCLUSIVE` (taken by `DROP`, `TRUNCATE`, and many `ALTER TABLE` forms). Writes acquire the appropriate row-level lock mode automatically. Locking reads request one explicitly through `FOR SHARE`, `FOR KEY SHARE`, `FOR NO KEY UPDATE`, or `FOR UPDATE`. The compatibility model is comparable, but PostgreSQL does not expose SQL Server's U mode or intent-lock hierarchy under those names.

# Granularity

The engine can lock at several sizes, and the choice is a direct trade of concurrency against overhead:

- **Row or index key** (SQL Server `RID`/`KEY`, PostgreSQL row locks) — the finest ordinary DML target. Different rows can proceed independently when no coarser or range constraint overlaps, but they can still conflict through a page/table lock, key-range protection, unique-index insertion, foreign-key checks, or escalation. Each fine lock also costs tracking work. PostgreSQL records ordinary row-lock ownership in tuple metadata rather than one shared-memory lock entry per row.
- **Page** — an intermediate SQL Server resource covering an 8 KB data or index page. Fewer lock structures are needed, but operations on different rows conflict when their incompatible locks cover the same page. PostgreSQL does not expose page locks as the ordinary row-locking unit.
- **HoBT and table** — a SQL Server HoBT is one heap or one B-tree, so a partitioned table can have several HoBTs. A table lock covers the table and all its heaps and indexes. Escalation can target a HoBT when `LOCK_ESCALATION = AUTO` on a partitioned table. Otherwise it normally targets the table.
- **Database and other resources** — the engine also locks metadata, schema, allocation, files, and the database. These are separate lockable resources, not a simple level above every row access.

Fine-grained locks allow unrelated rows to proceed but consume more lock-manager memory. Coarse locks are cheaper to track and create wider contention. The optimizer and lock manager can choose an initial granularity, and SQL Server may later replace many fine locks with a coarser lock through escalation.

# Concurrent Schedule and Predicate Protection

Without row-versioned reads or SQL Server's lock-after-qualification optimization, one lock-based `READ COMMITTED` schedule looks like this:

| Time | Transaction A | Transaction B | Lock result |
| --- | --- | --- | --- |
| 1 | `BEGIN; UPDATE accounts SET balance = balance - 100 WHERE id = 7;` |  | A holds X on account 7 |
| 2 |  | `SELECT balance FROM accounts WHERE id = 7;` | B requests S and waits on A's X |
| 3 | `COMMIT;` |  | A releases X |
| 4 |  | The `SELECT` completes | B can read the committed value |

Row locks cover rows that already exist, but a serializable predicate also has to protect the *gaps*. If A reads `WHERE account_id BETWEEN 100 AND 199`, B must not insert account 150 and create a phantom before A commits. Engines enforce that boundary with key-range or predicate protection, or detect the dangerous dependency through a serializable MVCC scheme. Locking only the rows returned by the first read is insufficient.

# Lock Escalation

SQL Server considers **escalation** after a statement acquires roughly 5,000 locks on one table or index, and it can also react to lock-memory pressure. Escalation replaces many row, key, or page locks with a table lock, or with a HoBT lock when partition-level escalation is configured. The exact attempt and result depend on conflicting locks and current memory conditions.

The cost appears abruptly. A table lock can block transactions that touch rows outside the original range, so a large `UPDATE` or `DELETE` may turn local contention into a table-wide queue. SQL Server allows `LOCK_ESCALATION` configuration per table, but disabling escalation trades that queueing risk for higher lock-memory use. Batching the operation and keeping transactions short is usually the first control to evaluate.

PostgreSQL does not escalate row locks into table locks. Row-lock ownership is recorded in tuple state rather than one ordinary shared-memory lock entry per row. Table and other heavyweight locks do use the shared lock table, whose capacity is influenced by `max_locks_per_transaction`. A transaction touching many distinct database objects can still exhaust that capacity.

# Latch Vs Lock

A **lock** protects a logical transactional resource such as a key, row, or table. Its lifetime follows the lock mode and isolation contract. A **latch** protects an in-memory structure while the engine performs a short physical operation such as reading or changing a buffer page. Latch ownership is not tied to the transaction lifetime. Lock waits therefore point to transactional contention, while latch waits point to contention inside storage-engine memory structures.

# Optimistic Concurrency Control

Pessimistic control reserves data before a decision. Optimistic control lets callers work concurrently and rejects a stale conditional write. Both can prevent lost updates, but they put the cost in different places. The database still takes a short row lock while executing an optimistic `UPDATE`. “Optimistic” describes the application protocol, not a lock-free engine.

Suppose an order starts at `quantity = 5`, `version = 17`. Two callers read it. The first update succeeds and advances the version. The second affects zero rows because its predicate is stale:

```sql
UPDATE orders
SET quantity = 6,
    version = version + 1
WHERE id = 42
  AND version = 17;
```

Exactly one writer can change version 17. The loser must reload, merge, reject, or recompute. Zero affected rows is a conflict result, not a successful no-op.

The application workflow is explicit:

1. Return the version with the resource, often as an HTTP `ETag`.
2. Require it on mutation, for example through `If-Match`.
3. Execute one conditional `UPDATE` containing the identity and version predicate.
4. Treat zero affected rows as a conflict.
5. Recompute from current state or report the conflict. When an HTTP `If-Match` precondition evaluates false, the response is normally `412 Precondition Failed`. RFC 9110 permits a successful `2xx` response instead when the server verifies that the requested state change has already succeeded. `409 Conflict` remains appropriate for an application conflict not expressed as the failed precondition.

Blind retry is safe only for an idempotent operation or a calculation rerun from fresh state. Replaying “set quantity to 6” after another writer changed the business state can overwrite a valid decision.

```sql
BEGIN;
SELECT quantity
FROM orders
WHERE id = 42
FOR UPDATE;

UPDATE orders SET quantity = 6 WHERE id = 42;
COMMIT;
```

`FOR UPDATE` makes the second writer wait before deciding. This fits frequent conflicts or expensive recomputation, but the transaction must remain short.

| Boundary | Pessimistic | Optimistic |
| --- | --- | --- |
| Conflict timing | Wait before the write decision | Detect at the conditional write |
| Strong fit | Frequent conflicts, costly recomputation | Rare conflicts, cheap recomputation |
| Main failure cost | Blocking and deadlocks | Wasted work and retry storms |
| Engine locking | Holds a reservation while work proceeds | Still locks briefly during the `UPDATE` |

# Blocking Vs Deadlock

**Blocking** is the normal consequence of locking: transaction B requests a lock incompatible with one A already holds, so B waits. It is not necessarily temporary or self-resolving. An abandoned session or open transaction can retain the lock indefinitely until the client commits or rolls back, a lock or statement timeout or cancellation fires, the connection is terminated, or an operator intervenes. Monitor blocker age and transaction age, not only waiter count.

A **deadlock** is the pathological case: a **cycle** in the wait-for graph — A holds a lock B needs while B holds a lock A needs — so neither can ever proceed and no amount of waiting resolves it. The engine detects the cycle and chooses a victim. SQL Server raises error 1205 and rolls back the victim transaction. PostgreSQL reports `deadlock detected`, aborts the transaction, and rejects later statements until the application rolls it back. Retry the whole transaction, not only the failed statement. The linked [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks|Deadlocks]] note covers detection, victim selection, consistent access ordering, and retrying the whole transaction.

# References

- [SQL Server transaction locking and row versioning](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide)
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [RFC 9110: Conditional Requests](https://www.rfc-editor.org/rfc/rfc9110.html#name-conditional-requests)
