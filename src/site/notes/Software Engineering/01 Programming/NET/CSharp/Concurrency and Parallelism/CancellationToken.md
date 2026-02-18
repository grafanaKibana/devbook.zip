---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/concurrency-and-parallelism/cancellation-token/","noteIcon":"1"}
---


# Intro

`CancellationToken` is the standard .NET mechanism for cooperative cancellation. It lets callers request stop while callees decide safe cancellation points and cleanup behavior. Correct token propagation is one of the biggest quality differences between toy async code and production-grade services.


## Deeper Explanation

`CancellationToken` is a cooperative stop signal rather than a hard kill switch. The caller requests cancellation, and each caller chooses safe points to stop by passing the token to cancellable APIs or by checking `ThrowIfCancellationRequested()` in CPU loops.

In service code, the main rule is propagation: if your method accepts a token, forward it to every downstream async call that supports cancellation.

## Example

```csharp
public async Task<OrderDto?> GetOrderAsync(
    int id,
    CancellationToken cancellationToken)
{
    // 1) Outbound HTTP call is cancellable.
    using var response = await _httpClient.GetAsync(
        $"orders/{id}",
        cancellationToken);

    response.EnsureSuccessStatusCode();

    // 2) JSON deserialization is also cancellable.
    return await response.Content.ReadFromJsonAsync<OrderDto>(
        cancellationToken: cancellationToken);
}
```

1. Caller passes a token (often `HttpContext.RequestAborted` in ASP.NET Core).
2. `GetAsync(..., cancellationToken)` registers cancellation with the HTTP operation.
3. If cancellation is requested while waiting for network I/O, the await completes with `OperationCanceledException`.
4. If HTTP succeeds, deserialization still observes the same token and can cancel independently.
5. The exception bubbles to caller, which can treat cancellation as expected control flow.


## Pitfalls

- Accepting a token but not forwarding it downstream silently disables cooperative cancellation.
- Swallowing `OperationCanceledException` can make canceled work look successful.
- Using `CancellationToken.None` inside request flow breaks request-abort propagation.


## Questions

> [!QUESTION]- Why is cancellation in .NET called cooperative?
> Because callee code chooses where to observe token state and terminate safely. Runtime does not forcibly kill the operation.

> [!QUESTION]- Should canceled operations be logged as errors?
> Usually no. They are expected control flow when initiated by caller timeout/user cancellation. Log at debug/info unless behavior is unexpected.

> [!QUESTION]- When is it reasonable not to cancel immediately after token is signaled?
> When a tiny critical section must complete to keep state consistent (for example finishing a single idempotent write or releasing resource ownership).

## Links

- [Cancellation in managed threads (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)
- [CancellationToken API (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken)
- [Cancellation in ASP.NET Core request pipelines](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/use-http-context#requestaborted)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await\|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]]
<!-- whats-next:end -->
