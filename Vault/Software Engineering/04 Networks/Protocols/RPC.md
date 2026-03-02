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

## Pitfalls

**Versioning hell**
Changing a Protobuf message (removing a field, reusing a field number) breaks existing clients. Mitigation: never remove or reuse field numbers; use the `reserved` keyword for deprecated fields; version service names (`OrderServiceV2`) for breaking changes.

**Tight coupling through generated stubs**
Client and server must share the same `.proto` file. A server-side change requires regenerating and redeploying all clients. Treat `.proto` files as a public API contract with the same backward-compatibility rules as a REST API.

**Serialization overhead masking latency**
Protobuf is fast, but large messages (nested objects, repeated fields) still add serialization cost. A 10KB Protobuf message serialized 10,000 times/sec adds measurable CPU. Profile serialization in hot paths; use streaming for large payloads instead of single large messages.

## gRPC C# Example

```csharp
// Server implementation
public class OrderServiceImpl : OrderService.OrderServiceBase
{
    public override Task<OrderResponse> PlaceOrder(
        OrderRequest request, ServerCallContext context)
    {
        // context.CancellationToken respects client-side deadlines
        return Task.FromResult(new OrderResponse
        {
            OrderId = Guid.NewGuid().ToString(),
            Status = "Accepted"
        });
    }
}

// Client call with deadline
var channel = GrpcChannel.ForAddress("https://localhost:5001");
var client = new OrderService.OrderServiceClient(channel);
var response = await client.PlaceOrderAsync(
    new OrderRequest { ProductId = "sku-123", Quantity = 2 },
    deadline: DateTime.UtcNow.AddSeconds(5)); // client-side timeout
```

## Questions

> [!QUESTION]- Why is RPC's 'local call' abstraction considered leaky?
> RPC hides the network boundary, but the network introduces failures that local calls never have: calls can time out, be delivered twice (at-least-once delivery), or fail with the server having already executed the operation. A failed RPC does not mean the server didn't execute — the response may have been lost. This forces callers to implement idempotency keys, retries with backoff, and circuit breakers — concerns that don't exist for local calls. The abstraction is useful but must not be trusted blindly.

> [!QUESTION]- When should you choose gRPC over REST?
> Choose gRPC for internal service-to-service communication where: (1) you need high throughput or low latency (binary Protobuf is 3-10x smaller than JSON), (2) you need bidirectional streaming, or (3) you want strongly typed contracts enforced at compile time. Choose REST for public APIs, browser clients (gRPC requires a proxy for browsers), or when human-readable payloads matter for debugging. The key constraint: gRPC requires HTTP/2 and a Protobuf toolchain; REST works with any HTTP client.


## References

- [[Software Engineering/04 Networks/Protocols/gRPC|gRPC]] — the modern RPC framework: Protobuf contracts, HTTP/2 transport, streaming, and .NET implementation.
- [[Software Engineering/04 Networks/Protocols/REST|REST]] — the alternative communication style: resource-oriented, HTTP verbs, JSON, browser-native.
- [Fallacies of distributed computing (Wikipedia)](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing) — the eight assumptions that make distributed systems harder than they appear; essential context for any RPC-based system.
- [gRPC core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/) — official gRPC documentation covering service definitions, stub generation, and the four service types (unary, server streaming, client streaming, bidirectional).
- [Protocol Buffers language guide (Google)](https://protobuf.dev/programming-guides/proto3/) — field numbering rules, reserved fields, and backward compatibility; essential for safe schema evolution.
- [gRPC .NET documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/grpc/) — ASP.NET Core gRPC server setup, client factory, interceptors, and health checks.

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
