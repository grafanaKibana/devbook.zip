---
topic:
  - Programming
subtopic:
  - NET
summary: "Keeping work progressing without blocking, and using multiple cores for CPU-bound work."
priority: High
status: Creation
tags: [FolderNote]
publish: true
level:
  - "4"
---

Concurrency describes program structure: several operations can be in progress during the same period. Parallelism describes execution: several operations run at the same instant. A single core can interleave concurrent work but cannot execute it in parallel.

That distinction drives the .NET choices in this folder. Asynchronous composition keeps I/O waits from occupying threads. Controlled parallelism gives CPU work access to multiple cores. Mixing the two models usually adds threads without making the workload finish sooner.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Composition versus Simultaneous Execution

A single thread can compose overlapping I/O without running two instructions at once:

1. At 0 ms, request A sends an HTTP call and registers its continuation with `await`. The thread returns to the scheduler.
2. At 1 ms, the same thread starts request B and yields at its `await`.
3. At 40 ms, B's socket completion makes its continuation runnable. The thread processes it.
4. At 52 ms, A becomes runnable and the thread resumes it.

Both requests were in flight together. The thread still executed one continuation at a time because the overlap came from the operating system and network.

CPU work crosses a different boundary. This loop partitions the pixels and schedules workers through the [[Home/Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]. Multiple workers can execute `Sharpen` simultaneously on different cores:

```csharp
Parallel.For(
    fromInclusive: 0,
    toExclusive: pixels.Length,
    new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
    i => pixels[i] = Sharpen(pixels[i]));
```

That is useful only when `Sharpen` does enough computation to repay partitioning and scheduling overhead. For socket waits, adding worker threads consumes resources without making the remote service respond sooner.

![[Programming/Programming-Concurrency and Parallelism-18120000.png|theme-aware]]

> [!WARNING] Diagram caveat
> The “not concurrent, parallel” quadrant does not fit these definitions. Simultaneous execution is necessarily concurrent. The visual is useful only for contrasting interleaving with simultaneous execution.

# Choosing the Execution Model

## Mental Model

- I/O-bound work usually needs asynchronous APIs rather than more worker threads.
- CPU-bound work may benefit from partitioning across a measured degree of parallelism.
- Cancellation belongs to the operation's full ownership chain.
- Shared mutable state needs an ownership rule before it needs a faster lock.

## Choosing Options for the Same Requirement

Start with the workload and failure boundary. The primitive comes after that.

| Requirement | Viable options | Prefer | Avoid |
|---|---|---|---|
| Many independent external I/O calls with low latency target | Sequential `await`, `Task.WhenAll`, bounded fan-out (`SemaphoreSlim` + `WhenAll`) | `Task.WhenAll` for moderate fan-out. Bounded fan-out when dependency limits or connection pools can saturate | Unbounded `WhenAll` over large sets. `Parallel.ForEachAsync` for pure I/O without explicit limit rationale |
| CPU-heavy per-item processing on large datasets | Sequential loop, `Parallel.For` / `Parallel.ForEach`, `Parallel.ForEachAsync`, PLINQ | `Parallel.For` / `Parallel.ForEach` for synchronous CPU work. `Parallel.ForEachAsync` only when each body is asynchronous. PLINQ for declarative batch transforms | Running heavy CPU loops directly in a hot request path without limits |
| Serialize access to shared mutable state | `lock`, `SemaphoreSlim`, `Channel<T>` single-consumer pipeline, immutable snapshots | `lock` for short synchronous sections. `SemaphoreSlim` for async call chains. `Channel<T>` when buffering or backpressure is also required | Mixing `lock` with async waiting patterns. Coarse global locks around I/O |
| Stop work on timeout or caller disconnect | Caller token only, `CancelAfter`, linked tokens | Caller token by default. Linked token when combining caller cancellation and local SLA timeout | Creating nested linked token sources inside tight loops |
| Run work beyond request lifetime | `Task.Run`, in-process queue (`Channel<T>` + `BackgroundService`), isolated worker with a durable broker | In-process bounded queue when admission control is enough and shared process capacity is acceptable. Isolated worker when request-serving capacity needs protection | Fire-and-forget `Task.Run`. Treating an in-process queue as durable or resource-isolated |

# Coordination Patterns

A coordination mechanism must make ownership and failure visible. Merely removing the immediate race is not enough.

| Mechanism | Workload | Backpressure | Ownership | Cancellation | Starvation | Failure behavior |
|---|---|---|---|---|---|---|
| [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Channels\|`Channel<T>`]] | Async producer-consumer handoff | A bounded channel waits or drops by policy | Writers submit. Readers drain. A single reader can own mutable state | Each wait accepts a token. `Complete` ends the stream | FIFO items do not imply fair writers or readers | `Complete(error)` exposes a terminal error. An uncaught item failure can stop the consumer pump |
| [[Home/Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]] / [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|`Task`]] | Scheduled work and async composition. Use [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|parallelism]] for CPU partitioning | None: callers must bound fan-out or queueing | The pool owns worker threads. The caller owns task observation | Cooperative through a token passed into the operation | Blocking pool workers can starve unrelated continuations | Exceptions are captured by `Task` and surface when observed or awaited |
| [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|`TaskCompletionSource<T>`]] | Adapt one callback, event, or external completion into a task | None: it represents one completion, not a work queue | The adapter owns `TrySetResult`, `TrySetException`, and `TrySetCanceled` | The adapter must register cancellation explicitly | No contender-fairness guarantee. `RunContinuationsAsynchronously` avoids running continuations inline on the completing thread | The producer chooses exactly one terminal result. Later `TrySet*` calls lose the race |
| [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Locking\|`lock` / `Monitor`]] | Short synchronous access to shared state | `Monitor.Wait` can gate a condition, but it does not bound incoming work | The entering thread owns the monitor and must exit it | `lock` has no token. Use a timed `Monitor.TryEnter` when waiting must be bounded | No strict acquisition fairness. Long holders can starve contenders and form [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|deadlocks]] | Exit occurs during stack unwinding, but partial state mutations are not rolled back |
| `Barrier` | Fixed participants meeting at phase boundaries | None: every participant waits for the phase | Each registered participant must signal exactly once per phase | `SignalAndWait` accepts a token, but cancellation does not complete work for other participants | One delayed or missing participant stalls the phase | Post-phase callback failures surface as `BarrierPostPhaseException` |
| `ReaderWriterLockSlim` | Read-heavy synchronous state with rare writes | None: queued callers only wait for ownership | The entering thread owns its read, upgradeable-read, or write lock | No token. `TryEnter*Lock` can impose a timeout | Writers are favored over new readers, but strict fairness is not promised | Recursion and ownership errors throw. Failed mutations still require application-level recovery |

