---
publish: true
created: 2026-10-21T13:29:32.433Z
modified: 2026-10-21T13:29:32.433Z
published: 2026-10-21T13:29:32.433Z
topic:
  - Data Persistence
subtopic: []
summary: Reusing a bounded set of open database connections to avoid costly handshakes.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Data Persistence
qard-topic: Connection Pooling
flashcard_uid: 788e9b4c
---

Opening a physical database connection can require a socket, a security handshake, authentication, and server-side session setup. Repeating that work for every query wastes latency and server capacity. A connection pool keeps physical connections open and lends them to callers. `SqlClient` and Npgsql enable pooling by default. The application still has to return connections promptly and keep the fleet-wide limit within what the database can serve.

# How It Works

The client-side pool manages a bounded set of physical connections:

1. `OpenAsync()` takes a usable idle connection or creates one while the pool is below its maximum.
2. Once the pool is full, another caller waits until a connection returns or the connection timeout expires.
3. `Close()` or `Dispose()` returns the logical connection. The provider resets reusable session state and places the physical connection back in the pool.

```mermaid
flowchart LR
    R[Request] -->|borrow| P[(Pool: idle conns)]
    P -->|none free + at max| W[Wait up to timeout]
    R -->|return on Dispose| P
    P -.->|idle too long| C[Close extra conns]
```

Pools are separated by connection configuration. `SqlClient` uses an exact connection-string match and may also separate by identity, credential object, transaction context, or other provider state. Npgsql similarly maintains pools by data-source configuration. Idle and maximum-lifetime settings decide when a provider retires extra or aging connections.

# Example

Pooling works when checkout time stays short. A connection is opened immediately before database work and disposed as soon as that work finishes. An open connection should not sit idle while unrelated network calls or user interaction completes.

```csharp
// 'using' returns the connection to the pool immediately after the query.
await using var conn = new NpgsqlConnection(connectionString);
await conn.OpenAsync(ct);                       // rented from pool (cheap)
await using var cmd = new NpgsqlCommand("SELECT name FROM users WHERE id = $1", conn)
    { Parameters = { new() { Value = id } } };
var name = (string?)await cmd.ExecuteScalarAsync(ct);
// dispose → connection reset and returned to pool
```

Npgsql pool settings can be configured in the connection string, for example `Maximum Pool Size=100;Minimum Pool Size=5;Connection Lifetime=300`. Defaults and keyword names are provider-specific.

# Sizing the Pool

Bigger is not automatically better. Every open connection consumes client and server resources. Once the database reaches its CPU, I/O, or lock-contention limit, more concurrent queries increase queueing inside the server instead of raising throughput.

The HikariCP project offers this rough starting point for a database handling mostly active work:

> **connections ≈ (CPU cores × 2) + effective spindle count**

It is a heuristic, not a per-instance entitlement. Storage architecture, query mix, transaction duration, and workload burstiness can move the useful limit. Sizing starts from a database-wide concurrency budget, reserves capacity for administration and background work, then divides the remainder across application instances. Fifty pods with a maximum of 100 connections each expose 5,000 possible sessions even if the database can run only a small fraction at once.

# Pitfalls

- **Pool exhaustion.** Every connection is checked out, so another `OpenAsync()` waits and eventually times out. A leak, a long transaction, unrelated work inside the checkout window, or more concurrency than the configured pool can support can all produce the same symptom.
- **Connection leaks.** A connection that is never disposed may remain checked out. `using` or `await using` makes the return path explicit even when the command fails.
- **Slow work inside the checkout window.** Waiting for an HTTP response while holding a connection consumes scarce database concurrency without using it. The same problem appears when a transaction remains open across unrelated work. See [[ACID]].
- **Pool fragmentation.** Different connection strings, identities, or provider configurations create separate pools. Per-user credentials and per-tenant databases can multiply the physical connection count even when each pool looks small.
- **Autoscaling multiplication.** Each process owns its client pool. Adding instances raises the possible server-session count unless pool limits shrink with the fleet.
- **Elastic compute fan-out.** A warm function environment may reuse its own pool, but separate environments do not share it. A burst that creates many environments can therefore create many independent pools at once.

# Server-Side Poolers

When many application processes would otherwise maintain too many server sessions, a proxy can multiplex client connections in front of the database:

