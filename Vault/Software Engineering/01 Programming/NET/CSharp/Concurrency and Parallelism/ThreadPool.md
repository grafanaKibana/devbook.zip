---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---

# Intro

The .NET ThreadPool is the shared execution engine for most `Task`-based work. It dynamically manages worker threads and I/O completion processing to balance throughput and latency. Understanding ThreadPool behavior is essential for diagnosing starvation, latency spikes, and "mysterious" timeout storms. Starting raw threads has real cost: setup time, stack allocation, and scheduler overhead. The ThreadPool amortizes this by reusing worker threads and limiting how many run concurrently.


## Example

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

The point is not `SemaphoreSlim` itself. The point is explicit concurrency control so the ThreadPool is not overwhelmed by accidental unbounded work.


## Questions

> [!QUESTION]- What is ThreadPool starvation and how does it usually start?
> Starvation means queued work cannot get workers quickly enough, often triggered by blocking waits on pool threads or unbounded CPU work.

> [!QUESTION]- Why can an async app still suffer ThreadPool issues?
> Because only part of the call graph is async; any blocking segment on pool workers can throttle the entire system.


## Links

- [The managed thread pool (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/the-managed-thread-pool)
- [ThreadPool class API (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.threadpool)
- [Diagnosing .NET ThreadPool starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation)
- [Threading in C#: Thread Pooling (Joe Albahari)](https://www.albahari.com/threading/#_Thread_Pooling)
- [Threading in C#: Optimizing the Thread Pool (Joe Albahari)](https://www.albahari.com/threading/#_Optimizing_the_Thread_Pool)

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
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]]
<!-- whats-next:end -->
