---
publish: true
created: 2026-08-20T20:41:15.682Z
modified: 2026-08-20T20:41:15.682Z
published: 2026-08-20T20:41:15.682Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Horizontal scaling adds service instances. Stateless handlers are simplest, while stateful services need partitioning, replication, and routing.
level:
  - "2"
priority: High
status: Creation
---

Horizontal scaling (scale-out) adds service instances and divides work among them. [[Software Architecture/Distributed Systems/Scalability Patterns/Vertical Scaling]] instead gives one instance more resources. Scale-out can increase capacity and reduce the effect of one instance failing, but only while another component does not become the bottleneck.

Stateless request handlers are the simplest case because any replica can accept the next request. Shared sessions and files move to an external store, and a [[Software Architecture/Distributed Systems/Load Balancing|load balancer]] routes only to ready instances. Stateful services can also scale horizontally. They need explicit partition ownership, replication, and a routing or coordination rule when ownership moves.

# How Autoscaling Adds Capacity

An autoscaler observes a signal, computes a desired replica count, starts or stops instances, and waits for the new capacity to become usable. The signal must track the constrained resource. CPU is useful for CPU-bound request handlers. Queue age or backlog is often better for workers. More application replicas cannot repair a saturated database, connection limit, or external API quota.

This ASP.NET Core example externalizes session storage through the registered distributed cache. It covers incidental session state only. Business state still needs a partition owner and a replication plan.

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

This Kubernetes HPA targets average CPU utilization and limits how quickly capacity is removed:

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

The five-minute stabilization window does not pause every scale-in for five minutes. The controller considers recent recommendations and uses the highest value in the window, which smooths flapping metrics. New instances still need startup and readiness time before they contribute. Scale-out therefore reacts after load is observed unless spare capacity or an earlier signal covers that delay.

# What Limits Scale-Out

- **Local state:** in-memory sessions, local files, and per-instance locks break when the next request reaches another replica. Externalize incidental state or route intrinsic state by a stable owner.
- **Downstream pressure:** each replica can add database connections and concurrent calls. Twenty replicas with a pool size of 100 expose up to 2,000 database connections. Bound pools and total concurrency against the dependency, not per-instance convenience.
- **Uneven work:** sticky sessions and hot partition keys can leave one instance saturated while fleet averages look healthy.
- **Scale-in:** stop new work, drain connections or leases, and give handlers enough shutdown time. Removing an owner before its work moves can lose or duplicate effects.

[[Software Architecture/Distributed Systems/Load Balancing]] explains how routing excludes unready instances and distributes work among the rest.

Horizontal scaling earns its complexity when measured capacity grows enough to meet the target. If doubling replicas produces little throughput improvement, the bottleneck is elsewhere. [[Software Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]] explains how to identify that bottleneck before choosing a scaling method.

# Questions

> [!QUESTION]- What architectural prerequisites must be met before horizontal scaling works?
> Work must be divisible, routing must reach an eligible owner, and state must have a sharing or partition-ownership rule. Stateless handlers satisfy those constraints by externalizing shared state. A [[Software Architecture/Distributed Systems/Load Balancing|load balancer]] can distribute requests, while stateful services also need replication, ownership, and failover coordination.

> [!QUESTION]- Why can horizontal scaling fail even with many instances?
> More replicas can move saturation to the database, a connection pool, or an external quota. Local state can make replicas inconsistent, while sticky sessions or hot keys create uneven load. Startup delay also means new replicas may arrive after the overload has already caused failures.

# References

- [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [The Twelve-Factor App: Processes](https://12factor.net/processes)
- [Designing Distributed Systems](https://www.oreilly.com/library/view/designing-distributed-systems/9781491983638/)
