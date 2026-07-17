---
publish: true
created: 2026-07-16T16:55:26.934Z
modified: 2026-07-16T16:55:26.934Z
published: 2026-07-16T16:55:26.934Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: A focused .NET gateway implementation using YARP routes, clusters, transforms, and resilience boundaries.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

# Intro

YARP is Microsoft's reverse-proxy toolkit for building a .NET edge gateway. It provides routing, destination selection, transforms, health checks, and extensibility without defining business policy. Reach for it when gateway behavior must be owned in ASP.NET Core and configuration alone is not enough.

## Minimal gateway

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

var app = builder.Build();
app.MapReverseProxy();
app.Run();
```

```json
{
  "ReverseProxy": {
    "Routes": {
      "orders": {
        "ClusterId": "orders-cluster",
        "Match": { "Path": "/api/orders/{**catch-all}" },
        "Transforms": [
          { "PathRemovePrefix": "/api" }
        ]
      }
    },
    "Clusters": {
      "orders-cluster": {
        "Destinations": {
          "orders-a": { "Address": "https://orders.internal/" }
        }
      }
    }
  }
}
```

The route matches the public path, the cluster owns destinations and load-balancing policy, and the transform removes the external prefix before forwarding.

## Production boundaries

- Authenticate before proxying and authorize by route or endpoint metadata.
- Forward trace context and a stable request ID; do not log bearer tokens or request bodies by default.
- Apply client-facing rate limits at the edge. Keep downstream concurrency limits and bulkheads near the protected dependency.
- Use active or passive destination health only when the signal distinguishes one destination from the rest of the fleet.
- Bound retries to replayable requests. A gateway retry of an uncertain `POST` needs an end-to-end idempotency contract.

Keep aggregation small and read-oriented. If gateway code starts deciding order eligibility, payment state, or inventory invariants, move that logic to the owning service.

## References

- [YARP getting started](https://learn.microsoft.com/aspnet/core/fundamentals/servers/yarp/getting-started) — official registration, configuration, and proxy endpoint setup.
- [YARP configuration files](https://learn.microsoft.com/aspnet/core/fundamentals/servers/yarp/config-files) — official route, cluster, destination, and transform schema.
- [YARP health checks](https://learn.microsoft.com/aspnet/core/fundamentals/servers/yarp/dests-health-checks) — official active and passive destination health behavior.
- [ASP.NET Core rate limiting](https://learn.microsoft.com/aspnet/core/performance/rate-limit) — official middleware and policy model for edge quotas.
