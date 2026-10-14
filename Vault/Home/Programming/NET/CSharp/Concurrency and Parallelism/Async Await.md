---
topic:
  - Programming
subtopic:
  - NET
summary: ".NET's model for non-blocking I/O that releases the thread while awaiting work."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Concurrency and Parallelism/Async Await"
flashcard_uid: "4a42db52"
---

`async` and `await` let .NET code wait for I/O without holding a thread idle. While a network or database operation is in flight, the worker can return to the pool and run something else. UI applications stay responsive, and servers can keep many requests in progress without assigning a thread to every wait.

The useful mental model is simple: **async does not mean "run on another thread."** During a true asynchronous I/O wait, no thread is executing the method. Completion makes its continuation runnable later.

# How the State Machine Works

The C# compiler lowers an `async` method into a state-machine type. For ordinary `async Task` methods, Roslyn commonly emits a struct; async iterators use a reference type that also serves enumerable and enumerator roles. Each suspension point becomes a state transition. At compile time, this code:

```csharp
public async Task<string> FetchAsync(string url)
{
    var response = await _http.GetAsync(url);
    return await response.Content.ReadAsStringAsync();
}
```

The compiler emits a state machine with fields for local state such as `url` and `response`. Its `MoveNext()` method advances the method until the next incomplete await. Completion schedules another call to `MoveNext()`.

**What happens at each `await`:**

1. The method runs synchronously until it hits an incomplete awaitable.
2. The awaiter reports whether the operation has already completed. If it has, execution continues without yielding.
3. If not done, a continuation is registered on the awaitable and the method returns an incomplete `Task` to its caller.
4. When the I/O completes, the continuation fires and `MoveNext()` resumes from the saved state.

This is why `await` differs from `Task.Result` and `Task.Wait()`: those block the current thread, while `await` releases it.

**Allocation cost.** For an ordinary `async Task` method, the generated state machine is commonly a value type. When the method suspends, its state must survive after the current stack frame returns, so the builder stores it for later continuation. A method that completes synchronously can avoid that suspension path. `ValueTask<T>` can reduce allocations when synchronous completion is common, but it adds consumption rules and should be introduced only after measurement. `Task` remains the clear default.

# ConfigureAwait

By default, `await` asks to resume through the current `SynchronizationContext`, or through a non-default current `TaskScheduler`. A UI application uses that behavior to return to its UI thread. ASP.NET Core normally has no custom synchronization context, so there is usually nothing to capture there.

`ConfigureAwait(false)` says the continuation does not require resumption through the captured context or scheduler. It does not promise a thread switch: an already-completed await may continue synchronously, and another continuation may run on the thread that completes the operation.

```csharp
// Library code — no UI or request context needed
var data = await _repo.GetAsync(id).ConfigureAwait(false);
```

General-purpose library code often uses `ConfigureAwait(false)` because it should not depend on a caller's scheduling context. Application code should make the choice from its actual host: UI code may need the captured context, while ASP.NET Core code usually gains little from spelling out `false`. This option does not repair sync-over-async by itself. The durable fix is to keep the call chain asynchronous.

## `ExecutionContext` Vs `SynchronizationContext`

These mechanisms carry different things across an await:

- **`SynchronizationContext`** influences where the continuation runs. `ConfigureAwait(false)` opts out of capturing it.
- **`ExecutionContext`** carries ambient state such as `AsyncLocal<T>` values. It flows across normal awaits even when `ConfigureAwait(false)` is used. Suppressing that flow is a separate, rare operation.

## `ConfigureAwaitOptions` (.NET 8)

.NET 8 added `ConfigureAwait(ConfigureAwaitOptions)` for cases that need more than the Boolean choice:

- `ContinueOnCapturedContext` — the equivalent of the old `true`.
- For a non-generic `Task`, `SuppressThrowing` observes completion without propagating the task's fault or cancellation. It is deliberately narrow and should not become a way to hide failures.
- `ForceYielding` schedules the continuation even when the task has already completed, which can break synchronous reentrancy.

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

For data that arrives incrementally, `IAsyncEnumerable<T>` lets the producer yield values asynchronously and the consumer pull them with `await foreach`. A page or message can arrive after an asynchronous wait without materializing the whole sequence.

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

`[EnumeratorCancellation]` connects a token supplied by `.WithCancellation(ct)` to the iterator parameter. Resources with asynchronous cleanup use `IAsyncDisposable` and `await using`.

# Pitfalls

