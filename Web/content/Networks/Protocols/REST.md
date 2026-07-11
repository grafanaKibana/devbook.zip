---
publish: true
created: 2026-07-11T21:46:02.944Z
modified: 2026-07-11T21:46:02.945Z
published: 2026-07-11T21:46:02.945Z
topic:
  - Networks
subtopic:
  - Protocols
summary: An architectural style for resources identified by URIs and manipulated over stateless HTTP.
level:
  - "3"
priority: High
status: Done
---

# Intro

REST (Representational State Transfer) is an architectural style for networked systems defined by Roy Fielding, centered on resources identified by URIs and manipulated through representations (often JSON) over stateless client-server interactions, commonly via HTTP. It matters because it maps naturally to HTTP semantics, is broadly supported by infrastructure and tooling, and is one of the most common styles for HTTP APIs. You usually reach for REST when you have resource-centric, CRUD-heavy domains, browser/mobile clients, and teams that benefit from predictable HTTP behavior. In interviews, strong answers connect REST constraints to operational outcomes: scalability, cacheability, evolvability, and reliability.

## REST Constraints

Fielding defined six constraints. A system is RESTful when the required constraints are respected together (code-on-demand is optional).

1. **Client-Server**
   - Clients and servers evolve independently.
   - In practice: UI concerns stay in the client, business/data concerns stay in the server.
   - Benefit: cleaner separation of responsibilities and deploy cadence.

2. **Stateless**
   - Each request contains all context needed to process it.
   - In practice: auth via bearer token/JWT, request-scoped correlation IDs, no sticky server session required.
   - Benefit: easier horizontal scaling and simpler failover.

3. **Cacheable**
   - Responses declare whether and how they may be cached.
   - In practice: `Cache-Control`, `ETag`, `Last-Modified`, and `If-None-Match` support.
   - Benefit: lower latency and lower backend load.

4. **Uniform Interface**
   - A consistent way to identify resources, manipulate state, and express intent.
   - In practice: stable URIs, standard HTTP methods, media types, and status codes.
   - Benefit: generic clients/proxies can interact without custom protocol knowledge.

5. **Layered System**
   - A client does not need to know whether it is connected directly to the origin server.
   - In practice: [[API Gateway|API gateways]], reverse proxies, CDNs, WAFs, service mesh sidecars.
   - Benefit: security, scalability, and operability through composable layers.

6. **Code-on-Demand (optional)**
   - Server can transfer executable code to client.
   - In practice: rare in modern API design; historically JS downloaded by browsers is the common example.
   - Benefit: client extensibility without pre-shipping behavior.

## Uniform Interface Deep Dive

Uniform interface has four sub-constraints. This is where interviewers often go deeper.

### 1) Resource Identification via URI

- Resources are named with stable URIs, not RPC verbs.
- Prefer nouns and collections:
  - `GET /api/orders/42`
  - `POST /api/orders`
- Avoid endpoint naming like `/createOrder` or `/processOrderNow` unless you are modeling an action resource explicitly.

### 2) Resource Manipulation Through Representations

- Clients send/receive representations (`application/json`) instead of direct object references.
- The representation carries enough data to transition state.
- Example: `PUT /api/orders/42` sends a full order representation for replacement semantics.

### 3) Self-Descriptive Messages

- Each message is understandable in isolation.
- Meaning comes from method + URI + headers + media type + body + status code.
- Example: `Content-Type: application/json`, `ETag`, `Location`, and `Retry-After` communicate behavior without out-of-band conventions.

### 4) HATEOAS (Hypermedia as the Engine of Application State)

- Responses include links/actions that describe valid next transitions.
- Example order payload includes `cancel`, `pay`, or `track` links depending on state.
- Many production APIs stop at Level 2 (no hypermedia), but understanding HATEOAS shows architectural depth.

## HTTP Methods and Semantics

| Method | Semantics | Idempotent? | Safe? |
| --- | --- | --- | --- |
| GET | Read resource representation | Yes | Yes |
| POST | Create subordinate resource or trigger non-idempotent processing | No | No |
| PUT | Replace target resource with supplied representation | Yes | No |
| PATCH | Partially modify target resource | Usually no (can be designed idempotent) | No |
| DELETE | Remove target resource | Yes | No |

Interview shorthand:

- **Safe** means no requested state mutation (`GET`, `HEAD`).
- **Idempotent** means repeating the same request yields the same resulting state.
- Retries are easiest for idempotent operations.

## HTTP Status Codes in Practice

| Group | Common Codes | Typical Use |
| --- | --- | --- |
| 2xx Success | `200 OK`, `201 Created`, `204 No Content` | Read success, create success with `Location`, delete/update success without body |
| 3xx Redirection/Cache | `301 Moved Permanently`, `304 Not Modified` | Resource moved permanently, conditional request hit cache validation |
| 4xx Client Errors | `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Content`, `429 Too Many Requests` | Validation/auth/authorization/rate-limit/concurrency issues from caller side |
| 5xx Server/Upstream Errors | `500 Internal Server Error`, `502 Bad Gateway`, `503 Service Unavailable` | Server bug, bad upstream response, temporary outage/overload |

Guideline for senior-level API design:

- Return the most specific status code you can defend.
- Keep error bodies machine-readable (for example `application/problem+json`).
- Document retry behavior for `409`, `429`, and `503` explicitly.

## C# Example (ASP.NET Core Minimal API)

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

