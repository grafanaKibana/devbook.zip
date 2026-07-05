---
publish: true
created: 2026-07-05T10:53:36.613+03:00
modified: 2026-07-05T15:49:35.025+03:00
---

# Intro

WebSocket (RFC 6455) is an application-layer protocol that provides **full-duplex, message-oriented** communication over a single long-lived TCP connection. Unlike HTTP's request-response model, either side can send a message at any time without being asked — which is what makes it the standard transport for **real-time web**: chat, live dashboards, multiplayer games, collaborative editing, and server-pushed notifications. It is _not_ the same as a raw [[Sockets|socket]]: a WebSocket runs **over** TCP, is established through an HTTP handshake, adds message framing, and is the only bidirectional transport browsers can open natively.

## WebSocket vs Raw Socket vs HTTP

| | Raw [[Sockets\|TCP socket]] | WebSocket | HTTP request/response |
|---|---|---|---|
| Layer | Transport endpoint (OS) | Application protocol over TCP | Application protocol over TCP |
| Direction | Full-duplex | **Full-duplex** | Half-duplex (client asks, server answers) |
| Framing | None — you build it | Built-in **message** frames | Built-in (one message per request) |
| Setup | TCP handshake | HTTP `Upgrade` → then persists | New request each time (or keep-alive reuse) |
| Browser-accessible | No | **Yes** (`WebSocket` API) | Yes |

The key distinction: a raw socket is the unframed byte pipe you'd use for a custom protocol on a server; a WebSocket is a _standardized_ framed protocol that traverses the web's HTTP/proxy/firewall infrastructure and works in browsers.

## How It Works

A WebSocket connection starts life as an **HTTP request** and is _upgraded_ in place:

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

After the `101 Switching Protocols` handshake, the connection stops speaking HTTP and exchanges **frames**: text or binary messages, plus control frames (`ping`/`pong` for keep-alive, `close` for the shutdown handshake). `ws://` is plaintext; **`wss://`** is WebSocket over TLS (and the only thing you should use in production).

## Example (.NET)

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

## Pitfalls

- **No automatic reconnection.** The connection can drop (network blip, proxy idle-timeout, server restart) and the protocol won't reconnect for you. Clients must implement reconnect-with-backoff and the server must tolerate resubscription — or use SignalR, which does this.
- **Idle connections get culled.** Load balancers and proxies drop connections with no traffic (often 60s). Send periodic `ping` frames (or app-level heartbeats) to keep the path alive — the same concern as TCP keep-alive.
- **Scaling is stateful.** A WebSocket pins a client to one server for the connection's life, so a broadcast must reach clients on _other_ servers. You need **sticky sessions** plus a **backplane** (Redis pub/sub) to fan messages across instances — exactly the [[SignalR]] scale-out problem.
- **No built-in request/response correlation.** WebSocket is a message stream, not RPC; if you need "call and await a reply," you add your own correlation IDs (or use a protocol designed for it).
- **Security: validate `Origin` and authenticate.** The browser sends an `Origin` header but does **not** enforce same-origin on WebSockets — a malicious page can open a `wss://` to your server (**Cross-Site WebSocket Hijacking**) and it will carry the user's cookies. Check `Origin` server-side and authenticate the connection (token in the first message or a short-lived ticket), since custom headers can't be set on the browser handshake.

## Tradeoffs

| Transport | Direction | Best for | Weakness |
|---|---|---|---|
| **WebSocket** | Full-duplex | Bidirectional, low-latency real-time (chat, games, collab) | Stateful scaling; no built-in reconnect |
| **Server-Sent Events (SSE)** | Server→client only | One-way streams (feeds, notifications) over plain HTTP | No client→server channel; text only |
| **HTTP long polling** | Simulated push | Fallback where WebSockets are blocked | High overhead, latency |
| **[[gRPC]] streaming** | Full-duplex | Service-to-service streaming with contracts | Not browser-native (needs gRPC-Web) |

**Decision rule**: use WebSockets when the client and server both need to push messages at low latency. If you only need server→client, **SSE** is simpler (plain HTTP, auto-reconnect built in). In .NET, reach for **SignalR** rather than raw WebSockets unless you have a specific reason — it picks the best transport and solves reconnection and scale-out for you.

## Questions

> [!QUESTION]- How is a WebSocket different from a raw TCP socket?
> A raw socket is the OS-level, unframed byte-stream endpoint — you implement your own message boundaries, handshakes, and (in a browser, you can't open one at all). A WebSocket is a standardized application protocol _over_ TCP: it's established via an HTTP `Upgrade` handshake, has built-in message framing and ping/pong/close control frames, traverses HTTP proxies/firewalls on 80/443, and is exposed to browsers through the native `WebSocket` API.

> [!QUESTION]- Why does a WebSocket connection start as an HTTP request?
> So it can reuse the web's existing infrastructure — ports 80/443, TLS, proxies, load balancers, and browser security model — and _upgrade_ a normal HTTP connection in place (`101 Switching Protocols`) rather than requiring a new port or protocol that firewalls would block. After the upgrade, the same TCP connection carries WebSocket frames instead of HTTP.

> [!QUESTION]- When would you choose Server-Sent Events over WebSockets?
> When you only need **server→client** push (live feeds, notifications, progress updates) and not a client→server channel. SSE runs over plain HTTP, is simpler, and has automatic reconnection built into the browser `EventSource` API. Choose WebSockets when you need true bidirectional, low-latency messaging.

## References

- [The WebSocket Protocol (RFC 6455)](https://www.rfc-editor.org/rfc/rfc6455) — handshake, framing, and control frames.
- [WebSockets API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) — browser client API and usage patterns.
- [WebSockets support in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/websockets) — raw WebSocket handling in Kestrel.
- [Cross-Site WebSocket Hijacking (PortSwigger)](https://portswigger.net/web-security/websockets/cross-site-websocket-hijacking) — the Origin-validation security pitfall.
