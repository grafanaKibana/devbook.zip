---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Full-duplex, message-oriented communication over a long-lived connection or HTTP stream for real-time apps."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

WebSocket (RFC 6455) is a full-duplex, message-oriented protocol for a long-lived browser/server channel. The common opening handshake upgrades an HTTP/1.1 connection. Extended CONNECT carries the same frame protocol on one HTTP/2 stream, and RFC 9220 adapts that mechanism to HTTP/3.

The browser API makes WebSocket useful for chat, dashboards, games, and collaborative editing. It is still a transport choice rather than an application contract. Reconnect, resume, authorization, overload behavior, and request correlation remain above the protocol.

# WebSocket Vs Raw Socket Vs HTTP

| | Raw [[Sockets\|TCP socket]] | WebSocket | HTTP request/response |
|---|---|---|---|
| Layer | Transport endpoint (OS) | Application protocol over TCP, an HTTP/2 stream, or an HTTP/3 stream | Application protocol over TCP or QUIC |
| Direction | Full-duplex | **Full-duplex** | Client-initiated exchanges. Request and response content can stream, and HTTP/2 or HTTP/3 can multiplex exchanges |
| Framing | None. The application defines it | Built-in **message** frames | Built-in request and response messages |
| Setup | TCP handshake | HTTP/1.1 `Upgrade` or Extended CONNECT over HTTP/2 or HTTP/3, subject to stack support | Requests reuse eligible connections |
| Browser-accessible | No | **Yes** (`WebSocket` API) | Yes |

A raw TCP socket exposes an unframed byte stream. WebSocket adds an opening handshake, message framing, client masking, ping/pong control frames, and an orderly close handshake. The browser `WebSocket` API exposes messages rather than raw TCP access.

# How It Works

The common HTTP/1.1 opening handshake upgrades a connection in place:

```text
Client → Server:
  GET /chat HTTP/1.1
  Host: example.com
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
  Sec-WebSocket-Version: 13

Server → Client:
  HTTP/1.1 101 Switching Protocols
  Upgrade: websocket
  Connection: Upgrade
  Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
── From here the same TCP connection carries WebSocket frames ──
```

After `101 Switching Protocols`, the connection carries text, binary, and control frames. One message can span multiple frames, so a receiver using a frame-level API must assemble fragments until `EndOfMessage`. With HTTP/2 Extended CONNECT, a successful `2xx` response opens one stream without switching the whole connection. HTTP/3 follows the same extended-CONNECT model over QUIC. `ws://` is plaintext. Production browser traffic normally uses `wss://`.

# Example (.NET)

ASP.NET Core handles WebSockets without a separate server:

```csharp
app.UseWebSockets();

app.Map("/ws", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    var buffer = new byte[4096];

    while (socket.State == WebSocketState.Open)
    {
        var result = await socket.ReceiveAsync(buffer, context.RequestAborted);
        if (result.MessageType == WebSocketMessageType.Close) break;

        // echo the message back
        await socket.SendAsync(
            buffer.AsMemory(0, result.Count),
            result.MessageType, result.EndOfMessage, context.RequestAborted);
    }
});
```

The echo sketch exits when it receives a close frame but does not send the required close response. A production handler must call `CloseAsync` with the received close status and description before disposal, while respecting request cancellation and a bounded close timeout.

Most .NET applications can use **[[SignalR]]** instead of owning raw frames. SignalR adds a hub/RPC model, groups, and fallback transports. Automatic reconnect is available but opt-in in ASP.NET Core SignalR clients, and durable resume still belongs to the application.

# Pitfalls

