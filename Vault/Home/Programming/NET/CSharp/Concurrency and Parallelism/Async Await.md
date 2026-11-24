---
topic: [Programming]
subtopic: [NET]
level: ["4"]
priority: High
status: In Progress
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Concurrency and Parallelism/Async Await"
flashcard_uid: "4a42db52"
created: "2026-02-10T16:03:55.000Z"
modified: "2026-11-24T12:42:46.039Z"
published: "2026-07-08T13:14:17.320Z"
---

`async` and `await` let .NET code wait for I/O without holding a thread idle. While a network or database operation is in flight, the worker can return to the pool and run something else. UI applications stay responsive, and servers can keep many requests in progress without assigning a thread to every wait.

Asynchronous I/O reduces the threads tied up in waiting, but it does not make the I/O itself faster or remove limits imposed by CPU work, connection pools or downstream services.

The useful mental model is simple: **async does not mean "run on another thread."** During a true asynchronous I/O wait, no thread is executing the method. Completion makes its continuation runnable later.

# How the State Machine Works

The C# compiler lowers an `async` method into a state-machine type. For ordinary `async Task` methods, Roslyn commonly emits a struct, while async iterators use a reference type that also serves enumerable and enumerator roles. Each suspension point becomes a state transition. At compile time, this code:

```csharp
public async Task<string> FetchAsync(string url)
{
    var response = await _http.GetAsync(url);
    return await response.Content.ReadAsStringAsync();
}
```

The compiler emits a state machine with fields for local state such as `url` and `response`. Its `MoveNext()` method advances the method until the next incomplete await. Completion schedules another call to `MoveNext()`.

**What happens at each `await`:**

1. The method runs synchronously on the caller's thread until it hits the first incomplete awaitable.
2. The awaiter reports whether the operation has already completed. If it has, execution continues without yielding.
3. If not done, a continuation is registered on the awaitable and the method returns an incomplete `Task` to its caller.
4. When the I/O completes, the continuation fires and `MoveNext()` resumes from the saved state.

This is why `await` differs from `Task.Result` and `Task.Wait()`: those block the current thread, while `await` releases it.

**Allocation cost.** For an ordinary `async Task` method, the generated state machine is commonly a value type. When the method suspends, its state must survive after the current stack frame returns, so the builder stores it for later continuation. A method that completes synchronously can avoid that suspension path. `ValueTask<T>` can reduce allocations when synchronous completion is common, but it adds consumption rules and should be introduced only after measurement. `Task` remains the clear default.

# ConfigureAwait

By default, `await` asks to resume through the current `SynchronizationContext`, or through a non-default current `TaskScheduler`. A UI application uses that behavior to return to its UI thread. ASP.NET Core normally has no custom synchronization context, so there is usually nothing to capture there.

`ConfigureAwait(false)` says the continuation does not require resumption through the captured context or scheduler. It does not promise a thread switch: an already-completed await may continue synchronously, and another continuation may run on the thread that completes the operation.

```csharp
// Library code: no UI or request context needed
var data = await _repo.GetAsync(id).ConfigureAwait(false);
```

General-purpose library code often uses `ConfigureAwait(false)` because it should not depend on a caller's scheduling context. Application code should make the choice from its actual host: UI code may need the captured context, while ASP.NET Core code usually gains little from spelling out `false`. This option does not repair sync-over-async by itself. The durable fix is to keep the call chain asynchronous.

## `ExecutionContext` Vs `SynchronizationContext`

These mechanisms carry different things across an await:

- **`SynchronizationContext`** influences where the continuation runs. `ConfigureAwait(false)` opts out of capturing it.
- **`ExecutionContext`** carries ambient state such as `AsyncLocal<T>` values. It flows across normal awaits even when `ConfigureAwait(false)` is used. Suppressing that flow is a separate, rare operation.

## `ConfigureAwaitOptions` (.NET 8)

.NET 8 added `ConfigureAwait(ConfigureAwaitOptions)` for cases that need more than the Boolean choice:

- `ContinueOnCapturedContext` is the equivalent of the old `true`.
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

