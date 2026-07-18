---
publish: true
created: 2026-07-18T08:26:04.118Z
modified: 2026-07-18T09:40:41.757Z
published: 2026-07-18T09:40:41.757Z
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

A proxy terminates one connection and opens another on behalf of a represented party. A **forward proxy** represents egress clients; a **reverse proxy** represents origins for inbound traffic.

For concrete implementation patterns and configuration tradeoffs, see [[Nginx]].

![[Assets/System Design 101/0f72173713c3c8ef79a66db657ea539fb25b758b396d5561f28e7728e28bf1ff.png]]

## Trust and Scope

Choose proxy type by ownership and failure boundary:

- Forward proxy: policy-controlled client path to external services.
- Reverse proxy: public entry point for service traffic, plus routing, TLS edge, and buffering.

Neither is automatically secure. Identity and trust are defined by configuration controls: authentication, rewritten headers, certificate handling, and bypass policy.

If you use an enterprise forward proxy with interception, TLS is terminated at the proxy and headers are policy-bound. If you use a non-intercepting tunnel, encryption remains end-to-end to the upstream endpoint.

## Example

- Forward proxy: `Browser -> enterprise forward proxy CONNECT api.example.com:443 -> target` normally makes the target observe the proxy's network address. The proxy still sees the client, and authentication or forwarding metadata can expose client identity, so it remains a trusted observer that needs strict allowlists and tunnel policy.
- Reverse proxy: `Internet client -> reverse proxy (TLS terminate) -> app service` centralizes ingress rules. If the reverse proxy drops or rewrites `X-Forwarded-For` incorrectly, downstream systems can record the proxy IP instead of the real client.

## Shared Failure Pattern

Proxy centralization concentrates outage risk. Redundant instances reduce single-path blast radius, and `502/504` class failures usually indicate upstream/proxy boundary issues before application logic.

## References

- [Proxy vs Reverse Proxy (ByteByteGo snapshot)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/proxy-vs-reverse-proxy.md) — source distinction and request flow.
- [HTTP Semantics: CONNECT (RFC 9110 §9.3.6)](https://www.rfc-editor.org/rfc/rfc9110.html#name-connect) — tunnel request behavior.
- [HTTP Caching (RFC 9111)](https://www.rfc-editor.org/rfc/rfc9111) — shared cache behavior and freshness rules.
- [Forwarded HTTP Extension (RFC 7239)](https://www.rfc-editor.org/rfc/rfc7239) — proxy metadata and security expectations.
- [TLS 1.3 (RFC 8446)](https://www.rfc-editor.org/rfc/rfc8446) — the handshake and authentication boundary that tunneling preserves and interception terminates.
