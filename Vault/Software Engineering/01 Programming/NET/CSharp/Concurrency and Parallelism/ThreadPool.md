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
