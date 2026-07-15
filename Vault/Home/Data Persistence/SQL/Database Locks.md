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

A database lock is how the storage engine serializes conflicting access to the same data so that concurrent transactions still see the isolation guaranteed by [[ACID]]. When two transactions want the same row and at least one is writing, the engine cannot let both proceed freely; it grants a lock to one and makes the other wait until the first commits or rolls back. Write (exclusive) locks are held to the end of the **transaction** and released at commit/abort; read (shared) lock duration depends on the isolation level — released as soon as the read finishes under Read Committed, but held to commit under Repeatable Read and higher. That is what ties locking to isolation: a higher level simply holds locks longer and covers more.

Two contrasts frame the whole topic:

- **Locks vs MVCC.** Locking is the *pessimistic* way to enforce isolation — block first, so a conflict never happens. **MVCC** (Multi-Version Concurrency Control) is the *optimistic* alternative: instead of blocking a reader, the engine keeps an older committed *version* of the row and lets the reader see that, so readers don't take locks and don't block writers (see the MVCC discussion in [[ACID]]). PostgreSQL is MVCC-first, so ordinary `SELECT`s take no row locks at all; SQL Server is lock-based by default under `READ COMMITTED` but switches to versioning when you enable snapshot isolation. Even an MVCC engine still uses locks for the *write* side and for `SELECT ... FOR UPDATE` — versioning removes read-write blocking, not write-write blocking.
- **Engine locks vs in-process locks.** This note is about the *database-engine* layer: a lock manager inside the server, shared by every client connection, protecting rows and tables. That is a different layer from the in-process `lock`/`Monitor` story in [[Locking]], which protects in-memory objects inside a single .NET process. A CLR `lock` never crosses the process boundary; a database lock is the engine's own bookkeeping and is invisible to your application code except as waiting.

## Lock modes

A lock mode encodes *what* a transaction intends to do, and the engine grants a new lock only if its mode is **compatible** with every lock already held on that resource. Three basic modes cover reads and writes, and an intent hierarchy makes coarse-grained checks cheap.

- **Shared (S)** — taken to read. Many transactions can hold S on the same row simultaneously because concurrent reads don't conflict. S blocks a writer (X) from taking the row until every reader is done.
- **Exclusive (X)** — taken to modify (insert/update/delete). X is incompatible with *every* other mode, including S: while a transaction holds X on a row, no one else may read (under lock-based isolation) or write it.
- **Update (U)** — the subtle one. It exists to prevent a specific self-inflicted deadlock in *read-then-write* operations. An `UPDATE` first has to **scan** to find the qualifying row, then modify it. If that scan took an S lock, two transactions updating the same row would both hold S, and both would then try to upgrade S→X — each blocked by the other's S. A U lock breaks this: only **one** transaction may hold U on a resource at a time, but U is compatible with existing S locks, so it doesn't block readers during the search phase. When the transaction actually writes, U converts to X. Because only one U exists, the deadly upgrade race can't form.

The compatibility that makes U work, in one matrix (rows = held, columns = requested):

| held \ requested | S | U | X |
| --- | --- | --- | --- |
| **S** | ✓ | ✓ | ✗ |
| **U** | ✓ | ✗ | ✗ |
| **X** | ✗ | ✗ | ✗ |

**Intent locks (IS / IX / SIX)** solve a different problem: efficient conflict detection *across granularities*. Suppose a transaction holds X locks on 500 individual rows of a table, and another transaction now wants to lock the **whole table** exclusively (say, to rebuild it). How does the engine know the table is busy without walking all 500 row locks? It doesn't have to — because before taking a row-level X, the first transaction also placed an **intent** lock on the table above it. An **IS** ("intent shared") on the table means "I hold, or intend to hold, S locks somewhere below." **IX** means the same for X locks. **SIX** is the combination "S on the whole resource plus IX for some sub-parts" — the mode for *scanning a whole table while updating a few of its rows*. Now the table-level request just checks one intent lock on the table: an IX on the table is incompatible with a table-level X, so the second transaction waits immediately, no row-lock scan required. Intent locks are the mechanism that lets a hierarchical lock manager answer coarse questions in `O(1)`.

PostgreSQL exposes a parallel but differently-named vocabulary. Its **table-level** modes run from `ACCESS SHARE` (taken by a plain `SELECT`) up to `ACCESS EXCLUSIVE` (taken by `DROP`, `TRUNCATE`, most `ALTER TABLE`), and its **row-level** modes are requested explicitly — `FOR SHARE`, `FOR KEY SHARE`, `FOR NO KEY UPDATE`, `FOR UPDATE`. The names differ but the idea is identical: a mode declares intent, and the engine grants only compatible modes.

## Granularity

The engine can lock at several sizes, and the choice is a direct trade of concurrency against overhead:

- **Row** (SQL Server `RID`/`KEY`, PostgreSQL row locks) — the finest. Two transactions touching different rows of the same table never conflict, so concurrency is maximal. The cost is that each lock is a separate entry in the lock manager, consuming memory and CPU to acquire, track, and release.
- **Page** — an intermediate size in SQL Server (one lock covers ~8 KB of rows). Fewer lock structures than per-row, but a transaction now conflicts with anyone touching a co-located row on the same page. (PostgreSQL has no user-visible page locks for rows; it stores row locks in the tuple header itself.)
- **Table** — coarsest for normal DML. One lock covers everything, so lock overhead is negligible, but the whole table serializes: any conflicting access anywhere in the table waits.
- **Database / higher** — schema and maintenance operations lock at the object, `HoBT`, or database level.

