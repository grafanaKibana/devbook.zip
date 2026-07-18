---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Operating .NET HTTP clients through connection pooling, DNS changes, protocol negotiation, and bounded retries."
level:
  - "3"
priority: High
status: Creation
publish: false
---

# Intro

`HttpClient` is a request API over a connection pool owned by `SocketsHttpHandler`. Correct operation depends less on disposing the client than on bounding connection lifetime, concurrency, timeouts, and retries. Reusing a client avoids repeated TCP/TLS setup and ephemeral-port exhaustion; rotating pooled connections lets DNS changes take effect.

## Lifetime and DNS

Create long-lived clients directly or through `IHttpClientFactory`. Do not create and dispose one client per request: destroying pools forces new connections while closed TCP connections remain in `TIME_WAIT`.

```csharp
var handler = new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    MaxConnectionsPerServer = 100,
    ConnectTimeout = TimeSpan.FromSeconds(3)
};

var client = new HttpClient(handler)
{
    Timeout = TimeSpan.FromSeconds(10),
    DefaultRequestVersion = HttpVersion.Version20,
    DefaultVersionPolicy = HttpVersionPolicy.RequestVersionOrLower
};
```

DNS TTL does not close an established connection. `PooledConnectionLifetime` limits how long a connection remains eligible for reuse; the next connection resolves the hostname again. Pick the lifetime from endpoint-change behavior and connection-setup cost rather than copying a universal two-minute value.

`IHttpClientFactory` centralizes named/typed client configuration and rotates handlers. Its default handler lifetime is an implementation default, not a DNS guarantee: active connections and application retry behavior still determine when traffic leaves an old endpoint.

## HTTP Version Policy

The default request version remains HTTP/1.1. Set both the desired version and `HttpVersionPolicy` when the application requires a specific negotiation boundary:

| Policy | Behavior |
| --- | --- |
| `RequestVersionExact` | Fail when the requested version cannot be used |
| `RequestVersionOrLower` | Prefer the requested version and fall back |
| `RequestVersionOrHigher` | Use the requested version or negotiate upward |

HTTP/2 and HTTP/3 support also depends on TLS/ALPN, operating system, server, proxy, and runtime capabilities. Record the negotiated response version in diagnostics when protocol behavior matters.

## Timeout and Retry Contract

Separate connect, request, and caller cancellation budgets. A single broad timeout hides whether time was spent waiting for a pool slot, connecting, receiving headers, or streaming content.

Retry only transient failures within one end-to-end deadline. An idempotent HTTP method reduces state risk but does not prove replay safety; request bodies, one-time credentials, downstream effects, and an unknown commit result still matter. For non-idempotent operations, use an application idempotency key with durable deduplication before automatic retry.

Dispose `HttpResponseMessage` and stream large bodies with `HttpCompletionOption.ResponseHeadersRead` so connections return to the pool after content consumption. Bound concurrency: an unbounded caller queue can overload the destination even when the handler limits open connections.

## References

- [Guidelines for using HttpClient](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-guidelines) — official lifetime, pooling, DNS, resilience, and factory guidance.
- [HTTP version selection](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-migrate-from-httpwebrequest#http-version-selection) — documents request versions and `HttpVersionPolicy` behavior.
- [IHttpClientFactory](https://learn.microsoft.com/dotnet/core/extensions/httpclient-factory) — official named/typed client and handler-lifetime configuration.
