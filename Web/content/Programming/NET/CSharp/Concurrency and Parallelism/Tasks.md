---
publish: true
created: 2026-10-21T13:29:32.441Z
modified: 2026-10-21T13:29:32.441Z
published: 2026-10-21T13:29:32.441Z
topic:
  - Programming
subtopic:
  - NET
summary: .NET's core abstraction for asynchronous work, its completion, result, and composition.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Concurrency and Parallelism/Tasks
flashcard_uid: 9dbbd8f8
---

`Task` is a handle to an operation that may finish later. It records completion, cancellation, or failure and gives other code something to await or combine. The abstraction says nothing about whether a thread is currently executing the operation.

A CPU-bound task may run on a ThreadPool worker. A task representing asynchronous I/O normally spends most of its lifetime waiting for the operating system, with a thread needed only to initiate work and process completion. Keeping that distinction visible prevents needless `Task.Run` calls and misleading thread-count assumptions.

# How It Works

`Task` is the read side of a future/promise pair. `TaskCompletionSource<T>` exposes the write side for adapting callbacks or events to a task-based contract. A task eventually reaches `RanToCompletion`, `Faulted`, or `Canceled`. Its earlier status depends on how it was created and scheduled.

`await` first asks whether the awaiter has completed. If so, execution may continue synchronously. Otherwise, the async state machine registers its continuation and returns control to the caller. The continuation later runs through the captured scheduling context when one applies, or through the default task infrastructure.

**Core forms:**

- `Task` — represents an operation with no return value.
- `Task<T>` — represents an operation that produces a value of type `T`.
- `ValueTask` / `ValueTask<T>` — value-type awaitables that can represent an immediate result, a `Task`, or an `IValueTaskSource`. They can avoid a `Task` allocation in carefully measured APIs, but their consumption rules are stricter.

**Creation and scheduling.** Tasks returned by `async` methods and most framework APIs already represent work in progress. A task created with the `Task` constructor remains in `Created` until scheduled with `Start`, which is rarely useful in application code. `Task.Factory.StartNew` is lower-level and easy to misuse with asynchronous delegates:

- An `async` lambda can produce a nested task that requires `Unwrap`.
- The default scheduler is `TaskScheduler.Current`, so behavior can depend on the caller's context.

`Task.Run` is the normal way to queue CPU-bound work to the default scheduler. `TaskCreationOptions.LongRunning` is a scheduler hint for work that would otherwise monopolize a worker. The default scheduler typically responds with a non-pool thread, but custom schedulers may behave differently.

**Already-completed tasks.** `Task.CompletedTask`, `Task.FromResult`, `Task.FromException`, and `Task.FromCanceled` express a known outcome without scheduling work. The runtime may cache some completed instances, but that is an implementation optimization rather than a contract to build allocation claims around.

# Example — Parallel Fan-Out

```csharp
public async Task<IReadOnlyList<UserDto>> LoadUsersAsync(
    IEnumerable<int> ids,
    CancellationToken cancellationToken)
{
    var tasks = ids.Select(id => _client.GetUserAsync(id, cancellationToken));
    var users = await Task.WhenAll(tasks);
    return users;
}
```

Enumerating `ids.Select(...)` creates the request tasks, and `Task.WhenAll` returns a task that completes after all of them finish. `WhenAll` does not start dormant tasks itself. When the operations are independent and their work overlaps, elapsed time approaches the slowest operation rather than the sum. Downstream limits can change that result.

# Failure Aggregation

The task returned by `WhenAll` waits for every input. If any input faults, the combined task is faulted and retains the collection of unwrapped input failures in its `Exception`. Awaiting it propagates one exception, so code that needs the full set must inspect the combined task or the individual tasks after completion.

The example below rebuilds an aggregate from the individual tasks. Its catch executes only after `WhenAll` has reached a terminal state, so every input can be inspected.

```csharp
public async Task SyncAllAsync(CancellationToken cancellationToken)
{
    Task a = _catalog.SyncAsync(cancellationToken);
    Task b = _pricing.SyncAsync(cancellationToken);
    Task c = _inventory.SyncAsync(cancellationToken);

    try
    {
        await Task.WhenAll(a, b, c);
    }
    catch when (a.IsFaulted || b.IsFaulted || c.IsFaulted)
    {
        // Inspect all faults, not only the first observed one.
        var failures = new[] { a, b, c }
            .Where(t => t.IsFaulted)
            .SelectMany(t => t.Exception!.Flatten().InnerExceptions)
            .ToArray();

        throw new AggregateException("Batch sync failed", failures);
    }
}
```

# Composition Patterns

