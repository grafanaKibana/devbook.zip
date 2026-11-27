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
modified: "2026-11-27T16:47:13.667Z"
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
> `Task.Result` can deadlock because it blocks the calling thread until the task finishes, and the rest of the async method may have to run on that same thread. That is the case on a UI thread, because the rest of a method after an `await` is queued back to it through the `SynchronizationContext`. The thread then waits for the task, and the task waits for the thread. `await` does not block, so the thread is free to run the rest of the method and the task finishes.
>
> ```csharp
> // UI app, called on the UI thread
> var text = LoadAsync().Result;      // 2. blocks the UI thread until LoadAsync finishes
>
> async Task<string> LoadAsync()
> {
>     var raw = await ReadAsync();    // 1. not finished yet, so the rest will be queued to the UI thread
>     return raw.Trim();              // 3. never runs, because the UI thread is blocked in step 2
> }
> ```
>
> ASP.NET Core has no such context, so the rest of the method runs on any ThreadPool thread and `.Result` does not deadlock. `.Result` still keeps the request's thread blocked for the whole wait, and under load the blocked requests can use up the pool, so the queued rest of each method has no thread to run on. That is thread pool starvation: the API stops responding, which looks like a deadlock. With `await`, the thread goes back to the pool during the wait.
>
> ```csharp
> [HttpGet]
> // ASP.NET Core Web API, blocking: no deadlock, but the thread is held for the whole wait
> public string Get() => _service.LoadAsync().Result;
>
> [HttpGet]
> // Fixed: the thread returns to the pool during the wait
> public async Task<string> Get() => await _service.LoadAsync();
> ```
>
> [.NET Blog: ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/) · [Microsoft: Synchronous wrappers for asynchronous methods](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/synchronous-wrappers-for-asynchronous-methods) · [Microsoft: `Task<TResult>.Result`](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task-1.result) · [Microsoft: ASP.NET Core best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0)

> [!qard]- How do exceptions from `await` and `Task.Result` differ?
> `await` rethrows the exception the task recorded, so a `catch` for its specific type works. `Task.Result` throws an `AggregateException` that wraps it, so the original exception has to be read from `InnerExceptions`.
>
> A task can hold several exceptions, as a faulted `Task.WhenAll` does. `await` still rethrows only one of them, while the `AggregateException` from `Task.Result` carries all of them.
>
> [Microsoft: `await` operator](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/await) · [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

<!-- qard-id: 52ff6f00-16ec-4741-9be4-2551798fc8ee -->
> [!qard]- What does `ConfigureAwait(false)` do to an async method?
> `ConfigureAwait(false)` changes where the rest of a method runs after an `await`. By default the `await` reads `SynchronizationContext.Current` when it suspends and queues the rest to that context. The context is not a thread but an object that decides where queued work runs, and a UI app's context queues work to the UI thread. `ConfigureAwait(false)` skips the context, so the rest runs on a ThreadPool thread. ASP.NET Core has no context, so the rest already runs on a pool thread and the call changes nothing there.
>
> A reusable library is the usual place for `ConfigureAwait(false)`, because the library does not know its caller and does not need the caller's context after an `await`. Every `await` in the library needs the call, because it applies only to the `await` it is written on.
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
> The caller cannot catch the exception because an `async void` method returns nothing that could carry the exception back. An `async Task` method stores the exception in the returned task, and the caller's `await` rethrows it inside the caller's `try`/`catch`. An `async void` method has no task, so the exception is thrown somewhere else. It goes to the `SynchronizationContext` that was current when the method started, or to a ThreadPool thread when there is none, as in ASP.NET Core. Nothing catches the exception there, so the process normally crashes. The same happens when the exception is thrown before the first `await`. The rule is `async Task` everywhere except event handlers, and an `async void` handler keeps its `try`/`catch` inside the method body.
>
> ```csharp
> try { Handler(); }                        // returns with no Task to await
> catch (InvalidOperationException) { }     // never runs
>
> async void Handler()
> {
>     await Task.Delay(100);
>     throw new InvalidOperationException();   // only a try/catch in here catches it
> }
> ```
>
> [Microsoft: async return types](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-return-types) · [.NET: AsyncVoidMethodBuilder](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Runtime/CompilerServices/AsyncVoidMethodBuilder.cs) · [.NET: Task.ThrowAsync](https://github.com/dotnet/runtime/blob/v10.0.0/src/libraries/System.Private.CoreLib/src/System/Threading/Tasks/Task.cs#L1734-L1764)

# References

- [Async programming scenarios](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
- [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
