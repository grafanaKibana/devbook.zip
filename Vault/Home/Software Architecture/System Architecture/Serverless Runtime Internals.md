---
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: "FaaS runtime lifecycle, reuse, cold starts, concurrency, and state boundaries."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Function-as-a-Service platforms create and reuse isolated execution environments in response to demand. A cold start initializes an environment before the first invocation; later invocations may reuse its process and memory, but that reuse is an optimization rather than durable state. [[Serverless Architecture]] covers the wider managed-service architecture, including serverless containers and databases.

## Execution lifecycle

An AWS Lambda environment has initialization, invocation, and shutdown/reset phases. Azure Functions has analogous host and worker initialization governed by its hosting plan. Providers may freeze an idle environment and resume it later, replace it after an error, or add environments to handle concurrency.

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

Reusing `HttpClient` reduces connection churn when the process is warm. Correctness cannot depend on that static field surviving. Durable state belongs in an external database, queue, or object store.

## Cold-start controls

Cold-start time includes environment allocation, runtime boot, code loading, and application initialization. It varies by platform, runtime, package size, networking, and configuration; there is no universal `.NET = 500 ms–3 s` range. Measure the chosen plan and region.

Provisioned or minimum instances trade fixed cost for predictable latency. Snapshot/restore features can reduce initialization for supported runtimes but require checks for stale connections, random values, credentials, and uniqueness after restore. Native AOT may reduce .NET startup cost when library and reflection constraints are acceptable.

## Concurrency and connections

Scale-out can create many independent client pools. Cap per-environment database connections and use a server-side proxy or pooler when fan-out could exceed database limits. Warm environments may retain cached data, so cache entries need expiry and cannot be the source of truth.

## References

- [AWS Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html) — official init, invoke, freeze/reuse, reset, and shutdown lifecycle.
- [AWS Lambda SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html) — official snapshot/restore support and runtime-hook constraints.
- [Azure Functions hosting options](https://learn.microsoft.com/azure/azure-functions/functions-scale) — official scaling, instance, cold-start, and hosting-plan behavior.
- [.NET Native AOT deployment](https://learn.microsoft.com/dotnet/core/deploying/native-aot/) — official startup, size, and compatibility tradeoffs.
