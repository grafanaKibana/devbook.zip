---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/concurrency-and-parallelism/parallelism/","noteIcon":"1"}
---


# Intro

Parallelism is about finishing CPU-bound work faster by using multiple cores at the same time. In .NET, the main tools are `Parallel.ForEachAsync`, PLINQ, and custom partitioned pipelines. Effective parallel code maximizes throughput while preserving determinism, bounded resource usage, and observability.

## Deeper Explanation

### Mental model

- Async does not automatically mean parallel CPU execution.
- Parallelism helps when each unit does meaningful CPU work.
- Shared mutable state is the core risk; minimize or isolate it.
- Throughput gains are bounded by Amdahl's law and memory bandwidth.

### Representative example

```csharp
public async Task<IReadOnlyList<Result>> ComputeAsync(
    IReadOnlyList<Job> jobs,
    CancellationToken cancellationToken)
{
    var results = new ConcurrentBag<Result>();

    await Parallel.ForEachAsync(
        jobs,
        new ParallelOptions
        {
            MaxDegreeOfParallelism = Environment.ProcessorCount,
            CancellationToken = cancellationToken
        },
        (job, ct) =>
        {
            var value = ExpensiveTransform(job, ct);
            results.Add(value);
            return ValueTask.CompletedTask;
        });

    return results.ToList();
}
```

### Choosing the tool

- `Parallel.ForEachAsync`: straightforward bounded parallel loops.
- PLINQ: declarative data transforms where ordering needs are explicit.
- Manual task partitioning: when you need custom scheduling, affinity, or batching.

## Pitfalls

- Over-parallelization can be slower due to scheduling/context-switch overhead.
- Contended locks on shared state erase gains from extra workers.
- Running CPU-heavy loops in request handlers can starve unrelated requests.
- Ignoring ordering requirements can produce nondeterministic bugs.

## Tradeoffs

| Choice | Pros | Cons | Use when |
|---|---|---|---|
| `Parallel.ForEachAsync` | Bounded, simple API | Less control than custom scheduler | Per-item CPU transforms |
| PLINQ | Concise query style | Harder debugging, ordering caveats | Batch analytics style pipelines |
| Manual partition + tasks | Maximum control | More complexity and failure modes | Specialized workload tuning |
| Sequential | Deterministic and simple | Lower throughput for CPU-heavy sets | Small datasets or strict ordering |

## Questions

> [!QUESTION]- Why can adding more parallel workers reduce performance?
> Because of contention, synchronization overhead, cache misses, and context switching once you exceed useful core-level parallelism.

> [!QUESTION]- How do you decide `MaxDegreeOfParallelism`?
> Start near `Environment.ProcessorCount`, then tune with workload benchmarks and production telemetry rather than assumptions.

> [!QUESTION]- When should you avoid PLINQ?
> When correctness depends on strict ordering, side-effect sequencing, or when query-level debugging clarity matters more than terse syntax.

## Links

- [Parallel programming in .NET (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/)
- [Parallel.ForEachAsync API (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.parallel.foreachasync)
- [Potential pitfalls in data and task parallelism](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/potential-pitfalls-in-data-and-task-parallelism)

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
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]]
<!-- whats-next:end -->
