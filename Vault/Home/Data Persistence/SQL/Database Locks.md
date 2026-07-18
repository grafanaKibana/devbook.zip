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

# Intro

A database lock is one mechanism a storage engine uses to serialize conflicting access so concurrent transactions satisfy the selected [[Home/Data Persistence/ACID|ACID]] isolation level. In a lock-based read path, an incompatible reader or writer waits; an MVCC read may instead use a committed version while writers still take locks. Exclusive data locks normally survive to transaction end. Shared-lock duration is engine and mode specific: SQL Server's locking `READ COMMITTED` usually releases read locks after the statement, while `REPEATABLE READ` and `SERIALIZABLE` retain the relevant protection to transaction end. Row-versioned `READ COMMITTED`, PostgreSQL MVCC reads, and serializable schemes based on dependency detection do not follow that shared-lock timeline.

Three contrasts frame the whole topic:

- **Locks vs MVCC.** Locking blocks incompatible access to a logical resource; **MVCC** (Multi-Version Concurrency Control) keeps committed row versions so a reader can use an appropriate snapshot instead of blocking a writer (see [[Home/Data Persistence/ACID|ACID]]). MVCC is a version-management mechanism, not a synonym for optimistic concurrency: PostgreSQL still uses locks for write-write conflicts and `SELECT ... FOR UPDATE`, while SQL Server can combine row versioning for reads with locks for writes.
- **Pessimistic vs optimistic conflict handling.** Pessimistic code acquires a lock before the protected change. Optimistic code proceeds without that preemptive lock, then detects a conflicting version at write or commit and retries or rejects the change. Either policy can run on an MVCC engine.
- **Engine locks vs in-process locks.** This note is about the *database-engine* layer: a lock manager inside the server, shared by every client connection, protecting rows and tables. That is a different layer from the in-process `lock`/`Monitor` story in [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Locking|Locking]], which protects in-memory objects inside a single .NET process. A CLR `lock` never crosses the process boundary; a database lock is the engine's own bookkeeping and is invisible to your application code except as waiting.

## Lock modes

A lock mode encodes *what* a transaction intends to do, and the engine grants a new lock only if its mode is **compatible** with every lock already held on that resource. Three basic modes cover reads and writes, and an intent hierarchy makes coarse-grained checks cheap.

- **Shared (S)** — taken by locking reads. Many transactions can hold S on the same resource simultaneously. S blocks a writer (X) until the lock is released, but an MVCC snapshot read may not request a row-level S lock at all.
- **Exclusive (X)** — taken to modify (insert/update/delete). Among the basic data modes on the same resource, X conflicts with S, U, and another X: while a transaction holds X on a row, no locking reader or other writer can take that row.
- **Update (U)** — SQL Server uses U to prevent a specific deadlock in *read-then-write* operations. An `UPDATE` first scans to find the qualifying row, then modifies it. If that scan took S, two transactions could both hold S and then both try to upgrade S→X, each blocked by the other's S. Only one transaction may hold U on a resource, while U remains compatible with S during the search phase. It converts to X for the write, preventing the upgrade race.

The basic SQL Server compatibility that makes U work, in one matrix (rows = held, columns = requested):

| held \ requested | S | U | X |
| --- | --- | --- | --- |
| **S** | ✓ | ✓ | ✗ |
| **U** | ✓ | ✗ | ✗ |
| **X** | ✗ | ✗ | ✗ |

**Intent locks (IS / IX / SIX)** solve a different problem: efficient conflict detection *across granularities*. Suppose a transaction holds X locks on 500 individual rows of a table, and another transaction now wants to lock the **whole table** exclusively (say, to rebuild it). How does the engine know the table is busy without walking all 500 row locks? It doesn't have to — because before taking a row-level X, the first transaction also placed an **intent** lock on the table above it. An **IS** ("intent shared") on the table means "I hold, or intend to hold, S locks somewhere below." **IX** means the same for X locks. **SIX** is the combination "S on the whole resource plus IX for some sub-parts" — the mode for *scanning a whole table while updating a few of its rows*. Now the table-level request just checks one intent lock on the table: an IX on the table is incompatible with a table-level X, so the second transaction waits immediately, no row-lock scan required. Intent locks are the mechanism that lets a hierarchical lock manager answer coarse questions in `O(1)`.

