---
publish: true
created: 2026-07-11T21:46:00.416Z
modified: 2026-07-18T11:30:11.446Z
published: 2026-07-18T11:30:11.446Z
topic:
  - Programming
subtopic:
  - NET
summary: .NET's model for non-blocking I/O that releases the thread while awaiting work.
level:
  - "4"
priority: High
status: Ready to Repeat
---

`async` and `await` are .NET's default model for non-blocking I/O. The goal is responsiveness and scalability: while code waits on network, disk, or database I/O, the thread is released so it can do other work. This is why async code keeps UIs responsive and helps servers handle more concurrent requests without proportionally more threads.

The most important mental model: **async is not the same as "run on another thread"**. In many cases, no thread is actively executing your method while an awaited I/O operation is in flight. The thread is returned to the pool and reclaimed when the I/O completes.

# How It Works — The State Machine

The C# compiler transforms every `async` method into a state machine struct. Each `await` point becomes a state transition. At compile time, this code:

```csharp
public async Task<string> FetchAsync(string url)
{
    var response = await _http.GetAsync(url);
    return await response.Content.ReadAsStringAsync();
}
```

becomes roughly equivalent to a struct with fields capturing local variables (`url`, `response`) and a `MoveNext()` method that switches on the current state. The runtime calls `MoveNext()` when the awaited operation completes.

**What happens at each `await`:**

1. The method runs synchronously until it hits an incomplete awaitable.
2. The awaitable's `IsCompleted` is checked — if already done (cached result, synchronous completion), execution continues without yielding.
3. If not done, a continuation is registered on the awaitable and the method returns an incomplete `Task` to its caller.
4. When the I/O completes, the continuation fires and `MoveNext()` resumes from the saved state.

This is why `await` differs from `Task.Result` and `Task.Wait()`: those block the current thread, while `await` releases it.

**Allocation cost.** The state machine is a `struct`, so a method that completes synchronously (every `await` hits an already-completed awaitable) allocates nothing on the heap. The struct is **boxed to the heap only when the method actually suspends** — at that point the runtime needs to keep it alive across the await. In hot paths that suspend frequently, two techniques cut this allocation:

- Return **`ValueTask`/`ValueTask<T>`** instead of `Task<T>` when the result is often available synchronously.
- Opt into a **pooled state-machine builder** with `[AsyncMethodBuilder(typeof(PoolingAsyncValueTaskMethodBuilder))]` (or build the project with `DOTNET_ReadyToRun` / pooling enabled) so the boxed boxes are reused rather than GC'd.

Default to `Task` and only reach for these once profiling shows async allocation is a real cost.

# ConfigureAwait

By default, `await` captures the current `SynchronizationContext` (or `TaskScheduler`) and resumes on it. In a UI app, this means the continuation runs on the UI thread — useful for updating controls. In ASP.NET Core, there is no `SynchronizationContext`, so this is a no-op.

`ConfigureAwait(false)` tells the runtime: "resume on any available thread, don't capture the context."

```csharp
// Library code — no UI or request context needed
var data = await _repo.GetAsync(id).ConfigureAwait(false);
```

**Rule of thumb:**

- Library code: always use `ConfigureAwait(false)` to avoid context capture overhead and deadlock risk.
- Application code (controllers, view models): omit it — you usually want to resume on the original context.

## `ExecutionContext` vs `SynchronizationContext`

These are two different ambient mechanisms, and conflating them is a common source of bugs:

- **`SynchronizationContext`** controls _where_ (which thread/scheduler) the continuation resumes. This is what `ConfigureAwait(false)` opts out of.
- **`ExecutionContext`** carries _ambient state_ — `AsyncLocal<T>` values, the security/impersonation context — and **always flows across `await`, even with `ConfigureAwait(false)`**. So `ConfigureAwait(false)` does _not_ drop your `AsyncLocal` values; it only changes the resumption thread. To stop `ExecutionContext` from flowing (rare), use `ExecutionContext.SuppressFlow()`.

## `ConfigureAwaitOptions` (.NET 8)

.NET 8 added an overload `ConfigureAwait(ConfigureAwaitOptions)` with composable flags beyond the old boolean:

- `ContinueOnCapturedContext` — the equivalent of the old `true`.
- `SuppressThrowing` — await a `Task` purely for completion, ignoring faults/cancellation (useful for "fire and observe completion only").
- `ForceYielding` — always yield, even if the awaitable is already complete (handy to break up synchronous re-entrancy).

# Example

```csharp
public async Task<OrderDto?> LoadOrderAsync(
    int id,
    CancellationToken cancellationToken)
{
    using var response = await _httpClient.GetAsync(
        $"orders/{id}",
        cancellationToken);

    response.EnsureSuccessStatusCode();

    return await response.Content.ReadFromJsonAsync<OrderDto>(
        cancellationToken: cancellationToken);
}
```

The method does not hold a thread while waiting on network I/O. The continuation runs only when the response is available.

# Async Streams (IAsyncEnumerable)

For data that arrives incrementally (paged APIs, streamed query results, message consumers), `IAsyncEnumerable<T>` lets a producer `yield return` values asynchronously and a consumer pull them with `await foreach` — each item can suspend without buffering the whole sequence in memory.

