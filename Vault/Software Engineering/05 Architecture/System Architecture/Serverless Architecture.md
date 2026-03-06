---
topic:
  - Architecture
subtopic:
  - System Architecture
level:
  - "3"
priority: Medium
status: Creation
dg-publish: true
---

# Serverless Architecture

Serverless architecture runs application logic in stateless, short-lived functions managed entirely by a cloud provider. You write the function; the provider handles provisioning, scaling, patching, and billing. You pay per invocation and execution time, not for idle capacity. "Serverless" is a misnomer — servers exist, but you don't manage them.

The canonical example is **Azure Functions** / **AWS Lambda**: a function triggered by an HTTP request, a queue message, a timer, or a blob upload. The function runs, completes, and the infrastructure scales to zero when idle.

## How It Works

```csharp
// Azure Function: HTTP trigger
public static class OrderProcessor
{
    [Function("ProcessOrder")]
    public static async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post")] HttpRequestData req,
        FunctionContext ctx)
    {
        var order = await req.ReadFromJsonAsync<OrderRequest>();
        // Process order...
        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { OrderId = Guid.NewGuid() });
        return response;
    }
}
```

The function is stateless: no in-memory state survives between invocations. State must be externalized to a database, cache, or storage service.

## Triggers and Bindings

Azure Functions and AWS Lambda support multiple trigger types:

| Trigger | Use case |
|---|---|
| HTTP | REST APIs, webhooks |
| Timer | Scheduled jobs (cron) |
| Queue (Service Bus, SQS) | Async message processing |
| Blob/S3 | File processing on upload |
| Event Grid/EventBridge | Event-driven workflows |

## Pitfalls

### Cold Start Latency

**What goes wrong**: the first invocation after a period of inactivity takes 500ms–3s while the runtime initializes. For latency-sensitive APIs, this is unacceptable.

**Why it happens**: the provider scales to zero when idle. The first request must boot the runtime, load the function, and initialize dependencies.

**Mitigation**: use **Premium Plan** (Azure) or **Provisioned Concurrency** (AWS) to keep instances warm. For .NET, use Native AOT compilation to reduce startup time. Accept cold starts for background jobs where latency doesn't matter.

### Vendor Lock-In

**What goes wrong**: the function uses provider-specific trigger bindings, SDKs, and configuration. Migrating to another provider requires rewriting the function host.

**Why it happens**: provider-specific bindings are convenient and reduce boilerplate.

**Mitigation**: isolate business logic from the function host. The function handler should be a thin adapter that calls a provider-agnostic service. This makes the core logic portable even if the host is not.

## Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Serverless (Functions) | Zero infrastructure management, scales to zero, pay-per-use | Cold starts, stateless constraint, vendor lock-in, hard to debug locally | Event-driven workloads, variable traffic, background jobs |
| Containers (AKS, ECS) | Full control, no cold starts, portable | Infrastructure management overhead, minimum cost even at idle | Steady traffic, stateful workloads, complex services |
| PaaS (App Service, Elastic Beanstalk) | Managed runtime, no cold starts | Always-on cost, less granular scaling | Long-running services, traditional web apps |

**Decision rule**: use serverless for event-driven, bursty, or infrequent workloads where idle cost matters. Use containers or PaaS for services with steady traffic, strict latency requirements, or complex state management. Serverless and containers are often combined: serverless for async processing, containers for the synchronous API layer.

## Questions

> [!QUESTION]- How do you mitigate cold start latency in serverless functions?
> Cold starts occur when the provider scales from zero — the runtime must boot, load the function, and initialize dependencies (500ms–3s for .NET). Mitigations: (1) Premium Plan (Azure) or Provisioned Concurrency (AWS) keeps instances warm at a fixed cost. (2) Native AOT compilation reduces .NET startup time by eliminating JIT. (3) Minimize dependencies loaded at startup — lazy-initialize anything not needed on every invocation. Accept cold starts for background jobs where latency doesn't matter; eliminate them for latency-sensitive APIs.

> [!QUESTION]- How do you avoid vendor lock-in with serverless functions?
> Isolate business logic from the function host. The function handler should be a thin adapter that reads the trigger event, calls a provider-agnostic service, and returns a response. The core logic lives in a class library with no provider-specific dependencies. This makes the business logic portable even if the host (Azure Functions, AWS Lambda) is not. Cost: requires discipline to keep the adapter thin; teams often let provider-specific bindings leak into business logic.

> [!QUESTION]- How do you model cost for a serverless workload vs a container-based one?
> Serverless: cost = (invocations × duration × memory) + egress. Scales to zero when idle — no cost for unused capacity. Container: cost = (instances × uptime) regardless of traffic. Serverless wins for bursty or infrequent workloads; containers win for steady high-throughput traffic where the per-invocation overhead adds up. The crossover point is roughly when serverless cost exceeds the minimum container cost at sustained load.


## References

- [Azure Functions overview (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview) — official overview of Azure Functions triggers, bindings, hosting plans, and scaling behavior.
- [Serverless architectures (Martin Fowler)](https://martinfowler.com/articles/serverless.html) — practitioner article covering the tradeoffs of serverless, when it fits, and the operational challenges (cold starts, observability, testing).
- [Azure Functions performance and reliability (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-functions/functions-best-practices) — best practices for cold start mitigation, connection reuse, and scaling configuration.
- [Cold starts in Azure Functions (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale#cold-start-behavior) — explains cold start behavior across hosting plans and mitigation options including Premium Plan and Provisioned Concurrency.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/System Architecture/Event-Driven Architecture|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Microservices|Microservices]]
> - [[Software Engineering/05 Architecture/System Architecture/Modular Monolith|Modular Monolith]]
> - [[Software Engineering/05 Architecture/System Architecture/Monolith Architecture|Monolith Architecture]]
> - [[Software Engineering/05 Architecture/System Architecture/Service-Oriented Architecture|Service-Oriented Architecture]]
<!-- whats-next:end -->
