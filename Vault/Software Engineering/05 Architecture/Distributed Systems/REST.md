---
topic:
  - "Architecture"
subtopic:
  - "Distributed Systems"
level:
  - "3"
priority: High
status: Ready To Repeat

dg-publish: true
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
   - In practice: API gateways, reverse proxies, CDNs, WAFs, service mesh sidecars.
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
| gRPC | HTTP/2 | Protobuf (binary) | Strong bi-directional streaming | Limited direct browser support (typically gRPC-Web bridge) | Low-latency internal service-to-service calls with strict contracts |
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

> [!QUESTION]- A client sends `POST /api/orders`, times out, and retries. How do you prevent duplicate orders?
> **Expected answer:**
> - Require an `Idempotency-Key` header for create operations.
> - Persist key + request hash + resulting order ID with TTL.
> - On retry with same key and same payload, return the original result (`201` or `200`) instead of creating a new order.
> - On same key with different payload, reject with `409 Conflict`.
> **Why this matters:** demonstrates reliability under partial failure and correct non-idempotent write handling.

> [!QUESTION]- Explain `PUT` vs `PATCH` semantics and retry behavior.
> **Expected answer:**
> - `PUT` replaces the target resource representation; repeated identical calls are idempotent.
> - `PATCH` applies partial updates; idempotency depends on patch format and operation semantics.
> - Clients can safely auto-retry idempotent requests when network failures are ambiguous.
> - Servers should document patch media type and conflict rules (`409`/`422`).
> **Why this matters:** tests precise HTTP semantics and failure-mode reasoning.

> [!QUESTION]- Why do many teams stop at Richardson Level 2 instead of Level 3 HATEOAS?
> **Expected answer:**
> - Level 2 already provides major REST benefits: resource URIs, verb semantics, status codes, cacheability.
> - Level 3 requires hypermedia-aware clients, link relation design discipline, and tooling investment.
> - In closed ecosystems, clients often already know workflows, reducing HATEOAS payoff.
> - Level 3 is valuable when runtime discoverability and loose client coupling are strategic requirements.
> **Why this matters:** shows tradeoff thinking rather than dogmatic purity.

## References

- [What is a REST API? (IBM)](https://www.ibm.com/ru-ru/cloud/learn/rest-apis)
- [REST dissertation (Fielding)](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)
- [Create web APIs with ASP.NET Core](https://learn.microsoft.com/aspnet/core/web-api/)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [Best Practices for Designing a Pragmatic RESTful API (Vinay Sahni)](https://www.vinaysahni.com/best-practices-for-a-pragmatic-restful-api)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Topics**
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Distributed Systems/API Gateway|API Gateway]]
> - [[Software Engineering/05 Architecture/Distributed Systems/CAP theorem|CAP theorem]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Consistency Models|Consistency Models]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Distributed Transactions|Distributed Transactions]]
> - [[Software Engineering/05 Architecture/Distributed Systems/IaaS, PaaS, SaaS, CaaS|IaaS, PaaS, SaaS, CaaS]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Load Balancing|Load Balancing]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues|Message Queues]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Observability|Observability]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Webhooks|Webhooks]]
<!-- whats-next:end -->
