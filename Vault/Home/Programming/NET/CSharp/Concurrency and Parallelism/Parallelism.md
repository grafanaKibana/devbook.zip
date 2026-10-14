---
topic:
  - Programming
subtopic:
  - NET
summary: "Finishing CPU-bound work faster by using multiple cores at once."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Programming"
qard-topic: "NET/CSharp/Concurrency and Parallelism/Parallelism"
flashcard_uid: "5a1bba92"
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

`ConcurrentBag<Result>` preserves every result but not input order. If each output must correspond to a particular job, store it in an indexed result array or include the job identity in the result rather than relying on enumeration order.

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
| Manual partitioning + channels | Streaming pipelines that need buffering and backpressure | More coordination code. Benchmark throughput for the actual workload |

For a synchronous CPU loop, start with `Parallel.For` or `Parallel.ForEach`. PLINQ fits a pure query whose merge semantics are acceptable. `Parallel.ForEachAsync` belongs to bounded asynchronous iterations, while `Task.WhenAll` fits finite I/O fan-out that is already safely bounded. [[Channels|channels]] earn their extra machinery when the work is a stream and producers need backpressure.

Parallelism is not limited to running more threads:

- **TPL Dataflow** (`System.Threading.Tasks.Dataflow`) builds producer/consumer pipelines from blocks with their own buffering and degree limits.
- **SIMD** through `Vector<T>`, `System.Numerics`, or hardware intrinsics processes several values per instruction. Numeric loops can gain more from vectorization than from extra threads, and the two approaches can be combined.

# Questions

<!-- qard-id: d918b18d-d000-4609-b2ca-0a7266c4944b -->
> [!qard]- Why can adding more parallel workers reduce performance?
> Workers help only while there is enough independent work and the machine or downstream system has capacity. Beyond that point they compete for CPU, memory bandwidth, caches, locks, and dependency capacity; scheduling and coordination also grow. The extra work can reduce throughput or worsen latency, so measure the workload rather than equating worker count with speed. [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

<!-- qard-id: 6f1732ae-c419-4c5a-9c6e-cd54e91be456 -->
> [!qard]- How should `MaxDegreeOfParallelism` be chosen?
> Choose a limit from the bottleneck and measure it under representative load. CPU-bound work may start near available processors, but memory-heavy work can saturate earlier and database/remote calls must respect dependency capacity. Keep the value that meets throughput and tail-latency goals without exhausting those resources; `ProcessorCount` is a starting clue, not a universal default. [ParallelOptions.MaxDegreeOfParallelism](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.paralleloptions.maxdegreeofparallelism?view=net-10.0) · [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

<!-- qard-id: 6b77dfe2-1eb1-4e64-a158-8563bde1f363 -->
> [!qard]- When is PLINQ a poor fit?
> PLINQ is a poor fit when each item is too cheap to repay partition/merge overhead, correctness depends on side-effect order or shared mutable state, or source ordering is required but its preservation costs too much. It fits independent CPU work when unordered results are acceptable and measurement shows a gain. [Microsoft: PLINQ pitfalls](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/potential-pitfalls-with-plinq) · [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

<!-- qard-id: 7121b006-f909-4325-8fd7-53f0c9b69861 -->
> [!qard]- Why can a parallel query be slower than a sequential query for small inputs?
> Parallel execution pays to partition input, schedule work, and merge results. With few items or little work per item, the sequential loop can finish before those fixed costs are repaid. Parallel execution is useful only when independent work is large enough to outweigh the setup and coordination. [Microsoft: Understanding speedup in PLINQ](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/understanding-speedup-in-plinq)

# References

- [Parallel programming in .NET](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/)
