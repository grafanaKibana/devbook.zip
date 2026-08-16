---
topic:
  - Networks
subtopic:
  - Protocols
summary: "A stateless request-response protocol carrying web and API messages across reusable connections."
level:
  - "3"
priority: High
status: Ready to Repeat

publish: true
---

HTTP is the message contract behind browsers, APIs, webhooks, and service health checks. A request names a target and carries a method, fields, and optional content. The response reports an outcome and may carry a representation.

Those semantics are separate from the connection carrying them. HTTP/1.1, HTTP/2, and HTTP/3 preserve the same method and status model while changing framing, multiplexing, and transport behavior.

# Methods, Statuses, and Replay Safety

| Method | Intended semantics | Safe | Idempotent | Retry decision |
|---|---|---|---|---|
| `GET` | Transfer a current representation | Yes | Yes | Retry within the request deadline when replay is acceptable |
| `HEAD` | Transfer GET metadata without response content | Yes | Yes | Same boundary as `GET` |
| `POST` | Process content according to the target resource | No | No | Retry only with explicit dedupe/idempotency or proof it was not processed |
| `PUT` | Create or replace the target state with the supplied representation | No | Yes | Preserve preconditions and reconcile an unknown first outcome |
| `PATCH` | Apply a media-type-defined patch | No | Depends on patch | Retry only when the patch operation is idempotent or deduplicated |
| `DELETE` | Remove the target association | No | Yes | Define repeat responses and reconcile uncertain completions |

Idempotency describes the intended server effect of repeated identical requests, not identical responses or freedom from races. If a conditional `PUT` commits but its response is lost, an identical retry can return `412 Precondition Failed` because the first request advanced the entity tag. The client should fetch or otherwise reconcile current state rather than remove `If-Match` and overwrite a concurrent change.

| Status | Boundary meaning |
|---|---|
| 201 Created | New resource and optional `Location` target |
| 400 Bad Request | Request malformed or invalid framing |
| 401 Unauthorized | Challenge required |
| 403 Forbidden | Request understood, denied |
| 409 Conflict | Current resource state conflicts |
| 412 Precondition Failed | `If-Match`/state precondition violated |
| 422 Unprocessable Content | Syntax is understood, but the instructions cannot be processed |
| 429 Too Many Requests | Apply retry policy and any `Retry-After` |
| 502 Bad Gateway | Gateway cannot consume upstream response |
| 503 Service Unavailable | Server temporarily unable to handle the request, commonly overload or maintenance; `Retry-After` may bound retry timing |

An unknown status is interpreted by class for generic handling. Retry and security policy still need an explicit rule. An unregistered value supplies neither. Diagnostics should retain the raw code and the intermediary or product that generated it.

# Connection Models and Versions

| Version | Transport | What changes |
|---|---|---|
| HTTP/1.1 | TCP | Persistent connections. Limited request ordering in practice |
| HTTP/2 | TCP + streams | Multiplexed streams with flow-control and scheduling |
| HTTP/3 | QUIC + streams | Removes transport-level HOL for independent streams |

# Fields, Content, and Conditional Requests

Fields carry several different contracts:

- representation metadata: `Content-Type` and content-coding fields
- routing and identity: `Host`, `Location`, and explicitly trusted forwarding fields
- negotiation: `Accept`, `Accept-Encoding`, and `Accept-Language`
- validators: `ETag`, `If-Match`, `If-None-Match`
- response semantics: status, challenge headers, `Range` + `Content-Range`

HTTP/1.1 uses `Content-Length`, chunked transfer coding, or connection closure to delimit content according to its message rules. HTTP/2 and HTTP/3 carry content in frames instead. Range requests combine `Range`, `206 Partial Content`, and `Content-Range` for resumable downloads and media seeking.

Connection-specific fields are scoped to one hop. A proxy must remove fields named by `Connection` and must not forward HTTP/1.1-only connection metadata into HTTP/2 or HTTP/3.

Optimistic concurrency belongs to this header contract:

- A `GET /orders/42` response returns a validator such as `ETag: "17"`.
- The client sends `If-Match: "17"` with the state-changing request.
- The server returns `428 Precondition Required` when the validator is missing and `412 Precondition Failed` when another writer has advanced the version.
- The storage write performs the same comparison atomically. An application-side read, comparison, then unconditional save still has a race.

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

