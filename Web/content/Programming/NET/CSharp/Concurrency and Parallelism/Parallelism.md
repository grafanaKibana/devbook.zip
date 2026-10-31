---
publish: true
created: 2026-02-18T20:04:43.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-31T08:53:28.535Z
topic:
  - Programming
subtopic:
  - NET
summary: Finishing CPU-bound work faster by using multiple cores at once.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Concurrency and Parallelism/Parallelism
flashcard_uid: 5a1bba92
---

Parallelism uses several cores to finish CPU-bound work sooner. .NET provides loop-based APIs, PLINQ, and lower-level partitioning tools, but the useful speedup comes from the workload rather than the API name. Small items, shared writes, or a large serial phase can make parallel code slower than the original loop.

Async code is not automatically parallel. It frees a thread while an operation waits, which solves a different problem.

# How It Works

The machine has three jobs: split the input, schedule the pieces, and merge the results. Each job adds overhead.

Two broad patterns cover most cases:

- **Data parallelism** applies the same operation to many elements. Independent inputs make this the easier case to scale.
- **Task parallelism** runs different operations together. Dependencies between those operations make scheduling and failure handling less regular.

## Partitioning

Partition size decides how much time goes to useful work versus coordination. `Parallel.For`/`ForEach` and PLINQ partition their sources before workers consume them:

- **Range or chunk partitioning** gives workers blocks of indexable input. It is cheap when item costs are similar, but one unlucky block can contain most of the expensive items.
- **Dynamic partitioning** (`Partitioner.Create(source, loadBalance: true)`) distributes smaller chunks as workers become free. It handles skew better and pays for more coordination.

Uniform work favors larger ranges. Uneven work often benefits from dynamic load balancing.

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

The body above completes synchronously, so `Parallel.ForEach` would usually express the CPU-bound intent more directly. `Parallel.ForEachAsync` becomes useful when each iteration genuinely awaits and the operation still needs a degree limit plus cancellation.

`ConcurrentBag<Result>` preserves every result but not input order. If each output must correspond to a particular job, an indexed result array or the job identity included in each result preserves that correspondence, while enumeration order does not.

## PLINQ Example for Pure Transforms

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

## Lock-free Accumulation with Thread-local State

The `Parallel.For` overload with `localInit` and `localFinally` avoids a shared write on every iteration. Each worker accumulates locally, then performs one merge.

```csharp
long total = 0;
Parallel.For(0, data.Length,
    () => 0L,                                   // localInit: per-worker accumulator
    (i, _, local) => local + data[i],           // body: no shared write
    local => Interlocked.Add(ref total, local)); // localFinally: one merge per worker
```

The hot loop no longer contends on `total`. Only the final worker merges do. This often scales better than calling `Interlocked.Add` for every element.

# Pitfalls

- **Shared writes become the bottleneck.** Thread-safe collections prevent corruption but still coordinate internally. Partition-local state removes that traffic from the hot loop.
- **False sharing can serialize independent counters.** Workers that update adjacent fields may repeatedly invalidate the same cache line. Per-worker locals avoid the shared line. Carefully padded storage is an option when the layout must remain explicit.
- **Blocking I/O consumes pool threads.** `Parallel.ForEach` is a poor fit for operations that spend most of their time waiting. Async I/O with a degree limit keeps pressure bounded without parking a thread per request.
- **Amdahl's law sets a hard ceiling.** If 20 percent of the operation remains serial, infinite parallel capacity still cannot exceed a fivefold speedup.
- **Ordering has a merge cost.** PLINQ's `.AsOrdered()` is useful only when the consumer requires source order.
- **Parallel failures arrive together.** APIs may surface worker failures through `AggregateException`. Handling should inspect `InnerExceptions` or use `.Flatten().Handle(...)` when individual failure policy matters.

# Tradeoffs

| Approach | Best for | Cost |
|---|---|---|
| `Parallel.For` / `Parallel.ForEach` | Independent synchronous CPU-bound iterations | Partitioning cost. Blocking body |
| `Parallel.ForEachAsync` | Bounded iterations whose bodies genuinely await | Async scheduling and per-iteration state |
| PLINQ | Pure transforms on in-memory sequences | Merge cost. Ordering adds extra overhead. Harder to debug |
| `Task.WhenAll` fan-out | I/O-bound work (HTTP, DB) | Thread-pool friendly. No CPU parallelism benefit |
| Manual partitioning + channels | Streaming pipelines that need buffering and backpressure | More coordination code. Throughput is established by benchmarking the actual workload |

