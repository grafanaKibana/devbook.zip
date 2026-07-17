---
publish: true
created: 2026-07-16T15:15:22.818Z
modified: 2026-07-16T15:15:22.818Z
published: 2026-07-16T15:15:22.818Z
topic:
  - Networks
subtopic:
  - Protocols
summary: A stateless request-response protocol carrying web and API messages across reusable connections.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

HTTP is a stateless request-response protocol for transferring representations and control metadata between clients, servers, and intermediaries. Browsers, APIs, webhooks, health checks, and file downloads all use the same message model: a request names a target and method, and a response returns a status, fields, and optional content. The version changes framing and transport behavior; it does not redefine method or status semantics.

Use this note as the route through the HTTP family. [[HTTP Semantics]] owns methods, status codes, fields, content, and retry boundaries. [[HTTP Caching]] owns freshness and validators. [[HTTP 2]] owns multiplexing and the HTTP/3 transport boundary. [[HTTPS and TLS]] owns trust and encryption. [[NET HTTP Clients]] owns .NET connection pools, timeouts, and version policy.

## Target and Browser Request Flow

HTTP request targets are URI references, but parsing their components is not an HTTP implementation exercise. [[URL]] owns browser URL parsing, authority and IPv6 syntax, percent-encoding, relative resolution, and normalization. The fragment remains client-side and is not sent in the HTTP request.

Entering `https://api.example.com/orders/42` can cross several boundaries:

1. The browser parses the URL, applies navigation policy, and checks relevant caches.
2. It obtains an address through [[DNS]] or an already-cached/configured mapping.
3. It reuses or establishes a connection: TCP plus TLS for HTTP/1.1 or HTTP/2, or QUIC with integrated TLS for HTTP/3.
4. It sends an HTTP request. A redirect can restart policy, resolution, and connection selection for a new origin.
5. It processes the response while discovered subresources may be fetched concurrently.

This is a dependency graph, not a fixed chronology. Service workers, caches, speculative connections, redirects, connection reuse, and streaming parsing can skip or overlap steps.

```text
GET /orders/42 HTTP/1.1
Host: api.example.com
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 31

{"id":42,"status":"accepted"}
```

## Connections and Versions

HTTP/1.1 connections are persistent by default unless message framing or `Connection: close` requires closure. Without pipelining, a client waits for one response before sending the next request on that connection. With pipelining, it may send several requests before receiving responses, but the server must return those responses in request order. A slow first response therefore blocks later pipelined responses. Intermediary bugs and poor failure recovery kept browser pipelining from becoming dependable.

| Version | Message transport | Concurrency boundary | Loss boundary |
|---|---|---|---|
| HTTP/1.1 | Text messages over TCP | One active exchange per connection in common browser use; pipelined responses remain ordered | TCP loss blocks that connection |
| HTTP/2 | Binary frames and streams over one TCP connection | Streams can make progress concurrently, subject to flow control, priority, server work, and shared TCP delivery | One missing TCP segment can delay data for every stream |
| HTTP/3 | HTTP frames over QUIC streams | Independent streams avoid cross-stream transport head-of-line blocking | Ordered delivery still applies within each stream; QPACK and control-stream dependencies can also delay field decoding or progress |

HTTP/2 removes the HTTP/1.1 ordered-response bottleneck by interleaving frames from multiple streams. It does not promise that no request waits: connection and stream flow-control windows, server capacity, scheduling, and TCP loss still matter. HTTP/3 moves reliable delivery into QUIC so loss on one request stream does not block unrelated request streams at the transport layer.

## Semantics Boundary

Methods describe the client's intent. Safe methods do not request a state change; idempotent methods have the same intended server effect when repeated. Neither property is a blanket retry policy. A client also needs a deadline, replay safety, concurrency preconditions, and a way to resolve an unknown outcome.

Status codes describe the response to one request. `401 Unauthorized` means authentication credentials are required and the response carries an applicable `WWW-Authenticate` challenge. `403 Forbidden` means the server understood the request and refuses it; the client may be authenticated, but authentication is not a prerequisite for using `403`. A server may answer `404` instead when disclosing resource existence would be harmful.

