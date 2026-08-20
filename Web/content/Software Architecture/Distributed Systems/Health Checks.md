---
publish: true
created: 2026-08-20T20:41:15.678Z
modified: 2026-08-20T20:41:15.678Z
published: 2026-08-20T20:41:15.678Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Health checks expose bounded service signals whose consumers decide when to restart, stop routing, degrade, or alert.
level:
  - "3"
priority: High
status: Ready to Repeat
---

A health check is a signal with a declared consumer and action. Restarting a process needs different evidence from removing traffic or gating a deployment. One undifferentiated `/health` endpoint can turn a shared dependency outage into fleet-wide restart or eviction.

# Liveness, Readiness, and Startup

- **Liveness:** can this process make progress? Keep it local and dependency-free when failure triggers a restart.
- **Readiness:** should this instance receive new traffic? Include instance-specific initialization and dependencies only when routing elsewhere can improve the result.
- **Startup:** has initialization completed far enough for normal liveness and readiness policy to apply? Use it to protect slow-starting processes from premature restart.

Each signal names the capability it measures, such as event-loop progress, completed local initialization, or the ability to accept writes. A healthy process can still be unable to serve one operation. An unhealthy shared dependency does not necessarily make one application instance uniquely bad.

# Active and Passive Observation

An active check probes an endpoint or transport on a schedule. It uses a timeout and thresholds such as three consecutive failures before removal, followed by two successes before re-entry. A passive check observes real request failures, including TCP resets or an elevated error rate. Passive evidence can expose failures that synthetic probes miss, but application errors need classification before they evict a backend.

The probe originates outside the failure domain under test, or from each consumer vantage point whose reachability is being evaluated. A process checking itself cannot detect a zone-level routing partition.

# Actions and Failure Amplification

Consumers must document the action behind each signal:

| Signal consumer | Typical action | Main risk |
| --- | --- | --- |
| Process supervisor | Restart the process | Restart loop during an external outage |
| Load balancer | Stop routing new requests | Empty pool after shared dependency failure |
| Deployment controller | Pause rollout or keep an instance unavailable | Rollout deadlock from an impossible readiness gate |
| Operator alert | Investigate or mitigate | Alert storm from redundant symptoms |

A globally shared database outage usually affects every replica. Putting it in every readiness check can empty the fleet, replacing controlled `503` responses or degraded reads with no endpoint. The dependency belongs there only when the instance is uniquely unhealthy or the application cannot serve any useful contract. This is a fail-open/fail-closed decision. Failure stays closed when an invariant cannot be protected, but one unavailable capability does not make the whole process dead.

Recovery needs thresholds and a ramp-up period. A cold instance can pass a shallow probe before its connections or model clients are ready for full traffic. Sustained recovery evidence prevents flapping. Slow start or bounded concurrency limits the load during re-entry.

# ASP.NET Core Example

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks()
    .AddCheck(
        "self",
        () => HealthCheckResult.Healthy(),
        tags: ["live"])
    .AddCheck<StartupProbe>("startup", tags: ["startup"])
    .AddCheck(
        "request-serving",
        () => HealthCheckResult.Healthy(),
        tags: ["ready"]);

var app = builder.Build();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("live")
});

app.MapHealthChecks("/health/startup", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("startup")
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.Run();
```

`StartupProbe` can stay unhealthy while this replica warms required local state, then become healthy after initialization. The separate readiness check answers whether the initialized process can serve requests now. A real service can include bounded local conditions such as a draining flag or exhausted worker capacity, while excluding shared dependencies whose outage would evict every replica. Probe timeouts stay below the consumer's timeout. Dependency telemetry remains visible even when it is not a routing signal. A [[Software Architecture/Distributed Systems/Load Balancing|load balancer]] filters unready destinations before applying weights, latency, or connection-count algorithms.

# References

- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Implementing health checks](https://aws.amazon.com/builders-library/implementing-health-checks/)
- [Health checks in ASP.NET Core](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks)
