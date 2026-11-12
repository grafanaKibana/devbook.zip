---
publish: true
created: 2026-02-10T16:03:55.000Z
modified: 2026-11-12T21:09:36.103Z
published: 2026-07-08T13:14:17.320Z
topic:
  - Programming
subtopic:
  - NET
summary: .NET's model for non-blocking I/O that releases the thread while awaiting work.
level:
  - "4"
priority: High
status: In Progress
qard-deck: Programming
qard-topic: NET/CSharp/Concurrency and Parallelism/Async Await
flashcard_uid: 4a42db52
---

`async` and `await` let .NET code wait for I/O without holding a thread idle. While a network or database operation is in flight, the worker can return to the pool and run something else. UI applications stay responsive, and servers can keep many requests in progress without assigning a thread to every wait.

Asynchronous I/O reduces the threads tied up in waiting; it does not make the I/O itself faster or remove limits imposed by CPU work, connection pools or downstream services.

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

The fix belongs at the boundary that blocks: awaiting there instead of blocking keeps the call chain asynchronous. Library code that does not need the caller's context can also use `ConfigureAwait(false)`, but relying on every transitive await to do so is brittle.

**Fire-and-forget swallows exceptions**
Calling an async method without awaiting it drops the caller's handle to completion. A later fault sits on the returned `Task` with no local code to observe or report it.

```csharp
// Exception is lost — the task is never observed
_ = SendEmailAsync(user);
```

Work that belongs to the current operation is awaited by that operation. Work that must outlive it belongs in an owned background queue where failures and shutdown are observed.

**Async void**
`async void` methods cannot be awaited and their exceptions cannot be caught by callers. They exist only for event handlers.

```csharp
// Caller cannot catch this exception
public async void OnButtonClick(object sender, EventArgs e) { ... }
```

Fix: `async Task` replaces `async void` everywhere except event handlers.

**Unnecessary `Task.Run` wrapping**
Wrapping already-async I/O in `Task.Run` adds a ThreadPool scheduling hop without making the I/O more asynchronous. The worker can return once the I/O has been initiated; it need not stay occupied for the whole wait.

A `Task.Run` wrapper around synchronous blocking I/O still occupies a ThreadPool worker for the whole wait.

```csharp
// Pointless — GetAsync is already async
var result = await Task.Run(() => _http.GetAsync(url));
```

Fix: the async method is awaited directly, without the `Task.Run` wrapper.

**Awaiting `Task.WhenAll` throws one contained exception**
A faulted `WhenAll` task records every failure in its `Exception` property, but `await` propagates one contained exception rather than throwing the surrounding `AggregateException`. When every failure matters, code keeps the combined task and inspects `task.Exception`.

# Questions

<!-- qard-id: 1cd27d60-d7eb-47c8-9be5-3d6e78be5028 -->

