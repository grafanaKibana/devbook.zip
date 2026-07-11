---
topic:
  - Programming
subtopic:
  - NET
summary: "ASP.NET Core's real-time framework for bidirectional server/client messaging over persistent connections, the default when the server must push updates immediately."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

SignalR is ASP.NET Core's real-time communication framework for bidirectional server/client messaging over persistent connections. It is the default choice when the server must push updates immediately (chat, live dashboards, collaborative workflows, notifications) without polling-heavy architectures. A stock trading dashboard, for example, uses SignalR to push price updates to 50,000 concurrent browser clients with sub-100ms delivery — replacing a 5-second polling interval that was generating 10,000 requests/second and still showing stale prices. SignalR hides transport negotiation details behind hubs, but production success still depends on scaling, connection lifecycle handling, and clear authorization boundaries.

## How It Works

### Mental Model

```mermaid
sequenceDiagram
  participant Client
  participant Hub as Hub runtime
  participant App as App service

  Client->>Hub: Connect and negotiate transport
  Hub->>App: Invoke hub method
  App->>Hub: Publish event/message
  Hub->>Client: Push update
```

SignalR negotiates the best available transport (WebSockets first, then fallback options). Hub methods are invoked per call on transient hub instances, and outbound messages are routed through `Clients.*` targets (`All`, `User`, `Group`, etc.).

### Example

Hub:

```csharp
public sealed class ChatHub : Hub
{
    public async Task Send(string message)
    {
        await Clients.All.SendAsync("message", message);
    }
}
```

Register in ASP.NET Core pipeline:

```csharp
builder.Services.AddSignalR();

var app = builder.Build();
app.MapHub<ChatHub>("/hubs/chat");
app.Run();
```

### Pushing from outside a hub

Most real apps push messages from a controller or background service, not from inside a hub method. Inject **`IHubContext<THub>`** to do that:

```csharp
public sealed class PriceUpdater(IHubContext<PriceHub> hub)
{
    public Task BroadcastAsync(decimal price, CancellationToken ct) =>
        hub.Clients.All.SendAsync("price", price, ct);
}
```

### Streaming and client results

- **Streaming**: a hub method returning `IAsyncEnumerable<T>` (or accepting a `ChannelReader<T>`) streams items incrementally instead of one big payload — good for live feeds and large transfers with backpressure.
- **Client results (.NET 7+)**: the server can *invoke a method on a client and await its return value* with `Clients.Client(id).InvokeAsync<T>(...)` — turning the normally fire-and-forget push into a request/response.

### Connection lifecycle

Override `OnConnectedAsync` / `OnDisconnectedAsync` to manage group membership and presence. The client supports **automatic reconnect** (`.WithAutomaticReconnect()`), but reconnection assigns a **new `ConnectionId`**, so re-add the connection to its groups on reconnect. SignalR delivers **at-most-once** with no built-in durability — if a client is offline when a message is sent, it's gone. Persist anything that must survive a disconnect (DB/queue) and replay on reconnect.

## Pitfalls

- Assuming hub instances are stateful leads to lost data because hubs are transient per invocation; keep connection/session state in `Context.Items` or external stores. In one production incident, a team stored a user's shopping cart in a hub field — every subsequent `SendAsync` call operated on an empty cart because the hub was a new instance, resulting in 12 hours of lost cart data before the bug was traced.
- Skipping `await` on `SendAsync` can drop messages when hub execution completes before send operations finish.
- Treating groups as authorization boundaries is unsafe: groups are routing constructs, not security policy enforcement.
- Multi-node deployments fail unpredictably without a scale-out plan (Azure SignalR Service or backplane) and correct session-affinity assumptions. A 4-node deployment without a backplane delivers messages only to clients connected to the originating node — roughly 75% of connected clients silently miss every broadcast, and the bug only manifests under load when connections distribute across nodes. The fix is a **backplane** (`AddStackExchangeRedis(...)`) that fans every message out to all nodes, **or** Azure SignalR Service which offloads connections entirely. Either way self-hosted SignalR needs **sticky sessions** (ARR affinity), because the initial negotiate and the transport connection must land on the same node — unless you disable the negotiate step or use the managed service.
- Forgetting that the transport **falls back** (WebSockets → Server-Sent Events → Long Polling) when WebSockets are unavailable. Long Polling especially amplifies the sticky-session requirement and the cost of a missing backplane; verify your proxy/load balancer allows WebSocket upgrades so you actually get the fast transport.

## Tradeoffs

- SignalR vs polling: SignalR gives lower latency and better network efficiency for frequent updates, while polling is simpler for low-frequency/eventually-consistent scenarios.
- Azure SignalR Service vs self-managed backplane: managed service reduces operational burden and sticky-session complexity, while self-managed options provide more infrastructure control.
- JSON vs MessagePack protocol: JSON is easier to debug and interoperate with, while MessagePack reduces payload size for high-throughput workloads.

## Questions

> [!QUESTION]- When is SignalR a good fit?
> - Use SignalR when clients need server-pushed updates with low latency (chat, collaboration, live telemetry).
> - It is most valuable when update frequency is high enough that polling wastes bandwidth or increases staleness.
> - If updates are rare and latency tolerance is high, simpler HTTP polling can be cheaper to operate.

> [!QUESTION]- What is the first scaling problem you will hit?
> - Cross-node message fan-out: messages sent on one server do not automatically reach clients connected to another node.
> - Plan scale-out early with Azure SignalR Service or a supported backplane, then validate routing under load tests.
> - Also validate sticky-session requirements for your chosen topology and transport strategy.

> [!QUESTION]- Why are SignalR groups not enough for authorization?
> - Groups control message routing, not permission checks.
> - Membership can change/rejoin over reconnect paths, so relying on groups alone risks privilege drift.
> - Enforce security with authentication and policy/role-based authorization on hub methods.

## Links

- [ASP.NET Core SignalR](https://learn.microsoft.com/aspnet/core/signalr/introduction?view=aspnetcore-10.0) - Official architecture and transport overview.
- [Use hubs in SignalR for ASP.NET Core](https://learn.microsoft.com/aspnet/core/signalr/hubs?view=aspnetcore-10.0) - Hub lifecycle, targeting APIs, and error handling.
- [Scale ASP.NET Core SignalR](https://learn.microsoft.com/aspnet/core/signalr/scale?view=aspnetcore-10.0) - Scale-out models, sticky sessions, and hosting constraints.
- [Authentication and authorization in SignalR](https://learn.microsoft.com/aspnet/core/signalr/authn-and-authz?view=aspnetcore-10.0) - Auth flows, token handling, and security rules.
- [Scaling SignalR at production scale (Ably)](https://ably.com/topic/scaling-signalr) - Practical scaling tradeoffs and operational pitfalls.
