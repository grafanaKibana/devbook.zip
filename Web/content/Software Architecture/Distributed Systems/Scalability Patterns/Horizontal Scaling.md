---
publish: true
created: 2026-10-28T12:27:03.072Z
modified: 2026-10-28T12:27:33.566Z
published: 2026-10-28T12:27:33.566Z
topic:
  - Software Architecture
subtopic:
  - Distributed Systems
summary: Horizontal scaling adds service instances. Stateless handlers are simplest, while stateful services need partitioning, replication, and routing.
level:
  - "2"
priority: High
status: Creation
qard-deck: Software Architecture
qard-topic: Distributed Systems/Scalability Patterns/Horizontal Scaling
flashcard_uid: 07349cc0
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

- **Local state:** in-memory sessions, local files, and per-instance locks break when the next request reaches another replica. Incidental state moves to an external store, while intrinsic state is routed by a stable owner.
- **Downstream pressure:** each replica can add database connections and concurrent calls. Twenty replicas with a pool size of 100 expose up to 2,000 database connections. Pool sizes and total concurrency need bounds set against the dependency, not per-instance convenience.
- **Uneven work:** sticky sessions and hot partition keys can leave one instance saturated while fleet averages look healthy.
- **Scale-in:** an instance stops accepting new work, drains connections or leases, and allows its handlers enough shutdown time. Removing an owner before its work moves can lose or duplicate effects.

[[Software Architecture/Distributed Systems/Load Balancing]] explains how routing excludes unready instances and distributes work among the rest.

Horizontal scaling earns its complexity when measured capacity grows enough to meet the target. If doubling replicas produces little throughput improvement, the bottleneck is elsewhere. [[Software Architecture/Distributed Systems/Scalability Patterns/Scalability Patterns|Scalability Patterns]] explains how to identify that bottleneck before choosing a scaling method.

# Questions

> [!qard]- What is the difference between horizontal and vertical scaling?
> Vertical scaling (scaling up) gives one instance more resources, such as a larger VM. Horizontal scaling (scaling out) adds instances and divides the work among them.
>
> The direction changes several practical consequences:
>
> | Aspect | Vertical scaling | Horizontal scaling |
> |---|---|---|
> | How capacity grows | A larger machine runs the same instance, so work does not have to be divided. | More instances share the load, which works only when work can be divided and routed among them. |
> | Upper limit | The largest available instance size caps growth. | Shared dependencies, such as the database, become the limit rather than one machine. |
> | Disruption while scaling | Resizing often makes the instance temporarily unavailable, so it is automated less often. | Instances can be added or removed while the application keeps running, which suits autoscaling. |
> | Effect of an instance failure | Adds no redundancy. A failed instance takes all of its capacity with it. | Remaining instances can keep serving while the failed one is replaced. |
> | State | Scaling one instance up does not by itself require moving in-process state. | Shared state must move outside interchangeable instances, or stateful work needs explicit partition ownership. |
>
> [Microsoft: Autoscaling guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/auto-scaling) · [The Twelve-Factor App: Concurrency](https://12factor.net/concurrency) · [The Twelve-Factor App: Processes](https://12factor.net/processes)

<!-- qard-id: 3519a1dc-d268-4d95-bb60-6ad491ba0d75 -->

> [!qard]- What architectural prerequisites must be met before horizontal scaling works?
> Work must be divisible across instances, and routing must reach an instance able to own or process it. Shared durable state must live outside interchangeable workers, or stateful work needs explicit partition ownership and routing. Stateless processes are a simpler case because any replica can take the next unit; they do not mean the application has no persistent state. [The Twelve-Factor App: Processes](https://12factor.net/processes) · [The Twelve-Factor App: Concurrency](https://12factor.net/concurrency)

<!-- qard-id: 410b3f2e-b17c-4be8-82e4-a5a5e81f6ef2 -->

> [!qard]- Why can horizontal scaling fail even with many instances?
> Adding instances helps only when the instances themselves are the bottleneck and work actually spreads across them. Otherwise extra replicas add load or cost without adding useful capacity.
>
> - **Downstream saturation:** each replica adds its own database connections and outbound calls. Twenty replicas with a pool of 100 connections each can open up to 2,000 connections, so the database, a connection limit or an external API quota saturates instead.
> - **Instance-local state:** sessions, files or locks held in one process are missing when the next request reaches another replica, so requests fail or behave inconsistently.
> - **Uneven distribution:** a hot partition key or sticky routing can overload one instance while fleet averages look healthy. More replicas do not relieve the instance that owns the hot work.
> - **Scaling lag:** an autoscaler acts on observed metrics, and new instances need startup and readiness time before they serve traffic. Capacity therefore arrives after demand has risen unless spare capacity or an earlier signal covers the delay.
>
> When throughput barely improves after the replica count doubles, the bottleneck is elsewhere.
>
> [The Twelve-Factor App: Processes](https://12factor.net/processes) · [Microsoft: Autoscaling guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/auto-scaling) · [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)

# References

- [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [The Twelve-Factor App: Processes](https://12factor.net/processes)
- [Designing Distributed Systems](https://www.oreilly.com/library/view/designing-distributed-systems/9781491983638/)
