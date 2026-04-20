---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/distributed-systems/scalability-patterns/horizontal-scaling/"}
---


# Horizontal Scaling

Horizontal scaling (scale-out) means adding more instances of a service and distributing incoming load across all of them, rather than making a single instance bigger (see [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Vertical Scaling\|Vertical Scaling]] for the alternative). It's the standard long-term strategy for stateless services because it offers near-linear capacity growth, fault tolerance through redundancy, and no single-instance ceiling. The catch: it only works when the service is genuinely stateless, all shared state lives outside the instance (database, cache, queue), and a [[Software Engineering/05 Architecture/Distributed Systems/Load Balancing\|load balancer]] sits in front to route traffic. Without those prerequisites, adding instances doesn't increase capacity — it creates inconsistency. For the broader context, see [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns\|Scalability Patterns]].

## How It Works

### Prerequisites

Before you can scale out, three things must be true:

1. **Stateless service design.** Each request must be fully self-contained. No in-memory session, no local file writes that other instances need to read. If instance A handles request 1 and instance B handles request 2 from the same user, both must produce the same result without sharing local state.

2. **Externalized state.** Sessions go to Redis or a distributed cache. Files go to blob storage (Azure Blob, S3). Locks go to a distributed lock service. The database is the source of truth, not the instance's memory.

3. **Load balancer in front.** A [[Software Engineering/05 Architecture/Distributed Systems/Load Balancing\|Load Balancing]] layer (Azure Load Balancer, NGINX, Kubernetes Service) distributes traffic across instances. Without it, all traffic still hits one node.

### Scale-Out and Scale-In

During **scale-out**, the orchestrator (Kubernetes, Azure App Service, AWS Auto Scaling) detects a trigger — CPU above 70%, request queue depth, custom metric — and provisions new instances. The load balancer's health checks confirm readiness before traffic is routed to the new instance. Cold start latency matters here: a .NET app that takes 10 seconds to warm up will not absorb a traffic spike instantly.

During **scale-in**, instances are drained (existing connections finish), then terminated. If scale-in is too aggressive, you oscillate: scale out, scale in, scale out again. This is the thundering herd problem at the infrastructure level.

### Distributed-Systems Costs

Horizontal scaling introduces coordination overhead that vertical scaling avoids:

- **Network hops.** Calls that were in-process are now over the network. A Redis cache lookup adds ~1ms; a distributed lock adds more.
- **Consistency.** Multiple instances reading and writing shared state need cache invalidation strategies. A write on instance A must be visible to instance B within an acceptable window.
- **Deployment complexity.** Rolling deploys, blue/green, or canary releases become necessary. You can't just restart one process.
- **Connection pool pressure.** Each instance opens its own connection pool to the database. Ten instances with a pool size of 100 means 1,000 potential connections — most databases have hard limits.

## Example: ASP.NET Core on Kubernetes with HPA

A typical setup: an ASP.NET Core API is stateless, sessions are stored in Redis, and Kubernetes Horizontal Pod Autoscaler (HPA) manages instance count.

**Stateless ASP.NET Core with Redis session:**

```csharp
// Program.cs
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"];
    options.InstanceName = "myapp:";
});

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(20);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// No in-memory session provider — all session data goes to Redis
```