[[Home/Programming/NET/CSharp/Concurrency and Parallelism/Semaphore|`SemaphoreSlim`]] fits a concurrency limit rather than exclusive ownership. [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Mutex|Mutex]] pays for an operating-system handle when ownership must cross a process boundary. Neither provides durable queueing or removes deadlock risk from a multi-lock design.

## Decision Walkthroughs

### Fan out 500 HTTP calls

The dependency's capacity sets the useful fan-out, not the size of the input collection. Start with a conservative cap and tune it from latency and rejection data. Preserve each input index when output order matters because completion order will vary.

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

### Improve throughput of CPU transforms

`Parallel.For` or `Parallel.ForEach` fits synchronous CPU work. `Parallel.ForEachAsync` earns its async machinery only when each body awaits. PLINQ can keep a pure batch transform readable.

In a server, an in-process bounded queue limits admission but still consumes the same CPU and memory as request handling. Sustained CPU work needs an isolated worker process or service when request-serving capacity must be protected.

### Protect shared state in an async flow

A short synchronous critical section belongs behind a [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Locking|lock]]. If ownership must span an `await`, `SemaphoreSlim.WaitAsync` can represent the gate, though holding any gate across I/O widens the contention window. A single-consumer [[Home/Programming/NET/CSharp/Concurrency and Parallelism/Channels|channel]] is often clearer when ordered mutation and buffering are both part of the requirement.

# Questions

> [!QUESTION]- What is the difference between concurrency and parallelism in practice?
> Concurrency means several operations are in progress during the same period, even if one thread takes turns running them. Parallelism means operations execute at the same time on multiple cores. Asynchronous I/O uses concurrency so a thread is not blocked while an external operation is pending. CPU-bound work uses parallelism when splitting the calculation across cores reduces its elapsed time.

> [!QUESTION]- What should be checked before choosing `Task`, `lock`, `Parallel`, or `Channel`?
> First check what the work spends time doing and who is responsible for finishing it. I/O-bound work usually needs asynchronous APIs so threads are not blocked. CPU-bound work may benefit from measured parallelism. Shared mutable state needs synchronization or a single owner, while background work needs a queue with a clear lifetime and failure policy. The primitive follows from those requirements.

# References

- [Concurrency Is Not Parallelism](https://go.dev/talks/2012/concurrency.slide)
- [Managed threading best practices](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
- [Threading in C#](https://www.albahari.com/threading/)
