---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Traversing changing API collections with stable ordering, opaque cursors, and explicit consistency."
level:
  - "3"
priority: High
status: Creation
publish: false
---

# Intro

Pagination limits response size; it does not automatically make a query cheap or provide a consistent snapshot. The API must define a stable order, page boundary, cursor scope, and what concurrent inserts, updates, and deletes can do while a client traverses the collection.

## Keyset Cursor

For orders sorted newest first, use a unique composite order such as `(created_at DESC, id DESC)`. The cursor carries the last returned pair:

```http
GET /orders?status=open&limit=50&after=eyJjcmVhdGVkQXQiOiIyMDI2LTA3LTE2VDEwOjAwOjAwWiIsImlkIjo5MDF9.sig
```

```sql
SELECT id, created_at, total
FROM orders
WHERE tenant_id = @tenantId
  AND status = @status
  AND (created_at, id) < (@createdAt, @id)
ORDER BY created_at DESC, id DESC
LIMIT 51;
```

Fetch one extra row to determine whether another page exists. The unique `id` tie-breaker prevents an ambiguous boundary when several rows share a timestamp. The index should begin with equality filters and then the ordered keys, for example `(tenant_id, status, created_at DESC, id DESC)`.

Encode and integrity-protect the cursor rather than exposing an editable database token. Bind it to tenant, principal or authorization scope, filters, sort order, direction, page-size policy, and expiry. A cursor from `status=open` must not be reusable for `status=closed`.

## Consistency Contract

A cursor identifies a position, not a snapshot. With live keyset traversal:

- later inserts before the cursor may not appear in subsequent pages;
- deletes can remove rows the client has not reached;
- an update to the sort key can move a row across the boundary.

If exact snapshot traversal matters, include a snapshot/version boundary or query storage that can retain a snapshot for the traversal lifetime. That costs storage and retention and needs an expiry response when the snapshot is gone.

For backward traversal, encode direction and boundary explicitly. Query in the direction that uses the index, then reverse the returned rows if the presentation order requires it.

## Offset versus Keyset

| Need | Offset/page number | Keyset cursor |
| --- | --- | --- |
| Direct jump to page 20 | Natural | Not natural |
| Stable deep traversal under inserts | Rows can shift | Stable relative boundary |
| Deep query cost | Often scans/skips earlier rows | Seeks from indexed boundary |
| Human-readable navigation | Easy | Cursor is opaque |

Use offset for small, stable administrative lists and approximate page jumps. Use keyset for large or changing collections. In both cases, cap page size and total backend work independently.

## References

- [Microsoft REST API Guidelines: Collections](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#collections) — cursor, continuation, page-size, and collection response guidance.
- [PostgreSQL row constructor comparison](https://www.postgresql.org/docs/current/functions-comparisons.html#ROW-WISE-COMPARISON) — primary semantics for the composite boundary used in the SQL example.
- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110) — defines safe retrieval and URI query semantics that the pagination contract builds on.
