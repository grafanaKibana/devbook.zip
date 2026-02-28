---
topic:
  - Architecture
subtopic:
  - Distributed Systems
level:
  - "2"
priority: High
status: Ready To Repeat
dg-publish: true
---

# Intro

Load balancing distributes incoming traffic across multiple service instances so one instance does not become a bottleneck or a single point of failure. In system design interviews, this is usually the first infrastructure building block because it enables horizontal scale without changing client behavior. It matters for availability, failure isolation, and predictable latency under burst traffic. Reach for it as soon as a service runs on more than one instance, especially for AI APIs where request cost varies by prompt size and model path.

## Mechanism

Load balancers can operate at different layers, and that layer choice drives what routing decisions are possible.

- **L4 transport layer**
  - Routes using connection metadata such as source and destination IP, port, and protocol.
  - Works for TCP and UDP.
  - Fast and lightweight because it does not parse application payloads.
  - Cannot route by HTTP path, header, host, or cookie.
- **L7 application layer**
  - Understands HTTP and can route by host, path, method, header, or cookie.
  - Supports advanced traffic policies such as canary, A/B, and auth edge checks.
  - Adds processing overhead versus L4.

```mermaid
flowchart LR
    C[Client] --> LB[Load Balancer]
    LB --> A[Server A]
    LB --> B[Server B]
    LB --> D[Server C]
```

Practical interview rule: pick L4 for high-throughput generic transport routing, pick L7 when business routing logic depends on request content.

## Algorithms

No single algorithm is best; choose based on workload shape and fairness goals.

Algorithm | How it routes | Prefer when | Main risk
--- | --- | --- | ---
Round robin | Cycles requests evenly across instances. | Backend instances are similar and request cost is roughly uniform. | Slow instances still get equal share and can queue up.
Weighted round robin | Round robin with per-instance weight multipliers. | Instance sizes differ, such as mixed VM sizes or mixed CPU generations. | Static weights drift from real capacity after noisy-neighbor effects or throttling.
Least connections | Picks the instance with the fewest active connections. | Connection duration varies, such as streaming or long-running AI completions. | Connection count may not reflect CPU or memory cost for short but expensive requests.
IP hash | Deterministically maps client IP to backend. | You need simple affinity without external session storage. | NAT gateways can collapse many users to one IP and create hotspots.
Consistent hashing | Maps keys to a hash ring with minimal remapping when nodes change. | Cache locality, shard affinity, and gradual scale changes matter. | Too few virtual nodes or poor weights can skew ring ownership, and hot keys can still create hotspots even with a balanced ring.

For AI inference endpoints, request duration and compute cost vary heavily, so pick the algorithm by measuring p95 and p99 latency, error rate, and backend saturation under representative load instead of assuming one default winner.

## Health Checks

Health checks decide whether an instance should stay in the active pool.

- **Active health checks**
  - The load balancer probes endpoints such as `/health/live` and `/health/ready` on a fixed interval.
  - It uses threshold logic, for example three consecutive failures means out of rotation.
  - It can use timeout budgets to detect hung instances.
- **Passive health checks**
  - The load balancer watches real request failures like timeouts and TCP resets, and L7 proxies or gateways can also track elevated HTTP 5xx rates when configured.
  - Useful when synthetic probes pass but real traffic fails.

Typical state transition:

1. Instance fails probes or exceeds passive error thresholds.
2. LB marks it unhealthy and removes it from new request routing.
3. Existing requests are drained, failed, or retried according to policy.
4. Instance must pass recovery criteria before re-entry.

Important implementation point: a readiness endpoint must verify critical dependencies, not just return process-alive.

## .NET Context

ASP.NET Core services with Kestrel are commonly deployed behind a reverse proxy or managed load balancer.

- **Kestrel behind reverse proxy**
  - Common options are NGINX, YARP, ingress controllers, or cloud-managed LBs.
  - Proxy handles ingress concerns such as TLS termination, route matching, and header forwarding.
- **Azure service choices**
  - **Azure Load Balancer** is L4 and optimized for high-performance TCP or UDP distribution.
  - **Azure Application Gateway** is L7 and supports HTTP routing, TLS policy controls, and WAF features.

Minimal readiness and liveness setup in ASP.NET Core.
The `AddSqlServer` and `AddRedis` probes below come from the community Xabaril health checks packages (`AspNetCore.HealthChecks.SqlServer` and `AspNetCore.HealthChecks.Redis`).
If your team prefers only Microsoft-maintained dependencies, use custom `AddCheck` implementations for dependency readiness.

```bash
dotnet add package AspNetCore.HealthChecks.SqlServer
dotnet add package AspNetCore.HealthChecks.Redis
```

```csharp
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("MainDb")!)
    .AddRedis(builder.Configuration.GetConnectionString("Redis")!);

var app = builder.Build();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = _ => true
});

app.MapGet("/", () => Results.Ok("service-ready"));

app.Run();
```