Fields carry representation metadata, negotiation, validators, authentication challenges, tracing, and routing information. Connection-specific fields such as `Connection`, `Keep-Alive`, `Transfer-Encoding`, and `Upgrade` are hop-by-hop and must not be forwarded blindly. See [[HTTP Semantics]] for the complete method, status, header, content-framing, and conditional-request contract.

## Caching Boundary

HTTP caches reuse a stored response only when the cache key, freshness rules, request directives, authorization boundary, and `Vary` dimensions allow it. `no-cache` permits storage but requires validation before reuse; `no-store` forbids storage. `ETag` plus `If-None-Match` can validate a representation without transferring it again.

APIs should declare cache behavior explicitly. A missing freshness directive can permit heuristic caching, while a missing `Vary` dimension can serve one representation to a client that requested another. [[HTTP Caching]] owns those decisions and the shared-cache authorization boundary.

## Security and Client Boundaries

HTTPS carries HTTP through TLS, adding confidentiality, integrity, and peer authentication. TLS 1.3 0-RTT data can be replayed, so an operation must be explicitly replay-safe before it is sent early; an idempotent method label alone is insufficient. See [[HTTPS and TLS]] for certificate validation, interception, HSTS, and handshake details.

A .NET caller should reuse connection pools rather than create and dispose one `HttpClient` per request. Pool lifetime, DNS refresh, version negotiation, timeouts, and retries belong to [[NET HTTP Clients]].

## Pitfalls

- **Treating idempotent as automatically retryable.** A repeated `PUT` has the same intended effect, but a lost response, a changed `ETag`, or concurrent writers can change the observable result. Preserve preconditions and reconcile unknown outcomes.
- **Assuming version upgrades remove all waiting.** Multiplexing changes where requests block; it does not remove server queues, flow control, packet recovery, or per-stream ordering.
- **Trusting forwarding fields from any client.** Accept `Forwarded` or product-specific proxy fields only from a configured trusted proxy boundary.

## Questions

> [!QUESTION]- Why did HTTP/1.1 pipelining not remove head-of-line blocking?
> A client could send requests without waiting, but the server still had to return responses in request order. A slow first response blocked every later response on that connection, and ambiguous failures made safe recovery difficult. HTTP/2 instead interleaves independently identified stream frames.

> [!QUESTION]- Does `403 Forbidden` prove that the caller is authenticated?
> No. `403` says the server understood the request and refuses to fulfill it. Insufficient permission for an authenticated identity is common, but a server can refuse an unauthenticated request with `403` when another challenge would not help or policy requires refusal without disclosure.

## References

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) — defines methods, status codes, fields, content, conditional requests, and connection semantics.
- [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) — defines freshness, validation, authorization-sensitive shared caching, and cache-control directives.
- [RFC 9112 — HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112) — defines HTTP/1.1 message framing, persistence, pipelining response order, and connection handling.
- [RFC 9113 — HTTP/2](https://www.rfc-editor.org/rfc/rfc9113) — defines HTTP/2 streams, framing, flow control, and multiplexing over TCP.
- [RFC 9114 — HTTP/3](https://www.rfc-editor.org/rfc/rfc9114) — maps HTTP semantics to QUIC streams and documents stream and QPACK dependencies.
- [ByteByteGo: URL, URI, and URN](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/url-uri-urn-do-you-know-the-differences.md) — taxonomy summary retained here only as the boundary to the focused URL note.
- [ByteByteGo: Is HTTPS safe?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/is-https-safe.md) — interception scenario bounded here by explicit trust-store control and separate TLS sessions.
- [ByteByteGo: HTTP headers](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/important-things-about-http-headers-you-may-not-know.md) — header inventory summarized here by semantics and intermediary scope.
- [ByteByteGo: Browser navigation lifecycle](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-happens-when-you-type-a-url-into-your-browser.md) — fixed chronology replaced here with cache, reuse, redirect, QUIC, and concurrency boundaries.
- [ByteByteGo: HTTP methods](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-9-http-request-methods.md) — method inventory retained here as a route to the RFC-based semantics and retry note.
- [ByteByteGo: Unusual HTTP status codes](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/5-http-status-codes-that-should-never-have-been-created.md) — status-code claim corrected using standardized semantics and the IANA registry boundary.
