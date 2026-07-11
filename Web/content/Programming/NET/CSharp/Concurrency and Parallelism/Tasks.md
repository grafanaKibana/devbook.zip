---
publish: true
created: 2026-07-11T18:27:45.835Z
modified: 2026-07-11T18:27:45.835Z
published: 2026-07-11T18:27:45.835Z
topic:
  - Programming
subtopic:
  - NET
summary: Task is .NET's core abstraction for asynchronous work, modeling eventual completion, result/error propagation, and composition without managing raw threads.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

`Task` is the core .NET abstraction for asynchronous work. It models eventual completion, result/error propagation, and composition (`WhenAll`, `WhenAny`) without forcing you to manage raw threads. For production systems, understanding `Task` semantics is critical for avoiding deadlocks, thread starvation, and unbounded fan-out.

`Task` represents an operation, not a thread. A task might run on a pooled worker, or it might represent asynchronous I/O that completes later without occupying a worker while waiting.

## How It Works

A `Task` is a promise: it starts in one of three terminal states — `RanToCompletion`, `Faulted`, or `Canceled`. The runtime tracks the state and stores the result or exception. When you `await` a task, the compiler generates a continuation that runs when the task reaches a terminal state.

**Key types:**

- `Task` — represents an operation with no return value.
- `Task<T>` — represents an operation that produces a value of type `T`.
- `ValueTask` / `ValueTask<T>` — stack-allocated alternative for hot paths where the result is often synchronously available (e.g., cached reads). Has strict consumption rules.

**Hot vs cold tasks.** Tasks returned from `async` methods, `Task.Run`, and most BCL APIs are **hot** — already started. Only a `Task` created with the `new Task(...)` constructor is **cold** and must be `.Start()`ed; this form is essentially never correct in modern code. Avoid `Task.Factory.StartNew` too — it is full of foot-guns:

- It is **not async-aware**: passing an `async` lambda returns a `Task<Task>`, so you must call `.Unwrap()` (or you'll "complete" before the inner work does).
- It defaults to **`TaskScheduler.Current`**, not `TaskScheduler.Default` — inside a parallel/UI context that can schedule your work somewhere surprising.

Use `Task.Run` for CPU-bound offload; reserve `Task.Factory.StartNew` for the rare case you genuinely need `TaskCreationOptions.LongRunning` (which spins a dedicated thread instead of borrowing a pool thread).

**Cached completed tasks.** Don't allocate a fresh task for synchronous results — use the runtime's cached singletons: `Task.CompletedTask`, `Task.FromResult(value)`, `Task.FromException(ex)`, `Task.FromCanceled(token)`. `Task.FromResult` caches common values (e.g. `true`/`false`/small ints) so it is allocation-free in the common case.

## Example — Parallel Fan-Out

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

`Task.WhenAll` starts all requests concurrently and waits for all to complete. Total latency is the slowest individual request, not the sum.

## Failure Aggregation

`Task.WhenAll` throws the first exception when awaited, but all tasks run to completion. To inspect all failures:

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
    catch
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

## Composition Patterns

| Pattern | Use case |
|---------|----------|
| `Task.WhenAll(tasks)` | Wait for all; aggregate failures |
| `Task.WhenAny(tasks)` | Race multiple operations; first-success or timeout fallback |
| `TaskCompletionSource<T>` | Bridge callback/event APIs into task-based APIs |
| `Task.Run(action)` | Offload CPU-bound work to a pool thread |
| `ValueTask<T>` | Hot-path optimization when result is often synchronously available |

### Processing tasks as they finish

A common anti-pattern is "loop, `WhenAny`, remove the winner, repeat" to process tasks in completion order. That is **O(n²)** — each `WhenAny` re-registers a continuation on every remaining task — and leaves the losing tasks unobserved if you exit early. On **.NET 9+** use `Task.WhenEach`, which yields each task as it completes:

```csharp
await foreach (var finished in Task.WhenEach(tasks))
{
    // handle each result/fault as soon as it's ready, in completion order
    Use(await finished);
}
```

`TaskScheduler` is the abstraction that decides where continuations run; you rarely implement one, but it's why `Task.Factory.StartNew` defaulting to `TaskScheduler.Current` matters (above). For bounded concurrent fan-out over a collection, prefer `Parallel.ForEachAsync` (see [[Parallelism]]) over hand-rolled `WhenAll` + `SemaphoreSlim`.

## Pitfalls

**Unobserved task exceptions**
If a `Task` faults and nothing observes its exception (no `await`, no `.Exception` check), the exception is silently swallowed. In .NET 4.5+, unobserved exceptions no longer crash the process by default, but they are still lost.

```csharp
// Exception is lost — the task is never awaited or observed
_ = SendEmailAsync(user);
```

Fix: `await` the task, or attach a continuation to handle the exception:

```csharp
_ = SendEmailAsync(user).ContinueWith(
    t => _logger.LogError(t.Exception, "Email send failed"),
    TaskContinuationOptions.OnlyOnFaulted);
```

**`ValueTask` consumed more than once**
`ValueTask` may be backed by a pooled object. Awaiting it twice, calling `.Result` after awaiting, or storing it for later use violates its contract and causes undefined behavior.

```csharp
var vt = GetCachedValueAsync();
var r1 = await vt; // OK
var r2 = await vt; // WRONG — may read from a recycled object
```

Fix: convert to `Task` with `.AsTask()` if you need to consume the result multiple times.

**`Task.Run` for I/O**
Wrapping async I/O in `Task.Run` wastes a pool thread for the entire I/O duration.

```csharp
// Pointless — GetStringAsync is already async
var result = await Task.Run(() => _http.GetStringAsync(url));
```

Fix: `await` the async method directly.

**Unbounded `Task.WhenAll`**
Calling `Task.WhenAll` on thousands of tasks simultaneously can overwhelm the ThreadPool and downstream services.

```csharp
// Dangerous with large collections — no concurrency limit
var results = await Task.WhenAll(items.Select(i => ProcessAsync(i)));
```

Fix: use `SemaphoreSlim` to bound concurrency (see [[ThreadPool]]).

## Questions

> [!QUESTION]- Why is `Task` not equivalent to a thread?
> `Task` models completion and scheduling, while threads are execution resources. Many async tasks complete I/O without holding a thread during waiting. A single thread can drive thousands of concurrent I/O tasks by processing their continuations sequentially.
> Cost of confusing them: over-allocating threads (via `Task.Run` for I/O) wastes memory and increases context-switching overhead.

> [!QUESTION]- When should `Task.Run` be used in ASP.NET Core?
> Rarely for request I/O — async I/O APIs already don't block threads. Use `Task.Run` for CPU-bound work that must be isolated from the request thread (e.g., image processing, heavy computation), ideally with bounded concurrency via `SemaphoreSlim`.

> [!QUESTION]- Why is `Task.WhenAll` usually better than sequential `await` for independent calls?
> Sequential `await` runs operations one after another — total latency is the sum. `Task.WhenAll` runs them concurrently — total latency is the slowest. For three 100ms calls: sequential = 300ms, concurrent = ~100ms.
> Cost: concurrent fan-out can overwhelm downstream services; bound concurrency when calling external APIs.

> [!QUESTION]- When should you use `ValueTask` instead of `Task`?
> Only when profiling shows allocation pressure from `Task` on a hot path where the result is frequently synchronously available (e.g., a cache hit). `ValueTask` has strict consumption rules and is harder to use correctly. Default to `Task`; switch to `ValueTask` only with measurement evidence.

## References

- [Task class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task) — full API reference for `Task`, `Task<T>`, `WhenAll`, `WhenAny`, `Run`, and `FromResult`.
- [Task.WhenAll documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenall) — behavior details including exception aggregation semantics.
- [Understanding the cost of async/await (Stephen Toub, Microsoft)](https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/) — deep dive into when `ValueTask` is appropriate and its consumption rules.
- [There is no thread (Stephen Cleary)](https://blog.stephencleary.com/2013/10/there-is-no-thread.html) — explains why async I/O tasks don't require a dedicated thread while waiting.
- [Threading in C#: Task Parallelism (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_Task_Parallelism) — comprehensive reference on `Task` creation, continuations, and `AggregateException` handling.
- [Threading in C#: Working with AggregateException (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_Working_with_AggregateException) — how to inspect all faults from `Task.WhenAll`.
