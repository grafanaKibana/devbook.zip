---
publish: true
created: 2026-07-18T08:17:49.156Z
modified: 2026-07-18T09:40:42.271Z
published: 2026-07-18T09:40:42.271Z
topic:
  - Networks
subtopic:
  - Protocols
summary: A resource-oriented architectural style built from stateless messages and a uniform interface.
level:
  - "3"
priority: High
status: Done
---

# Intro

REST is an architectural style for networked systems, not a synonym for JSON over HTTP. It constrains interactions around stable resource identities, a uniform interface, and explicit cache/representation behavior so clients, servers, and intermediaries can evolve with fewer assumptions.

Use REST when the problem is broad interoperability, stable resource contracts, and cacheable reads. Use GraphQL when clients need flexible projections with a robust governance model, and gRPC when schema-coupled service-to-service contracts and streaming are the first-class need.

## Constraint and Method Boundaries

REST is mostly about the contract boundaries, not framework syntax:

- Client-server separation
- Stateless request handling
- Cacheable responses
- Uniform interface and media semantics
- Layered intermediaries
- Optional code on demand

```http
PUT /orders/42 HTTP/1.1
Content-Type: application/json
If-Match: "order-v7"

{"id":42,"status":"shipped"}
```

`PUT` is idempotent and may be retried after a communication failure. With `If-Match`, however, a successful first attempt can advance the entity tag so the retry returns `412 Precondition Failed`. That response does not prove the first attempt failed; reconcile the current representation before deciding the next action.

Use status contracts that describe the real boundary:

- `201` plus `Location` for creation
- `409` for state conflict
- `412` for failed preconditions
- `422` for instruction-valid but unprocessable content
- `429`/`503` when retry policy applies

## API Design and Compatibility Surface

Resource naming is the external boundary; framework choice is local.

| Intent | HTTP contract | Boundary rule |
| --- | --- | --- |
| Create a cart | `POST /carts` with `Idempotency-Key` | Persist idempotency key, request fingerprint, and prior result with the created resource |
| Read a cart | `GET /carts/{cartId}` | Authorize the specific resource and emit validators like `ETag` |
| Replace known data | `PUT /carts/{cartId}/items/{sku}` | Preserve intended meaning through idempotent contracts |
| Patch mutable fields | `PATCH ...` with defined patch format and `If-Match` | Reject stale payloads with `412` |
| Delete cart | `DELETE /carts/{cartId}` | Define idempotent behavior and tombstone policy |
| Search carts | `GET /carts?owner=42&status=open&limit=50&after=...` | Bind pagination and filter state to authorization and principal |

A creation response uses `201 Created` and `Location` when the server creates a resource. Error responses use `application/problem+json` with stable problem type identifiers and avoid leaking whether another tenant's resource exists.

Idempotency keys solve an ambiguous retry only when their store is durable and scoped. The server must reject the same key with a different request fingerprint, return the original result for a completed request, and define expiry longer than the client's maximum retry window.

Compatibility strategy:

Prefer additive fields, tolerant readers, and new optional capabilities before versioning. A version is earned when old and new contracts cannot coexist safely.

| Strategy | Strength | Cost |
|---|---|---|
| Path version (`/v2/carts`) | Visible and easy to route | Duplicates resource lifetimes and links |
| Media type or header | Keeps resource URI stable | Harder discovery, gateway, and cache configuration |
| New resource or operation | Makes a genuinely new capability explicit | Clients may coordinate across old and new workflows |

Pick one strategy per API surface and publish deprecation, migration, and removal dates. Do not add `v1` before a real breaking change exists.

REST and GraphQL expose different control surfaces:

| Dimension | REST | [[GraphQL]] |
|---|---|---|
| Contract owner | Server owns resources and representations | Server owns schema; clients own operation documents |
| Cache key | Method, URL, and `Vary` work with generic caches | Arbitrary operations need persisted IDs or GraphQL-aware caches |
| Authorization | Checked per endpoint and resource | Checked through nested field and object resolution |
| Cost control | Endpoint work is comparatively predictable | Depth, aliases, list sizes, and resolver fan-out need budgets |
| Strong fit | Stable resource interactions and broad HTTP reach | Multiple clients need different graph projections |

Neither removes backend fan-out. Choose GraphQL only when selectable graph projections repay the schema governance and execution controls.

![[Assets/System Design 101/5032baef84adef8c53504b673533fcf11649adebbf0883b66d5199c997aca764.jpg]]

