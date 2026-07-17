---
publish: true
created: 2026-07-16T08:27:14.227Z
modified: 2026-07-16T08:27:14.227Z
published: 2026-07-16T08:27:14.227Z
topic:
  - Networks
subtopic:
  - Architecture & Ops
summary: Intermediaries that represent either a client reaching the internet or an origin accepting traffic.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

A proxy terminates one connection and creates another on behalf of a party it represents. A **forward proxy** represents clients reaching external services; a **reverse proxy** represents one or more origins accepting client traffic. The distinction is operational, not directional: it tells you who configures the intermediary, which endpoints it hides, and where trust moves.

Use a forward proxy for controlled egress, filtering, or client anonymity. Use a reverse proxy for one public entry point, TLS termination, routing, load balancing, or shared caching. Neither is automatically a security boundary: it becomes one only when authentication, header handling, certificates, and bypass paths are controlled.

![[Assets/System Design 101/0f72173713c3c8ef79a66db657ea539fb25b758b396d5561f28e7728e28bf1ff.png]]

## Two Request Paths

### Forward proxy: client to internet

Assume a company laptop is configured to use `egress.corp:3128` and requests `https://api.example.com/orders`:

1. The laptop resolves and connects to `egress.corp`, not directly to the API.
2. It sends `CONNECT api.example.com:443` to ask the proxy for a TCP tunnel. The proxy applies egress policy and resolves or connects to the target.
3. With a plain tunnel, TLS is end to end between the laptop and `api.example.com`; the proxy sees the target host and traffic volume but not the HTTP path or body.
4. With enterprise TLS interception, the proxy terminates TLS and presents a substitute certificate signed by a CA installed on the laptop. It can inspect HTTP, but now it holds plaintext and signing capability.

For plain HTTP, the client sends the proxy an absolute URI and the proxy makes the origin request. A shared forward proxy may cache a cacheable response, but a `CONNECT` response itself is not cacheable and an opaque TLS tunnel does not expose HTTP objects to cache.

### Reverse proxy: internet to origin

Assume public DNS maps `api.example.com` to a reverse-proxy fleet:

1. The client resolves the public name and establishes TLS with the proxy.
2. The proxy matches host, path, or headers; `/orders` routes to an orders-service pool.
3. It creates a separate upstream connection, optionally using TLS again, and forwards the request.
4. The origin sees the proxy as its network peer. It should use `Forwarded` or a vendor header for client identity only when the value was written by a trusted proxy that stripped untrusted inbound copies.

The proxy may cache public responses and balance requests because it can read HTTP after terminating TLS. If TLS passes through instead, routing is limited to information visible before encryption, and the backend retains certificate and HTTP responsibility.

## Trust, Routing, and Failure Boundaries

| Question | Forward proxy | Reverse proxy |
|---|---|---|
| Who configures it? | Client, device policy, or egress network | Service or platform operator |
| Whose endpoint is hidden? | Client address/topology from the origin | Origin addresses/topology from the client |
| Who usually resolves the destination? | Proxy after receiving an absolute URI or `CONNECT` authority | Client resolves the public proxy name; proxy resolves the selected upstream |
| Where can TLS end? | At the origin for tunneling, or at an intercepting proxy | At the proxy, at the origin via pass-through, or at both hops |
| Typical routing key | Destination host and egress policy | Public host, path, method, or header |

Centralization also concentrates failure. If the only egress proxy is down, clients cannot reach permitted external services. If the only reverse proxy is down, healthy origins are unreachable. Run redundant instances behind independent discovery or load-balancing paths, bound connection and upstream timeouts, and distinguish proxy failures such as `502 Bad Gateway` from application responses.

Do not trust `X-Forwarded-For` merely because it exists. An internet client can supply that header. The edge must replace or sanitize it, and the application must trust forwarded identity only from known proxy addresses. The same rule applies to scheme and host headers used for redirects or authorization decisions.

## References

- [Proxy vs Reverse Proxy (ByteByteGo snapshot)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/proxy-vs-reverse-proxy.md) — the reviewed comparison and adopted request-path diagram.
- [HTTP Semantics: CONNECT (RFC 9110 §9.3.6)](https://www.rfc-editor.org/rfc/rfc9110.html#name-connect) — defines tunnel establishment, authority-form targets, and the non-cacheable CONNECT response.
- [HTTP Caching (RFC 9111)](https://www.rfc-editor.org/rfc/rfc9111) — defines shared-cache behavior, freshness, and validation.
- [Forwarded HTTP Extension (RFC 7239)](https://www.rfc-editor.org/rfc/rfc7239) — specifies the standardized proxy metadata header and its security considerations.
- [TLS 1.3 (RFC 8446)](https://www.rfc-editor.org/rfc/rfc8446) — defines the handshake and authentication boundary that tunneling preserves and interception terminates.
