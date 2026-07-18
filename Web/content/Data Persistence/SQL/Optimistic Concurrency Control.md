---
publish: true
created: 2026-07-16T14:49:26.541Z
modified: 2026-07-16T14:49:26.541Z
published: 2026-07-16T14:49:26.541Z
topic:
  - Data Persistence
subtopic:
  - SQL
summary: Detecting stale writes with a version predicate instead of holding a lock while callers think.
level:
  - "4"
priority: High
status: Creation
---

# Intro

Optimistic concurrency control lets several callers read the same row, then accepts a write only if the row still has the version that caller observed. It fits low-conflict workflows where holding a database lock across application work would be expensive. The loser must reload, merge, reject, or recompute; a zero-row conditional update is a concurrency result, not a successful no-op.

## Lost Update

An order starts at `quantity = 5`, `version = 17`. A and B both read it. A writes 6. If B then writes 7 without checking the version, A's committed update disappears.

```sql
UPDATE orders
SET quantity = 6,
    version = version + 1
WHERE id = 42
  AND version = 17;
```

Exactly one concurrent writer can change version 17. The winner affects one row. The loser affects zero rows and must read the new version before deciding what to do.

## Conflict Workflow

1. Return the version with the resource, often as an HTTP `ETag`.
2. Require it on mutation, for example through `If-Match`.
3. Execute one conditional `UPDATE` containing both the identity and version predicate.
4. Treat zero affected rows as a conflict, not as success.
5. Retry only by recomputing from current state, or return `409 Conflict` / `412 Precondition Failed` so the user can merge.

Blind retries are safe only for idempotent operations or calculations that are rerun from fresh state. Replaying “set quantity to 6” after another writer changed the business state can overwrite a valid decision.

## Pessimistic Comparison

```sql
BEGIN;
SELECT quantity
FROM orders
WHERE id = 42
FOR UPDATE;

UPDATE orders SET quantity = 6 WHERE id = 42;
COMMIT;
```

`FOR UPDATE` makes the second writer wait before it decides. This is easier when conflicts are frequent or retrying is expensive, but the transaction must stay short. Optimistic control avoids the read-and-think lock interval and instead pays for wasted work and conflict handling.

| Boundary | Pessimistic | Optimistic |
|---|---|---|
| Conflict timing | Wait before the write decision | Detect at conditional write |
| Strong fit | Frequent conflicts, costly recomputation | Rare conflicts, cheap recomputation |
| Main failure cost | Blocking and deadlocks | Wasted work and retry storms |
| Engine locking | Holds reservation while work proceeds | Still locks briefly during the `UPDATE` |

## References

- [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) — primary reference for `SELECT ... FOR UPDATE` and row-lock conflicts.
- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — explains concurrent-update behavior and serialization failures that require whole-transaction retry.
- [HTTP conditional requests](https://www.rfc-editor.org/rfc/rfc9110.html#name-conditional-requests) — standard semantics for validators such as `ETag` and `If-Match` at an API boundary.