// Consumer: pulls one item at a time, never materializing the full set
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
// DEADLOCK in UI or legacy ASP.NET: never do this
var result = GetDataAsync().Result;
```

The fix belongs at the boundary that blocks: awaiting there instead of blocking keeps the call chain asynchronous. Library code that does not need the caller's context can also use `ConfigureAwait(false)`, but relying on every transitive await to do so is brittle.

**Fire-and-forget swallows exceptions**
Calling an async method without awaiting it drops the caller's handle to completion. A later fault sits on the returned `Task` with no local code to observe or report it.

```csharp
// Exception is lost: the task is never observed
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
Wrapping already-async I/O in `Task.Run` adds a ThreadPool scheduling hop without making the I/O more asynchronous. The worker can return once the I/O has been initiated, and it need not stay occupied for the whole wait.

A `Task.Run` wrapper around synchronous blocking I/O still occupies a ThreadPool worker for the whole wait.

```csharp
// Pointless: GetAsync is already async
var result = await Task.Run(() => _http.GetAsync(url));
```

Fix: the async method is awaited directly, without the `Task.Run` wrapper.

**Awaiting `Task.WhenAll` throws one contained exception**
A faulted `WhenAll` task records every failure in its `Exception` property, but `await` propagates one contained exception rather than throwing the surrounding `AggregateException`. When every failure matters, code keeps the combined task and inspects `task.Exception`.

# Questions

