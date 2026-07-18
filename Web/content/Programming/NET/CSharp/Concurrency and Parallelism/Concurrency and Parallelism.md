---
publish: true
created: 2026-07-15T06:12:10.153Z
modified: 2026-07-17T05:45:14.728Z
published: 2026-07-17T05:45:14.728Z
tags:
  - FolderNote
topic:
  - Programming
subtopic:
  - NET
summary: Keeping work progressing without blocking, and using multiple cores for CPU-bound work.
priority: High
status: Creation
level:
  - "4"
---

# Intro

Concurrency is a property of program **structure** — composing a program out of independently executing tasks that can be _dealt with_ in overlapping time periods. Parallelism is a property of **execution** — actually _doing_ several of them in the same instant, which requires multiple cores. A single-core machine runs concurrent programs perfectly well by interleaving them, with zero parallelism; concurrent design enables parallelism without requiring it. The practical consequence is the split this hub is organized around: concurrency is what keeps I/O-bound work from blocking threads, and parallelism is what makes CPU-bound work finish faster on multiple cores.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Concurrency and Parallelism section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Async Await">Async Await</span></span></div><p class="db-card-summary">.NET's model for non-blocking I/O that releases the thread while awaiting work.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Async Await.md" data-tooltip-position="top" aria-label="Async Await">Async Await</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="CancellationToken">CancellationToken</span></span></div><p class="db-card-summary">Cooperative cancellation where callers request a stop and callees comply safely.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken.md" data-tooltip-position="top" aria-label="CancellationToken">CancellationToken</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Channels">Channels</span></span></div><p class="db-card-summary">Bounded async producer-consumer handoff between threads, with backpressure.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Channels.md" data-tooltip-position="top" aria-label="Channels">Channels</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Deadlocks">Deadlocks</span></span></div><p class="db-card-summary">When execution paths wait forever on resources each other holds, halting progress.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks.md" data-tooltip-position="top" aria-label="Deadlocks">Deadlocks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Locking">Locking</span></span></div><p class="db-card-summary">The default in-process mutual-exclusion primitive: one thread in the critical section at a time.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Locking.md" data-tooltip-position="top" aria-label="Locking">Locking</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Mutex">Mutex</span></span></div><p class="db-card-summary">An OS-backed primitive enforcing single-owner access, useful across processes.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Mutex.md" data-tooltip-position="top" aria-label="Mutex">Mutex</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Parallelism">Parallelism</span></span></div><p class="db-card-summary">Finishing CPU-bound work faster by using multiple cores at once.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Parallelism.md" data-tooltip-position="top" aria-label="Parallelism">Parallelism</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Semaphore">Semaphore</span></span></div><p class="db-card-summary">A primitive allowing up to N concurrent holders, for bounded parallelism.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Semaphore.md" data-tooltip-position="top" aria-label="Semaphore">Semaphore</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Tasks">Tasks</span></span></div><p class="db-card-summary">.NET's core abstraction for asynchronous work, its completion, result, and composition.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Tasks.md" data-tooltip-position="top" aria-label="Tasks">Tasks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="ThreadPool">ThreadPool</span></span></div><p class="db-card-summary">.NET's shared execution engine for Task-based work, managing worker and I/O threads.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool.md" data-tooltip-position="top" aria-label="ThreadPool">ThreadPool</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

## Composition versus simultaneous execution

A single thread can compose overlapping I/O without running two instructions at once:

1. At 0 ms, request A sends an HTTP call and registers its continuation with `await`; the thread returns to the scheduler.
2. At 1 ms, the same thread starts request B and yields at its `await`.
3. At 40 ms, B's socket completion makes its continuation runnable; the thread processes it.
4. At 52 ms, A becomes runnable and the thread resumes it.

Both requests were in flight together, but the thread executed only one continuation at a time. The overlap came from the operating system and network, not another CPU core.

