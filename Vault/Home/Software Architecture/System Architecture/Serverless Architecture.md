---
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: "Uses provider-managed functions, containers, messaging, storage, or databases with service-defined scaling and billing."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

Serverless architecture moves capacity provisioning, patching, and much of the availability control plane to a provider. The category includes functions, managed containers, queues, object storage, and databases with service-defined scaling and billing.

The name is easy to overread. Some products scale to zero. Others keep minimum capacity. Some bill per request, while others charge for allocated CPU, memory, or storage. The exact service contract matters more than the label.

Serverless fits when the workload matches that contract and reduced infrastructure ownership is worth the platform constraints. A timer-triggered function, a Cloud Run service, and a serverless database solve different problems.

# Function Example

This Azure Function performs one scheduled operation and keeps durable state behind a repository:

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

The process may be reused, so clients and connection pools can be reused too. Correctness still cannot depend on memory surviving the next invocation. Durable progress belongs in managed storage.

# Execution Model

Functions usually start from an HTTP request, timer, queue, object notification, or event bus. Serverless containers run ordinary images with provider-managed capacity. Managed databases and queues remove host management while keeping their own quotas, retention rules, consistency models, and prices.

![[Software Architecture/Software Architecture-Serverless Architecture-18120000.png]]

The visual is a dated fleet model rather than an AWS compatibility contract. The stable idea is an isolated execution environment that the provider may initialize, reuse, freeze, reset, or remove.

## Lifecycle and Warm State

An AWS Lambda environment moves through initialization, invocation, and shutdown or reset. Azure Functions has comparable host and worker initialization controlled by its hosting plan. Idle environments may be frozen and resumed, or replaced without notice.

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

The static client reduces connection churn on warm invocations. It is a cacheable optimization, not durable state.

## Cold Starts

A cold start can include environment allocation, runtime boot, code loading, network setup, and application initialization. There is no useful universal latency number. Runtime, package size, plan, region, and networking all change the result.

Minimum or provisioned instances trade fixed cost for steadier latency. Snapshot and restore features can shorten initialization for supported runtimes, but restored connections, credentials, random values, and uniqueness assumptions need checking. Native AOT can reduce .NET startup time when its reflection and library constraints fit the application.

## Concurrency and Connections

Scale-out creates independent client pools. A function that looks cheap in isolation can open hundreds of downstream connections when many environments start at once. Cap each local pool and use a server-side proxy or pooler when the database cannot absorb that fan-out.

Warm caches need expiry and may disappear at any time. They can reduce work, but they cannot be the source of truth.

# Where Serverless Workloads Fail

## Cold-Start Latency

New execution environments may breach a latency objective while the runtime and application initialize. Measure the selected product, plan, region, and network path under representative scale-out. Buy ready capacity only when the latency requirement justifies the idle cost.

## Provider Coupling

Trigger bindings and platform SDKs make the host concise, but they also define the migration surface. Keep the handler thin and place domain behavior in an ordinary service. The host will still need rewriting. The business rules should not.

## Database Connection Exhaustion

Every execution environment owns its local pool. Rapid scale-out multiplies those pools and can exhaust the database just as traffic rises. A shared server-side pooler, such as RDS Proxy for supported AWS databases or PgBouncer for PostgreSQL, controls the fan-out. [[Home/Data Persistence/Connection Pooling]] covers the underlying limit and sizing choices.

> [!NOTE]
> Serverless container products are not interchangeable. Cloud Run and Azure Container Apps can scale to zero in supported configurations. AWS Fargate supplies serverless task compute but does not itself guarantee that an ECS service reaches zero tasks. Billing follows the selected product's resource and minimum-instance rules.

# Tradeoffs

| Approach | What it buys | Main boundary | Good fit |
| --- | --- | --- | --- |
| Functions | Managed event execution. Zero idle instances on some plans | Runtime limits, initialization variance, provider bindings | Short event-driven work with external state |
| Serverless containers | Familiar container contract with managed capacity | Product-specific concurrency, minimums, and billing | HTTP or worker workloads that do not fit a function host |
| Managed PaaS | Stable process model with managed runtime | Minimum capacity and platform constraints vary | Long-running services with predictable latency needs |

Model cost from the service's real dimensions: requests, duration, memory, CPU, minimum capacity, egress, logs, and downstream connections. A cheaper compute line can still create a more expensive system.

# References

- [Azure Functions overview](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview)
- [AWS Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [Firecracker: Lightweight Virtualization for Serverless Applications](https://www.usenix.org/conference/nsdi20/presentation/agache)
- [Serverless architectures](https://martinfowler.com/articles/serverless.html)