```csharp
public async IAsyncEnumerable<Order> StreamOrdersAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    string? cursor = null;
    do
    {
        var page = await _client.GetPageAsync(cursor, ct);
        foreach (var order in page.Items)
            yield return order;
        cursor = page.NextCursor;
    } while (cursor is not null);
}

// Consumer — pulls one item at a time, never materializing the full set
await foreach (var order in StreamOrdersAsync(ct).WithCancellation(ct).ConfigureAwait(false))
{
    Process(order);
}
```

Note the `[EnumeratorCancellation]` attribute (so a token passed via `.WithCancellation(ct)` reaches the iterator) and `await using` / `IAsyncDisposable` for resources whose cleanup is itself asynchronous (e.g. `DbDataReader`, network streams).

# Pitfalls

**Sync-over-async deadlock**
Calling `.Result` or `.Wait()` on a task inside a method that runs under a `SynchronizationContext` (UI thread, legacy ASP.NET) causes a deadlock. The blocking call holds the context thread; the continuation needs that same thread to resume. Neither can proceed.

```csharp
// DEADLOCK in UI or legacy ASP.NET — never do this
var result = GetDataAsync().Result;
```

Fix: `await` all the way up, or use `ConfigureAwait(false)` in the async method so the continuation does not need the original context.

**Fire-and-forget swallows exceptions**
Calling an async method without awaiting it discards the returned `Task`. Any exception thrown inside is silently lost.

```csharp
// Exception is lost — the task is never observed
_ = SendEmailAsync(user);
```

Fix: either `await` the call, or explicitly handle the task's exception via `.ContinueWith` or a background queue.

**Async void**
`async void` methods cannot be awaited and their exceptions cannot be caught by callers. They exist only for event handlers.

```csharp
// Caller cannot catch this exception
public async void OnButtonClick(object sender, EventArgs e) { ... }
```

Fix: use `async Task` everywhere except event handlers.

**Unnecessary `Task.Run` wrapping**
Wrapping already-async I/O in `Task.Run` wastes a thread pool thread for no benefit.

```csharp
// Pointless — GetAsync is already async
var result = await Task.Run(() => _http.GetAsync(url));
```

Fix: `await` the async method directly.

**Only the first exception surfaces from an awaited task**
A `Task` can hold multiple exceptions (e.g. a faulted `Task.WhenAll`), but `await` rethrows only the **first** one — it unwraps the `AggregateException` for ergonomics. To see all of them, inspect `task.Exception` (an `AggregateException`) directly after the await. Internally the runtime preserves the original throw-site stack with `ExceptionDispatchInfo.Capture(ex).Throw()`, which is why an awaited exception shows the real failure location rather than the resumption point.

# Questions

> [!QUESTION]- How is asynchrony different from multithreading?
> Asynchrony is about not blocking while waiting (especially for I/O). An `async` method can release the current thread while awaiting, and continue later — potentially on the same thread.
> Multithreading is about executing work on multiple threads concurrently (for CPU-bound work). Async code can be single-threaded and still be asynchronous.
> The key cost difference: async I/O uses no thread while waiting; multithreading always occupies a thread.

> [!QUESTION]- What is the difference between `await` and `Task.Result`?
> `await` waits asynchronously: it does not block the current thread, it unwraps exceptions as `Exception` (not `AggregateException`), and it respects `SynchronizationContext`.
> `Task.Result` waits synchronously: it blocks the current thread, wraps exceptions in `AggregateException`, and can deadlock under a `SynchronizationContext`.
> Cost: `.Result` in a context-aware environment is a deadlock waiting to happen; `await` is the safe default.

> [!QUESTION]- When should you use `ConfigureAwait(false)`?
> In library code that does not need to resume on a specific context. It avoids context-capture overhead and eliminates the deadlock risk when library code is called from a context-aware environment.
> Do not use it in application-layer code (controllers, view models) where you need to resume on the original context to update UI or access `HttpContext`.

> [!QUESTION]- If async does not always use extra threads, why does it improve scalability?
> Because waiting time is no longer paid by tying up worker threads. Released threads can process other requests while I/O is pending. A server with 100 threads can handle thousands of concurrent I/O-bound requests if each thread is released during the wait.

> [!QUESTION]- When should you use `Task.Run` with async code?
> For CPU-bound work that you intentionally offload to a pool thread (e.g., image processing, heavy computation). Do not use it to wrap already-async I/O APIs — that wastes a thread for no benefit.

# References

- [Async programming scenarios (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios) — official overview of async/await patterns with examples for I/O and CPU-bound work.
- [Await, UI, and deadlocks (Stephen Toub, Microsoft)](https://devblogs.microsoft.com/dotnet/await-and-ui-and-deadlocks-oh-my/) — deep dive into how `SynchronizationContext` causes deadlocks and how `ConfigureAwait(false)` prevents them.
- [ConfigureAwait FAQ (Stephen Toub, Microsoft)](https://devblogs.microsoft.com/dotnet/configureawait-faq/) — exhaustive reference on when and why to use `ConfigureAwait(false)`.
- [There is no thread (Stephen Cleary)](https://blog.stephencleary.com/2013/10/there-is-no-thread.html) — explains why async I/O does not require a dedicated thread while waiting.
- [Threading in C#: Task Parallelism (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_Task_Parallelism) — comprehensive reference on `Task`, continuations, and the async state machine.
- [Async/await best practices (Stephen Cleary)](https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming) — canonical list of async pitfalls: async void, sync-over-async, fire-and-forget.
