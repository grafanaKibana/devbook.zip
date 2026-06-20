---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: High
status: Ready to Repeat
dg-publish: true
---
# Intro

The .NET ThreadPool is the shared execution engine for most `Task`-based work. It dynamically manages worker threads and I/O completion processing to balance throughput and latency. Understanding ThreadPool behavior is essential for diagnosing starvation, latency spikes, and "mysterious" timeout storms that appear under load.

Starting raw threads has real cost: setup time (~1ms), stack allocation (1MB default), and scheduler overhead. The ThreadPool amortizes this by reusing worker threads and limiting how many run concurrently.

## How It Works

The ThreadPool maintains two thread categories:

- **Worker threads** — execute CPU-bound and async continuations. Managed by the hill-climbing algorithm.
- **I/O completion threads** — on Windows these handle IOCP callbacks for async I/O. On **Linux/macOS there is no IOCP**: async socket I/O is driven by an epoll/kqueue-based event loop, and completions are dispatched onto worker threads. So `completionPortThreads` is largely a Windows concept — don't tune it on Linux expecting the same effect.

**Thread injection (hill-climbing algorithm):**
The CLR starts with a minimum number of threads (one per logical CPU by default). When all threads are busy and work is queued, the runtime injects new threads conservatively — historically about one per 500ms — so starvation can persist for seconds before the pool recovers.

**Modern runtimes are smarter than the flat "1 per 500ms" rule.** .NET 6+ ships a portable thread pool with improved hill-climbing and **blocking detection** that injects threads faster when it observes pool threads parked in blocking calls. You can still tune behavior via environment knobs — `DOTNET_ThreadPool_UnfairSemaphoreSpinLimit`, `DOTNET_ThreadPool_ForceMinWorkerThreads`/`ForceMaxWorkerThreads` — but treat these as last resorts after fixing the blocking that caused starvation in the first place.

**Min/max thread limits:**

```csharp
// Read current limits
ThreadPool.GetMinThreads(out int workerMin, out int ioMin);
ThreadPool.GetMaxThreads(out int workerMax, out int ioMax);

// Increase minimum to reduce ramp-up latency under burst load
// (use with caution — too high wastes memory and increases context switching)
ThreadPool.SetMinThreads(workerThreads: 50, completionPortThreads: 10);
```

The default minimum is `Environment.ProcessorCount`. Increasing it pre-allocates threads so the pool can absorb bursts without the 500ms injection delay.

**Allocation-free scheduling and dedicated threads.** Two lower-level escape hatches:

- For high-frequency scheduling, implement `IThreadPoolWorkItem` and queue it with `ThreadPool.UnsafeQueueUserWorkItem(workItem, preferLocal: true)` — this avoids the closure/delegate allocation that `Task.Run` and `QueueUserWorkItem(WaitCallback)` incur.
- For work that runs for the lifetime of the app or blocks for a long time, **don't** borrow a pool thread — use a dedicated `Thread`, or `Task.Factory.StartNew(..., TaskCreationOptions.LongRunning)`, which spins up a thread outside the pool so it can't contribute to starvation.

## Example — Bounded Fan-Out

```csharp
public async Task<IReadOnlyList<Result>> ProcessBatchAsync(
    IReadOnlyList<Item> items,
    CancellationToken cancellationToken)
{
    // Bounded fan-out avoids queue explosions and ThreadPool contention.
    using var gate = new SemaphoreSlim(initialCount: 32);

    var tasks = items.Select(async item =>
    {
        await gate.WaitAsync(cancellationToken);
        try
        {
            return await _service.ProcessAsync(item, cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    });

    return await Task.WhenAll(tasks);
}
```

Without the `SemaphoreSlim`, processing 10,000 items would queue 10,000 tasks simultaneously. Each continuation that runs synchronously occupies a worker thread. The ThreadPool cannot inject threads fast enough, and latency spikes.

## ThreadPool Starvation

Starvation occurs when all worker threads are blocked and the pool cannot inject new ones fast enough to drain the queue.

**Common causes:**

1. **Blocking on tasks** — calling `.Result` or `.Wait()` on a `Task` inside a pool thread blocks that thread. If enough threads do this, the pool exhausts its workers.

```csharp
// Each call blocks a pool thread while waiting for the HTTP response
public void ProcessAll(IEnumerable<string> urls)
{
    Parallel.ForEach(urls, url =>
    {
        // BLOCKS a pool thread — starvation risk under high concurrency
        var result = _http.GetStringAsync(url).Result;
        Process(result);
    });
}
```

