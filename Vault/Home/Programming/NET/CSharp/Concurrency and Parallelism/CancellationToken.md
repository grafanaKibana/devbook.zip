---
topic:
  - Programming
subtopic:
  - NET
summary: "Cooperative cancellation where callers request a stop and callees comply safely."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

`CancellationToken` carries a request to stop through .NET call chains. The caller owns the request. Each operation decides where it can stop without leaving partial state behind. When a request token disappears halfway down the stack, the client may be gone while database or HTTP work keeps running.

Cancellation is cooperative. A `CancellationTokenSource` signals the token, and the callee either passes it to token-aware APIs or checks it at safe points. `OperationCanceledException` then unwinds the operation through normal cleanup.

# How It Works

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

When cancellation is requested:

1. Caller calls `cts.Cancel()` or the timeout fires.
2. `GetAsync` observes the token and throws `OperationCanceledException`.
3. The exception propagates up the call stack.
4. The boundary classifies it as cancellation rather than an ordinary failure, provided the exception represents the token that controls the operation.

ASP.NET Core exposes `HttpContext.RequestAborted` for the request lifetime. Passing it downstream stops waiting promptly when the server detects a disconnected client.

```csharp
public async Task<IActionResult> GetOrder(int id)
{
    var order = await _service.GetOrderAsync(id, HttpContext.RequestAborted);
    return Ok(order);
}
```

# CPU-Bound Cancellation

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

The check is cheap, but its placement is a latency decision. Per item is sensible when items are small. Expensive inner loops may need checks inside the item as well.

# Registration Callbacks

For an API with no token-aware operation, `token.Register(callback)` bridges cancellation into its completion mechanism. The returned `CancellationTokenRegistration` should be disposed when the operation finishes. Otherwise the source retains the callback and its captured state for the source's remaining lifetime.

```csharp
var tcs = new TaskCompletionSource();
await using var reg = ct.Register(() => tcs.TrySetCanceled(ct));
```

> [!WARNING]
> `Cancel()` runs registered callbacks synchronously, so a slow callback delays the caller and lock reentrancy can deadlock. .NET 8 added `CancelAsync()`, which returns a task representing callback completion and avoids making the initiating call wait synchronously. Cancellation callbacks still need to be short and non-blocking.

`CancellationTokenSource` is disposable, especially when it owns a timer or linked registrations. `TryReset()` supports carefully controlled reuse when cancellation has not been requested, but pooling sources is rarely worth the ownership risk without profile data.

# Pitfalls

**Accepting a token but not forwarding it**
The method signature looks cancellable, yet a downstream call receives no token. The operation then keeps running past the cancellation boundary.

```csharp
// Bug: token accepted but not forwarded
public async Task<Data> LoadAsync(CancellationToken cancellationToken)
{
    return await _repo.GetAsync(id); // missing cancellationToken
}
```

Forward the token to downstream work that belongs to the same operation. Deliberately independent work needs a different owner, not an accidental `CancellationToken.None`.

**Swallowing `OperationCanceledException`**
A broad catch that returns a fallback can turn canceled work into apparent success. That is dangerous when the fallback looks like a valid partial result.

```csharp
// Bug: cancellation is hidden
try { return await DoWorkAsync(ct); }
catch (Exception ex) { _logger.LogError(ex, "Failed"); return null; }
```

Keep cancellation distinct from failure. In a broad error handler, rethrow it before handling ordinary exceptions:

```csharp
try { return await DoWorkAsync(ct); }
catch (OperationCanceledException) { throw; } // re-throw, don't swallow
catch (Exception ex) { _logger.LogError(ex, "Failed"); return null; }
```

**Using `CancellationToken.None` inside request flow**
Hardcoding `CancellationToken.None` breaks request-abort propagation. It is correct only where the work intentionally has a lifetime beyond the request and another component owns that lifetime.

**Confusing a timeout with caller cancellation**
A linked token turns both causes into cancellation at the callee. The boundary can distinguish them by checking which source fired:

```csharp
using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
using var linked = CancellationTokenSource.CreateLinkedTokenSource(userToken, timeoutCts.Token);
try { await DoWorkAsync(linked.Token); }
catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested && !userToken.IsCancellationRequested)
{
    throw new TimeoutException("Operation exceeded 5s."); // a timeout, not a user cancel
}
```

`await task.WaitAsync(TimeSpan.FromSeconds(5), ct)` separates the two outcomes for the wait: expiration throws `TimeoutException`, while `ct` throws `OperationCanceledException`. It does not itself cancel the underlying operation, so the operation still needs its own token when continued work would be wasteful.

**Not disposing `CancellationTokenSource`**
`CancellationTokenSource` implements `IDisposable`. Forgetting to dispose it leaks a timer registration when a timeout is set.

```csharp
// Correct: dispose via using
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
```

**Canceling at the wrong granularity**
Canceling a shared source stops every operation that observes it. A linked child source combines parent cancellation with a local timeout or local stop request without canceling the parent.

```csharp
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
    parentToken, localTimeoutToken);
await DoWorkAsync(linkedCts.Token);
```

# References

- [Cancellation in managed threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads)
