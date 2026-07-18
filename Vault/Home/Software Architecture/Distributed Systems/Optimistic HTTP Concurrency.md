---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "Preventing lost HTTP updates with required validators and an atomic compare-and-swap write."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Optimistic HTTP concurrency lets clients update a resource only if the version they read is still current. The HTTP precondition is `If-Match`; the storage boundary must enforce the same comparison atomically. An application-side read, comparison, then unconditional save still has a race.

## Contract

`GET /orders/42` returns `ETag: "17"`. The client sends that validator with its update:

```http
PUT /orders/42 HTTP/1.1
If-Match: "17"
Content-Type: application/json

{"shippingAddress":"Kyiv"}
```

The server returns `428 Precondition Required` when `If-Match` is missing and `412 Precondition Failed` when another writer has already advanced the version.

## Atomic compare-and-swap

```csharp
app.MapPut("/orders/{id:long}", async (
    long id,
    UpdateOrder request,
    HttpRequest http,
    OrdersDb db,
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

The single `UPDATE ... WHERE version = expected` is the concurrency boundary. If zero rows change, the client must re-read, merge deliberately, and retry with the new validator.

## References

- [RFC 9110: If-Match](https://www.rfc-editor.org/rfc/rfc9110#name-if-match) — primary HTTP semantics for preventing lost updates with validators.
- [RFC 6585: 428 Precondition Required](https://www.rfc-editor.org/rfc/rfc6585#section-3) — primary status definition for requiring conditional requests.
- [EF Core concurrency conflicts](https://learn.microsoft.com/ef/core/saving/concurrency) — official optimistic-concurrency token and compare-on-update behavior.