| Pattern | Use case |
|---------|----------|
| `Task.WhenAll(tasks)` | Complete after every input. Preserve failures on the combined task |
| `Task.WhenAny(tasks)` | Return the first completed task, whether successful, faulted, or canceled |
| `TaskCompletionSource<T>` | Bridge callback/event APIs into task-based APIs |
| `Task.Run(action)` | Offload CPU-bound work to a pool thread |
| `ValueTask<T>` | Measured optimization when synchronous completion is common |

## Processing Tasks as They Finish

Repeatedly calling `WhenAny` over a shrinking list adds coordination work and makes early-exit cleanup easy to forget. On .NET 9+, `Task.WhenEach` yields each task after it completes. If several tasks finish together, their exact enumeration order is unspecified:

```csharp
await foreach (var finished in Task.WhenEach(tasks))
{
    // handle each result/fault once available; ties have no defined order
    Use(await finished);
}
```

`TaskScheduler` decides where scheduled task work runs. Async continuations also interact with `SynchronizationContext`, so continuation placement is broader than `TaskScheduler` alone. For bounded concurrent [[Parallelism|fan-out]] over a collection, `Parallel.ForEachAsync` is often clearer than creating every task up front and gating each one with `SemaphoreSlim`.

# Pitfalls

**Unobserved task exceptions.** A fault stays on its task until observed through `await`, `Wait`, `Result`, or `Exception`. If the task becomes collectible first, the runtime can raise `TaskScheduler.UnobservedTaskException`. Modern .NET does not terminate the process by default after that event. Relying on finalization for reporting is still nondeterministic.

```csharp
// Exception is lost — the task is never awaited or observed
_ = SendEmailAsync(user);
```

The fault-only continuation below observes the fault, but it is not a general fire-and-forget primitive. Application work should normally be awaited or handed to an owned background queue whose worker logs failures and participates in shutdown.

```csharp
_ = SendEmailAsync(user).ContinueWith(
    t => _logger.LogError(t.Exception, "Email send failed"),
    TaskContinuationOptions.OnlyOnFaulted);
```

**`ValueTask` consumed more than once.** A `ValueTask` backed by `IValueTaskSource` may reuse pooled state, so multiple awaits, concurrent awaits, or mixing `Result` with awaiting can break its contract. A value backed by a `Task` or immediate result is more permissive, but callers should not depend on knowing that representation.

```csharp
var vt = GetCachedValueAsync();
var r1 = await vt; // OK
var r2 = await vt; // WRONG — may read from a recycled object
```

A single `AsTask()` call converts the `ValueTask` to a `Task` when the result must be cached, shared, or awaited more than once.

**`Task.Run` for asynchronous I/O.** Wrapping an already asynchronous API adds a ThreadPool scheduling hop. The worker normally returns after the I/O has been initiated, so it is inaccurate to say that it stays occupied for the whole wait, but the wrapper still adds no useful asynchrony.

```csharp
// Pointless — GetStringAsync is already async
var result = await Task.Run(() => _http.GetStringAsync(url));
```

Awaiting the async method directly gives the same asynchrony without the scheduling hop.

**Unbounded fan-out.** Creating thousands of operations can exhaust connection limits, rate limits, memory, or downstream capacity. Pure asynchronous waiting does not consume one ThreadPool worker per task, but every completion and CPU segment still needs processing.

```csharp
// Dangerous with large collections — no concurrency limit
var results = await Task.WhenAll(items.Select(i => ProcessAsync(i)));
```

Concurrency is bounded according to the scarce resource. `Parallel.ForEachAsync`, a channel-backed worker set, or `SemaphoreSlim` can limit work before it reaches the dependency or [[ThreadPool]].

# Questions

<!-- qard-id: f3889ce8-c8c4-492a-b4a0-d4b3be95ed90 -->

