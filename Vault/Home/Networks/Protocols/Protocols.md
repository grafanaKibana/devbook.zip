---
topic:
  - Networks
subtopic:
  - Protocols
summary: "The agreed rules that let machines communicate, with each layer's protocols and debugging."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "3"
status: Done
---

Protocols are the agreed-upon rules that let machines communicate: what to send, in what order, and what to do when things go wrong. Every layer of the stack (link, network, transport, application) has its own protocol set, and production debugging often means knowing which layer broke the contract. Example: an HTTP 502 can mean the upstream is down, or it can mean a TLS version mismatch between proxy and origin that never shows up in application logs.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Choosing an API Style

Several of these protocols are interchangeable *styles* for client–server APIs, so the real decision is between them. [[DNS]] and [[SMTP]] are single-purpose protocols rather than API styles. [[HTTP]] and [[HTTP 2]] provide the HTTP application-protocol substrate used by REST, GraphQL, and gRPC; WebSocket begins with an HTTP opening handshake and then switches to its own bidirectional framing protocol.

| Style | Interaction | Contract and payload | Browser/cache boundary | Operational coupling |
| --- | --- | --- | --- | --- |
| [[REST]] | Request/response around resources | Server-owned HTTP contract; usually JSON, but media type is negotiable | Native browser reach; HTTP methods and URLs give intermediaries useful cache keys | Loose when resources and compatibility rules are stable; clients still coordinate representation changes |
| [[GraphQL]] | Client selects a graph-shaped response; subscriptions add server streams | Shared typed schema plus client-owned operation documents; commonly JSON over HTTP | Native HTTP, but arbitrary `POST /graphql` calls need persisted IDs or custom cache keys | Schema, cost, authorization, and resolver fan-out require a governed execution platform |
| [[RPC]] / [[gRPC]] | Unary calls or typed streams around operations | Code-generated service contract; gRPC normally uses Protocol Buffers and HTTP/2 framing | Direct browser use needs gRPC-Web or another bridge; HTTP caches do not understand method meaning | Tight schema/toolchain coupling is acceptable when both ends release under engineering control |
| [[WebSockets]] | Long-lived, bidirectional messages | Application-defined messages inside WebSocket frames | Browser-native, but not normal HTTP response caching | Every client consumes connection state; reconnect, resume, backpressure, and fan-out are application concerns |
| Webhook | Asynchronous server-to-server callback | Provider-owned HTTP event contract | Receiver endpoint rather than browser API; retries need event IDs and signature verification | Provider controls delivery schedule; consumer must tolerate duplicates and out-of-order arrival |

Default to REST for an external resource API with broad reach and useful HTTP caching. Choose GraphQL when independently evolving clients genuinely need selectable graph projections and the organization can govern one schema. Choose gRPC for controlled service-to-service contracts and streaming. Choose WebSockets only for low-latency bidirectional traffic; use webhooks when the receiver can expose an HTTP endpoint and eventual delivery is enough.

# References

- [RFC 3986: Uniform Resource Identifier (URI): Generic Syntax](https://datatracker.ietf.org/doc/html/rfc3986) — defines URI components, relative resolution, normalization, and percent-encoding.
- [MDN: URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) — browser-facing guide to parsing and manipulating URLs with the platform `URL` API.
- [Fielding dissertation, Chapter 5 — REST](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) — defines REST's resource, representation, uniform-interface, statelessness, cache, and layered-system constraints and their tradeoffs.
- [GraphQL Specification](https://spec.graphql.org/September2025/) — normative schema, operation, selection-set, execution, and response semantics behind client-selected graph projections.
- [gRPC Core Concepts](https://grpc.io/docs/what-is-grpc/core-concepts/) — official service-definition, generated-client, unary, and streaming RPC model.
- [RFC 6455 — The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455.html) — standard opening handshake, bidirectional framing, connection lifecycle, and security model.
- [Stripe Webhooks](https://docs.stripe.com/webhooks) — an authoritative provider example of signed event delivery, automatic retries, duplicate handling, and non-guaranteed event ordering.
- [ByteByteGo: Eight network protocols](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/explaining-8-popular-network-protocols-in-1-diagram.md) — source map corrected here for the HTTP/3, QUIC, UDP, HTTPS, and TLS boundaries.
- [ByteByteGo: API architectural styles](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/a-cheatsheet-on-comparing-api-architectural-styles.md) — source selector reframed around interaction, contract, reach, cacheability, and coupling rather than popularity.