2. **Unbounded CPU work** — long-running CPU tasks occupy threads and prevent I/O continuations from running.

3. **Synchronous middleware or filters** — in ASP.NET Core, a synchronous filter that does I/O blocks a request thread for the duration.

**Symptoms:** Increasing request latency, `ThreadPool` queue depth growing, `dotnet-counters` showing `ThreadPool Queue Length` > 0 sustained, eventual `TaskCanceledException` or timeout storms.

**Diagnosis:**

```bash
# Monitor ThreadPool metrics live
dotnet-counters monitor --process-id <pid> System.Runtime

# Key counters:
# threadpool-queue-length     — work items waiting for a thread
# threadpool-thread-count     — current worker thread count
# monitor-lock-contention-count — lock contention rate
```

## Pitfalls

**Blocking inside `Task.Run`**
`Task.Run` schedules work on the ThreadPool. If that work blocks (e.g., synchronous I/O, `.Result`), it holds a pool thread for the entire duration.

```csharp
// Wastes a pool thread for the full HTTP round-trip
await Task.Run(() => _http.GetStringAsync(url).Result);

// Correct: use async I/O directly
var result = await _http.GetStringAsync(url);
```

**`Thread.Sleep` in pool threads**
`Thread.Sleep` blocks the thread without releasing it to the pool. Use `await Task.Delay(ms)` instead.

**Raising `SetMinThreads` too high**
Each pre-allocated thread consumes ~1MB of stack. Setting min threads to 500 on a 4-core machine wastes 500MB and increases context-switching overhead. Tune based on measured queue depth, not guesswork.

**`Parallel.ForEach` with async lambdas**
`Parallel.ForEach` does not understand `async` — it treats the async lambda as `async void`, fires all iterations, and returns before any complete. Use `Parallel.ForEachAsync` (.NET 6+) or `Task.WhenAll` with bounded concurrency instead.

## Questions

> [!QUESTION]- What is ThreadPool starvation and how does it usually start?
> Starvation means queued work cannot get workers quickly enough. It starts when threads block synchronously (`.Result`, `.Wait()`, `Thread.Sleep`) instead of releasing back to the pool. The hill-climbing algorithm injects new threads slowly (~1 per 500ms), so starvation can persist for seconds under burst load.
> Cost of fixing: increasing `SetMinThreads` reduces ramp-up latency but increases baseline memory usage.

> [!QUESTION]- Why can a fully async app still suffer ThreadPool issues?
> Because only part of the call graph may be async. Any synchronous segment on a pool thread — a blocking filter, a sync-over-async call in a library, a `Thread.Sleep` — holds that thread and reduces pool capacity. Even one blocking call per request can starve the pool under high concurrency.

> [!QUESTION]- When is it appropriate to call `ThreadPool.SetMinThreads`?
> When you have measured sustained queue depth under burst load and confirmed the bottleneck is thread injection latency (not CPU saturation or I/O). Increase min threads to match your expected burst concurrency. Do not set it higher than needed — each thread costs ~1MB of stack and adds context-switching overhead.

> [!QUESTION]- What is the difference between `Task.Run` and `ThreadPool.QueueUserWorkItem`?
> `Task.Run` returns a `Task` that supports `await`, cancellation, and exception propagation. `QueueUserWorkItem` is a lower-level fire-and-forget API with no built-in result or error handling. Prefer `Task.Run` in all modern code; `QueueUserWorkItem` is a legacy API.

## References

- [The managed thread pool (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/the-managed-thread-pool) — official overview of ThreadPool architecture, min/max threads, and work item queuing.
- [Diagnosing .NET ThreadPool starvation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation) — step-by-step production diagnosis using `dotnet-counters` and `dotnet-dump`.
- [ThreadPool class API (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.threadpool) — `SetMinThreads`, `GetMinThreads`, `QueueUserWorkItem` reference.
- [Threading in C#: Thread Pooling (Joe Albahari)](https://www.albahari.com/threading/#_Thread_Pooling) — comprehensive reference on pool internals, hill-climbing, and starvation scenarios.
- [Parallel.ForEachAsync (.NET 6+)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.parallel.foreachasync) — async-aware parallel iteration that avoids the `async void` trap of `Parallel.ForEach`.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken|CancellationToken]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Mutex|Mutex]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Semaphore|Semaphore]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]]
<!-- whats-next:end -->
