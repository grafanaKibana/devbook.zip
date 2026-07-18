---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "How per-attempt timeouts and propagated deadlines bound latency across a distributed call path."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

A timeout limits how long one operation may wait. A deadline is the latest time by which the whole operation must finish. The distinction matters after a request crosses service boundaries: giving every hop a fresh five-second timeout can turn a five-second user budget into a much longer chain. Propagate the remaining deadline and make each attempt fit inside it.

Use a per-attempt timeout to release sockets and caller capacity when one dependency call hangs. Use an overall deadline to bound retries, backoff, queueing, and all downstream work together. [[Retry and Timeout Patterns]] owns retry selection; this note owns time-budget propagation.

## Budget model

For a two-second request budget with at most two dependency attempts:

- Reserve 200 ms for response serialization and network return.
- Give each dependency attempt at most 700 ms.
- Stop before another attempt when the remaining deadline cannot cover the attempt plus backoff.
- Propagate cancellation so database, HTTP, and broker calls stop consuming resources after the caller no longer needs the result.

Per-attempt timeout without an overall deadline can still exceed the user budget across retries. An overall deadline without per-attempt timeout lets the first hung call consume the entire budget.

## .NET example

```csharp
public sealed class PricingClient(HttpClient httpClient)
{
    public async Task<decimal> GetPriceAsync(
        Guid productId,
        CancellationToken deadlineToken)
    {
        using var attempt = CancellationTokenSource.CreateLinkedTokenSource(deadlineToken);
        attempt.CancelAfter(TimeSpan.FromMilliseconds(700));

        using var response = await httpClient.GetAsync(
            $"/prices/{productId}",
            attempt.Token);

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<decimal>(attempt.Token);
    }
}
```

```csharp
app.MapGet("/quotes/{productId:guid}", async (
    Guid productId,
    PricingClient pricing,
    CancellationToken requestAborted) =>
{
    using var deadline = CancellationTokenSource.CreateLinkedTokenSource(requestAborted);
    deadline.CancelAfter(TimeSpan.FromSeconds(2));

    var price = await pricing.GetPriceAsync(productId, deadline.Token);
    return Results.Ok(new { productId, price });
});
```

The endpoint owns the overall two-second budget. `PricingClient` creates a shorter linked token for one attempt, while every nested operation still observes the caller's cancellation. If retry is added, it must reuse the same overall deadline rather than create a new two-second budget per attempt.

For gRPC, send a deadline with the call so the server receives the remaining budget. For HTTP APIs, cancellation is local unless the protocol and service contract explicitly carry a deadline; the downstream service must not infer that the TCP disconnect alone is a reliable budget signal.

## Pitfalls

- **Fresh timeout at every hop**: each service restarts the clock, so end-to-end latency exceeds the caller's SLO. Propagate an absolute deadline or a strictly decreasing remaining budget.
- **Cancellation treated as rollback**: canceling the caller does not prove that a downstream write stopped. Retry writes only with an idempotency contract.
- **Budget equals observed median**: normal tail latency causes avoidable cancellations. Set budgets from the end-to-end SLO, downstream percentiles, and reserved recovery time.
- **No remaining-budget check before retry**: an attempt begins even though it cannot finish before the deadline. Stop retrying and return the controlled failure.

## References

- [Polly timeout strategy](https://www.pollydocs.org/strategies/timeout.html) - Timeout cancellation behavior and strategy configuration in Polly v8.
- [gRPC deadlines and cancellation](https://grpc.io/docs/guides/deadlines/) - Deadline propagation and the distinction between client cancellation and server work.
- [ASP.NET Core request timeouts](https://learn.microsoft.com/aspnet/core/performance/timeouts) - Official middleware for endpoint-level request timeout policies.
- [Timeout pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/timeouts) - Microsoft guidance for bounding remote operations and choosing timeout values.