- **PgBouncer** assigns a server connection for an entire client session, transaction, or statement depending on mode. Transaction pooling reduces server-session occupancy, but session-scoped state such as `SET`, `LISTEN`, session advisory locks, and SQL `PREPARE` does not follow a client between transactions. Protocol-level prepared plans can work when `max_prepared_statements` is configured.
- **Managed database proxies**, such as RDS Proxy, can provide a shared connection boundary for elastic clients. Azure SQL Database is a managed database service rather than a drop-in server-side pooler, so its connection limits and gateway behavior must be designed separately.

# Tradeoffs

| Concern | Small pool | Large pool |
|---|---|---|
| DB server load | Low (few backends) | High — can saturate `max_connections`, memory |
| App throughput under burst | May queue/timeout | More concurrency, until DB becomes the bottleneck |
| Latency | Slight wait when busy | Lower wait, but risks DB-side contention |

Sizing begins with a conservative fleet-wide budget. Pool wait time is measured alongside database CPU, I/O, active sessions, transaction age, and query latency. Concurrency is increased only while throughput improves within the latency target. A shared proxy can help when process count, rather than useful database parallelism, is driving the session count.

# Questions

<!-- qard-id: c0535519-685c-48e5-9c02-919ec55d53c3 -->

> [!qard]- When can a larger connection pool make performance worse?
> A larger pool makes performance worse once the database, rather than the pool, is the bottleneck. Until that point, more connections let more work run concurrently. After the database reaches its CPU, I/O or lock-contention limit, additional sessions add contention and queueing inside the server instead of throughput. Latency rises, and every open session still consumes client and server resources.
>
> The possible session count is also larger than one setting suggests:
>
> - **The limit is per pool.** A setting such as SqlClient's `Max Pool Size` caps one pool, not the whole application or fleet.
> - **Pools fragment.** Providers keep separate pools for different connection strings. Depending on the provider, they also separate pools by identity or other connection state. Per-tenant or per-user configurations can multiply connections even when each pool looks small.
> - **Instances multiply pools.** Each process owns its own pools. Fifty instances with a maximum of 100 connections each can open 5,000 sessions, even if the database can usefully run only a small fraction of them at once.
>
> Pool size is therefore a fleet-wide budget. It starts from measured database capacity, reserves headroom for administration and background work, and divides the rest across instances. Reading pool wait time alongside database CPU, I/O and active sessions shows which side is saturated. Waits while the database is healthy point to leaks, long checkouts or an undersized pool. Waits on a saturated database are not fixed by a larger pool.
>
> [SQL Server connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17) · [SqlClient connection options](https://learn.microsoft.com/en-us/sql/connect/ado-net/connection-options?view=sql-server-ver17)

<!-- qard-id: e65be66b-2817-486a-8729-013a780049b0 -->

> [!qard]- With client-side connection pooling, what happens when application code opens and disposes a database connection?
> Opening borrows a physical connection from the pool, and disposing returns it to the pool instead of closing it. The application works with a short-lived logical connection, while the provider keeps the expensive physical connection open for reuse. Establishing a physical connection can require a socket, a security handshake, authentication and a server session, depending on the provider and connection configuration. Without pooling, every open creates a new physical connection and repeats that setup. The cost belongs to establishing the connection, not to each query sent over a connection that is already open.
>
> 1. **Open:** the provider selects the pool that matches the connection configuration. It takes an idle physical connection, or creates a new one if the pool is below its maximum size.
> 2. **Exhausted pool:** if every connection is checked out and the pool is at its maximum, the open call waits for another caller to return one. If none returns before the connection timeout, the open fails.
> 3. **Close or dispose:** the logical connection ends. The provider resets reusable session state and places the physical connection back in the pool for the next caller.
> 4. **Retirement:** idle and maximum-lifetime settings let the provider close extra or aging physical connections later.
>
> **Failure consequence:** a connection that is never closed or disposed may stay checked out. The usable pool also shrinks through leaks, long transactions and slow unrelated work while a connection is open, such as waiting for an HTTP response. Open calls then time out. Pooling therefore works best when a connection is opened just before database work and disposed as soon as that work ends, usually through `using` or `await using`.
>
> [SQL Server connection pooling](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql-server-connection-pooling?view=sql-server-ver17)

# References

- [SQL Server connection pooling](https://learn.microsoft.com/en-us/dotnet/framework/data/adonet/sql-server-connection-pooling)
- [Npgsql connection string parameters](https://www.npgsql.org/doc/connection-string-parameters.html)
- [HikariCP pool sizing](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [PgBouncer documentation](https://www.pgbouncer.org/)