> [!qard]- Why is `Task` not equivalent to a thread?
> A `Task` is an object that represents an operation and its eventual outcome: a result, a failure or cancellation. A thread is an execution resource that runs code. A task uses a thread only while code belonging to it is actually running.
>
> - **CPU-bound tasks:** with the default scheduler, which `Task.Run` uses, their delegates are queued to the ThreadPool, where a limited set of reusable threads runs many tasks over time instead of one thread per task. A custom `TaskScheduler` decides for itself where its tasks run, and the `LongRunning` hint typically leads the default scheduler to use a separate non-pool thread.
> - **I/O-bound tasks:** while the operating system performs the I/O, the pending task holds no managed thread. A thread is needed only to start the operation and to run the code that processes its completion.
>
> Creating many tasks therefore does not mean one thread per task, and the number of pending tasks does not show how many threads are busy.
>
> [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming) · [Microsoft: TaskScheduler](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.taskscheduler?view=net-10.0) · [Microsoft: TAP I/O-bound tasks](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/implementing-the-task-based-asynchronous-pattern#io-bound-tasks)

<!-- qard-id: db5bfc4e-e700-4619-8af4-682ca20127c6 -->

> [!qard]- Why does awaiting `Task.Run` inside an ASP.NET Core request usually not help?
> ASP.NET Core already runs request code on ThreadPool threads. When the request awaits `Task.Run`, its own thread returns to the pool while another pool thread runs the work. The request therefore gains no CPU capacity and frees no net thread. It only adds a scheduling hop.
>
> - **Blocking work:** inside `Task.Run` it still blocks a pool thread, just a different one. Synchronous I/O does not become asynchronous I/O.
> - **Already asynchronous APIs:** awaiting them directly gives the same non-blocking wait without the extra hop.
> - **Long-running or CPU-heavy work:** it competes with other requests for the same pool threads. It belongs outside the request path, for example in a background service or an out-of-process worker fed by a queue, with the result reported to the client asynchronously.
>
> [Microsoft: ASP.NET Core best practices](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0) · [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

<!-- qard-id: 55bddd1a-2bfc-482a-a86b-0be86ea885a5 -->

> [!qard]- Why can `Task.WhenAll` reduce elapsed time for independent asynchronous calls?
> The time saving comes from starting the calls before waiting, so their waits overlap. Awaiting each call in turn makes the total roughly the sum of the call times. Starting all of them first and then awaiting `Task.WhenAll` makes the total approach the slowest call.
>
> ```csharp
> // Sequential: the second call starts only after the first finishes
> var user = await GetUserAsync(id);
> var orders = await GetOrdersAsync(id);
>
> // Overlapped: both calls are in flight before the wait
> var userTask = GetUserAsync(id);
> var ordersTask = GetOrdersAsync(id);
> await Task.WhenAll(userTask, ordersTask);
> ```
>
> `Task.WhenAll` itself only returns a task that completes when every supplied task has completed. It does not start tasks that were never started, and it does not make synchronous work run in parallel. Awaiting the already-started tasks one by one would also overlap them. `WhenAll` adds one wait for all of them that also records every failure.
>
> The gain also requires the calls to be independent and the downstream service to handle them concurrently. If it queues or throttles them, the total moves back toward the sum.
>
> [Microsoft: Task.WhenAll](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenall?view=net-10.0) · [Microsoft: Task-based asynchronous programming](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

> [!qard]- How does `Task.WhenAll` report failures when several of its tasks fail?
> The task returned by `Task.WhenAll` completes only after every supplied task has finished. If any of them faulted, it ends faulted, and its `Exception` holds an `AggregateException` with the failures from all faulted tasks. Awaiting it, however, rethrows only one of those exceptions.
>
> - **The other failures:** after `await` throws, the full set is still available on the combined task's `Exception.InnerExceptions` and on each input task's own `Exception`.
> - **No early exit:** one failure does not stop or cancel the remaining tasks, and `WhenAll` still waits for all of them.
> - **Cancellation:** when no task faulted but at least one was canceled, the combined task ends canceled.
>
> ```csharp
> Task all = Task.WhenAll(a, b, c);
> try
> {
>     await all;
> }
> catch (Exception)
> {
>     // await rethrew one failure; the combined task keeps all of them
>     var failures = all.Exception?.InnerExceptions;
>     Log(failures);
>     throw;
> }
> ```
>
> [Microsoft: Task.WhenAll](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenall?view=net-10.0)

<!-- qard-id: cc606580-b441-46d2-82a6-9d4928c9c59e -->

> [!qard]- When is `ValueTask` worth using instead of `Task`?
> `ValueTask` is worth it only when profiling shows that `Task` allocations on a hot path matter. The typical case is a method called very often that usually completes synchronously, such as a read served from an internal buffer. `Task` remains the default.
>
> - **What it saves:** when the result is already available, `ValueTask<T>` carries it directly instead of allocating a `Task<T>`. It can also wrap a reusable `IValueTaskSource`, so some asynchronous completions avoid an allocation too.
> - **What it costs:** the struct holds more fields than a single `Task` reference, so returning and copying it costs more. It also has stricter consumption rules: it is awaited only once, never awaited concurrently, and its `Result` is not read before it completes. A pooled source can be reused for another operation after the first consumption, so breaking these rules gives undefined behavior, such as reading another operation's result.
>
> A caller that must store, share or await the result more than once calls `AsTask()` once and uses the resulting `Task`.
>
> [Microsoft: ValueTask](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask?view=net-10.0)

# References

- [Task class](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task)
- [Understanding the whys, whats, and whens of ValueTask](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/)
