---
publish: true
created: 2026-08-20T20:41:15.650Z
modified: 2026-08-20T20:41:15.650Z
published: 2026-08-20T20:41:15.650Z
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

Concurrency describes program structure: several operations can be in progress during the same period. Parallelism describes execution: several operations run at the same instant. A single core can interleave concurrent work but cannot execute it in parallel.

That distinction drives the .NET choices in this folder. Asynchronous composition keeps I/O waits from occupying threads. Controlled parallelism gives CPU work access to multiple cores. Mixing the two models usually adds threads without making the workload finish sooner.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Concurrency and Parallelism section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Async Await">Async Await</span></span></div><p class="db-card-summary">.NET's model for non-blocking I/O that releases the thread while awaiting work.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Async Await.md" data-tooltip-position="top" aria-label="Async Await">Async Await</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="CancellationToken">CancellationToken</span></span></div><p class="db-card-summary">Cooperative cancellation where callers request a stop and callees comply safely.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken.md" data-tooltip-position="top" aria-label="CancellationToken">CancellationToken</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Channels">Channels</span></span></div><p class="db-card-summary">Bounded async producer-consumer handoff with explicit backpressure.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Channels.md" data-tooltip-position="top" aria-label="Channels">Channels</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Deadlocks">Deadlocks</span></span></div><p class="db-card-summary">When execution paths wait forever on resources each other holds, halting progress.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks.md" data-tooltip-position="top" aria-label="Deadlocks">Deadlocks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Locking">Locking</span></span></div><p class="db-card-summary">The default in-process mutual-exclusion primitive: one thread in the critical section at a time.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Locking.md" data-tooltip-position="top" aria-label="Locking">Locking</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Mutex">Mutex</span></span></div><p class="db-card-summary">An OS-backed primitive enforcing single-owner access, useful across processes.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Mutex.md" data-tooltip-position="top" aria-label="Mutex">Mutex</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Parallelism">Parallelism</span></span></div><p class="db-card-summary">Finishing CPU-bound work faster by using multiple cores at once.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Parallelism.md" data-tooltip-position="top" aria-label="Parallelism">Parallelism</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Semaphore">Semaphore</span></span></div><p class="db-card-summary">A primitive allowing up to N concurrent holders, for bounded parallelism.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Semaphore.md" data-tooltip-position="top" aria-label="Semaphore">Semaphore</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Tasks">Tasks</span></span></div><p class="db-card-summary">.NET's core abstraction for asynchronous work, its completion, result, and composition.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Tasks.md" data-tooltip-position="top" aria-label="Tasks">Tasks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="ThreadPool">ThreadPool</span></span></div><p class="db-card-summary">.NET's shared execution engine for Task-based work, managing worker and I/O threads.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool.md" data-tooltip-position="top" aria-label="ThreadPool">ThreadPool</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), background-color var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)), transform var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity var(--dur-2, 140ms) var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)); } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @keyframes db-card-in { from { opacity: 0; transform: translateY(6px); } } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: db-card-in var(--dur-3, 220ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) backwards; } .dc-topic-grid .db-card:nth-child(2), .folder-map-children .db-card:nth-child(2) { animation-delay: calc(var(--stagger, 28ms) * 1); } .dc-topic-grid .db-card:nth-child(3), .folder-map-children .db-card:nth-child(3) { animation-delay: calc(var(--stagger, 28ms) * 2); } .dc-topic-grid .db-card:nth-child(4), .folder-map-children .db-card:nth-child(4) { animation-delay: calc(var(--stagger, 28ms) * 3); } .dc-topic-grid .db-card:nth-child(5), .folder-map-children .db-card:nth-child(5) { animation-delay: calc(var(--stagger, 28ms) * 4); } .dc-topic-grid .db-card:nth-child(6), .folder-map-children .db-card:nth-child(6) { animation-delay: calc(var(--stagger, 28ms) * 5); } .dc-topic-grid .db-card:nth-child(n+7), .folder-map-children .db-card:nth-child(n+7) { animation-delay: calc(var(--stagger, 28ms) * 6); } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } .dc-topic-grid .db-card, .folder-map-children .db-card { animation: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Composition versus Simultaneous Execution

A single thread can compose overlapping I/O without running two instructions at once:

1. At 0 ms, request A sends an HTTP call and registers its continuation with `await`. The thread returns to the scheduler.
2. At 1 ms, the same thread starts request B and yields at its `await`.
3. At 40 ms, B's socket completion makes its continuation runnable. The thread processes it.
4. At 52 ms, A becomes runnable and the thread resumes it.

Both requests were in flight together. The thread still executed one continuation at a time because the overlap came from the operating system and network.