PostgreSQL exposes a parallel but differently named vocabulary. Its **table-level** modes run from `ACCESS SHARE` (taken by a plain `SELECT`) up to `ACCESS EXCLUSIVE` (taken by `DROP`, `TRUNCATE`, and many `ALTER TABLE` forms), and its **row-level** modes are requested explicitly—`FOR SHARE`, `FOR KEY SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`. The compatibility model is comparable, but PostgreSQL does not expose SQL Server's U mode or intent-lock hierarchy under those names.

## Granularity

The engine can lock at several sizes, and the choice is a direct trade of concurrency against overhead:

- **Row or index key** (SQL Server `RID`/`KEY`, PostgreSQL row locks) — the finest ordinary DML target. Different rows can proceed independently when no coarser or range constraint overlaps, but they can still conflict through a page/table lock, key-range protection, unique-index insertion, foreign-key checks, or escalation. Each fine lock also costs tracking work; PostgreSQL records ordinary row-lock ownership in tuple metadata rather than one shared-memory lock entry per row.
- **Page** — an intermediate SQL Server resource covering an 8 KB data or index page. Fewer lock structures are needed, but operations on different rows conflict when their incompatible locks cover the same page. PostgreSQL does not expose page locks as the ordinary row-locking unit.
- **HoBT and table** — a SQL Server HoBT is one heap or one B-tree, so a partitioned table can have several HoBTs. A table lock covers the table and all its heaps and indexes. Escalation can target a HoBT when `LOCK_ESCALATION = AUTO` on a partitioned table; otherwise it normally targets the table.
- **Database and other resources** — the engine also locks metadata, schema, allocation, files, and the database. These are separate lockable resources, not a simple level above every row access.

Fine-grained locking maximizes concurrency at the price of many small locks (memory + management cost); coarse-grained locking is cheap to track but forces unrelated transactions to contend. The engine starts fine and coarsens only when the fine-grained bookkeeping gets expensive — which is exactly what escalation does.

## Concurrent schedule and predicate protection

With lock-based `READ COMMITTED`, one conflicting row schedule looks like this:

| Time | Transaction A | Transaction B | Lock result |
| --- | --- | --- | --- |
| 1 | `BEGIN; UPDATE accounts SET balance = balance - 100 WHERE id = 7;` |  | A holds X on account 7 |
| 2 |  | `SELECT balance FROM accounts WHERE id = 7;` | B requests S and waits on A's X |
| 3 | `COMMIT;` |  | A releases X |
| 4 |  | The `SELECT` completes | B can read the committed value |

Row locks cover rows that already exist, but a serializable predicate also has to protect the *gaps*. If A reads `WHERE account_id BETWEEN 100 AND 199`, B must not insert account 150 and create a phantom before A commits. Engines enforce that boundary with key-range or predicate protection, or detect the dangerous dependency through a serializable MVCC scheme. Locking only the rows returned by the first read is insufficient.

## Lock escalation

SQL Server acquires fine-grained locks first, then **escalates** many of them into a single coarse lock when a statement holds too many. The default trigger is roughly **5,000 locks on one object in a single statement**, or when total lock memory crosses a server-wide threshold. Escalation converts thousands of row/page locks on a table into one table-level lock: it slashes the memory and management cost of holding all those tiny locks.

The danger is the **concurrency cliff**. The instant those 5,000 row locks become one table lock, the transaction is holding the *entire table* — every other transaction that wanted an unrelated row now blocks, even though the escalating transaction only cares about a fraction of the rows. A large `UPDATE` or `DELETE` that quietly escalates can stall an otherwise-healthy workload. The engine decides based on lock *count per object* and *global lock memory pressure*, and SQL Server lets you disable it per table (`ALTER TABLE ... SET (LOCK_ESCALATION = DISABLE)`) when a table is hot enough that a table lock is worse than the memory cost of keeping row locks.

Notably, **PostgreSQL does not escalate locks at all.** Row locks live in the tuple itself (in the `xmax` field), so holding a million of them costs no shared-memory lock entries; heavier locks live in a fixed-size shared lock table bounded by `max_locks_per_transaction`. The design choice is the mirror image: PostgreSQL never surprises you with a table lock, but a transaction that takes an unusual number of *object-level* locks can exhaust the shared lock table instead.

## Latch vs lock

