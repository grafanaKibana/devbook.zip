---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Implementing bounded HTTP retry and timeout policies with Polly v8, including Retry-After handling."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Polly v8 implements retry and timeout strategies in .NET resilience pipelines. [[Retry and Timeout Patterns]] owns the selection rules; this note owns the concrete HTTP configuration. The example retries a replayable `GET`, caps total and per-attempt time, adds jitter, and honors server-provided `Retry-After` delays.

## HTTP pipeline

```csharp
using Microsoft.Extensions.Http.Resilience;
using Polly;
using Polly.Retry;
using Polly.Timeout;

builder.Services.AddHttpClient<InventoryClient>(client =>
{
    client.BaseAddress = new Uri("https://inventory.internal/");
    client.Timeout = Timeout.InfiniteTimeSpan;
})
.AddResilienceHandler("inventory", pipeline =>
{
    pipeline.AddTimeout(TimeSpan.FromSeconds(8));

    pipeline.AddRetry(new RetryStrategyOptions<HttpResponseMessage>
    {
        MaxRetryAttempts = 3,
        Delay = TimeSpan.FromMilliseconds(200),
        BackoffType = DelayBackoffType.Exponential,
        UseJitter = true,
        ShouldHandle = new PredicateBuilder<HttpResponseMessage>()
            .Handle<HttpRequestException>()
            .Handle<TimeoutRejectedException>()
            .HandleResult(response => response.StatusCode is
                System.Net.HttpStatusCode.RequestTimeout or
                System.Net.HttpStatusCode.TooManyRequests or
                System.Net.HttpStatusCode.BadGateway or
                System.Net.HttpStatusCode.ServiceUnavailable or
                System.Net.HttpStatusCode.GatewayTimeout),
        DelayGenerator = static args =>
        {
            var retryAfter = args.Outcome.Result?.Headers.RetryAfter;
            var delay = retryAfter?.Delta;

            if (delay is null && retryAfter?.Date is { } date)
            {
                delay = date - DateTimeOffset.UtcNow;
            }

            return ValueTask.FromResult<TimeSpan?>(
                delay > TimeSpan.Zero ? delay : null);
        }
    });

    pipeline.AddTimeout(TimeSpan.FromSeconds(2));
});
```

The outer timeout bounds the whole operation. The inner timeout bounds one attempt. Returning `null` from `DelayGenerator` lets Polly use exponential backoff with jitter when the response has no valid `Retry-After`. The caller's cancellation token and total deadline still win; do not sleep beyond the remaining request budget.

Apply this policy to methods the dependency actually treats as replayable. A `POST` needs a server-side idempotency contract whose retention exceeds the retry window.

## References

- [Polly retry strategy](https://www.pollydocs.org/strategies/retry.html) — official `RetryStrategyOptions`, `DelayGenerator`, jitter, and outcome handling.
- [Polly timeout strategy](https://www.pollydocs.org/strategies/timeout.html) — official timeout ordering and cancellation behavior.
- [.NET HTTP resilience](https://learn.microsoft.com/dotnet/core/resilience/http-resilience) — official `HttpClient` resilience integration.
- [RFC 9110: Retry-After](https://www.rfc-editor.org/rfc/rfc9110#field.retry-after) — primary header semantics for date and delay forms.