CPU work crosses a different boundary. This loop partitions the pixels and schedules workers through the [[Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]. Multiple workers can execute `Sharpen` simultaneously on different cores:

```csharp
Parallel.For(
    fromInclusive: 0,
    toExclusive: pixels.Length,
    new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
    i => pixels[i] = Sharpen(pixels[i]));
```

That is useful only when `Sharpen` does enough computation to repay partitioning and scheduling overhead. For socket waits, adding worker threads consumes resources without making the remote service respond sooner.

![[Assets/Programming/Programming-Concurrency and Parallelism-18120000.png]]

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
| [[Programming/NET/CSharp/Concurrency and Parallelism/Channels\|`Channel<T>`]] | Async producer-consumer handoff | A bounded channel waits or drops by policy | Writers submit. Readers drain. A single reader can own mutable state | Each wait accepts a token. `Complete` ends the stream | FIFO items do not imply fair writers or readers | `Complete(error)` exposes a terminal error. An uncaught item failure can stop the consumer pump |
| [[Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]] / [[Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|`Task`]] | Scheduled work and async composition. Use [[Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|parallelism]] for CPU partitioning | None: callers must bound fan-out or queueing | The pool owns worker threads. The caller owns task observation | Cooperative through a token passed into the operation | Blocking pool workers can starve unrelated continuations | Exceptions are captured by `Task` and surface when observed or awaited |
| [[Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|`TaskCompletionSource<T>`]] | Adapt one callback, event, or external completion into a task | None: it represents one completion, not a work queue | The adapter owns `TrySetResult`, `TrySetException`, and `TrySetCanceled` | The adapter must register cancellation explicitly | No contender-fairness guarantee. `RunContinuationsAsynchronously` avoids running continuations inline on the completing thread | The producer chooses exactly one terminal result. Later `TrySet*` calls lose the race |
| [[Programming/NET/CSharp/Concurrency and Parallelism/Locking\|`lock` / `Monitor`]] | Short synchronous access to shared state | `Monitor.Wait` can gate a condition, but it does not bound incoming work | The entering thread owns the monitor and must exit it | `lock` has no token. Use a timed `Monitor.TryEnter` when waiting must be bounded | No strict acquisition fairness. Long holders can starve contenders and form [[Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|deadlocks]] | Exit occurs during stack unwinding, but partial state mutations are not rolled back |
| `Barrier` | Fixed participants meeting at phase boundaries | None: every participant waits for the phase | Each registered participant must signal exactly once per phase | `SignalAndWait` accepts a token, but cancellation does not complete work for other participants | One delayed or missing participant stalls the phase | Post-phase callback failures surface as `BarrierPostPhaseException` |
| `ReaderWriterLockSlim` | Read-heavy synchronous state with rare writes | None: queued callers only wait for ownership | The entering thread owns its read, upgradeable-read, or write lock | No token. `TryEnter*Lock` can impose a timeout | Writers are favored over new readers, but strict fairness is not promised | Recursion and ownership errors throw. Failed mutations still require application-level recovery |

[[Programming/NET/CSharp/Concurrency and Parallelism/Semaphore|`SemaphoreSlim`]] fits a concurrency limit rather than exclusive ownership. [[Programming/NET/CSharp/Concurrency and Parallelism/Mutex|Mutex]] pays for an operating-system handle when ownership must cross a process boundary. Neither provides durable queueing or removes deadlock risk from a multi-lock design.

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

A short synchronous critical section belongs behind a [[Programming/NET/CSharp/Concurrency and Parallelism/Locking|lock]]. If ownership must span an `await`, `SemaphoreSlim.WaitAsync` can represent the gate, though holding any gate across I/O widens the contention window. A single-consumer [[Programming/NET/CSharp/Concurrency and Parallelism/Channels|channel]] is often clearer when ordered mutation and buffering are both part of the requirement.

# Questions

> [!QUESTION]- What is the difference between concurrency and parallelism in practice?
> Concurrency means several operations are in progress during the same period, even if one thread takes turns running them. Parallelism means operations execute at the same time on multiple cores. Asynchronous I/O uses concurrency so a thread is not blocked while an external operation is pending. CPU-bound work uses parallelism when splitting the calculation across cores reduces its elapsed time.

> [!QUESTION]- What should be checked before choosing `Task`, `lock`, `Parallel`, or `Channel`?
> First check what the work spends time doing and who is responsible for finishing it. I/O-bound work usually needs asynchronous APIs so threads are not blocked. CPU-bound work may benefit from measured parallelism. Shared mutable state needs synchronization or a single owner, while background work needs a queue with a clear lifetime and failure policy. The primitive follows from those requirements.

# References

- [Concurrency Is Not Parallelism](https://go.dev/talks/2012/concurrency.slide)
- [Managed threading best practices](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
- [Threading in C#](https://www.albahari.com/threading/)