Fine-grained locking maximizes concurrency at the price of many small locks (memory + management cost); coarse-grained locking is cheap to track but forces unrelated transactions to contend. The engine starts fine and coarsens only when the fine-grained bookkeeping gets expensive — which is exactly what escalation does.

## Lock escalation

SQL Server acquires fine-grained locks first, then **escalates** many of them into a single coarse lock when a statement holds too many. The default trigger is roughly **5,000 locks on one object in a single statement**, or when total lock memory crosses a server-wide threshold. Escalation converts thousands of row/page locks on a table into one table-level lock: it slashes the memory and management cost of holding all those tiny locks.

The danger is the **concurrency cliff**. The instant those 5,000 row locks become one table lock, the transaction is holding the *entire table* — every other transaction that wanted an unrelated row now blocks, even though the escalating transaction only cares about a fraction of the rows. A large `UPDATE` or `DELETE` that quietly escalates can stall an otherwise-healthy workload. The engine decides based on lock *count per object* and *global lock memory pressure*, and SQL Server lets you disable it per table (`ALTER TABLE ... SET (LOCK_ESCALATION = DISABLE)`) when a table is hot enough that a table lock is worse than the memory cost of keeping row locks.

Notably, **PostgreSQL does not escalate locks at all.** Row locks live in the tuple itself (in the `xmax` field), so holding a million of them costs no shared-memory lock entries; heavier locks live in a fixed-size shared lock table bounded by `max_locks_per_transaction`. The design choice is the mirror image: PostgreSQL never surprises you with a table lock, but a transaction that takes an unusual number of *object-level* locks can exhaust the shared lock table instead.

## Latch vs lock

Latches and locks are easy to confuse because both serialize access, but they operate at different layers and different timescales. A **lock** is *logical*: it protects a row or table as a transactional resource, is registered in the lock manager, and is held until the transaction ends — its job is isolation. A **latch** is *physical*: a lightweight, short-lived primitive that protects an **in-memory structure** (a buffer-pool page, an index's internal node) only for the duration of the physical operation touching it — reading bytes out of a page, splitting an index node. A latch is held for microseconds, is never tied to your transaction's lifetime, and exists to keep memory internally consistent while a page is being read or modified. When you see *lock* waits you are looking at transactional contention (isolation); when you see *latch* waits you are looking at memory-structure contention (physical throughput).

## Blocking vs deadlock

**Blocking** is the normal, healthy consequence of locking: transaction B requests a lock in a mode incompatible with one B already holds, so B waits until the holder commits or rolls back and releases it. Blocking is temporary and self-resolving — it's simply the queue that enforces isolation. Most "the database is slow" incidents are long blocking chains, not deadlocks.

A **deadlock** is the pathological case: a **cycle** in the wait-for graph — A holds a lock B needs while B holds a lock A needs — so neither can ever proceed and no amount of waiting resolves it. The engine runs a background detector that finds the cycle and aborts one transaction as the **victim** (SQL Server raises error 1205; PostgreSQL cancels one statement with a *deadlock detected* error), releasing its locks so the survivor continues. Because the victim's work is rolled back, transactional code must be **retry-safe**. That failure mode — how the cycle is detected, how the victim is chosen, and how to avoid it with consistent access ordering — is owned by [[Deadlocks]]; this note stops at the boundary.

## Questions

> [!QUESTION]- When would you use an Update (U) lock instead of a Shared (S) lock?
> During the *search phase* of a read-then-write operation such as an `UPDATE` or `DELETE` that must scan to find the row it will modify. If that scan took an S lock, two transactions could both hold S on the target row and then both try to upgrade S→X, each blocked by the other's S — an instant deadlock. A U lock prevents it: only one transaction may hold U on a resource at a time (so the upgrade race can't form), yet U is compatible with existing S locks (so it doesn't block concurrent readers during the scan). When the write finally happens, U converts to X.

> [!QUESTION]- Locks vs MVCC — how does each enforce isolation?
> Locking is pessimistic: it blocks a conflicting access before it can happen, so a reader waits for a writer (and vice versa) under lock-based isolation. MVCC is optimistic: instead of blocking a reader, the engine keeps older committed *versions* of each row and serves the reader the version that was committed when its transaction began, so **readers never block writers and writers never block readers**. The costs differ too — locks add waiting and can deadlock; MVCC adds version bookkeeping (PostgreSQL's `VACUUM`, SQL Server's `tempdb` version store). Even MVCC engines still lock for write-write conflicts and for explicit `SELECT ... FOR UPDATE`.

> [!QUESTION]- Why do intent locks exist, and what does lock escalation trade away?
> Intent locks (IS/IX/SIX) let a hierarchical lock manager detect conflicts *across granularities* cheaply: before locking a row, a transaction places an intent lock on the table above it, so a request for a table-level lock can check that single intent lock instead of scanning every row lock. Lock escalation goes the other way — it collapses thousands of fine row/page locks into one coarse table lock to reclaim lock-manager memory. The trade is concurrency: the escalated transaction now holds the whole table, so unrelated transactions that only wanted other rows suddenly block — the "concurrency cliff."

## References

- [Transaction locking and row versioning guide (Microsoft Learn)](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide) — SQL Server's authoritative reference for lock modes (S/U/X, the IS/IX/SIX intent hierarchy), lockable resource granularities, lock escalation thresholds, and the latch-vs-lock distinction; the primary source for most of this note.
- [Explicit Locking (PostgreSQL docs)](https://www.postgresql.org/docs/current/explicit-locking.html) — PostgreSQL's table-level and row-level lock modes, their compatibility rules, why an MVCC engine takes so few read locks, and the fact that it performs no lock escalation.
