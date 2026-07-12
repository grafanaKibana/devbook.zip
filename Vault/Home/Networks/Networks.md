---
icon: network
order: 40
color: "#f59e0b"
topic:
  - Networks
subtopic: []
summary: "Protocols, latency, and reliability of how machines communicate over a network."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "3"
status: Done
---

# Intro

Networking is how software becomes a system: protocols, latency, reliability, and the failure modes between machines. Most production bugs are distributed bugs in disguise, so a solid network model is a force multiplier. Example: an HTTP timeout can be caused by DNS, TCP congestion, TLS negotiation, or the application itself.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## The Layer Model

Networking is easiest to reason about as a stack of layers, each depending on the one below. A single request touches all of them, so knowing which layer owns a symptom is half of debugging:

| Layer | Owns | Examples | Typical failure |
|---|---|---|---|
| Link | Frames on the local wire | Ethernet, Wi-Fi, ARP | Driver/physical issues, local congestion |
| Internet | Addressing and routing between networks | [[Home/Networks/Transport & Sockets/TCP IP\|IP]], ICMP, routing | Unreachable host, wrong route, MTU/fragmentation |
| Transport | End-to-end delivery between processes | [[Home/Networks/Transport & Sockets/TCP IP\|TCP]], [[Home/Networks/Transport & Sockets/UDP\|UDP]], ports | Refused/reset connections, retransmit-driven latency |
| Application | What the bytes mean | [[Home/Networks/Protocols/HTTP\|HTTP]], [[Home/Networks/Protocols/DNS\|DNS]], TLS, [[Home/Networks/Protocols/gRPC\|gRPC]] | Wrong status, slow handshakes, protocol mismatch |

TLS sits between transport and application, and DNS is an application-layer lookup most requests pay for first — which is why "the site is slow" so often turns out to be resolution or handshake cost, not the payload.

## Questions

> [!QUESTION]- How do you choose between REST/HTTP, gRPC, and WebSockets for service-to-service communication?
> - REST over HTTP is the default for public and cross-team APIs: cacheable, debuggable with ordinary tools, and universally supported, at the cost of verbose payloads and request/response-only semantics
> - gRPC wins for high-volume internal calls: binary Protobuf encoding, HTTP/2 multiplexing, and generated typed clients cut latency and boilerplate, but it needs tooling and is awkward to call from a browser
> - WebSockets fit genuinely bidirectional workloads like chat and collaborative editing; Server-Sent Events fit one-way server push — live updates, notifications — where the alternative is the client polling
> - The deciding questions are audience (public vs internal), traffic shape (request/response vs streaming), and whether human-debuggable payloads are worth the extra bytes

## References

- [High Performance Browser Networking (Ilya Grigorik)](https://hpbn.co/) — free O'Reilly book; the practical reference for latency, TCP, TLS, HTTP/1.1–2, and WebSockets.
- [MDN Web Docs: HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP) — authoritative reference for HTTP semantics, methods, status codes, and headers.
- [Cloudflare Learning Center: What is DNS?](https://www.cloudflare.com/learning/dns/what-is-dns/) — clear vendor-neutral explainers for DNS, CDNs, and how a request traverses the network.
- [gRPC documentation](https://grpc.io/docs/what-is-grpc/introduction/) — official introduction to gRPC, Protocol Buffers, and its HTTP/2 streaming model.
