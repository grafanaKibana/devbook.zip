---
topic:
  - Networks
subtopic:
  - Protocols
summary: "The agreed rules that let machines communicate, with each layer's protocols and debugging."
tags: [FolderNote]
publish: true
priority: High
level:
  - "3"
status: Done
---

Protocols define what machines exchange, how they sequence it, and how they react to failure. Each layer of the stack has its own contracts, from link framing through application messages. Production debugging often comes down to finding the first layer where the contract broke. An HTTP 502, for example, may point to a failed upstream application or to a TLS mismatch between proxy and origin that the application never sees.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Choosing an API Style

This folder mixes wire protocols with API styles and application mechanisms. [[DNS]] and [[SMTP]] solve specific infrastructure problems rather than offering general API styles. [[HTTP]] and [[HTTP 2]] provide the substrate used by REST, GraphQL, and gRPC. WebSocket starts with an HTTP opening handshake, then switches to its own bidirectional framing protocol.

| Style | Interaction | Contract and payload | Browser/cache boundary | Operational coupling |
| --- | --- | --- | --- | --- |
| [[REST]] | Request/response around resources | Server-owned HTTP contract. Usually JSON, but media type is negotiable | Native browser reach. HTTP methods and URLs give intermediaries useful cache keys | Loose when resources and compatibility rules are stable. Clients still coordinate representation changes |
| [[GraphQL]] | Client selects a graph-shaped response. Subscriptions add server streams | Shared typed schema plus client-owned operation documents. Commonly JSON over HTTP | Native HTTP, but arbitrary `POST /graphql` calls need persisted IDs or custom cache keys | Schema, cost, authorization, and resolver fan-out require a governed execution platform |
| [[RPC]] / [[gRPC]] | Unary calls or typed streams around operations | Code-generated service contract. GRPC normally uses Protocol Buffers and HTTP/2 framing | Direct browser use needs gRPC-Web or another bridge. HTTP caches do not understand method meaning | Tight schema/toolchain coupling is acceptable when both ends release under engineering control |
| [[WebSockets]] | Long-lived, bidirectional messages | Application-defined messages inside WebSocket frames | Browser-native, but not normal HTTP response caching | Every client consumes connection state. Reconnect, resume, backpressure, and fan-out are application concerns |
| Webhook | Asynchronous server-to-server callback | Provider-owned HTTP event contract | Receiver endpoint rather than browser API. Retries need event IDs and signature verification | Provider controls delivery schedule. Consumer must tolerate duplicates and out-of-order arrival |

REST is usually the least surprising choice for an external resource API that benefits from broad reach and HTTP caching. GraphQL fits independently evolving clients that need selectable graph projections, provided one schema can be governed well. GRPC fits controlled service-to-service contracts and typed streaming. WebSockets earn their connection-state cost when traffic must be low-latency and bidirectional. Webhooks fit asynchronous delivery to a receiver that can expose an HTTP endpoint and tolerate retries.

# References

- [Stripe Webhooks](https://docs.stripe.com/webhooks)