- **Reconnect loses session continuity.** WebSocket does not reconnect or replay missed messages. A client needs backoff and a resume cursor. The server needs bounded replay retention and idempotent resubscription. SignalR can perform reconnect attempts when configured, but it does not invent durable application state.
- **Idle and dead connections look similar.** Intermediaries can remove quiet connections. Ping/pong traffic keeps a path active and, with a timeout, detects an unresponsive peer. The browser API does not expose control frames, so browser applications often use an application heartbeat. ASP.NET Core's keep-alive interval alone does not enforce a pong deadline unless a timeout is configured.
- **Connection state has an owner.** Each live connection terminates on one server. Fan-out needs a directory or broker that can find that owner. Sticky routing plus pub/sub is one design. A managed connection service is another. Neither Redis nor stickiness is required by the protocol.
- **The classic browser API has weak backpressure.** `WebSocket.bufferedAmount` reports queued outbound bytes, but inbound messages arrive through events rather than a demand-aware stream. Bound server queues, coalesce replaceable state, and disconnect consumers that stay behind.
- **Concurrent writes need serialization.** .NET supports one send and one receive in parallel on a `WebSocket`. Multiple simultaneous sends on the same instance are unsupported. A single outbound queue should own frame ordering.
- **Request correlation is application data.** WebSocket carries messages, not RPC calls. A request/reply protocol needs correlation IDs, cancellation, deadlines, and duplicate handling.
- **`Origin` is a browser boundary, not authentication.** Browsers send `Origin` but do not apply CORS rules to WebSocket handshakes. Cookie-authenticated endpoints must allow only expected origins to prevent Cross-Site WebSocket Hijacking. Non-browser clients can omit or forge `Origin`, so the connection still needs normal authentication and authorization.

# Polling, SSE, and WebSockets

| Transport | Direction and lifetime | Intermediaries and browser support | Reconnect, resume, and backpressure | Per-client cost |
|---|---|---|---|---|
| Short polling | Client request/response on a timer | Ordinary HTTP. Works through caches and proxies when cache policy is correct | Retry is normal HTTP. Resume is the last version/cursor. Interval creates staleness and empty work | No permanent application connection, but request overhead scales with clients × poll frequency |
| Long polling | Client request held until an event or timeout, then immediately replaced | Ordinary HTTP, but proxy/server timeouts must exceed the hold period | Client reconnects after every response. Carry a cursor. Cap pending requests and event batches | One outstanding request plus repeated headers and timeout churn |
| Server-Sent Events | Long-lived server→client UTF-8 event stream | Native browser `EventSource`. HTTP-friendly, but buffering proxies must be disabled | Browser reconnects and sends `Last-Event-ID`. Server needs replay retention. API has no explicit consumer-demand signal | One long response and server buffers/heartbeats per client |
| WebSocket | Long-lived full-duplex framed messages | Native browser API after HTTP handshake. Some proxies impose idle limits | Application owns reconnect, resume tokens, acknowledgements, and queue bounds. Browser API has limited backpressure | One stateful connection, heartbeat, subscription state, and outbound queue per client |

![[Networks/Networks-WebSockets-18120000.jpg]]

Short polling fits low-frequency state where seconds of staleness are acceptable. Long polling is mainly a compatibility bridge. SSE handles ordered server-to-browser updates and has a native replay cursor. WebSocket fits low-latency traffic in both directions. In .NET, SignalR is usually the smaller application surface unless wire-level control matters.

Every long-lived option needs a queue policy. Bound per-client memory, coalesce replaceable state, and retain only enough history to honor documented resume tokens. A slow browser should lose stale updates or the connection, not grow an unbounded server queue.

# Questions

> [!QUESTION]- When would you choose Server-Sent Events over WebSockets?
> SSE fits ordered server-to-browser events when ordinary HTTP requests already cover client commands. `EventSource` reconnects and sends `Last-Event-ID`, giving the server a natural replay cursor. WebSocket fits low-latency bidirectional messages, but the application must define its own resume contract.

# References

- [The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [Bootstrapping WebSockets with HTTP/2](https://www.rfc-editor.org/rfc/rfc8441)
- [Bootstrapping WebSockets with HTTP/3](https://www.rfc-editor.org/rfc/rfc9220)
- [WebSockets support in ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/websockets)
- [Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
