---
topic:
  - Networks
subtopic:
  - Protocols
level:
  - "3"
priority: Medium
status: Creation
dg-publish: true
---

# RPC — Remote Procedure Call

RPC (Remote Procedure Call) is a communication style where a client invokes a server operation as if it were a local function call. The RPC framework handles serialization, network transport, and deserialization, hiding the network boundary from the caller. You define a service interface; the framework generates client stubs that make remote calls look like local method calls.

RPC is the foundation of [[Software Engineering/04 Networks/Protocols/gRPC|gRPC]] (Google's modern RPC framework) and was the basis of SOAP/WCF. It contrasts with [[Software Engineering/04 Networks/Protocols/REST|REST]], which models resources and uses HTTP verbs rather than procedure calls.

## How RPC Works

```text
Client                          Server
──────                          ──────
OrderService.PlaceOrder(req)
  → Serialize req to bytes
  → Send over TCP/HTTP
                                → Deserialize bytes to req
                                → Execute PlaceOrder(req)
                                → Serialize result to bytes
                                → Send response
  ← Deserialize bytes to result
  ← Return result to caller
```

The client stub makes the call look local. The network, serialization, and error handling are handled by the framework.

## RPC vs REST

| Dimension | RPC (gRPC) | REST |
|---|---|---|
| Interface style | Procedure/action-oriented (`PlaceOrder`, `GetUser`) | Resource-oriented (`POST /orders`, `GET /users/1`) |
| Contract | Strongly typed (Protobuf IDL, WSDL) | Loosely typed (OpenAPI, convention) |
| Serialization | Binary (Protobuf) — compact, fast | JSON/XML — human-readable, larger |
| Transport | HTTP/2 (gRPC) | HTTP/1.1 or HTTP/2 |
| Streaming | Native bidirectional streaming (gRPC) | Limited (SSE, WebSocket for push) |
| Browser support | Limited (requires gRPC-Web proxy) | Native |
| Best for | Internal service-to-service, high-throughput, streaming | Public APIs, browser clients, simple CRUD |

## The Fallacies of Distributed Computing

RPC's "local call" abstraction is leaky. The eight fallacies of distributed computing (Peter Deutsch) describe what RPC hides:

1. The network is reliable — it isn't. Calls can fail, time out, or be delivered twice.
2. Latency is zero — network calls are 100–1000× slower than local calls.
3. Bandwidth is infinite — serialization and payload size matter.
4. The network is secure — calls can be intercepted or replayed.

**Practical implication**: always handle RPC failures explicitly. Implement retries with idempotency keys, timeouts, and circuit breakers. Never assume a failed RPC means the server didn't execute the operation — it may have executed and the response was lost.

## References

- [[Software Engineering/04 Networks/Protocols/gRPC|gRPC]] — the modern RPC framework: Protobuf contracts, HTTP/2 transport, streaming, and .NET implementation.
- [[Software Engineering/04 Networks/Protocols/REST|REST]] — the alternative communication style: resource-oriented, HTTP verbs, JSON, browser-native.
- [Fallacies of distributed computing (Wikipedia)](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) — the eight assumptions that make distributed systems harder than they appear; essential context for any RPC-based system.
- [gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/) — official gRPC documentation covering service definitions, stub generation, and the four service types (unary, server streaming, client streaming, bidirectional).

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/04 Networks/04 Networks|04 Networks]]
>
> **Pages**
> - [[Software Engineering/04 Networks/Protocols/DNS|DNS]]
> - [[Software Engineering/04 Networks/Protocols/gRPC|gRPC]]
> - [[Software Engineering/04 Networks/Protocols/HTTP|HTTP]]
> - [[Software Engineering/04 Networks/Protocols/HTTP 2|HTTP 2]]
> - [[Software Engineering/04 Networks/Protocols/REST|REST]]
> - [[Software Engineering/04 Networks/Protocols/SMTP|SMTP]]
<!-- whats-next:end -->