Zero modified rows means the caller must re-read and merge deliberately before retrying. A stale payload is not made safe by replaying it with the new version.

# Freshness, Validators, and Cache Keys

HTTP caching reuses a stored response only when the request matches its cache key and the response is fresh or validates successfully. The performance win is avoiding origin work and transfer. The cost is a correctness contract around staleness, authorization, representation variants, and invalidation.

## Freshness Policy

```http
Cache-Control: public, max-age=60, s-maxage=300, must-revalidate
```

| Directive | Effect |
|---|---|
| `max-age=60` | A cache can reuse the response for 60 seconds from its calculated age |
| `s-maxage=300` | A shared cache uses 300 seconds instead of `max-age` |
| `no-cache` | Storage is allowed, but every reuse requires successful validation |
| `no-store` | The cache must not store the response |
| `private` | Shared caches must not store the response. A private cache may |
| `must-revalidate` | A stale response cannot be reused without successful validation, except where the specification explicitly permits it |

Without explicit freshness, a cache can apply a heuristic to eligible responses. An API that cares about reuse or staleness needs to state that policy.

## Validators and Preconditions

```http
GET /catalog/42 HTTP/1.1
If-None-Match: "catalog-v9"

HTTP/1.1 304 Not Modified
ETag: "catalog-v9"
Cache-Control: private, max-age=0, must-revalidate
```

`304 Not Modified` carries no representation content. The cache updates stored metadata and reuses its prior content. `If-None-Match` takes precedence over `If-Modified-Since` when both are present. Weak entity tags can validate semantic equivalence for caching but are unsuitable for `If-Match` lost-update protection.

## Cache Keys and `Vary`

The primary cache key includes the target URI and method according to cache rules. `Vary` adds selected request fields:

```http
Vary: Accept-Encoding, Accept-Language
```

Omitting a relevant field can cross-serve the wrong representation. Adding a high-cardinality field such as raw `User-Agent` can fragment the cache until reuse disappears. Normalize only according to an explicit application or intermediary contract. Arbitrary query sorting or decoding can change resource identity.

A shared cache normally cannot reuse a response to a request carrying `Authorization` unless the response explicitly permits shared reuse under RFC 9111. Even then, its key and representation must not mix identities. Keep private user data in a private cache, or use `no-store` when storage itself is unacceptable.

Caching pitfalls are contract failures rather than tuning details:

- `no-cache` does not provide secrecy because it permits storage.
- Some error responses are heuristically cacheable. Transient failures need an explicit short policy or `no-store`.
- Long freshness windows require versioned URLs, purge controls, or an accepted stale window with clear invalidation ownership.

# HTTPS, TLS, and Transport Trust

HTTPS is HTTP carried through TLS. TLS authenticates the server certificate, establishes symmetric traffic keys, and protects HTTP bytes from undetected modification or passive reading. It does not authenticate the application user, make the origin trustworthy, or prevent an authorized endpoint from logging plaintext.

## TLS 1.3 Handshake

```text
ClientHello: versions, key share, cipher suites, SNI, ALPN
ServerHello: selected version, key share, cipher suite
[encrypted] EncryptedExtensions, Certificate, CertificateVerify, Finished
[encrypted] client Finished
application data
```

The ClientHello and ServerHello remain visible because they negotiate the shared secret and protocol. After ServerHello, handshake traffic keys protect the server certificate and most remaining handshake metadata. An observer can still infer endpoints, timing, sizes, and any unencrypted ClientHello fields. Encrypted client hello is a separate deployment capability.

The client validates the certificate chain to a trusted root, the requested hostname against the leaf certificate's subject alternative names, the validity interval, and applicable revocation or policy signals. A successful handshake proves control of the certificate's private key under the client's trust policy, not ownership of a business identity.

## Resumption and 0-RTT

TLS 1.3 resumption can send early application data before the server completes the new handshake. An attacker can replay captured 0-RTT data to another accepting server instance. Reject early data or restrict it to operations whose replay is harmless under the complete application contract.

HTTP method idempotency alone is insufficient. A repeated `GET` can consume a one-time token, emit an audit event, or trigger billing even though GET is defined as safe. Keep authentication, purchases, state transitions, and one-time links out of 0-RTT unless the application has explicit anti-replay state.