**Sync-over-async deadlock**
Calling `.Result` or `.Wait()` under a single-threaded `SynchronizationContext` can deadlock. The caller occupies the context thread while the continuation waits to get back onto it.

```csharp
// DEADLOCK in UI or legacy ASP.NET — never do this
var result = GetDataAsync().Result;
```

Fix the boundary that blocks and keep the call chain asynchronous. Library code that does not need the caller's context can also use `ConfigureAwait(false)`, but relying on every transitive await to do so is brittle.

**Fire-and-forget swallows exceptions**
Calling an async method without awaiting it drops the caller's handle to completion. A later fault sits on the returned `Task` with no local code to observe or report it.

```csharp
// Exception is lost — the task is never observed
_ = SendEmailAsync(user);
```

Await work that belongs to the current operation. Work that must outlive it belongs in an owned background queue where failures and shutdown are observed.

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

**Awaiting `Task.WhenAll` throws one contained exception**
A faulted `WhenAll` task records every failure in its `Exception` property, but `await` propagates one contained exception rather than throwing the surrounding `AggregateException`. Keep the combined task and inspect `task.Exception` when every failure matters.

# Questions

<!-- qard-id: 1cd27d60-d7eb-47c8-9be5-3d6e78be5028 -->
> [!qard]- How do asynchronous waiting and multithreading differ?
> Asynchrony describes how an operation waits: while true asynchronous I/O is pending, the method can suspend without occupying a worker thread, then resume when completion makes its continuation runnable. It does not create a thread by itself. Multithreading means work can execute on multiple threads; those threads may run concurrently or in parallel depending on scheduling and available processors. CPU-bound work still needs a thread to execute. [Task-based Asynchronous Pattern](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model#async-and-await)

<!-- qard-id: d15b1902-c519-4853-98ac-4cc2da428172 -->
> [!qard]- What changes when an incomplete task is consumed with `await` instead of `Task.Result`?
> `await` suspends the method without blocking its current thread and resumes through the captured `SynchronizationContext` or non-default `TaskScheduler` when one applies. `Task.Result` blocks the calling thread until completion. If the task's continuation needs a context that the blocked caller occupies, the wait can deadlock. A fault observed through `Result` is wrapped in `AggregateException`; `await` propagates a contained exception. [Task<T>.Result](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task-1.result) · [Common async bugs](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/common-async-bugs#deadlocks-from-blocking-on-async-code)

<!-- qard-id: 52ff6f00-16ec-4741-9be4-2551798fc8ee -->
> [!qard]- What does `ConfigureAwait(false)` change, and when is it useful?
> `ConfigureAwait(false)` tells an await not to require resumption through the captured `SynchronizationContext` or non-default `TaskScheduler`. It does not promise a thread switch; a completed task may continue synchronously, and another continuation may run on the completing thread. It is commonly useful in reusable library code that does not need its caller's scheduling context. UI code usually needs the context to update controls. ASP.NET Core normally has no custom `SynchronizationContext`, so the setting usually changes little there; `HttpContext` lifetime and thread-safety remain separate concerns. [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/) · [Async scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios#understand-when-to-set-configureawaitfalse)

<!-- qard-id: 36a34049-8f3f-493f-b608-a516bf6a28a4 -->
> [!qard]- Why can true asynchronous I/O improve server concurrency without keeping a thread for every wait?
> When an asynchronous I/O operation is pending, the request can suspend and return its worker thread to the pool; completion later makes its continuation runnable. The freed thread can serve other work, so the server need not dedicate one thread to every in-flight I/O wait. This can improve concurrency for I/O-bound requests, but it does not guarantee a particular request capacity or throughput: CPU work, blocking dependencies, connection pools, downstream services, and resource limits still constrain the system. [Task-based Asynchronous Pattern](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/task-asynchronous-programming-model#async-and-await)

<!-- qard-id: 21176d6e-4394-438b-b511-e3f91affc308 -->
> [!qard]- When is `Task.Run` useful, and why is it usually wrong around asynchronous I/O?
> `Task.Run` queues work to a ThreadPool thread. It can move CPU-bound work off a UI thread to preserve responsiveness, though the work still consumes CPU and a thread. Wrapping an I/O API that is already asynchronous adds scheduling without making the I/O complete sooner. It is not a general ASP.NET Core scalability technique: consuming another ThreadPool worker can worsen pressure instead of increasing I/O capacity. [Task.Run](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.run) · [Common async bugs](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/common-async-bugs)

# References

- [Async programming scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
- [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