app.MapPost("/api/orders", async ([FromBody] CreateOrderDto dto, AppDbContext db, CancellationToken ct) =>
{
    var order = new Order
    {
        CustomerId = dto.CustomerId,
        Total = dto.Total,
        Currency = dto.Currency,
        CreatedAtUtc = DateTime.UtcNow
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
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Order> Orders => Set<Order>();
}
```

Why this is interview-relevant:

- `GET` returns `404` when the resource does not exist.
- `POST` returns `201 Created` plus a canonical resource URI.
- URI models a resource (`/orders/{id}`), not an RPC command.

## REST Maturity Model (Richardson)

| Level | Characteristics | Example |
| --- | --- | --- |
| Level 0 | Single URI + usually single verb (often POST everywhere) | `/api` with action in payload |
| Level 1 | Introduces resource-oriented URIs | `/orders`, `/orders/{id}` |
| Level 2 | Uses proper HTTP verbs and status codes | `GET/POST/PUT/DELETE` + 2xx/4xx/5xx semantics |
| Level 3 | Adds hypermedia controls (HATEOAS) | Response contains actionable links for next valid states |

Many production APIs are Level 2 because it balances interoperability and implementation cost. Level 3 is powerful for discoverability and workflow guidance, but it has ecosystem/tooling overhead many teams do not need.

## Tradeoffs: REST vs gRPC vs GraphQL

| Style | Protocol | Format | Streaming | Browser Support | Best Fit |
| --- | --- | --- | --- | --- | --- |
| REST | HTTP/1.1 or HTTP/2 | Usually JSON (sometimes XML) | Limited with SSE/WebSocket adjuncts | Excellent (native HTTP, CDN-friendly) | Public APIs, CRUD-heavy services, broad interoperability |
| [[gRPC]] | HTTP/2 | Protobuf (binary) | Strong bi-directional streaming | Limited direct browser support (typically gRPC-Web bridge) | Low-latency internal service-to-service calls with strict contracts |
| GraphQL | HTTP (commonly POST) | JSON over typed schema | Subscriptions possible | Strong with modern web clients | Aggregation-heavy UIs needing client-controlled response shape |

Decision heuristic:

- Pick **REST** for stable resource models, caching, and broad external consumption.
- Pick **gRPC** for high-throughput internal APIs and strict schema evolution discipline.
- Pick **GraphQL** when frontend teams need query flexibility across many backends.

## Pitfalls

### 1) Chatty APIs

- **What goes wrong**: one screen requires many sequential calls (`/user`, `/orders`, `/recommendations`, `/limits`), causing high tail latency.
- **Why it happens**: resource boundaries are too fine-grained for UI composition.
- **Mitigation**: introduce a BFF (Backend-for-Frontend), composite read endpoints, or server-driven aggregation.

### 2) Over-fetching and Under-fetching

- **What goes wrong**: fixed resource shapes return too much unused data or miss fields requiring extra calls.
- **Why it happens**: generic representations are optimized for reuse, not every consumer.
- **Mitigation**: support sparse fieldsets (`fields=`), expansions (`include=`), projection endpoints, or GraphQL when flexibility dominates.

### 3) Ignoring Idempotency During Retries

- **What goes wrong**: client timeout on `POST /orders` triggers retry and creates duplicate orders.
- **Why it happens**: transport uncertainty plus non-idempotent writes without deduplication contract.
- **Mitigation**: idempotency keys, unique constraints, request fingerprint checks, and deterministic duplicate response handling.

## Questions

> [!QUESTION]- Explain `PUT` vs `PATCH` semantics and retry behavior.
> `PUT` replaces the whole resource representation, so sending it twice lands the resource in the same state — it's idempotent, and a client can safely auto-retry it when a network blip leaves the outcome unknown. `PATCH` applies a partial update, and whether it's idempotent depends on the patch format: `set status = "shipped"` is, but `increment quantity by 1` isn't. So servers should document the patch media type and conflict rules (`409`/`422`). The upshot: retry `PUT` freely, but make `PATCH` safe with an idempotency key unless the operation is provably repeatable.

> [!QUESTION]- Why do many teams stop at Richardson Level 2 instead of Level 3 HATEOAS?
> Level 2 already buys most of what REST is good for — resource URIs, proper verbs, status codes, cacheability — and that's enough for the vast majority of APIs. Level 3 adds hypermedia: responses carry the links and actions valid for the current state. It's powerful for discoverability, but it needs clients that understand link relations plus the discipline and tooling to maintain them, and in a closed ecosystem clients already know the workflows, so the payoff shrinks. HATEOAS earns its cost when runtime discoverability and loose coupling are real goals; otherwise Level 2 is the pragmatic stopping point.

## References

- [What is a REST API? (IBM)](https://www.ibm.com/ru-ru/cloud/learn/rest-apis) — accessible overview of REST concepts, constraints, and HTTP method semantics.
- [REST dissertation (Fielding)](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — the original 2000 dissertation defining REST architectural constraints; chapter 5 is the canonical source.
- [Create web APIs with ASP.NET Core](https://learn.microsoft.com/aspnet/core/web-api/) — official guide to building REST APIs with ASP.NET Core, covering controllers, routing, and content negotiation.
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines) — Microsoft's internal API design standards covering versioning, error responses, pagination, and naming conventions.
- [Best Practices for Designing a Pragmatic RESTful API (Vinay Sahni)](https://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api) — practitioner guide covering URL design, HTTP status codes, versioning, and filtering with real-world examples.