CPU work crosses a different boundary. This loop partitions the pixels and schedules workers through the [[Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]; multiple workers can execute `Sharpen` simultaneously on different cores:

```csharp
Parallel.For(
    fromInclusive: 0,
    toExclusive: pixels.Length,
    new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
    i => pixels[i] = Sharpen(pixels[i]));
```

That is useful only when `Sharpen` does enough computation to repay partitioning and scheduling overhead. For socket waits, adding worker threads consumes resources without making the remote service respond sooner.

![[Assets/System Design 101/94cb521042378272fee362356d5dd9e423c3ee58e758b6ba9c753974d666ab96.png]]

> [!WARNING] Non-normative source visual
> The “not concurrent, parallel” quadrant is invalid under these definitions: work executing simultaneously on multiple cores is necessarily concurrent. Use the visual only to contrast interleaved composition with simultaneous execution, not as a four-state taxonomy.

## Deeper Explanation

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

## Coordination Patterns

The mechanism should expose the workload's ownership and failure boundary, not just make a race disappear.

| Mechanism | Workload | Backpressure | Ownership | Cancellation | Starvation | Failure behavior |
|---|---|---|---|---|---|---|
| [[Programming/NET/CSharp/Concurrency and Parallelism/Channels\|`Channel<T>`]] | Async producer-consumer handoff | A bounded channel waits or drops by policy | Writers submit; readers drain; a single reader can own mutable state | Each wait accepts a token; `Complete` ends the stream | FIFO items do not imply fair writers or readers | `Complete(error)` exposes a terminal error; an uncaught item failure can stop the consumer pump |
| [[Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]] / [[Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|`Task`]] | Scheduled work and async composition; use [[Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|parallelism]] for CPU partitioning | None: callers must bound fan-out or queueing | The pool owns worker threads; the caller owns task observation | Cooperative through a token passed into the operation | Blocking pool workers can starve unrelated continuations | Exceptions are captured by `Task` and surface when observed or awaited |
| [[Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|`TaskCompletionSource<T>`]] | Adapt one callback, event, or external completion into a task | None: it represents one completion, not a work queue | The adapter owns `TrySetResult`, `TrySetException`, and `TrySetCanceled` | The adapter must register cancellation explicitly | No contender-fairness guarantee; `RunContinuationsAsynchronously` avoids inline continuation capture | The producer chooses exactly one terminal result; later `TrySet*` calls lose the race |
| [[Programming/NET/CSharp/Concurrency and Parallelism/Locking\|`lock` / `Monitor`]] | Short synchronous access to shared state | `Monitor.Wait` can gate a condition, but it does not bound incoming work | The entering thread owns the monitor and must exit it | `lock` has no token; use a timed `Monitor.TryEnter` when waiting must be bounded | No strict acquisition fairness; long holders can starve contenders and form [[Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|deadlocks]] | Exit occurs during stack unwinding, but partial state mutations are not rolled back |
| `Barrier` | Fixed participants meeting at phase boundaries | None: every participant waits for the phase | Each registered participant must signal exactly once per phase | `SignalAndWait` accepts a token, but cancellation does not complete work for other participants | One delayed or missing participant stalls the phase | Post-phase callback failures surface as `BarrierPostPhaseException` |
| `ReaderWriterLockSlim` | Read-heavy synchronous state with rare writes | None: queued callers only wait for ownership | The entering thread owns its read, upgradeable-read, or write lock | No token; `TryEnter*Lock` can impose a timeout | Writers are favored over new readers, but strict fairness is not promised | Recursion and ownership errors throw; failed mutations still require application-level recovery |

[[Programming/NET/CSharp/Concurrency and Parallelism/Semaphore|`SemaphoreSlim`]] belongs beside this table when the requirement is a concurrency limit rather than exclusive ownership. [[Programming/NET/CSharp/Concurrency and Parallelism/Mutex|Mutex]] pays an operating-system handle cost when ownership must cross a process boundary. Neither adds queue durability or makes a multi-lock design safe from deadlock.

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

- For tiny in-memory critical sections, a [[Programming/NET/CSharp/Concurrency and Parallelism/Locking|lock]] is simplest.
- For async sections that must `await`, prefer `SemaphoreSlim.WaitAsync`.
- If contention is high and order matters, move state mutation behind a single-consumer [[Programming/NET/CSharp/Concurrency and Parallelism/Channels|channel]].

## Questions

> [!QUESTION]- What is the difference between concurrency and parallelism in practice?
> Concurrency is structure — a program composed of independently executing tasks that can be dealt with in overlapping time periods. Parallelism is execution — those tasks actually running in the same instant, which takes multiple cores. A single-core machine is perfectly capable of concurrency (it interleaves) and incapable of parallelism.
> In practice the structural choice buys responsiveness and non-blocking progress for I/O-bound work, and separately enables the throughput gain that parallelism delivers for CPU-bound work. Concurrent design permits parallelism; it does not require it.

> [!QUESTION]- Why do many production outages in .NET systems look like "performance" but are actually concurrency bugs?
> Because thread starvation, deadlocks, lock contention, and unbounded fan-out all manifest as latency spikes and timeouts before obvious crashes.

> [!QUESTION]- What is the first decision before choosing a primitive (`Task`, `lock`, `Parallel`, `Channel`)?
> Classify the workload as I/O-bound vs CPU-bound and define cancellation/error boundaries. Primitive choice follows that classification.

> [!QUESTION]- Why is unbounded `Task.WhenAll` often a bad first choice when calling around 300 external APIs in one request?
> Because it can overload downstream dependencies, saturate connection pools, and create timeout storms. Bounded fan-out keeps latency gains while preserving system stability.

> [!QUESTION]- For one requirement ("update shared state safely"), when do you choose `lock` vs `SemaphoreSlim` vs `Channel<T>`?
> Use `lock` for short synchronous sections, `SemaphoreSlim` for async flows that need awaiting, and `Channel<T>` when you also need queueing, ordering, or backpressure.

## References

- [Concurrency Is Not Parallelism (Rob Pike, 2012)](https://go.dev/talks/2012/concurrency.slide) — the talk this distinction comes from; argues concurrency is about program structure, parallelism about execution.
- [Asynchronous programming with async and await (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/) — the C# task-based asynchronous model, continuations, and guidance for I/O-bound work.
- [Task Parallel Library (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl) — the .NET task scheduler and data/task parallelism APIs.
- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices) — runtime guidance on synchronization, blocking, deadlocks, and shared state.
- [Threading in C# (Joe Albahari)](https://www.albahari.com/threading/) — a practitioner-oriented map of .NET threading, synchronization, tasks, and parallel execution.
- [Threading in C#: Basic synchronization and deadlocks (Joe Albahari)](https://www.albahari.com/threading/part2.aspx) — concrete monitor, mutex, semaphore, reader-writer lock, and deadlock mechanics.
- [Threading in C#: Parallel programming and tasks (Joe Albahari)](https://www.albahari.com/threading/part5.aspx) — task composition, continuations, parallel loops, PLINQ, and concurrent collections.
- [Concurrency is not parallelism (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/concurrency-is-not-parallelism.md) — source of the visual comparison; its labels are editorial framing, not .NET runtime authority.
- [Top 6 multithreading design patterns (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-6-multithreading-design-patterns-you-must-know.md) — taxonomy adapted to .NET ownership and failure semantics; the source visual is omitted because it equates tasks with threads and callback streams with futures.
