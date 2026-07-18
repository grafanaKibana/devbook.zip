---
publish: true
created: 2026-07-15T11:47:56.074Z
modified: 2026-07-18T11:38:38.733Z
published: 2026-07-18T11:38:38.733Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: Uses provider-managed functions, containers, messaging, storage, or databases with service-defined scaling and billing.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

Serverless architecture delegates capacity provisioning, patching, and much of the availability control plane to a provider. It includes FaaS, serverless containers, managed queues and event buses, object storage, and databases whose billing and scaling are service-defined. It does not mean every service scales to zero, has no idle charge, or bills only per invocation.

Reach for it when workload shape matches a managed service contract and reduced infrastructure ownership outweighs platform constraints. A queue-triggered function, a Cloud Run service, and a serverless database are different products with different concurrency, state, latency, and cost boundaries.

# Function example

This Azure Function performs one concrete scheduled operation while keeping durable state in a repository:

```csharp
public sealed class ExpiredSessionCleanup(ISessionRepository sessions)
{
    [Function("ExpiredSessionCleanup")]
    public Task RunAsync(
        [TimerTrigger("0 */5 * * * *")] TimerInfo timer,
        CancellationToken ct)
    {
        return sessions.DeleteExpiredAsync(DateTimeOffset.UtcNow, ct);
    }
}
```

The function process may be reused and can safely reuse clients and connection pools, but correctness cannot depend on its memory surviving. Durable progress belongs in managed storage.

# Triggers and managed services

HTTP, timers, queues, object notifications, and event buses are common function triggers. Serverless containers accept ordinary container workloads with provider-managed capacity; some products can scale to zero and others keep minimum instances. Managed databases and queues remove host management but retain quotas, consistency, retention, and pricing contracts.

# AWS Lambda execution orientation

![[Assets/System Design 101/aae14f041eec7ebaf0b4ed863793f574fd3b11dfc73ccf0b2f29dd8f4d5a539e.png]]

The visual is a dated fleet model, not an AWS compatibility contract. The stable behavior is isolated execution environments that may be initialized, reused, frozen, reset, or removed.

## Execution lifecycle

An AWS Lambda environment has initialization, invocation, and shutdown or reset phases. Azure Functions has analogous host and worker initialization governed by its hosting plan. Providers may freeze an idle environment and resume it later, replace it after an error, or add environments to handle concurrency.

```csharp
public sealed class Function
{
    private static readonly HttpClient Http = new();

    public async Task<Response> HandleAsync(Request request, CancellationToken ct)
    {
        using var response = await Http.GetAsync(
            $"https://catalog.internal/items/{request.ItemId}", ct);
        return new Response(response.IsSuccessStatusCode);
    }
}
```

Reusing `HttpClient` reduces connection churn when the process is warm. Correctness cannot depend on the static field surviving; durable state belongs in an external database, queue, or object store.

## Cold-start controls

Cold-start time includes environment allocation, runtime boot, code loading, and application initialization. It varies by platform, runtime, package size, networking, and configuration, so measure the chosen plan and region rather than relying on a universal range. Provisioned or minimum instances trade fixed cost for predictable latency. Snapshot and restore features can reduce initialization for supported runtimes, but restored state needs checks for stale connections, random values, credentials, and uniqueness. Native AOT may reduce .NET startup cost when library and reflection constraints are acceptable.

## Concurrency and connections

Scale-out creates independent client pools. Cap per-environment database connections and use a server-side proxy or pooler when fan-out could exceed database limits. Warm environments may retain cached data, so entries need expiry and cannot be the source of truth.

# Pitfalls

## Cold Start Latency

**What goes wrong**: a newly created execution environment adds runtime and application initialization latency that breaches a latency objective.

**Why it happens**: the selected plan has no ready environment, or scale-out needs more environments. Runtime, package, networking, and application initialization costs vary by product and configuration.

**Mitigation**: measure the chosen plan and region. Use minimum/provisioned capacity when the latency objective justifies fixed cost, reduce initialization work, and evaluate Native AOT where its compatibility constraints fit.

## Vendor Lock-In

**What goes wrong**: the function uses provider-specific trigger bindings, SDKs, and configuration. Migrating to another provider requires rewriting the function host.

**Why it happens**: provider-specific bindings are convenient and reduce boilerplate.

**Mitigation**: isolate business logic from the function host. The function handler should be a thin adapter that calls a provider-agnostic service. This makes the core logic portable even if the host is not.