> [!qard]- How do asynchronous waiting and multithreading differ?
> Asynchronous waiting is about not occupying a thread while an operation is pending; multithreading is about running work on more than one thread. An `async` method does not create a thread by itself.
>
> | Aspect | Asynchronous waiting | Multithreading |
> |---|---|---|
> | What it addresses | Time spent waiting for I/O or another pending operation. | Executing several pieces of work on separate threads. |
> | Thread use | While true asynchronous I/O is pending, the method is suspended and no thread runs it. A thread is needed again only when completion makes the continuation runnable. | Each piece of work occupies its thread while it runs. The threads run in parallel only when enough processors are available; otherwise the scheduler interleaves them. |
> | CPU-bound work | No gain by itself, because computation still needs a thread to execute. | Several pieces of CPU-bound work can make progress at the same time when processors allow. |
>
> The two ideas are independent: asynchronous code can wait without extra threads, and multithreaded code can still block its threads while waiting.
>
> [Microsoft: `await` operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/await) · [Microsoft: ASP.NET Core best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0) · [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

<!-- qard-id: d15b1902-c519-4853-98ac-4cc2da428172 -->

> [!qard]- What changes when an incomplete task is consumed with `await` instead of `Task.Result`?
> `await` suspends the method and frees the current thread until the task completes, while `Task.Result` blocks the calling thread for the entire wait. That difference also changes deadlock risk and how failures surface.
>
> | Aspect | `await` | `Task.Result` |
> |---|---|---|
> | Calling thread | Returns to its caller while the task is pending, so the thread can run other work. | Stays blocked and idle until the task completes. |
> | Resumption | Runs the rest of the method later as a continuation, through the captured `SynchronizationContext` or non-default `TaskScheduler` when one applies. | Continues on the same thread once it is released; no continuation is involved. |
> | Deadlock risk | Avoids the context deadlock, because the waiting code does not hold the context's thread. | Can deadlock when the task's continuation needs a single-threaded context, such as a UI thread, that the blocked caller occupies. Each side then waits for the other. |
> | Failures | Rethrows the task's exception itself; when a task holds several exceptions, `await` rethrows one of them. | Throws an `AggregateException` that wraps the task's exception or exceptions. |
>
> [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming) · [Microsoft: Synchronous wrappers for asynchronous methods](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/synchronous-wrappers-for-asynchronous-methods) · [Microsoft: `Task<TResult>.Result`](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task-1.result)

<!-- qard-id: 52ff6f00-16ec-4741-9be4-2551798fc8ee -->

> [!qard]- What does `ConfigureAwait(false)` change?
> `ConfigureAwait(false)` tells an `await` that its continuation need not resume through the captured `SynchronizationContext` or non-default `TaskScheduler`. By default, an incomplete await resumes through that context, which in a UI app means the UI thread; with `false`, the continuation can run on a ThreadPool thread or on the thread that completed the operation.
>
> - It does not force a thread switch: an already-completed task continues synchronously in the original context.
> - It does not stop `ExecutionContext` flow, so `AsyncLocal<T>` values still arrive.
> - It does not reliably fix blocking on async work, because every `await` on the path would need it.
>
> [Microsoft: Task.ConfigureAwait](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.configureawait?view=net-10.0) · [.NET Blog: ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)

> [!qard]- When is `ConfigureAwait(false)` useful?
> It fits reusable libraries, which should not depend on or queue back to the caller's context. UI code keeps the default when code after the `await` touches controls. ASP.NET Core normally has no custom `SynchronizationContext`, so the setting changes little there.
>
> [Microsoft: Task.ConfigureAwait](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.configureawait?view=net-10.0) · [.NET Blog: ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)

<!-- qard-id: 21176d6e-4394-438b-b511-e3f91affc308 -->

> [!qard]- When is `Task.Run` useful?
> When code calls slow synchronous CPU work that has no async version, such as hashing byte arrays already in memory. `SHA256.HashData` is plain synchronous code, so calling it, even inside an `async` method, keeps the calling thread busy until it finishes. `Task.Run` moves that work to a ThreadPool thread, so starting one task per chunk lets several CPU jobs run in parallel:
>
> ```csharp
> var hashes = await Task.WhenAll(chunks.Select(c => Task.Run(() => SHA256.HashData(c))));
> ```
>
> With 4 similar-sized jobs and 4 free cores, this takes roughly the time of one job instead of four.
>
> `Task.Run` does not improve a genuine asynchronous I/O wait: that wait already holds no thread. An async method may still do expensive synchronous work before its first incomplete `await`; moving that work to a pool thread can keep a UI responsive. Awaiting a single `Task.Run` inside an ASP.NET Core request adds scheduling without reducing worker-thread use, because the request already runs on a pool thread.
>
> [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming) · [Microsoft: ASP.NET Core best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0)

<!-- qard-id: 5aa8c873-def1-41f7-b94d-d57d2107cc56 -->

> [!qard]- Why does `GetAsync() ?? throw` fail to reject a null result from `Task<string?>`?
> The expression checks the returned task reference, not the string that the task eventually produces. A non-null task can complete successfully with a null result. The result guard belongs after the await:
>
> ```csharp
> static async Task<string> GetRequiredAsync()
> {
>     return await GetAsync()
>         ?? throw new InvalidOperationException("Value is required.");
> }
> ```
>
> `Task<string?>` describes a task whose result may be null; it does not make the task itself nullable. [Microsoft: async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types)

<!-- qard-id: 65740b39-9c79-46c5-937b-0af89b968458 -->

> [!qard]- Does a method returning `Task` always report exceptions through the task?
> No. The caller gets different results depending on where the exception occurs:
>
> - **Inside an `async Task` method:** an exception not caught inside the method is saved in its returned task. The caller receives that task; awaiting it throws the exception. This applies even when the body throws **before its first `await`**.
>
> - **Inside a method returning `Task` without `async`:** if its code throws before returning a task, the call throws immediately. The caller gets an exception and no returned task. Such a method can also deliberately return a failed task; the return type alone does not decide.
>
> - **While preparing the call’s arguments:** arguments are evaluated before the method starts. If that work throws, the method never starts, and no task is returned.
>
> [Microsoft: C# async-function specification](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/classes#15143-evaluation-of-a-task-returning-async-function) · [Microsoft: Task-based asynchronous pattern exception guidance](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap#exceptions)

<!-- qard-id: 4d37a597-f69e-4d9f-840b-4ec77e3aa513 -->

> [!qard]- Why can't the caller catch exceptions from an `async void` method?
> The code generated for an `async void` method catches exceptions that escape its body. Instead of throwing them back to the caller, it schedules a separate callback that throws the exception. The caller’s `try`/`catch` covers the original call, not this separate execution path.
>
> That callback is posted through the `SynchronizationContext` captured when the method starts. This is the framework’s way to queue work, such as onto a UI thread. If no context was captured, the callback runs on a ThreadPool thread. This routing also applies before the first `await`. The method returns no `Task` that the caller could await to observe the failure.
>
> **This will not catch the exception:**
>
> ```csharp
> try
> {
>     Handler();
> }
> catch (InvalidOperationException)
> {
>     Console.WriteLine("Caught");
> }
>
> async void Handler()
> {
>     await Task.FromException(new InvalidOperationException());
> }
> ```
>
> **This will catch the exception inside the handler:**
>
> ```csharp
> Handler();
>
> async void Handler()
> {
>     try
>     {
>         await Task.FromException(new InvalidOperationException());
>     }
>     catch (InvalidOperationException)
>     {
>         Console.WriteLine("Caught");
>     }
> }
> ```
>
> [Microsoft: async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types) · [.NET: AsyncVoidMethodBuilder](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Runtime/CompilerServices/AsyncVoidMethodBuilder.cs) · [.NET: Task.ThrowAsync](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Threading/Tasks/Task.cs#L1734-L1764)

# References

- [Async programming scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
- [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