The visual is a design prompt, not a protocol mandate. `POST` becomes retry-safe only with durable idempotency handling, path versioning is one compatibility option, and action resources are legitimate when the operation is not a collection mutation.

## Pagination Contracts

Pagination limits response size and does not imply snapshot consistency.

Keyset traversal keeps cursor positions stable under concurrent writes when ordering is strict and total:

```sql
SELECT id, created_at, total
FROM orders
WHERE tenant_id = @tenantId
  AND status = @status
  AND (created_at, id) < (@createdAt, @id)
ORDER BY created_at DESC, id DESC
LIMIT 51;
```

```http
GET /orders?status=open&limit=50&after=eyJjcmVhdGVkQWQiOiIyMDI2LTA3LTE2VDEwOjAwOjAwWiIsImlkIjo5MDF9.sig
```

Encode cursor scope and policy (tenant, sort order, direction, filters, page-size limits). A cursor from one query shape must not be reused for another.

Fetch one extra row to determine whether another page exists. The unique `id` tie-breaker prevents an ambiguous boundary when rows share a timestamp. The index should begin with equality filters and then the ordered keys, for example `(tenant_id, status, created_at DESC, id DESC)`.

Encode and integrity-protect the cursor rather than exposing an editable database token. Bind it to tenant, principal or authorization scope, filters, sort order, direction, page-size policy, and expiry.

### Consistency contract

A cursor identifies a position, not a snapshot. With live keyset traversal:

- Later inserts before the cursor may not appear in subsequent pages.
- Deletes can remove rows the client has not reached.
- An update to the sort key can move a row across the boundary.

If exact snapshot traversal matters, include a snapshot or version boundary, or query storage that can retain a snapshot for the traversal lifetime. That costs storage and retention and needs an expiry response when the snapshot is gone.

For backward traversal, encode direction and boundary explicitly. Query in the direction that uses the index, then reverse returned rows if the presentation order requires it.

| Need | Offset or page number | Keyset cursor |
|---|---|---|
| Direct jump to page 20 | Natural | Not natural |
| Stable deep traversal under inserts | Rows can shift | Stable relative boundary |
| Deep query cost | Often scans or skips earlier rows | Seeks from indexed boundary |
| Human-readable navigation | Easy | Cursor is opaque |

Use offset for small, stable administrative lists and approximate page jumps. Use keyset for large or changing collections. In both cases, cap page size and total backend work independently.

## Implementation Boundary (ASP.NET Core)

Framework mapping is mechanical; contract enforcement is architectural:

```csharp
app.MapGet("/api/orders/{id:int}", async (
    int id,
    AppDbContext db,
    CancellationToken ct) =>
    await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct) is { } order
        ? Results.Ok(order)
        : Results.NotFound());

app.MapPost("/api/orders", async (
    CreateOrderDto request,
    AppDbContext db,
    CancellationToken ct) =>
{
    var order = new Order
    {
        CustomerId = request.CustomerId,
        Total = request.Total,
        Currency = request.Currency
    };

    db.Orders.Add(order);
    await db.SaveChangesAsync(ct);
    return Results.Created($"/api/orders/{order.Id}", order);
});
```

A missing resource returns `404`; creation returns `201` and a `Location` value. Production creation also needs authorization, input validation, problem details, and an idempotency contract before a caller may retry it.

```csharp
app.MapPut("/api/orders/{id:int}", async (
    int id,
    UpdateOrder request,
    HttpRequest http,
    AppDbContext db,
    CancellationToken ct) =>
{
    if (!http.Headers.TryGetValue("If-Match", out var raw) ||
        !long.TryParse(raw.ToString().Trim('"'), out var expectedVersion))
    {
        return Results.StatusCode(StatusCodes.Status428PreconditionRequired);
    }

    var affected = await db.Database.ExecuteSqlInterpolatedAsync($"""
        UPDATE orders
        SET shipping_address = {request.ShippingAddress}, version = version + 1
        WHERE id = {id} AND version = {expectedVersion}
        """, ct);

    return affected == 1
        ? Results.NoContent()
        : Results.StatusCode(StatusCodes.Status412PreconditionFailed);
});
```

Optimistic concurrency is the server-side boundary. Zero rows changed means the caller must reread and reconcile before retry.

Operational boundaries remain part of the resource contract:

- Pass request cancellation through database and dependency calls.
- Set request-body size and JSON-depth limits before deserialization work grows without bound.
- Return RFC 9457 problem details without exception traces or secret values.
- Measure dependency time and queue time separately from serialization time.
- Keep retries in the caller or a clearly owned resilience layer; a handler must not replay a non-idempotent downstream operation blindly.