## Database Connection Exhaustion

**What goes wrong**: under load the platform spins up hundreds of concurrent function instances, each opening its own database connections, and the database hits `max_connections` and rejects everyone — a self-inflicted outage exactly when traffic is highest.

**Why it happens**: each execution environment has its own pool. Warm invocations can reuse that local pool, but rapid scale-out multiplies the number of pools and connections.

**Mitigation**: front the database with a **server-side pooler** that all instances share, such as RDS Proxy for supported AWS databases or PgBouncer for PostgreSQL, and cap per-instance client pool size. See [[Data Persistence/Connection Pooling]] — this is the canonical serverless data gotcha.

> [!NOTE]
> Serverless container products are not interchangeable. Cloud Run and Azure Container Apps can scale to zero under supported configurations. AWS Fargate supplies serverless task compute but does not itself promise automatic scale-to-zero for an ECS service. Billing follows each product's allocated-resource and minimum-instance rules.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Serverless functions | Provider-managed event execution; some plans scale to zero | Initialization variance, quotas, provider bindings, external state | Event-driven workloads with bounded execution |
| Serverless containers | Familiar container contract with managed capacity | Product-specific minimum instances, concurrency, and billing | HTTP or worker workloads that do not fit a function host |
| Managed PaaS | Managed runtime with stable process model | Minimum capacity and platform constraints vary | Long-running services with predictable latency needs |

**Decision rule**: model the exact service's request, duration, memory, concurrency, minimum-capacity, egress, and downstream costs. Choose the managed boundary that reduces ownership without violating latency, state, quota, or portability requirements.

# Questions

> [!QUESTION]- How do you mitigate cold start latency in serverless functions?
> Measure initialization and scale-out latency on the chosen product, runtime, plan, package, and network path. Reduce initialization work, reuse clients in warm environments, and buy minimum/provisioned capacity when the latency objective justifies its fixed cost. Native AOT can help .NET startup when reflection and library constraints are acceptable.

> [!QUESTION]- How do you avoid vendor lock-in with serverless functions?
> Isolate business logic from the function host. The function handler should be a thin adapter that reads the trigger event, calls a provider-agnostic service, and returns a response. The core logic lives in a class library with no provider-specific dependencies. This makes the business logic portable even if the host (Azure Functions, AWS Lambda) is not. Cost: requires discipline to keep the adapter thin; teams often let provider-specific bindings leak into business logic.

> [!QUESTION]- How do you model cost for a serverless workload vs a container-based one?
> Use the product's actual dimensions: requests, duration, allocated CPU/memory, provisioned or minimum instances, gateway, storage, egress, logging, and downstream connections. Some services scale to zero and some do not. Run the representative traffic shape through both pricing models and include latency and operating labor rather than assuming one universal crossover.

# References

- [Azure Functions overview (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview) — official overview of Azure Functions triggers, bindings, hosting plans, and scaling behavior.
- [Serverless architectures (Martin Fowler)](https://martinfowler.com/articles/serverless.html) — practitioner article covering the tradeoffs of serverless, when it fits, and the operational challenges (cold starts, observability, testing).
- [Azure Functions performance and reliability (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices) — best practices for cold start mitigation, connection reuse, and scaling configuration.
- [Cold starts in Azure Functions (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale#cold-start-behavior) — explains cold-start behavior across hosting plans and mitigation through always-ready and prewarmed instances.
- [Understanding the Lambda execution environment lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) — official Init, Invoke, freeze/reuse, reset, and Shutdown behavior.
- [Improving startup performance with Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html) — current supported runtimes, snapshot lifecycle, and restore-time constraints.
- [Azure Functions hosting options](https://learn.microsoft.com/azure/azure-functions/functions-scale) — official scaling, instance, cold-start, and hosting-plan behavior.
- [.NET Native AOT deployment](https://learn.microsoft.com/dotnet/core/deploying/native-aot/) — official startup, size, and compatibility tradeoffs.
- [Firecracker: Lightweight Virtualization for Serverless Applications](https://www.usenix.org/conference/nsdi20/presentation/agache) — peer-reviewed architecture paper for the microVM isolation mechanism used by Lambda.

## ByteByteGo provenance

- [What makes AWS Lambda fast](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-makes-aws-lambda-so-fast.md) — editorial lead for the fleet visual; internal component names are treated as dated implementation detail, not a service guarantee.
