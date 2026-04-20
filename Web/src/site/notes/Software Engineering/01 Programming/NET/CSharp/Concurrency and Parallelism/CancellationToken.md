---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/concurrency-and-parallelism/cancellation-token/"}
---

# Intro

`CancellationToken` is the standard .NET mechanism for cooperative cancellation. It lets callers request a stop while callees decide safe cancellation points and cleanup behavior. Correct token propagation is one of the biggest quality differences between toy async code and production-grade services — without it, canceled requests continue consuming resources long after the client has disconnected.

The model is cooperative: the caller signals intent to cancel via a `CancellationTokenSource`; the callee checks the token at safe points and throws `OperationCanceledException` to unwind cleanly.

## How It Works

```csharp
// Caller side: create a source and pass its token
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
var result = await DoWorkAsync(cts.Token);

// Or cancel manually
cts.Cancel();
```

```csharp
// Callee side: accept and propagate the token
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

**What happens when canceled:**
1. Caller calls `cts.Cancel()` or the timeout fires.
2. `GetAsync` observes the token and throws `OperationCanceledException`.
3. The exception propagates up the call stack.
4. Callers treat it as expected control flow (not an error), typically logging at `Debug` level.

**In ASP.NET Core**, `HttpContext.RequestAborted` is a pre-wired token that fires when the client disconnects. Pass it to every downstream call:

```csharp
public async Task<IActionResult> GetOrder(int id)
{
    var order = await _service.GetOrderAsync(id, HttpContext.RequestAborted);
    return Ok(order);
}
```

## CPU-Bound Cancellation

For CPU-bound loops, check the token explicitly:

```csharp
public async Task ProcessItemsAsync(
    IEnumerable<Item> items,
    CancellationToken cancellationToken)
{
    foreach (var item in items)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await ProcessOneAsync(item, cancellationToken);
    }
}
```

`ThrowIfCancellationRequested()` is a cheap check — it reads a volatile bool. Call it at the top of each loop iteration for responsive cancellation.

## Pitfalls

**Accepting a token but not forwarding it**
The most common mistake: the method signature accepts `CancellationToken` but passes `CancellationToken.None` (or nothing) to downstream calls. Cancellation is silently disabled.

```csharp
// Bug: token accepted but not forwarded
public async Task<Data> LoadAsync(CancellationToken cancellationToken)
{
    return await _repo.GetAsync(id); // missing cancellationToken
}
```

Fix: forward the token to every downstream async call that accepts one. Code review should flag any async call without a token argument.

**Swallowing `OperationCanceledException`**
Catching `Exception` and not re-throwing `OperationCanceledException` makes canceled work look successful. Downstream code may act on a partial result.

```csharp
// Bug: cancellation is hidden
try { return await DoWorkAsync(ct); }
catch (Exception ex) { _logger.LogError(ex, "Failed"); return null; }
```

Fix: catch `OperationCanceledException` separately and re-throw (or return a sentinel that callers understand as canceled):

```csharp
try { return await DoWorkAsync(ct); }
catch (OperationCanceledException) { throw; } // re-throw, don't swallow
catch (Exception ex) { _logger.LogError(ex, "Failed"); return null; }
```

**Using `CancellationToken.None` inside request flow**
Hardcoding `CancellationToken.None` in a method called from a request pipeline breaks request-abort propagation. The operation continues even after the client disconnects, wasting resources.

**Not disposing `CancellationTokenSource`**
`CancellationTokenSource` implements `IDisposable`. Forgetting to dispose it leaks a timer registration when a timeout is set.

```csharp
// Correct: dispose via using
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
```

**Canceling at the wrong granularity**
Canceling a shared `CancellationTokenSource` that multiple operations depend on cancels all of them. Use `CancellationTokenSource.CreateLinkedTokenSource` to create a child token that can be canceled independently.

```csharp
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
    parentToken, localTimeoutToken);
await DoWorkAsync(linkedCts.Token);
```

## Questions

> [!QUESTION]- When is it reasonable not to cancel immediately after the token is signaled?
> When a tiny critical section must complete to keep state consistent — for example, finishing a single idempotent write or releasing resource ownership. The key is that the section is short and bounded. Never hold a lock or do I/O while ignoring a cancellation signal for an extended period.

> [!QUESTION]- Why is cooperative cancellation safer than `Thread.Abort`?
> Cooperative cancellation stops at known safe points under your control. `Thread.Abort` (removed in .NET 5+) could interrupt arbitrary code paths — including `finally` blocks and lock releases — leaving resources or invariants in bad state. Cooperative cancellation keeps control flow explicit and cleanup reliable.

> [!QUESTION]- How do you propagate cancellation across a service boundary (e.g., HTTP call)?
> Pass the token to `HttpClient.GetAsync(url, cancellationToken)` or equivalent. The HTTP client registers a cancellation callback that aborts the underlying socket. For gRPC, pass the token to the call options. For message queues, check the token between message processing iterations.
> Cost: if the downstream service has already started processing, canceling the HTTP call does not cancel the server-side work — only the client-side wait.

## References

- [Cancellation in managed threads (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads) — official overview of the cooperative cancellation model, `CancellationTokenSource`, and linked tokens.
- [CancellationToken API (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken) — full API reference including `ThrowIfCancellationRequested`, `Register`, and `IsCancellationRequested`.
- [Cancellation in ASP.NET Core request pipelines (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/use-http-context#requestaborted) — how `HttpContext.RequestAborted` integrates with the cancellation model.
- [Threading in C#: Cancellation Tokens (Joe Albahari)](https://www.albahari.com/threading/part3.aspx#_Cancellation_Tokens) — practical examples of token propagation, linked sources, and CPU-loop cancellation.
- [Async cancellation best practices (Stephen Cleary)](https://blog.stephencleary.com/2022/02/cancellation-1-overview.html) — practitioner guide covering propagation patterns, exception handling, and common mistakes.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await\|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Mutex\|Mutex]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Semaphore\|Semaphore]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]]
<!-- whats-next:end -->
