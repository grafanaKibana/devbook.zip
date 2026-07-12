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

# Intro

Protocols are the agreed-upon rules that let machines communicate: what to send, in what order, and what to do when things go wrong. Every layer of the stack (link, network, transport, application) has its own protocol set, and production debugging often means knowing which layer broke the contract. Example: an HTTP 502 can mean the upstream is down, or it can mean a TLS version mismatch between proxy and origin that never shows up in application logs.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Choosing an API Style

Several of these protocols are interchangeable *styles* for client–server APIs, so the real decision is between them. ([[DNS]] and [[SMTP]] are single-purpose protocols, not API styles; [[HTTP]] and [[HTTP 2]] are the transport substrate the styles below run over.)

| Style | Model | Transport | Payload | Streaming | Reach for it when |
| --- | --- | --- | --- | --- | --- |
| [[REST]] | Resources identified by URIs, manipulated with HTTP verbs; stateless | HTTP/1.1+ | Text, usually JSON | Request/response — no native server push | Public, resource-centric, CRUD-heavy APIs; browser and mobile clients; cacheable, evolvable domains |
| [[RPC]] | Call a remote operation as if it were a local function; stubs hide the network | Varies (HTTP, TCP) | Framework-defined | Depends on the framework | Action/verb-centric APIs where the model is operations, not resources |
| [[gRPC]] | Contract-first RPC — the `.proto` file is the API spec | HTTP/2 | Binary (Protocol Buffers) | Unary plus client-, server-, and bidirectional-streaming | Internal service-to-service you control both ends of; polyglot code-gen, low latency, first-class streaming |
| [[WebSockets]] | Full-duplex, message-oriented, persistent connection | One long-lived TCP connection (HTTP upgrade) | Text or binary frames | Bidirectional — either side sends any time | Real-time browser apps: chat, live dashboards, multiplayer games, collaborative editing |

Default to REST for public, resource-shaped APIs that benefit from HTTP caching and broad client reach. Reach for gRPC when you own both ends and want fast binary contracts and streaming between services (RPC is the general "call a procedure" model that gRPC specializes over HTTP/2). Choose WebSockets when the server must push to the client in real time rather than only answer requests.

## References

- [RFC 3986: Uniform Resource Identifier (URI): Generic Syntax](https://datatracker.ietf.org/doc/html/rfc3986)
- [MDN: URL](https://developer.mozilla.org/en-US/docs/Web/API/URL)