**Kubernetes HPA targeting CPU utilization:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # prevent oscillation
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
```

The `stabilizationWindowSeconds: 300` on scale-down prevents the thundering herd: the HPA waits 5 minutes of sustained low CPU before removing instances, avoiding rapid oscillation.

## Pitfalls

**Stateful services that can't actually scale out.** An ASP.NET Core app using in-memory `IDistributedCache` or `TempData` backed by in-memory storage will silently break when scaled to 2+ instances. User A's session is on pod 1; their next request hits pod 2 and finds nothing. The fix is replacing in-memory providers with Redis before scaling out, not after.

**Database becomes the bottleneck.** Scaling the app tier from 2 to 20 instances multiplies database connection pressure by 10. A SQL Server instance with a 200-connection limit will start rejecting connections. Mitigation: use a connection pooler (PgBouncer for Postgres, Azure SQL's built-in pooling), tune pool sizes per instance (`Max Pool Size` in the connection string), and consider read replicas for read-heavy workloads.

**Uneven load distribution.** Sticky sessions (affinity routing) pin users to specific instances, defeating horizontal scaling's fault tolerance. If instance 3 handles all "heavy" users and instance 1 handles light ones, CPU-based autoscaling fires on the wrong signal. Prefer stateless routing; if affinity is unavoidable (e.g., WebSocket connections), account for it in capacity planning.

**Thundering herd on scale-out.** A traffic spike triggers scale-out, but new instances take 15-30 seconds to start and warm up. During that window, existing instances absorb the full load and may fail, triggering more scale-out events. Mitigation: keep a warm minimum replica count (`minReplicas: 2`), use pre-warming or KEDA event-driven scaling that reacts earlier, and set CPU targets conservatively (70% not 90%).

**Cold-start amplification.** In .NET, JIT compilation and DI container initialization add startup latency. Under load, a new pod that's still warming up will have high response times, which can cause the load balancer to mark it unhealthy and remove it before it's useful. Use readiness probes that check actual application health (a `/health/ready` endpoint that verifies Redis and DB connectivity), not just process liveness.

## Tradeoffs

| Dimension | Horizontal Scaling | Vertical Scaling |
|---|---|---|
| **Capacity ceiling** | Near-unlimited (add nodes) | Hard limit (largest VM SKU) |
| **Fault tolerance** | High — N-1 instances survive one failure | None — single instance failure = outage |
| **Cost model** | Pay per instance; can scale to zero | Pay for reserved large VM even at low load |
| **Latency** | Adds network hops for shared state | No added network overhead |
| **Complexity** | High — statelessness, load balancing, distributed state | Low — just resize the VM |
| **Best for** | Stateless APIs, web frontends, worker services | Stateful legacy apps, databases, ML inference |
| **Prerequisite** | Stateless design, externalized state | None |

Vertical scaling is the right first move for a stateful service you can't refactor, or when you need a quick fix with minimal risk. Horizontal scaling is the right long-term strategy for any service that needs to survive instance failures and grow beyond a single machine's limits.

## Questions

> [!QUESTION]- What architectural prerequisites must be met before horizontal scaling works?
> **Expected answer:**
> - Service must be stateless — no in-memory session or local file state.
> - All shared state externalized (Redis for cache/session, blob storage for files, database for persistent data).
> - A [[Software Engineering/05 Architecture/Distributed Systems/Load Balancing\|load balancer]] must distribute traffic across instances.
> - Without statelessness, adding instances creates inconsistency rather than capacity.
> - Without a load balancer, all traffic still hits one node.
> **Why this is strong:** It shows horizontal scaling is an architectural property, not just an ops action. Many engineers think "add more servers" is always safe.

> [!QUESTION]- Why can horizontal scaling fail even with many instances?
> **Expected answer:**
> - Database becomes the bottleneck — each instance opens its own connection pool (20 instances × 100 pool size = 2,000 connections).
> - Stateful services silently break (in-memory session on pod 1 invisible to pod 2).
> - Uneven load distribution from sticky sessions or hot partitions.
> - Thundering herd during scale-out when new instances aren't ready fast enough.
> - Connection pool or thread pool saturation before CPU becomes the bottleneck.
> **Why this is strong:** It demonstrates awareness that scaling one tier shifts the bottleneck downstream — a classic distributed-systems trap.

## References

- [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) — official HPA docs covering metrics, behavior tuning, and scaling algorithms
- [Azure App Service autoscale](https://learn.microsoft.com/en-us/azure/app-service/manage-scale-up) — Azure-specific scale-out configuration and limits
- [Designing Distributed Systems — Brendan Burns (O'Reilly)](https://www.oreilly.com/library/view/designing-distributed-systems/9781491983638/) — practitioner patterns for scalable, reliable distributed architectures
- [The Twelve-Factor App — Processes](https://12factor.net/processes) — canonical reference for stateless process design, the foundational prerequisite for horizontal scaling

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/Distributed Systems/Distributed Systems\|Distributed Systems]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Distributed Systems/Scalability Patterns/Vertical Scaling\|Vertical Scaling]]
<!-- whats-next:end -->
