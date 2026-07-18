---
publish: true
created: 2026-07-18T08:16:22.034Z
modified: 2026-07-18T09:50:37.022Z
published: 2026-07-18T09:50:37.022Z
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

# Intro

A health check is a signal with a declared consumer and action. Process restart, traffic removal, deployment gating, and operator alerting need different evidence. One undifferentiated `/health` endpoint can turn a shared dependency outage into fleet-wide restart or eviction.

## Signal contract

- **Liveness:** can this process make progress? Keep it local and dependency-free when failure triggers a restart.
- **Readiness:** should this instance receive new traffic? Include instance-specific initialization and dependencies only when routing elsewhere can improve the result.
- **Startup:** has initialization completed far enough for normal liveness and readiness policy to apply? Use it to protect slow-starting processes from premature restart.

Name what a signal measures: event-loop progress, local state initialization, ability to serve reads, or ability to accept writes. A healthy process can still be unable to serve one operation, while an unhealthy shared dependency does not necessarily make one application instance uniquely bad.

## Active and passive observation

An active check probes an endpoint or transport on a schedule. It uses a timeout and thresholds such as three consecutive failures before removal and two successes before re-entry. A passive check observes real request failures such as TCP resets, timeouts, or an elevated configured error rate. Passive evidence can detect failures that synthetic probes miss, but application errors must be classified before they evict a backend.

Probe from the failure domain that needs evidence. A process checking itself cannot detect a zone-level routing partition. [[Failure Detection]] owns suspicion thresholds, gossip, quorum context, ownership transfer, and fencing when observation must coordinate distributed state.

## Actions and failure amplification

Consumers must document the action behind each signal:

| Signal consumer | Typical action | Main risk |
| --- | --- | --- |
| Process supervisor | Restart the process | Restart loop during an external outage |
| Load balancer | Stop routing new requests | Empty pool after shared dependency failure |
| Deployment controller | Pause rollout or keep an instance unavailable | Rollout deadlock from an impossible readiness gate |
| Operator alert | Investigate or mitigate | Alert storm from redundant symptoms |

A globally shared database outage usually affects every replica. Putting it in every readiness check can remove the entire fleet, replacing controlled `503` responses or degraded reads with no endpoint. Include it only when the instance is uniquely unhealthy or the application cannot serve any useful contract. This is a fail-open/fail-closed decision: fail closed for an invariant that cannot be protected, but do not claim the whole process is dead when only one capability is unavailable.

Recovery needs thresholds and ramp-up. A cold instance can pass a shallow probe before caches, connections, or model clients are ready for full traffic. Require sustained recovery evidence and use slow start or bounded concurrency during re-entry.

## ASP.NET Core example

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

`StartupProbe` can stay unhealthy while this replica warms required local state, then become healthy after initialization. The separate readiness check answers whether the initialized process can serve requests now; a real service would include bounded local conditions such as a draining flag or exhausted worker capacity, while excluding shared dependencies whose outage would evict every replica. Keep probe timeouts below the consumer's timeout and expose dependency telemetry separately even when it is not a routing signal. [[Load Balancing]] owns how readiness filters a destination pool before weights, latency, or connection-count algorithms run.

## References

- [Health checks in ASP.NET Core](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks) — official registration, filtering, publishers, and endpoint behavior.
- [Kubernetes liveness, readiness, and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — primary restart, routing, and startup-gating semantics.
- [AWS Builders Library: Implementing health checks](https://aws.amazon.com/builders-library/implementing-health-checks/) — fleet-level risks, dependency scope, and fail-open/fail-closed behavior.
