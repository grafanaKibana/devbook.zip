---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Implementing HTTP resource contracts with ASP.NET Core results, validation, and preconditions."
level:
  - "3"
priority: Medium
status: Creation
publish: false
---

# Intro

ASP.NET Core implements a REST-style API by mapping HTTP resource contracts to application operations. Framework routing is the easy part. The useful boundary is preserving method semantics, validation, authorization, cancellation, and concurrency preconditions all the way to storage.

## Minimal Resource Example

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

app.MapGet("/api/orders/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
    await db.Orders.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct) is { } order
        ? Results.Ok(order)
        : Results.NotFound());

app.MapPost("/api/orders", async ([FromBody] CreateOrderDto request, AppDbContext db, CancellationToken ct) =>
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

app.Run();

public sealed record CreateOrderDto(Guid CustomerId, decimal Total, string Currency);

public sealed class Order
{
    public int Id { get; set; }
    public Guid CustomerId { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = "USD";
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
}
```

The route names resources rather than application methods. A missing order returns `404`; creation returns `201` and a `Location` value. Production code still needs authorization, validation, problem details, and an idempotency contract before retrying creation.

## Conditional Updates

Expose a version as an entity tag and require `If-Match` on state-changing replacements. Translate a missing precondition to `428 Precondition Required`, a stale version to `412 Precondition Failed`, and a domain conflict that is not a field precondition to `409 Conflict`.

Do not hide this check inside only the HTTP layer. The storage update must include the expected version in its predicate so another writer cannot change the row between validation and commit. Return the new validator after a successful update.

## Operational Boundary

- Pass the request cancellation token through database and dependency calls.
- Put a maximum request-body size and JSON-depth boundary before deserialization work grows without limit.
- Return RFC 9457 problem details without exception traces or secret values.
- Measure dependency time and queue time separately from serialization time.
- Keep retries in the caller or a clearly owned resilience layer; an API handler should not replay a non-idempotent downstream operation blindly.

## References

- [ASP.NET Core web APIs](https://learn.microsoft.com/aspnet/core/web-api/) — official routing, controllers, results, validation, and problem-details guidance.
- [ASP.NET Core minimal APIs](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis) — official endpoint mapping, binding, responses, and filters.
- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110) — primary method, precondition, and status semantics that the implementation must preserve.
- [Problem Details for HTTP APIs (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457) — standard error document and extension model.
