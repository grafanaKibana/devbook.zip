---
topic: [Networks]
subtopic: [Protocols]
summary: "Full-duplex, message-oriented communication over a long-lived connection or HTTP stream for real-time apps."
level: ["3"]
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Networks"
qard-topic: "Protocols/WebSockets"
flashcard_uid: "d66e2a8b"
created: "2026-06-20T08:45:59.000Z"
modified: "2026-10-28T12:33:42.000Z"
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

# Pitfalls

- **Reconnect loses session continuity.** WebSocket does not reconnect or replay missed messages. A client needs backoff and a resume cursor. The server needs bounded replay retention and idempotent resubscription. SignalR can perform reconnect attempts when configured, but it does not invent durable application state.
- **Idle and dead connections look similar.** Intermediaries can remove quiet connections. Ping/pong traffic keeps a path active and, with a timeout, detects an unresponsive peer. The browser API does not expose control frames, so browser applications often use an application heartbeat. ASP.NET Core's keep-alive interval alone does not enforce a pong deadline unless a timeout is configured.
- **Connection state has an owner.** Each live connection terminates on one server. Fan-out needs a directory or broker that can find that owner. Sticky routing plus pub/sub is one design. A managed connection service is another. Neither Redis nor stickiness is required by the protocol.
- **The classic browser API has weak backpressure.** `WebSocket.bufferedAmount` reports queued outbound bytes, but inbound messages arrive through events rather than a demand-aware stream. Servers compensate by bounding their queues, coalescing replaceable state, and disconnecting consumers that stay behind.
- **Concurrent writes need serialization.** .NET supports one send and one receive in parallel on a `WebSocket`. Multiple simultaneous sends on the same instance are unsupported. A single outbound queue should own frame ordering.
- **Request correlation is application data.** WebSocket carries messages, not RPC calls. A request/reply protocol needs correlation IDs, cancellation, deadlines, and duplicate handling.
- **`Origin` is a browser boundary, not authentication.** Browsers send `Origin` but do not apply CORS rules to WebSocket handshakes. Cookie-authenticated endpoints must allow only expected origins to prevent Cross-Site WebSocket Hijacking. Non-browser clients can omit or forge `Origin`, so the connection still needs normal authentication and authorization.

# Polling, SSE, and WebSockets

| Transport | Direction and lifetime | Intermediaries and browser support | Reconnect, resume, and backpressure | Per-client cost |
|---|---|---|---|---|
| Short polling | Client request/response on a timer | Ordinary HTTP. Works through caches and proxies when cache policy is correct | Retry is normal HTTP. Resume is the last version/cursor. Interval creates staleness and empty work | No permanent application connection, but request overhead scales with clients × poll frequency |
| Long polling | Client request held until an event or timeout, then immediately replaced | Ordinary HTTP, but proxy/server timeouts must exceed the hold period | Client reconnects after every response. Each new request carries a cursor. Pending requests and event batches need caps | One outstanding request plus repeated headers and timeout churn |
| Server-Sent Events | Long-lived server→client UTF-8 event stream | Native browser `EventSource`. HTTP-friendly, but buffering proxies must be disabled | Browser reconnects and sends `Last-Event-ID` only when a nonempty event ID is stored. An empty `id` field resets the stored ID, so later reconnects omit the header. Server needs replay retention. API has no explicit consumer-demand signal | One long response and server buffers/heartbeats per client |
| WebSocket | Long-lived full-duplex framed messages | Native browser API after HTTP handshake. Some proxies impose idle limits | Application owns reconnect, resume tokens, acknowledgements, and queue bounds. Browser API has limited backpressure | One stateful connection, heartbeat, subscription state, and outbound queue per client |

![[Networks/Networks-WebSockets-18120000.jpg|theme-aware]]

Short polling fits low-frequency state where seconds of staleness are acceptable. Long polling is mainly a compatibility bridge. SSE handles ordered server-to-browser updates and has a native replay cursor. WebSocket fits low-latency traffic in both directions. In .NET, SignalR is usually the smaller application surface unless wire-level control matters.

Every long-lived option needs a queue policy. The policy bounds per-client memory, coalesces replaceable state, and retains only enough history to honor documented resume tokens. A slow browser should lose stale updates or the connection, not grow an unbounded server queue.

# Questions

> [!qard]- What is WebSocket, and how is a WebSocket connection opened?
> WebSocket is a protocol for full-duplex, message-based communication over one long-lived connection: once the connection is open, either side can send a message at any time. It starts with an HTTP handshake, which lets it use the usual web ports and work with HTTP proxies and other intermediaries.
>
> The HTTP/1.1 opening handshake defined by RFC 6455 works as follows:
>
> 1. The client sends an HTTP `GET` request with `Upgrade: websocket`, `Connection: Upgrade` and a random `Sec-WebSocket-Key`.
> 2. A server that accepts replies `101 Switching Protocols` with a `Sec-WebSocket-Accept` value computed from that key. The value shows that the server understood the request as a WebSocket handshake rather than ordinary HTTP.
> 3. From then on, the same TCP connection carries WebSocket frames instead of HTTP messages. Data frames carry text or binary messages, and control frames carry ping, pong and the closing handshake.
> 
> `ws://` runs over plain TCP and `wss://` runs over TLS.
>
> The protocol provides framing and two-way delivery. It does not define request–response correlation, reconnection or resuming after a disconnect, so applications that need them build them on top.
>
> [RFC 6455: WebSocket](https://www.rfc-editor.org/rfc/rfc6455.html)

<!-- qard-id: 69cd7260-69f8-4974-b65e-f3af8ae3feb5 -->
> [!qard]- What conditions make Server-Sent Events a better fit than WebSockets?
> Server-Sent Events (SSE) fit better when updates flow mainly from server to browser, client actions can travel as ordinary HTTP requests, and built-in reconnection with a resume cursor is useful. WebSockets fit better when both sides need to send messages over the same long-lived connection, or when messages are binary.
>
> | Aspect | Server-Sent Events | WebSockets |
> |---|---|---|
> | Direction | One-way: the server sends an ordered stream of events in one long-lived HTTP response. Client actions use separate HTTP requests. | Full duplex: either side can send messages at any time on one connection. |
> | Message format | UTF-8 text events, so binary data has to be encoded as text. | Text or binary messages. |
> | Reconnection | The browser's `EventSource` reconnects automatically. If the stream has given it a nonempty event ID, the reconnection request sends that ID in a `Last-Event-ID` header. | Not part of the protocol. The application implements reconnection, usually with backoff. |
> | Resuming after a disconnect | Works only if the server tags events with IDs, keeps recent events and replays those after `Last-Event-ID`. Clients still have to tolerate duplicates or gaps. | The application defines its own resume tokens, replay and acknowledgements. |
> | Connection setup | An ordinary HTTP request and response. Intermediaries can drop a quiet stream, so servers often send periodic comment lines to keep it active. | Opens with an HTTP handshake, then exchanges WebSocket frames instead of HTTP messages. |
>
> Neither protocol guarantees a particular latency. Delivery time still depends on the server, the network and any intermediaries.
>
> [WHATWG: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) · [RFC 6455: WebSocket](https://www.rfc-editor.org/rfc/rfc6455.html)

# References

- [The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455)
- [Bootstrapping WebSockets with HTTP/2](https://www.rfc-editor.org/rfc/rfc8441)
- [Bootstrapping WebSockets with HTTP/3](https://www.rfc-editor.org/rfc/rfc9220)
- [WebSockets support in ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/websockets)
- [Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
