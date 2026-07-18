---
topic:
  - Networks
subtopic:
  - Protocols
summary: "Full-duplex, message-oriented communication over a single long-lived TCP connection for real-time apps."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

WebSocket (RFC 6455) is a full-duplex, message-oriented application protocol for long-lived browser/server communication. The common handshake upgrades an HTTP/1.1 connection; HTTP/2 can establish WebSockets with Extended CONNECT, carrying frames inside one multiplexed stream. WebSocket is one browser transport for chat, dashboards, games, and collaborative editing—not the only bidirectional option: WebRTC data channels and WebTransport expose different reliability, peer, and QUIC-based contracts.

# WebSocket vs Raw Socket vs HTTP

| | Raw [[Sockets\|TCP socket]] | WebSocket | HTTP request/response |
|---|---|---|---|
| Layer | Transport endpoint (OS) | Application protocol over a TCP connection or an HTTP/2 stream | Application protocol over TCP or QUIC |
| Direction | Full-duplex | **Full-duplex** | Client-initiated exchanges; request and response content can stream, and HTTP/2 or HTTP/3 can multiplex exchanges |
| Framing | None — you build it | Built-in **message** frames | Built-in (one message per request) |
| Setup | TCP handshake | HTTP/1.1 `Upgrade` or HTTP/2 Extended CONNECT | Requests reuse eligible connections |
| Browser-accessible | No | **Yes** (`WebSocket` API) | Yes |

The key distinction: a raw socket is an unframed byte pipe for a custom protocol; WebSocket standardizes the opening handshake, message framing, masking, ping/pong, and close behavior and is exposed through the browser `WebSocket` API.

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

After `101 Switching Protocols`, the connection exchanges WebSocket text, binary, and control frames. With HTTP/2 Extended CONNECT, the client sends `:method = CONNECT` and `:protocol = websocket`; a successful `2xx` response opens one stream for the same WebSocket frame protocol without switching the entire HTTP/2 connection. `ws://` is plaintext; use `wss://` across untrusted networks.

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

Most apps use a higher-level layer instead of raw frames — **[[SignalR]]** adds automatic reconnection, fallback transports, groups, and backplane scale-out on top of WebSockets.

# Pitfalls

- **No automatic reconnection.** The connection can drop (network blip, proxy idle-timeout, server restart) and the protocol won't reconnect for you. Clients must implement reconnect-with-backoff and the server must tolerate resubscription — or use SignalR, which does this.
- **Idle connections get culled.** Load balancers and proxies drop connections with no traffic. A server or non-browser client can send WebSocket `ping` control frames and observe `pong`. The browser `WebSocket` API exposes neither control, so browser applications need an application-level heartbeat message and timeout policy. A heartbeat proves recent application-path progress; it is not the same contract as TCP keep-alive.
- **Scaling is stateful.** Each live connection terminates on one server, so routing and fan-out must know which server owns each recipient. Sticky sessions plus a pub/sub backplane are one deployment; a managed connection service, partitioned connection directory, or application-owned broker can provide the same routing boundary. Do not present Redis or stickiness as protocol requirements.
- **No built-in request/response correlation.** WebSocket is a message stream, not RPC; if you need "call and await a reply," you add your own correlation IDs (or use a protocol designed for it).
- **Security: validate `Origin` and authenticate.** The browser sends an `Origin` header but does **not** enforce same-origin on WebSockets — a malicious page can open a `wss://` to your server (**Cross-Site WebSocket Hijacking**) and it will carry the user's cookies. Check `Origin` server-side and authenticate the connection (token in the first message or a short-lived ticket), since custom headers can't be set on the browser handshake.

# Polling, SSE, and WebSockets

| Transport | Direction and lifetime | Intermediaries and browser support | Reconnect, resume, and backpressure | Per-client cost |
|---|---|---|---|---|
| Short polling | Client request/response on a timer | Ordinary HTTP; works through caches and proxies when cache policy is correct | Retry is normal HTTP; resume is the last version/cursor; interval creates staleness and empty work | No permanent application connection, but request overhead scales with clients × poll frequency |
| Long polling | Client request held until an event or timeout, then immediately replaced | Ordinary HTTP, but proxy/server timeouts must exceed the hold period | Client reconnects after every response; carry a cursor; cap pending requests and event batches | One outstanding request plus repeated headers and timeout churn |
| Server-Sent Events | Long-lived server→client UTF-8 event stream | Native browser `EventSource`; HTTP-friendly, but buffering proxies must be disabled | Browser reconnects and sends `Last-Event-ID`; server needs replay retention; API has no explicit consumer-demand signal | One long response and server buffers/heartbeats per client |
| WebSocket | Long-lived full-duplex framed messages | Native browser API after HTTP handshake; some proxies impose idle limits | Application owns reconnect, resume tokens, acknowledgements, and queue bounds; browser API has limited backpressure | One stateful connection, heartbeat, subscription state, and outbound queue per client |

![[Networks/Networks-WebSockets-18120000.jpg]]

Choose short polling for low-frequency state where seconds of staleness are fine. Choose long polling as a compatibility bridge, not a default. Choose SSE for ordered server-to-browser updates with a replay cursor. Choose WebSockets when both sides must send low-latency messages. In .NET, reach for **SignalR** rather than raw WebSockets unless wire-level control matters; it provides transport fallback and reconnection helpers, but the application still owns durable resume and overload policy.

Backpressure must be explicit in every long-lived option. Bound the per-client queue, coalesce replaceable state, disconnect consumers that cannot keep up, and retain only enough history to honor documented resume tokens. An unbounded queue turns one slow browser into server memory growth.

# Questions

> [!QUESTION]- How is a WebSocket different from a raw TCP socket?
> A raw socket is an OS-level endpoint where the application defines framing and handshakes, and ordinary browser JavaScript cannot open one. WebSocket standardizes messages and control frames and is exposed through the browser `WebSocket` API. It commonly uses HTTP/1.1 Upgrade over TCP and can also use HTTP/2 Extended CONNECT.

> [!QUESTION]- Why does a WebSocket connection start as an HTTP request?
> So it can reuse origins, TLS, proxies, load balancers, and browser security policy on ports 80/443. HTTP/1.1 uses `101 Switching Protocols`; HTTP/2 uses a successful Extended CONNECT stream. Both then carry WebSocket frames under the negotiated transport.

> [!QUESTION]- When would you choose Server-Sent Events over WebSockets?
> When you only need **server→client** push (live feeds, notifications, progress updates) and not a client→server channel. SSE runs over plain HTTP, is simpler, and has automatic reconnection built into the browser `EventSource` API. Choose WebSockets when you need true bidirectional, low-latency messaging.

# References

- [The WebSocket Protocol (RFC 6455)](https://www.rfc-editor.org/rfc/rfc6455) — handshake, framing, and control frames.
- [Bootstrapping WebSockets with HTTP/2 (RFC 8441)](https://www.rfc-editor.org/rfc/rfc8441) — defines the Extended CONNECT mechanism for carrying WebSocket frames on one HTTP/2 stream.
- [WebSockets API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) — browser client API and usage patterns.
- [WebSockets support in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/websockets) — raw WebSocket handling in Kestrel.
- [Cross-Site WebSocket Hijacking (PortSwigger)](https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking) — the Origin-validation security pitfall.
- [WHATWG HTML: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) — defines `EventSource`, event framing, reconnection time, and last-event IDs.
- [ByteByteGo: Short polling, long polling, SSE, and WebSocket](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/shortlong-polling-sse-websocket.md) — source sequence visual expanded here with intermediary, resume, backpressure, and resource costs.