<!-- qard-id: 1cd27d60-d7eb-47c8-9be5-3d6e78be5028 -->
> [!qard]- How do asynchronous waiting and multithreading differ?
> Asynchronous waiting is about not occupying a thread while an operation is pending. Multithreading is about running work on more than one thread. An `async` method does not create a thread by itself.
>
> | Aspect | Asynchronous waiting | Multithreading |
> |---|---|---|
> | What it addresses | Time spent waiting for I/O or another pending operation. | Executing several pieces of work on separate threads. |
> | Thread use | While true asynchronous I/O is pending, the method is suspended and no thread runs it. A thread is needed again only when completion makes the continuation runnable. | Each piece of work occupies its thread while it runs. The threads run in parallel only when enough processors are available, and otherwise the scheduler interleaves them. |
> | CPU-bound work | No gain by itself, because computation still needs a thread to execute. | Several pieces of CPU-bound work can make progress at the same time when processors allow. |
>
> The two ideas are independent: asynchronous code can wait without extra threads, and multithreaded code can still block its threads while waiting.
>
> [Microsoft: `await` operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/await) · [Microsoft: ASP.NET Core best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0) · [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

> [!qard]- Why does asynchronous I/O need no thread while it waits?
> No thread is needed because a thread only executes instructions, and while the reply is pending the method has none. The waiting is done by hardware and the operating system, so the thread is free for other work.
>
> For an awaited database query:
>
> 1. The method asks the operating system to send the query, gets an incomplete task back and returns, which frees the thread.
> 2. The database does the work, and the operating system keeps only a small record of the pending request, not a thread.
> 3. When the reply arrives, the network card signals the operating system, which notifies .NET.
> 4. A thread, usually from the ThreadPool, runs the rest of the method.
>
> This holds only for truly asynchronous APIs: a synchronous call such as `File.ReadAllText` blocks its thread for the whole wait, even inside `Task.Run`.
>
> [Stephen Cleary: There Is No Thread](https://blog.stephencleary.com/2013/11/there-is-no-thread.html) · [.NET Blog: How Async/Await Really Works in C#](https://devblogs.microsoft.com/dotnet/how-async-await-really-works/)

> [!qard]- Which thread runs the code after an `await`?
> Not necessarily the thread that started the method: there is no general rule that code returns to the original thread. If the awaited operation has already completed, the code continues synchronously on the same thread. Otherwise the continuation runs where the captured context sends it, which in a UI app is the UI thread, and with nothing captured it runs on a ThreadPool thread or inline on the thread that completed the operation.
>
> An `async` method starts on its caller's thread and is not queued to the pool. At an incomplete `await`, the method returns to its caller, and the rest of the method (the continuation) is scheduled when the operation completes. The `await` fixes the target when it suspends, in this order:
>
> 1. **A current `SynchronizationContext`:** the continuation is posted to that context. WPF and WinForms install one that queues work to the UI thread.
> 2. **A non-default current `TaskScheduler`:** the continuation is scheduled on that scheduler.
> 3. **Neither:** a ThreadPool thread or the completing thread. This is normal in ASP.NET Core, in console apps and inside `Task.Run`, and `ConfigureAwait(false)` selects it regardless of context.
>
> Because the thread can change across an `await`, `[ThreadStatic]` data does not carry across it, and because monitor ownership belongs to a thread, the compiler rejects `await` inside a `lock` block.
>
> [Microsoft: `await` operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/await) · [.NET Blog: ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)

<!-- qard-id: d15b1902-c519-4853-98ac-4cc2da428172 -->
> [!qard]- Why can `Task.Result` deadlock, and how does `await` help?
> `Task.Result` blocks the calling thread until the task completes, so it deadlocks when the task needs that same thread in order to complete, as under a single-threaded `SynchronizationContext` such as a UI thread. `await` returns the thread to the caller instead of blocking, so the thread is free to run the queued continuation and the task completes.
>
> ```csharp
> // Called on the UI thread
> var text = LoadAsync().Result;      // UI thread blocks until LoadAsync completes
>
> async Task<string> LoadAsync()
> {
>     var raw = await ReadAsync();    // incomplete: the rest is queued back to the UI thread
>     return raw.Trim();              // can run only on the UI thread, which is blocked
> }
> ```
>
> `LoadAsync` cannot complete until its last line runs on the UI thread, and the UI thread cannot run it until `LoadAsync` completes. Each waits for the other.
>
> With `await LoadAsync()`, the UI thread goes back to its message loop and runs the queued line.
>
> Without a single-threaded context, as in ASP.NET Core or a console app, the queued line runs on a ThreadPool thread, so `Task.Result` does not deadlock there. It still holds one thread idle for the whole wait.
>
> [Microsoft: `await` operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/await) · [Microsoft: Synchronous wrappers for asynchronous methods](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/synchronous-wrappers-for-asynchronous-methods) · [Microsoft: `Task<TResult>.Result`](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task-1.result)

> [!qard]- How do exceptions from `await` and `Task.Result` differ?
> `await` rethrows the exception the task recorded, so a `catch` for its specific type works. `Task.Result` throws an `AggregateException` that wraps it, so the original exception has to be read from `InnerExceptions`.
>
> A task can hold several exceptions, as a faulted `Task.WhenAll` does. `await` still rethrows only one of them, while the `AggregateException` from `Task.Result` carries all of them.
>
> [Microsoft: `await` operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/await) · [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

<!-- qard-id: 52ff6f00-16ec-4741-9be4-2551798fc8ee -->
> [!qard]- What does `ConfigureAwait(false)` change?
> `ConfigureAwait(false)` tells an `await` that its continuation need not resume through the captured `SynchronizationContext` or non-default `TaskScheduler`. By default, an incomplete await resumes through that context, which in a UI app means the UI thread. With `false`, the continuation can run on a ThreadPool thread or on the thread that completed the operation.
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
> `Task.Run` runs the given code on a ThreadPool thread instead of the current thread. That is useful for a long calculation in two cases: keeping the calculation off the UI thread, and running several calculations at once on separate cores.
>
> The UI thread is the one thread that redraws the window and handles clicks, so the app freezes while that thread calculates. `await` alone cannot prevent the freeze, because `await` gives a thread back only while the code waits for something else to finish, such as a network reply. A calculation has no such wait, because the processor is executing its code the whole time.
>
> ```csharp
> // Click handler on the UI thread. Resize only computes pixels of a photo already in memory.
>
> // Direct call: the UI thread does the resizing
> preview.Image = Resize(photo);
>
> // Task.Run: a pool thread does the resizing, so the UI thread stays free
> preview.Image = await Task.Run(() => Resize(photo));
> ```
>
> Several `Task.Run` calls awaited with `Task.WhenAll` run on separate cores, so 4 similar calculations on 4 free cores take about the time of one.
>
> `Task.Run` does not help in two cases:
>
> - **An awaited I/O call:** `await` already gave the thread back for the wait, so no busy thread is left to replace.
> - **A single `Task.Run` inside an ASP.NET Core request:** the request code already runs on a pool thread, so `Task.Run` only swaps one pool thread for another.
>
> [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming) · [Microsoft: ASP.NET Core best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0)

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
