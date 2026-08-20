---
publish: true
created: 2026-08-20T20:41:15.633Z
modified: 2026-08-20T20:41:15.634Z
published: 2026-08-20T20:41:15.634Z
topic:
  - Networks
subtopic:
  - Protocols
summary: A style where a client invokes a server operation like a local function call.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Remote Procedure Call (RPC) exposes operations on another process through a client API. A generated stub or client library serializes the arguments, sends a request, waits for a response, and maps the result back into the caller's language.

The API may resemble a local method, but its failure model is remote. The call crosses a network, runs in a different failure domain, and may complete even when the caller never receives the response. That boundary is the central fact of RPC.

RPC is a family of approaches, not one wire protocol. [[gRPC]] uses service definitions, Protocol Buffers by default, and HTTP/2. SOAP/WCF and JSON-RPC make different choices. [[REST]] draws the interface around resources and representations rather than named operations.

# How RPC Works

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

The stub removes encoding and transport boilerplate. It cannot remove latency, partial failure, or uncertainty about whether a timed-out operation ran on the server.

# RPC Vs REST

| Dimension | RPC | REST-style HTTP API |
|---|---|---|
| Interface shape | Named operations such as `PlaceOrder` | Resource state and links, commonly `POST /orders` |
| Contract | Often an IDL with generated clients. The mechanism depends on the RPC system | May use OpenAPI and generated clients. REST itself does not require an IDL |
| Encoding | Chosen by the framework, such as Protobuf or JSON | Commonly JSON, although the media type is negotiable |
| Transport | Framework-specific. GRPC commonly uses HTTP/2 | HTTP semantics are part of the architectural style |
| Streaming | Framework-specific. GRPC supports four RPC shapes | Usually modeled with HTTP responses, SSE, or a separate WebSocket protocol |
| Best fit | Operation-oriented service contracts under coordinated ownership | Resource-oriented APIs that benefit from HTTP visibility, caching, and broad clients |

# The Fallacies of Distributed Computing

RPC's local-call syntax is useful and dangerous in equal measure. The fallacies of distributed computing name assumptions that the syntax can hide:

1. The network is reliable. Requests and responses can be delayed, lost, or interrupted.
2. Latency is zero. Even a healthy remote call crosses queues, protocol stacks, and another scheduler.
3. Bandwidth is infinite. Encoding and payload shape affect cost and tail latency.
4. The network is secure. Authentication, authorization, confidentiality, and replay defenses remain protocol concerns.

Every RPC needs an explicit deadline and a defined response to ambiguous failure. Retries belong only where the operation is safe to repeat or the server deduplicates attempts. A transport error says that the caller lacks a result. It does not prove that the server skipped the work.

# Delivery Semantics

Delivery labels describe execution bounds, not business outcomes:

- **At-most-once** allows zero or one execution. An implementation may avoid retries or suppress duplicates with request identifiers. The caller can still end in an unknown state after losing the response.
- **At-least-once** retries until success or a policy limit. Work is less likely to be lost, but one logical request may execute several times.
- **Exactly-once effect** requires application cooperation. Durable deduplication, an idempotency key, and the state change must share a consistency boundary. The transport alone cannot provide that result through every failure.

The normal design is bounded at-least-once delivery for retryable calls plus idempotent server behavior. When duplicate suppression must survive crashes, its record belongs in the same transaction as the side effect. This connects the [[gRPC|gRPC retry policy]] to the consistency boundary described by [[ACID|distributed transactions]].

# Pitfalls

**Breaking a shared contract**
For Protobuf-based RPC, field numbers are wire identities. Existing fields must not be renumbered, and deleted numbers should be reserved. Additive wire-safe changes still need application-level review because generated APIs and validation rules can change independently of the bytes.

**Mistaking code generation for coordinated deployment**
Generated stubs give compile-time names and types, but compatible clients and servers should remain independently deployable. A change that forces every client to regenerate and ship at once is a contract migration problem, not an unavoidable property of RPC.

**Letting large calls hide in a method signature**
A typed request can still carry an unbounded collection or object graph. Large messages increase allocation, flow-control pressure, and retry cost. Put size limits at the boundary and use streaming when the data is naturally incremental.

# gRPC C# Example

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

# References

- [Protocol Buffers language guide](https://protobuf.dev/programming-guides/proto3/)
- [gRPC for .NET](https://learn.microsoft.com/aspnet/core/grpc/)
