---
publish: true
created: 2026-07-11T21:42:54.485Z
modified: 2026-07-11T21:42:54.485Z
published: 2026-07-11T21:42:54.485Z
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

Concurrency and parallelism are related but different concerns in .NET applications. Concurrency is about making progress on multiple units of work without unnecessary blocking, while parallelism is about using multiple cores to finish CPU-bound work faster. This hub focuses on practical decisions for backend and desktop systems where latency, throughput, and correctness all matter.

<nav style="--card-accent: 244, 63, 94;" class="folder-structure-map" aria-label="Concurrency and Parallelism section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Async Await">Async Await</span></span></div><p class="db-card-summary">.NET's model for non-blocking I/O that releases the thread while awaiting work.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Async Await.md" data-tooltip-position="top" aria-label="Async Await">Async Await</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="CancellationToken">CancellationToken</span></span></div><p class="db-card-summary">Cooperative cancellation where callers request a stop and callees comply safely.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken.md" data-tooltip-position="top" aria-label="CancellationToken">CancellationToken</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Deadlocks">Deadlocks</span></span></div><p class="db-card-summary">When execution paths wait forever on resources each other holds, halting progress.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks.md" data-tooltip-position="top" aria-label="Deadlocks">Deadlocks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Mutex">Mutex</span></span></div><p class="db-card-summary">An OS-backed primitive enforcing single-owner access, useful across processes.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Mutex.md" data-tooltip-position="top" aria-label="Mutex">Mutex</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Parallelism">Parallelism</span></span></div><p class="db-card-summary">Finishing CPU-bound work faster by using multiple cores at once.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Parallelism.md" data-tooltip-position="top" aria-label="Parallelism">Parallelism</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Semaphore">Semaphore</span></span></div><p class="db-card-summary">A primitive allowing up to N concurrent holders, for bounded parallelism.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Semaphore.md" data-tooltip-position="top" aria-label="Semaphore">Semaphore</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Tasks">Tasks</span></span></div><p class="db-card-summary">.NET's core abstraction for asynchronous work, its completion, result, and composition.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/Tasks.md" data-tooltip-position="top" aria-label="Tasks">Tasks</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="ThreadPool">ThreadPool</span></span></div><p class="db-card-summary">.NET's shared execution engine for Task-based work, managing worker and I/O threads.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool.md" data-tooltip-position="top" aria-label="ThreadPool">ThreadPool</a></span></article></div><style>
.db-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9));
  border-radius: var(--radius-m, 0.55rem);
  background-color: var(--background-primary, var(--light, #ffffff));
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.db-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    ellipse 150% 175% at -22% -38%,
    rgba(var(--card-accent, 125, 125, 125), 0.09) 0%,
    rgba(var(--card-accent, 125, 125, 125), 0.04) 38%,
    rgba(var(--card-accent, 125, 125, 125), 0.014) 66%,
    transparent 90%
  );
  opacity: 0.78;
  transition: opacity 150ms ease;
}
.db-card:hover,
.db-card:focus-within {
  border-color: rgba(var(--card-accent, 125, 125, 125), 0.55);
  background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff)));
  box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08);
  transform: translateY(-0.125rem);
}
.db-card:hover::before,
.db-card:focus-within::before { opacity: 1; }
.db-card-body {
  position: relative;
  z-index: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: var(--db-card-pad, 0.85rem 0.9rem);
}
.db-card-icon {
  display: flex;
  width: 1.1rem;
  height: 1.1rem;
  flex: 0 0 auto;
  color: rgb(var(--card-accent, 125, 125, 125));
}
.db-card-icon svg { display: block; width: 100%; height: 100%; }
.db-card-title {
  display: block;
  margin: 0;
  color: var(--text-normal, var(--dark, #1f2937));
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}
/* Element-qualified (p.db-card-summary) on purpose: it ties the specificity of
   Obsidian reading view's ".markdown-rendered p" and, being injected later in
   the body, wins. A bare ".db-card-summary" loses to it, so Obsidian keeps its
   default paragraph spacing and the description gets large gaps above/below.
   Quartz doesn't add those margins, which is why the gap only showed there. */
p.db-card-summary {
  margin: 0.45rem 0 0;
  color: var(--text-muted, var(--darkgray, #5f6b7a));
  font-size: 0.875rem;
  line-height: 1.45;
}
.db-card-hit { position: absolute; inset: 0; z-index: 1; }
.db-card-hit a {
  position: absolute;
  inset: 0;
  min-width: 2.75rem;
  min-height: 2.75rem;
  border-radius: var(--radius-m, 0.55rem);
  background: transparent !important;
  font-size: 0;
}
.db-card-hit a:focus-visible {
  outline: 2px solid rgb(var(--card-accent, 125, 125, 125));
  outline-offset: -0.3rem;
}
@media (prefers-reduced-motion: reduce) {
  .db-card { transition: none; }
  .db-card::before { transition: none; }
  .db-card:hover,
  .db-card:focus-within { transform: none; }
}

.folder-structure-map {
\--card-accent: 16, 185, 129;
\--map-gap: 0.75rem;
width: 100%;
box-sizing: border-box;
margin: 0.5rem 0 0.75rem;
container-name: folder-map;
container-type: inline-size;
}
.folder-map-children {
/\* Flex (not grid) so each card sizes to its own title — a long title widens
its card and pushes to another row instead of being truncated, and rows
grow to fill the width with no empty tracks when there are few cards. _/
display: flex;
flex-wrap: wrap;
gap: var(--map-gap);
}
.folder-map-node {
/_ No overflow:hidden on a flex item whose min-width:auto collapses to 0: that
would let the card shrink below its title + note-count and clip them.
Without it the card's min size is its content, so long titles widen the card
(and wrap to another row) instead of being cut off. The shared ::before
accent uses border-radius:inherit to stay inside the rounded corners. _/
flex: 1 1 12rem;
min-height: 2.75rem;
\--db-card-pad: 0.5rem 0.75rem;
}
.folder-map-node .db-card-body {
min-height: 2.75rem;
justify-content: center;
}
.folder-map-node-heading {
display: flex;
align-items: center;
justify-content: space-between;
gap: 0.75rem;
}
.folder-map-node-title-group {
display: flex;
align-items: center;
gap: 0.5rem;
}
.folder-map-node .db-card-title {
white-space: nowrap;
}
.folder-map-node-count {
display: block;
flex: 0 0 auto;
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.875rem;
white-space: nowrap;
}
.folder-map-node .db-card-summary {
display: none;
}
/_ Empty-section placeholder: a muted gray dashed card (not raw text), reusing
the .db-card chrome but with the accent gradient and hover lift neutralized. \*/
.folder-map-node-empty {
border-style: dashed;
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
cursor: default;
}
.folder-map-node-empty::before { display: none; }
.folder-map-node-empty:hover,
.folder-map-node-empty:focus-within {
border-color: var(--background-modifier-border, var(--lightgray, #d8dee9));
background-color: var(--background-secondary, rgba(125, 125, 125, 0.06));
box-shadow: none;
transform: none;
}
.folder-map-node-empty .db-card-body {
justify-content: center;
align-items: center;
text-align: center;
}
.folder-map-empty-text {
color: var(--text-muted, var(--darkgray, #5f6b7a));
font-size: 0.9rem;
font-style: italic;
}
@container folder-map (min-width: 40rem) {
.folder-map-node {
min-height: 6rem;
\--db-card-pad: 0.85rem 0.9rem;
}
.folder-map-node .db-card-body {
min-height: 6rem;
justify-content: flex-start;
}
.folder-map-node .db-card-summary { display: block; }
}
@container folder-map (min-width: 64rem) {
.folder-map-node,
.folder-map-node .db-card-body { min-height: 6.75rem; }
} </style></nav>

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

## References

- [Asynchronous programming with async and await (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/)
- [Task parallel library (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/parallel-programming/task-parallel-library-tpl)
- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
- [Threading in C# (Joe Albahari)](https://www.albahari.com/threading/)
- [Threading in C#: Basic synchronization and deadlocks (Joe Albahari)](https://www.albahari.com/threading/part2.aspx)
- [Threading in C#: Parallel programming and tasks (Joe Albahari)](https://www.albahari.com/threading/part5.aspx)
