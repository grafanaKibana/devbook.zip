---
publish: true
created: 2026-07-15T06:12:10.154Z
modified: 2026-07-18T11:30:11.597Z
published: 2026-07-18T11:30:11.597Z
topic:
  - Programming
subtopic:
  - NET
summary: Finishing CPU-bound work faster by using multiple cores at once.
level:
  - "4"
priority: High
status: Ready to Repeat
---

Parallelism is about finishing CPU-bound work faster by using multiple cores at the same time. In .NET, the main tools are `Parallel.ForEachAsync`, PLINQ, and custom partitioned pipelines. Effective parallel code maximizes throughput while preserving determinism, bounded resource usage, and observability.

- Async does not automatically mean parallel CPU execution.
- Parallelism helps when each unit does meaningful CPU work.
- Shared mutable state is the core risk; minimize or isolate it.
- Throughput gains are bounded by Amdahl's law and memory bandwidth.

# How It Works

The practical pipeline is: partition work, execute partitions concurrently, collate results safely.

There are two patterns that are still useful decision anchors:

- Data parallelism: same operation over many data elements. Usually scales better and is easier to reason about.
- Task parallelism: different operations in parallel. Useful, but often less structured and harder to maintain.

## Partitioning

How work is split across cores decides whether you get linear speedup or wasted threads. `Parallel.For`/`ForEach` and PLINQ use a `Partitioner` under the hood:

- **Range/chunk partitioning** (default for indexable sources) hands each worker a contiguous block — low overhead, but suffers if the per-item cost is uneven (one worker draws all the slow items).
- **Dynamic partitioning** (`Partitioner.Create(source, loadBalance: true)`) hands out small chunks on demand — higher coordination cost but balances skewed workloads.

Match the partitioner to your data: uniform cost → range; skewed cost → dynamic/load-balanced.

# Example

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

## PLINQ example for pure transforms

```csharp
public int[] ComputePrimes(int fromInclusive, int toExclusive)
{
    return Enumerable.Range(fromInclusive, toExclusive - fromInclusive)
        .AsParallel()
        .Where(n => n > 1 && Enumerable.Range(2, (int)Math.Sqrt(n) - 1)
            .All(i => n % i != 0))
        .ToArray();
}
```

PLINQ works best when each element has enough CPU work to amortize partitioning and merge costs.

## Lock-free accumulation with thread-local state

The cleanest way to aggregate in parallel without a shared lock is the `Parallel.For` overload with `localInit`/`localFinally`: each worker accumulates into its own local, and only the final merge touches shared state.

```csharp
long total = 0;
Parallel.For(0, data.Length,
    () => 0L,                                   // localInit: per-worker accumulator
    (i, _, local) => local + data[i],           // body: no shared write
    local => Interlocked.Add(ref total, local)); // localFinally: one merge per worker
```

This replaces N contended writes with one merge per worker — far better scaling than `Interlocked.Add` on every iteration.

# Pitfalls

- **Shared mutable state causes data races**: `ConcurrentBag<T>` and similar collections add synchronization overhead. Prefer partition-local accumulators and merge at the end — the PLINQ `Aggregate` overload, the `Parallel.For` `localInit`/`localFinally` pattern above, or a `ConcurrentDictionary` keyed by partition ID are common patterns.
- **False sharing kills scaling silently**: when workers update adjacent fields that share a 64-byte CPU cache line (e.g. `long[] counts` indexed per-thread), each write invalidates the line in every other core's cache, serializing what looks like independent work. Symptom: adding cores makes it _slower_. Fix with per-worker locals (above), padding (`[StructLayout]` / spacing array entries onto separate cache lines), or `PaddedReference`-style wrappers.
- **Over-parallelizing I/O-bound work wastes threads**: `Parallel.ForEach` on I/O operations blocks thread-pool threads while waiting on I/O. Use `async/await` with `SemaphoreSlim` to cap concurrency without blocking threads.
- **Ignoring Amdahl's Law**: the serial fraction of your workload caps the maximum speedup regardless of core count. Profile first — if 20% of work is serial, you can never exceed 5× speedup no matter how many cores you add.
- **PLINQ ordering overhead**: `.AsParallel().AsOrdered()` forces a merge step that can negate parallelism gains. Only add `AsOrdered()` when the consumer actually requires ordered output.
- **Unhandled exceptions in parallel bodies**: exceptions from parallel workers are wrapped in `AggregateException`. Callers that only catch `Exception` will miss them. Always unwrap with `.Flatten().Handle(...)` or inspect `InnerExceptions`.

# Tradeoffs

| Approach | Best for | Cost |
|---|---|---|
| `Parallel.ForEachAsync` | CPU-bound work with async-compatible bodies | Overhead per partition; requires `CancellationToken` threading |
| PLINQ | Pure transforms on in-memory sequences | Merge cost; ordering adds extra overhead; harder to debug |
| `Task.WhenAll` fan-out | I/O-bound work (HTTP, DB) | Thread-pool friendly; no CPU parallelism benefit |
| Manual partitioning + channels | Streaming pipelines with backpressure | Most complex; best throughput for producer/consumer patterns |

**Decision rule**: start with `Parallel.ForEachAsync` for CPU-bound batch work. Switch to PLINQ when the operation is a pure transform and you want terse syntax. Use `Task.WhenAll` for I/O. Reach for [[Channels|channels]] only when you need backpressure or streaming.

**Two other parallelism axes** worth knowing exist beyond multi-threading:

- **TPL Dataflow** (`System.Threading.Tasks.Dataflow`) — composable blocks (`TransformBlock`, `ActionBlock`, `BufferBlock`) for multi-stage producer/consumer pipelines with per-block degree-of-parallelism and built-in backpressure.
- **SIMD / data-level parallelism** — `Vector<T>`, `System.Numerics`, and hardware intrinsics process multiple elements per instruction on a single thread. For tight numeric loops this can beat thread-level parallelism with none of the coordination cost, and composes _with_ it.

# Questions

> [!QUESTION]- Why can adding more parallel workers reduce performance?
> Because of contention, synchronization overhead, cache misses, and context switching once you exceed useful core-level parallelism.

> [!QUESTION]- How do you decide `MaxDegreeOfParallelism`?
> Start near `Environment.ProcessorCount`, then tune with workload benchmarks and production telemetry rather than assumptions.

> [!QUESTION]- When should you avoid PLINQ?
> When correctness depends on strict ordering, side-effect sequencing, or when query-level debugging clarity matters more than terse syntax.

> [!QUESTION]- Why can a parallel query be slower than sequential for small inputs?
> Partitioning, scheduling, and result merge overhead can dominate when per-element CPU work is too small.

# References

- [Parallel programming in .NET (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/) — overview of the Task Parallel Library, PLINQ, and data/task parallelism patterns.
- [Parallel.ForEachAsync API (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.parallel.foreachasync) — API reference with signature, parameters, and cancellation behavior.
- [Potential pitfalls in data and task parallelism](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/potential-pitfalls-in-data-and-task-parallelism) — Microsoft's own list of common mistakes: ordering, side effects, shared state, and exception handling.
- [Threading in C#: Why PFX and PFX concepts (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_Why_PFX) — deep-dive into the Parallel Framework Extras design rationale and work-stealing scheduler.
- [Threading in C#: PLINQ details and limitations (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_PLINQ) — covers PLINQ internals, ordering, cancellation, and when PLINQ is slower than sequential LINQ.
