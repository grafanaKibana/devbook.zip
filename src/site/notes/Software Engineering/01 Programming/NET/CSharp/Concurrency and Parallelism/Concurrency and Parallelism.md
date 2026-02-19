---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/concurrency-and-parallelism/concurrency-and-parallelism/","tags":["FolderNote"],"noteIcon":"1"}
---


# Intro

Concurrency and parallelism are related but different concerns in .NET applications. Concurrency is about making progress on multiple units of work without unnecessary blocking, while parallelism is about using multiple cores to finish CPU-bound work faster. This hub focuses on practical decisions for backend and desktop systems where latency, throughput, and correctness all matter.

## Deeper Explanation

Use this folder as a map:

- `Async Await` and `Tasks` for async orchestration and structured composition.
- `CancellationToken` for cooperative cancellation and timeout boundaries.
- `Parallelism` for CPU-bound work distribution.
- `ThreadPool` for runtime scheduling behavior and starvation diagnostics.
- `Deadlocks` for correctness and failure prevention under contention.
- `Mutex` and `Semaphore` for synchronization limits and access control strategies.

### Mental model

- If work waits on I/O, prefer async (`Task`, `await`) to avoid blocking threads.
- If work burns CPU, use controlled parallelism (`Parallel.ForEachAsync`, PLINQ, partitioning).
- If work can be canceled, thread cancellation through the full call chain.
- If shared state exists, design locking strategy first, then optimize.

### Choosing options for the same requirement

Use requirement-first decisions instead of primitive-first decisions.

| Requirement | Viable options | Prefer | Avoid |
|---|---|---|---|
| Many independent external I/O calls with low latency target | Sequential `await`, `Task.WhenAll`, bounded fan-out (`SemaphoreSlim` + `WhenAll`) | `Task.WhenAll` for moderate fan-out; bounded fan-out when dependency limits or connection pools can saturate | Unbounded `WhenAll` over large sets; `Parallel.ForEachAsync` for pure I/O without explicit limit rationale |
| CPU-heavy per-item processing on large datasets | Sequential loop, `Task.Run` partitioning, `Parallel.ForEachAsync`, PLINQ | `Parallel.ForEachAsync` when bounded workers and cancellation are needed; PLINQ for declarative batch transforms | Running heavy CPU loops directly in hot request path without limits |
| Serialize access to shared mutable state | `lock`, `SemaphoreSlim`, `Channel<T>` single-consumer pipeline, immutable snapshots | `lock` for short synchronous sections; `SemaphoreSlim` for async call chains; `Channel<T>` when you also need buffering/backpressure | Mixing `lock` with async waiting patterns; coarse global locks around I/O |
| Stop work on timeout or caller disconnect | Caller token only, `CancelAfter`, linked tokens | Caller token by default; linked token when combining caller cancellation and local SLA timeout | Creating nested linked token sources inside tight loops |
| Run work beyond request lifetime | `Task.Run`, in-process queue (`Channel<T>` + `BackgroundService`), external broker queue | In-process queue for moderate reliability needs; external broker for durability/retries/scale-out | Fire-and-forget `Task.Run` where failure/ordering/retry guarantees matter |

### Decision walkthroughs

#### Same requirement: "fan out 500 HTTP calls quickly"

- If dependency and infrastructure allow high concurrency, use bounded `Task.WhenAll` with an explicit limit.
- If each call is tiny and independent, start with a conservative cap (for example 16-64), then tune with telemetry.
- If strict ordering is needed, preserve original index and reorder results after completion.

```csharp
public async Task<IReadOnlyList<UserDto>> LoadUsersBoundedAsync(
    IReadOnlyList<int> ids,
    int maxConcurrency,
    CancellationToken cancellationToken)
{
    using var gate = new SemaphoreSlim(maxConcurrency);

    var tasks = ids.Select(async id =>
    {
        await gate.WaitAsync(cancellationToken);
        try
        {
            return await _client.GetUserAsync(id, cancellationToken);
        }
        finally
        {
            gate.Release();
        }
    });

    return await Task.WhenAll(tasks);
}
```

#### Same requirement: "improve throughput of CPU transforms"

- Use `Parallel.ForEachAsync` when you need bounded workers and cancellation with straightforward code.
- Use PLINQ for pure data transforms where query readability is better than imperative loops.
- If CPU work competes with request handling, move it to background workers with queue-based backpressure.

#### Same requirement: "protect state and stay async"

- For tiny in-memory critical sections, `lock` is simplest.
- For async sections that must `await`, prefer `SemaphoreSlim.WaitAsync`.
- If contention is high and order matters, move state mutation behind a single-consumer `Channel<T>`.

## Questions

> [!QUESTION]- What is the difference between concurrency and parallelism in practice?
> Concurrency is about responsiveness and non-blocking progress, often with async I/O.
> Parallelism is about throughput for CPU-bound workloads by using multiple cores simultaneously.

> [!QUESTION]- Why do many production outages in .NET systems look like "performance" but are actually concurrency bugs?
> Because thread starvation, deadlocks, lock contention, and unbounded fan-out all manifest as latency spikes and timeouts before obvious crashes.

> [!QUESTION]- What is the first decision before choosing a primitive (`Task`, `lock`, `Parallel`, `Channel`)?
> Classify the workload as I/O-bound vs CPU-bound and define cancellation/error boundaries. Primitive choice follows that classification.

> [!QUESTION]- Why is unbounded `Task.WhenAll` often a bad first choice when calling around 300 external APIs in one request?
> Because it can overload downstream dependencies, saturate connection pools, and create timeout storms. Bounded fan-out keeps latency gains while preserving system stability.

> [!QUESTION]- For one requirement ("update shared state safely"), when do you choose `lock` vs `SemaphoreSlim` vs `Channel<T>`?
> Use `lock` for short synchronous sections, `SemaphoreSlim` for async flows that need awaiting, and `Channel<T>` when you also need queueing, ordering, or backpressure.

## Links

- [Asynchronous programming with async and await (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
- [Task parallel library (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl)
- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
- [Threading in C# (Joe Albahari)](https://www.albahari.com/threading/)
- [Threading in C#: Basic synchronization and deadlocks (Joe Albahari)](https://www.albahari.com/threading/part2.aspx)
- [Threading in C#: Parallel programming and tasks (Joe Albahari)](https://www.albahari.com/threading/part5.aspx)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await\|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken\|CancellationToken]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Mutex\|Mutex]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Semaphore\|Semaphore]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]]
<!-- whats-next:end -->