Latches and locks are easy to confuse because both serialize access, but they operate at different layers and different timescales. A **lock** is *logical*: it protects a row or table as a transactional resource and is registered in the lock manager. Its duration depends on mode and isolation: write locks normally last to transaction end, while a shared read lock under `READ COMMITTED` can be released after the statement. A **latch** is *physical*: a lightweight, short-lived primitive that protects an **in-memory structure** (a buffer-pool page, an index's internal node) only for the duration of the physical operation touching it — reading bytes out of a page, splitting an index node. A latch is held for microseconds, is never tied to your transaction's lifetime, and exists to keep memory internally consistent while a page is being read or modified. When you see *lock* waits you are looking at transactional contention (isolation); when you see *latch* waits you are looking at memory-structure contention (physical throughput).

## Pessimistic and Optimistic Conflict Control

Pessimistic control reserves the data before making a decision; optimistic control lets callers work concurrently and rejects a stale conditional write. Both can prevent lost updates, but they move the waiting and retry cost to different places. [[Home/Data Persistence/SQL/Optimistic Concurrency Control|Optimistic Concurrency Control]] owns the version predicate, conflict workflow, and concrete comparison. The database still takes a short row lock while executing an optimistic `UPDATE`; “optimistic” describes the application protocol, not a lock-free engine.

## Blocking vs deadlock

**Blocking** is the normal consequence of locking: transaction B requests a lock incompatible with one A already holds, so B waits. It is not necessarily temporary or self-resolving. An abandoned session or open transaction can retain the lock indefinitely until the client commits or rolls back, a lock or statement timeout or cancellation fires, the connection is terminated, or an operator intervenes. Monitor blocker age and transaction age, not only waiter count.

A **deadlock** is the pathological case: a **cycle** in the wait-for graph — A holds a lock B needs while B holds a lock A needs — so neither can ever proceed and no amount of waiting resolves it. The engine detects the cycle and chooses a victim. SQL Server raises error 1205 and rolls back the victim transaction. PostgreSQL reports `deadlock detected`, aborts the transaction, and rejects later statements until the application rolls it back; retry the whole transaction, not only the failed statement. That failure mode — detection, victim selection, and consistent access ordering — is owned by [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks|Deadlocks]].

## Questions

> [!QUESTION]- When would you use an Update (U) lock instead of a Shared (S) lock?
> During the *search phase* of a read-then-write operation such as an `UPDATE` or `DELETE` that must scan to find the row it will modify. If that scan took an S lock, two transactions could both hold S on the target row and then both try to upgrade S→X, each blocked by the other's S — an instant deadlock. A U lock prevents it: only one transaction may hold U on a resource at a time (so the upgrade race can't form), yet U is compatible with existing S locks (so it doesn't block concurrent readers during the scan). When the write finally happens, U converts to X.

> [!QUESTION]- Locks vs MVCC — how does each enforce isolation?
> Locking blocks incompatible access, so a reader may wait for a writer under lock-based isolation. MVCC instead keeps older committed versions and can serve the reader from a snapshot, removing most read-write blocking. MVCC is not inherently optimistic: the same engine can use versioned reads, pessimistic write locks, and optimistic version checks. Locks add waiting and can deadlock; MVCC adds version bookkeeping (PostgreSQL's `VACUUM`, SQL Server's `tempdb` version store).

> [!QUESTION]- Why do intent locks exist, and what does lock escalation trade away?
> Intent locks (IS/IX/SIX) let a hierarchical lock manager detect conflicts *across granularities* cheaply: before locking a row, a transaction places an intent lock on the table above it, so a request for a table-level lock can check that single intent lock instead of scanning every row lock. Lock escalation goes the other way — it collapses thousands of fine row/page locks into one coarse table lock to reclaim lock-manager memory. The trade is concurrency: the escalated transaction now holds the whole table, so unrelated transactions that only wanted other rows suddenly block — the "concurrency cliff."

## References

- [Transaction locking and row versioning guide (Microsoft Learn)](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide) — SQL Server's authoritative reference for lock modes (S/U/X, the IS/IX/SIX intent hierarchy), lockable resource granularities, lock escalation thresholds, and the latch-vs-lock distinction; the primary source for most of this note.
- [Explicit Locking (PostgreSQL docs)](https://www.postgresql.org/docs/current/explicit-locking.html) — PostgreSQL's table-level and row-level lock modes, their compatibility rules, why an MVCC engine takes so few read locks, and the fact that it performs no lock escalation.
- [Transaction isolation (PostgreSQL docs)](https://www.postgresql.org/docs/current/transaction-iso.html) — primary reference for concurrent-update behavior and serialization failures that applications must retry.
- [Differences among database locks (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-are-the-differences-among-database-locks.md) — editorial lock-mode comparison; its inconsistent infographic is intentionally not reproduced.
- [Pessimistic versus optimistic locking (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/pessimistic-vs-optimistic-locking.md) — editorial comparison used for the policy boundary; its false-absolute infographic is intentionally omitted.
