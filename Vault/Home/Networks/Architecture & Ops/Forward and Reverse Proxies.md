---
topic:
  - Networks
subtopic:
  - Architecture & Ops
summary: "Intermediaries that represent either a client reaching the internet or an origin accepting traffic."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

A proxy receives traffic on one connection and sends it onward through another. A **forward proxy** sits on the client side of the trust boundary and controls egress. A **reverse proxy** sits in front of origins and controls ingress.

For concrete implementation patterns and configuration tradeoffs, see [[Nginx]].

![[Networks/Networks-Forward and Reverse Proxies-18120000.png]]

# Trust and Scope

The represented side determines the proxy type:

- Forward proxy: policy-controlled client path to external services.
- Reverse proxy: entry point for service traffic, often responsible for routing, TLS termination, and buffering.

Neither role creates a security boundary by itself. Authentication, header rewriting, certificate validation, and bypass routes determine what the intermediary can assert and what the next hop may trust.

An intercepting enterprise proxy terminates TLS and establishes a second protected connection, so the proxy can inspect plaintext and must be trusted as a certificate issuer. A non-intercepting `CONNECT` tunnel carries encrypted bytes without terminating the upstream TLS session.

# Example

- Forward proxy: `Browser -> enterprise forward proxy CONNECT api.example.com:443 -> target` normally makes the target observe the proxy's network address. The proxy still knows which client opened the tunnel. Authentication and forwarding metadata may expose more identity, so destination policy and audit controls remain necessary.
- Reverse proxy: `Internet client -> reverse proxy (TLS terminate) -> app service` centralizes ingress policy. Downstream code must accept forwarding metadata only from known proxies. Otherwise a client can spoof identity-bearing headers.

# Shared Failure Pattern

Proxy centralization concentrates outage risk. Redundant instances remove one process or host from the critical path, but shared configuration, name resolution, or upstream dependencies can still fail every instance. A `502` or `504` points first to the proxy-to-upstream boundary, not necessarily to application code.

# References

- [HTTP Semantics: CONNECT](https://www.rfc-editor.org/rfc/rfc9110.html#name-connect)
- [Forwarded HTTP Extension](https://www.rfc-editor.org/rfc/rfc7239)