For a synchronous CPU loop, `Parallel.For` or `Parallel.ForEach` is the starting point. PLINQ fits a pure query whose merge semantics are acceptable. `Parallel.ForEachAsync` belongs to bounded asynchronous iterations, while `Task.WhenAll` fits finite I/O fan-out that is already safely bounded. [[Channels|channels]] earn their extra machinery when the work is a stream and producers need backpressure.

Parallelism is not limited to running more threads:

- **TPL Dataflow** (`System.Threading.Tasks.Dataflow`) builds producer/consumer pipelines from blocks with their own buffering and degree limits.
- **SIMD** through `Vector<T>`, `System.Numerics`, or hardware intrinsics processes several values per instruction. Numeric loops can gain more from vectorization than from extra threads, and the two approaches can be combined.

# Questions

<!-- qard-id: d918b18d-d000-4609-b2ca-0a7266c4944b -->

> [!qard]- Why can adding more parallel workers reduce performance?
> Extra workers help only while there is independent work for them and spare capacity to run it. Past that point, each added worker contributes more overhead and contention than useful work, so throughput can fall and latency can rise.
>
> - **More CPU-bound workers than cores:** the extra workers cannot run at the same time. The operating system time-slices them, which adds switching overhead without adding compute.
> - **Contention on shared resources:** locks, shared writes and thread-safe collections make workers wait for one another. Memory bandwidth and caches are shared as well, so memory-heavy workers slow each other down.
> - **Coordination overhead:** partitioning the input, scheduling the pieces and merging the results cost more as work is spread across more workers.
> - **Downstream limits:** when each worker calls a database or remote service, extra workers queue on that dependency's connections or rate limits, adding waiting and possibly timeouts.
>
> Worker count is therefore a value to measure against the real workload, not a direct measure of speed.
>
> [Microsoft: Potential pitfalls with PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/potential-pitfalls-with-plinq) · [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

<!-- qard-id: 6f1732ae-c419-4c5a-9c6e-cd54e91be456 -->

> [!qard]- How should `MaxDegreeOfParallelism` be chosen?
> The limit should come from the resource that actually constrains the work and be confirmed by measurement under representative load. `Environment.ProcessorCount` is a reasonable starting point for CPU-bound work, not a universal default.
>
> - **CPU-bound work:** values near the core count are a starting point. Higher values add time-slicing overhead without adding compute.
> - **Memory- or cache-heavy work:** memory bandwidth can saturate before every core is busy, so the best value can be lower than the core count.
> - **Work that waits on I/O or a dependency:** the limit follows what the database or remote service can handle, such as its connection pool or rate limits. It can be higher or lower than the core count.
>
> The chosen value is the one that meets throughput and tail-latency goals without exhausting those resources. `MaxDegreeOfParallelism` is only an upper bound on concurrent operations. It does not force that many to run.
>
> [Microsoft: ParallelOptions.MaxDegreeOfParallelism](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.paralleloptions.maxdegreeofparallelism?view=net-10.0) · [Microsoft: Introduction to PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/introduction-to-plinq) · [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

<!-- qard-id: 6b77dfe2-1eb1-4e64-a158-8563bde1f363 -->

> [!qard]- When is PLINQ a poor fit?
> PLINQ is a poor fit when the query's work is not independent and large enough per element, or when running its delegates concurrently would break correctness.
>
> - **Shared mutable state:** delegates that write to shared variables or call non-thread-safe code can corrupt data. Locks or thread-safe calls that prevent this make workers wait on each other and can erase the speedup.
> - **Order-dependent side effects:** elements are processed on several threads, so side effects happen in no predictable order. `AsOrdered()` only preserves the order of the query's results, at extra merge cost.
> - **Thread-affine code:** work that must run on a specific thread, such as Windows Forms or WPF UI access or single-threaded-apartment COM objects, cannot safely run inside PLINQ delegates.
> - **Too little work per element:** partitioning and merging overhead can outweigh the parallel gain.
>
> PLINQ fits pure, CPU-bound transforms over in-memory data, where each element does enough work and measurement shows a speedup.
>
> [Microsoft: Potential pitfalls with PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/potential-pitfalls-with-plinq) · [Microsoft: Introduction to PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/introduction-to-plinq) · [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

<!-- qard-id: 7121b006-f909-4325-8fd7-53f0c9b69861 -->

> [!qard]- Why can a parallel query be slower than a sequential query for small inputs?
> Parallel execution pays to partition input, schedule work, and merge results. With few items or little work per item, the sequential loop can finish before those fixed costs are repaid. Parallel execution is useful only when independent work is large enough to outweigh the setup and coordination. [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

# References

- [Parallel programming in .NET](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/)