Session affinity in .NET systems:

- It helps as a short-term bridge when legacy in-memory session state exists.
- It hurts elasticity and failure recovery because clients are pinned to specific instances.
- Preferred senior design is stateless APIs plus shared state in Redis or another durable store.

## Pitfalls

### Sticky sessions can defeat balancing goals

- **What goes wrong**: load concentrates on a subset of instances while others stay underused.
- **Why**: affinity preserves client-to-instance mapping even as traffic patterns change.
- **Mitigation**: externalize session state, shorten affinity TTL, and apply affinity only when strictly required.

### Health endpoint does not validate dependencies

- **What goes wrong**: failing instances remain in rotation because `/health` always returns 200.
- **Why**: liveness is implemented, readiness is not.
- **Mitigation**: split liveness and readiness, include DB cache queue checks in readiness, and alert on dependency failure rates.

### Thundering herd when recovering instances

- **What goes wrong**: a recovered instance receives too much traffic too quickly and fails again.
- **Why**: immediate full reintroduction with cold caches and cold code paths.
- **Mitigation**: use slow-start ramp-up, pre-warm caches and model clients, and cap concurrent requests during warmup.

### TLS termination in the wrong place

- **What goes wrong**: security boundaries become unclear or latency increases unexpectedly.
- **Why**: inconsistent decisions between edge termination, re-encryption, and passthrough.
- **Mitigation**: define trust boundaries early, document where certificates live, and use mTLS internally when compliance requires it.

## Tradeoffs

Decision | Option A | Option B | How to choose
--- | --- | --- | ---
Layer | L4 | L7 | Need content-aware routing and edge features versus lower overhead data-plane routing
Session model | Sticky sessions | Stateless with shared store | Migration speed versus long-term resilience and autoscaling quality
TLS strategy | Terminate at LB | End-to-end encryption to service | Operational simplicity versus stricter east-west security requirements
Health model | Active only | Active plus passive | Simplicity versus better detection of real user-facing failures

## Questions

> [!QUESTION]- Your AI service has four instances behind an L7 gateway with passive outlier detection enabled. One instance returns HTTP 500 on about 30 percent of requests. How does the LB detect and handle this?
> **Expected answer**
> - Use active probes with failure thresholds and passive error observation from live traffic.
> - Mark the instance unhealthy after threshold breach and remove it from new routing.
> - Keep it out until it meets consecutive-success recovery checks.
> - If ingress is L4 or passive outlier detection is unavailable, rely on active checks plus retry and circuit-breaker policies in clients or gateways.
> - Add retries and circuit breakers at the caller or gateway for graceful degradation.
> **Why this question matters**
> - It tests production failure handling, not just basic definition knowledge.

> [!QUESTION]- When is Azure Load Balancer the better choice than Azure Application Gateway for an ASP.NET Core workload?
> **Expected answer**
> - Azure Load Balancer when L4 TCP or UDP distribution is enough and minimal overhead is preferred.
> - Azure Application Gateway when L7 HTTP capabilities are needed, such as path routing, WAF, and rich TLS controls.
> - Mention that Kestrel typically sits behind one of these ingress layers.
> **Why this question matters**
> - It validates whether the candidate can map requirements to concrete cloud services.

> [!QUESTION]- Why can sticky sessions hurt autoscaling outcomes, and what architecture is safer?
> **Expected answer**
> - Sticky sessions create uneven distribution and reduce failover quality.
> - Scale-out does not fully rebalance existing pinned clients.
> - Safer architecture is stateless service instances plus shared session state in Redis or a database.
> **Why this question matters**
> - It checks practical judgment about reliability and elasticity tradeoffs.

## References

- [Azure Load Balancer overview](https://learn.microsoft.com/azure/load-balancer/load-balancer-overview)
- [ASP.NET Core health checks](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks)
- [NGINX HTTP load balancing guide](https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/)
- [Xabaril ASP.NET Core Diagnostics Health Checks](https://github.com/Xabaril/AspNetCore.Diagnostics.HealthChecks)
- [Google SRE book chapter on handling overload](https://sre.google/sre-book/handling-overload/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Topics**
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues/Message Queues|Message Queues]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Distributed Systems/API Gateway|API Gateway]]
> - [[Software Engineering/05 Architecture/Distributed Systems/CAP theorem|CAP theorem]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Consistency Models|Consistency Models]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Distributed Transactions|Distributed Transactions]]
> - [[Software Engineering/05 Architecture/Distributed Systems/IaaS, PaaS, SaaS, CaaS|IaaS, PaaS, SaaS, CaaS]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Message Queues|Message Queues]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Observability|Observability]]
> - [[Software Engineering/05 Architecture/Distributed Systems/REST|REST]]
> - [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns|Scalability Patterns]]
<!-- whats-next:end -->