## Uniform Interface and Richardson Levels

The REST uniform interface has four parts:

1. Stable URI references identify resources independently of one representation.
2. A client manipulates a resource through a transferred representation.
3. Method, target, fields, media type, content, and status make messages self-descriptive.
4. Hypermedia controls can expose valid next transitions.

```json
{
  "id": 42,
  "status": "awaiting-payment",
  "links": [
    { "rel": "self", "href": "/orders/42", "method": "GET" },
    { "rel": "pay", "href": "/orders/42/payment", "method": "POST" },
    { "rel": "cancel", "href": "/orders/42/cancellation", "method": "PUT" }
  ]
}
```

The client still needs the media type and link-relation contract. Hypermedia reduces hard-coded workflow URLs; it does not eliminate versioning, authorization, or schema evolution.

The Richardson maturity model is a teaching model, not the definition of REST or a universal score:

| Level | Capability | Example | Missing boundary |
|---|---|---|---|
| 0 | One endpoint used as a message tunnel | `POST /api` with an action field | Resource identity and standard method semantics |
| 1 | Resource-oriented URI references | `/orders` and `/orders/42` | Methods and statuses may still be used as a tunnel |
| 2 | Methods, statuses, fields, and representations carry intent | `GET`, conditional `PUT`, `201`, `412` | Valid next transitions remain out-of-band |
| 3 | Hypermedia controls advertise available transitions | `pay`, `cancel`, and `track` links by order state | Client and server still share media-type and relation semantics |

Level 2 is common because it works with ordinary tooling and generated clients. Level 3 earns its cost when runtime discoverability, long-lived workflow evolution, or generic clients matter. A closed application whose client and server release together may get little value from hypermedia controls.

## Performance and Error Tradeoffs

Performance gains are not free; each one adds a contract:

- Cache: speedups with freshness/invalidation cost
- Compression: saves bandwidth, adds CPU
- Asynchronous work: hides latency, increases eventual-consistency and duplicate risk
- Queues/pools: control backpressure, require bounded retries and timeouts

![[Assets/System Design 101/74ee33387257a7a7e92285e69d60e6c69cc5c9166bc2277d8ccf94fe6806fc5b.png]]

Treat the visual as a technique inventory. Deep offset pagination can become slower, asynchronous logging needs a loss policy, caches need authorization-safe keys and invalidation, compression spends CPU, and pools need bounds and refresh behavior.

## API Style Comparison

| Style | Strong fit | Cost |
|---|---|---|
| REST | External or cross-team APIs with stable resources | Representation design, compatibility, and caching discipline |
| [[GraphQL]] | Selective projections for evolving clients | Query cost control, resolver load, authorization complexity |
| [[gRPC]] | Controlled service meshes with typed streaming | Schema/toolchain coupling and browser bridge needs |

No style removes governance; it changes where the cost is paid.

## Questions

> [!QUESTION]- What does a retry-time `412` mean for a conditional `PUT`?
> The first request may already have succeeded and changed the entity tag. The retry is allowed because `PUT` is idempotent, but its `412` cannot distinguish a successful first attempt from another writer's update. Read the current representation and reconcile before choosing a new precondition.

> [!QUESTION]- When should `POST` be idempotent in practice?
> Only when the client sends a durable idempotency key and the server enforces dedupe boundaries; otherwise `POST` can create duplicates.

## References

- [REST dissertation (Fielding)](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — architectural constraints and uniform interface.
- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110) — method, status, conditional, and header semantics for API contracts.
- [Problem Details for HTTP APIs (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) — machine-readable error payloads.
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines) — practical compatibility, pagination, and error conventions.
- [Microsoft REST API Guidelines: Collections](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#collections) — cursor, continuation, page-size, and collection response guidance.
- [PostgreSQL row constructor comparison](https://www.postgresql.org/docs/current/functions-comparisons.html#ROW-WISE-COMPARISON) — primary semantics for the composite boundary used in the SQL example.
- [ASP.NET Core web APIs](https://learn.microsoft.com/aspnet/core/web-api/) — official routing, controllers, results, validation, and problem-details guidance.
- [ASP.NET Core minimal APIs](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis) — official endpoint mapping, binding, responses, and filters.
- [Richardson Maturity Model (Martin Fowler)](https://martinfowler.com/articles/richardsonMaturityModel.html) — explains the four teaching levels with resource and hypermedia examples.
- [Web Linking (RFC 8288)](https://www.rfc-editor.org/rfc/rfc8288) — standard relation and link representation model for typed links.
