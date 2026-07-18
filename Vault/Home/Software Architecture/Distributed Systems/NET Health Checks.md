---
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: "ASP.NET Core liveness and readiness endpoints that improve routing without creating fleet-wide eviction."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

ASP.NET Core health checks expose signals that an orchestrator or load balancer can use to restart a broken process or stop routing new traffic to an unready instance. Liveness and readiness answer different questions. A bad dependency check can turn one shared outage into removal of every healthy application replica.

## Signals

- **Liveness:** can this process make progress? Keep it local and dependency-free. A liveness failure commonly causes restart.
- **Readiness:** should this instance receive new traffic? Include instance-specific initialization and dependencies only when routing to another replica can help.

A globally shared database outage usually affects every replica. Putting that database in every readiness check can evict the whole fleet from the load balancer, replacing controlled `503` responses with no endpoints. Include it only when an instance that cannot reach the database is uniquely unhealthy or the application truly cannot serve any useful request.

## ASP.NET Core configuration

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddCheck<StartupProbe>("startup", tags: ["ready"]);

var app = builder.Build();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live")
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();
```

`StartupProbe` can report unhealthy while this replica warms required local state, then healthy once initialization completes. Keep probe timeouts shorter than the orchestrator timeout and expose dependency telemetry separately even when it is not a routing signal.

## References

- [Health checks in ASP.NET Core](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks) — official registration, filtering, publishers, and endpoint behavior.
- [Kubernetes configure liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — primary routing and restart semantics for each probe.
- [AWS Builders Library: Implementing health checks](https://aws.amazon.com/builders-library/implementing-health-checks/) — fleet-level risks of dependency checks and fail-open/fail-closed behavior.