## HSTS and the First Visit

`Strict-Transport-Security` tells a browser that received the header over valid HTTPS to rewrite future HTTP attempts to HTTPS for the stated `max-age`. `includeSubDomains` extends the policy, so enable it only when every covered host supports HTTPS.

HSTS cannot protect the first visit before the browser knows the policy. Browser preload lists close that gap for accepted domains, but preload is a long-lived operational commitment with removal delay. Redirect HTTP to HTTPS, send HSTS only over HTTPS, and treat preload readiness as a separate rollout gate.

## TLS Interception and Trust Stores

An enterprise or debugging proxy can inspect HTTPS only when the client trusts a CA controlled by that proxy. The proxy terminates one TLS connection and creates a second connection to the origin. The connections have different traffic keys. Hostname validation succeeds because the proxy issues a matching leaf certificate from the installed root.

Treat trust-store modification as privileged configuration. Certificate pinning can narrow trust for controlled clients, but it increases rotation and recovery risk and is not a general browser defense.

# Connection Pooling, DNS, and HTTP Versions in .NET

`HttpClient` is a request API over a connection pool owned by `SocketsHttpHandler`. Correct operation depends less on disposing the client than on bounding connection lifetime, concurrency, timeouts, and retries. Reusing a client avoids repeated TCP/TLS setup and ephemeral-port exhaustion. Rotating pooled connections lets DNS changes take effect.

## Lifetime and DNS

Long-lived clients can be created directly or through `IHttpClientFactory`. Creating and disposing one client per request destroys connection pools, forces fresh handshakes, and leaves closed TCP connections in `TIME_WAIT`.

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

DNS TTL does not close an established connection. `PooledConnectionLifetime` limits how long a connection remains eligible for reuse. The next connection resolves the hostname again. The useful lifetime depends on endpoint churn and connection-setup cost. There is no universal value.

`IHttpClientFactory` centralizes named or typed client configuration and rotates handlers. Its default handler lifetime is an implementation default, not a DNS guarantee: active connections and application retry behavior still determine when traffic leaves an old endpoint.

## HTTP Version Policy

The default request version remains HTTP/1.1. Set both the desired version and `HttpVersionPolicy` when the application requires a specific negotiation boundary:

| Policy | Behavior |
|---|---|
| `RequestVersionExact` | Fail when the requested version cannot be used |
| `RequestVersionOrLower` | Prefer the requested version and fall back |
| `RequestVersionOrHigher` | Use the requested version or negotiate upward |

HTTP/2 and HTTP/3 support also depends on TLS/ALPN, operating system, server, proxy, and runtime capabilities. Record the negotiated response version when protocol behavior matters.

## Deadlines, Retries, and Caller Load

Separate connect, request, and caller cancellation budgets. A single broad timeout hides whether time was spent waiting for a pool slot, connecting, receiving headers, or streaming content.

Retry policy is a contract:

- Retry transient failures within one end-to-end deadline.
- An idempotent method reduces state risk but does not prove replay safety. Request bodies, one-time credentials, downstream effects, and unknown commit results still matter.
- Non-idempotent operations need an application idempotency key with durable deduplication before automatic retry.

Dispose `HttpResponseMessage` and stream large bodies with `HttpCompletionOption.ResponseHeadersRead` so connections return to the pool after content consumption. Bound concurrency: an unbounded caller queue can overload the destination even when the handler limits open connections.

# HTTP API Interoperability

[[REST]] fits resource APIs that need broad HTTP interoperability and ordinary caching semantics. GRPC fits controlled peers where schema-first contracts and streaming dominate. GraphQL fits clients that need projection control and can pay for query governance.

# Questions

> [!QUESTION]- Why is an idempotent HTTP method not automatically safe to retry?
> Idempotency constrains the intended effect of repeating the method. A request can still carry a one-time credential, trigger downstream work, consume deadline budget, or have an unknown first outcome. Automatic retry needs an end-to-end replay contract, not the method label alone.

# References

- [HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)
- [TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [HttpClient guidelines](https://learn.microsoft.com/dotnet/fundamentals/networking/http/httpclient-guidelines)
