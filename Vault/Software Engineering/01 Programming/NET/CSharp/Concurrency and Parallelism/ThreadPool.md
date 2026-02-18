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

The .NET ThreadPool is the shared execution engine for most `Task`-based work. It dynamically manages worker threads and I/O completion processing to balance throughput and latency. Understanding ThreadPool behavior is essential for diagnosing starvation, latency spikes, and "mysterious" timeout storms.

## Deeper Explanation

### Mental model

- Worker threads execute queued CPU-bound delegates.
- I/O completion ports resume async operations when kernel I/O completes.
- Thread injection is adaptive, not instant; blocking code can temporarily starve the pool.
- The pool is process-wide and shared by unrelated workloads.

### Representative example

```csharp
ThreadPool.GetAvailableThreads(out var availableWorkers, out var availableIo);
ThreadPool.GetMaxThreads(out var maxWorkers, out var maxIo);

Console.WriteLine($"Workers: {availableWorkers}/{maxWorkers}, IO: {availableIo}/{maxIo}");
```

Use this signal with request latency and queue length metrics to detect starvation trends.

### Practical guidance

- Avoid blocking waits (`.Result`, `.Wait`, long `Thread.Sleep`) on pool threads.
- Keep request handlers async end-to-end for I/O.
- Isolate long-running dedicated workers via hosted services/channels when appropriate.
- Tune min threads only with evidence; it is not a universal performance fix.

## Pitfalls

- Sync-over-async causes blocked workers and cascading latency.
- CPU-intensive background jobs on pool threads can degrade API latency.
- Treating `Task.Run` as a scaling strategy increases pressure instead of solving root cause.
- Raising min threads blindly can hide architectural issues and increase context switching.

## Tradeoffs

| Choice | Pros | Cons | Use when |
|---|---|---|---|
| ThreadPool default behavior | Good general balance | Can starve under heavy blocking | Typical web/service workloads |
| Increase min threads | Faster reaction under bursts | Higher baseline overhead | Proven short-lived starvation |
| Dedicated thread (`LongRunning`) | Isolation from pool | Extra resource cost | Truly long-lived CPU worker |
| External queue + workers | Backpressure and control | More infra/complexity | High-throughput background processing |

## Questions

> [!QUESTION]- What is ThreadPool starvation and how does it usually start?
> Starvation means queued work cannot get workers quickly enough, often triggered by blocking waits on pool threads or unbounded CPU work.

> [!QUESTION]- Why can an async app still suffer ThreadPool issues?
> Because only part of the call graph is async; any blocking segment on pool workers can throttle the entire system.

> [!QUESTION]- Is increasing `ThreadPool.SetMinThreads` a primary solution?
> Usually no. It can mitigate symptoms but the primary fix is removing blocking and controlling workload concurrency.

## Links

- [The managed thread pool (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/the-managed-thread-pool)
- [ThreadPool class API (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.threadpool)
- [Diagnosing .NET ThreadPool starvation](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-threadpool-starvation)

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
