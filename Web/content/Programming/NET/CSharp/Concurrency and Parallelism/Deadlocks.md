---
publish: true
created: 2026-07-08T15:01:12.648Z
modified: 2026-07-08T15:01:12.649Z
published: 2026-07-08T15:01:12.649Z
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

A deadlock happens when two or more execution paths wait forever on resources held by each other. In .NET systems, deadlocks appear both in classic lock-based code and in async flows that block on tasks. They are high-severity failures because throughput can drop to zero without obvious crashes — the process stays alive but stops making progress.

## How Deadlocks Form — Coffman Conditions

Deadlocks require all four Coffman conditions simultaneously:

1. **Mutual exclusion** — a resource cannot be shared (e.g., a `lock`/monitor). Protects correctness but introduces contention risk.
2. **Hold and wait** — a thread holds one resource while waiting for another. The common trigger in nested locking.
3. **No preemption** — a resource cannot be forcibly taken; the owner must release it. Blocked threads can wait forever without a timeout or cancellation path.
4. **Circular wait** — the wait graph has a cycle (A waits for B, B waits for A). The easiest condition to break with deterministic lock ordering.

Break any one condition and the deadlock cannot happen.

## Classic Lock Deadlock

```csharp
private static readonly object LockA = new();
private static readonly object LockB = new();

public void First()
{
    lock (LockA)
    {
        Thread.Sleep(10); // simulate work while holding A
        lock (LockB)      // then acquire B
        {
            // critical section using A + B
        }
    }
}

public void Second()
{
    lock (LockB)
    {
        Thread.Sleep(10); // simulate work while holding B
        lock (LockA)      // then acquire A — reverse order!
        {
            // critical section using B + A
        }
    }
}
```

**How the deadlock forms:**

1. Thread T1 enters `First`, acquires `LockA`.
2. Thread T2 enters `Second`, acquires `LockB`.
3. T1 tries to acquire `LockB` — blocked (owned by T2).
4. T2 tries to acquire `LockA` — blocked (owned by T1).
5. Neither thread can continue: circular wait.

## Async Deadlock (Sync-Over-Async)

A subtler deadlock pattern in async code: blocking on a `Task` inside a `SynchronizationContext`.

```csharp
// In a UI event handler or legacy ASP.NET action:
public void OnLoad()
{
    // DEADLOCK: blocks the UI thread, which the continuation needs to resume
    var data = LoadDataAsync().Result;
    Display(data);
}

private async Task<string> LoadDataAsync()
{
    // Default await captures the SynchronizationContext (UI thread).
    // The continuation needs the UI thread to resume — but it's blocked by .Result.
    return await _http.GetStringAsync("https://api.example.com/data");
}
```

**Why it deadlocks:**

- `.Result` blocks the UI/context thread.
- The `await` inside `LoadDataAsync` captured the `SynchronizationContext` and needs that same thread to resume.
- Neither can proceed.

## Prevention Patterns

**1. Consistent lock ordering**
Always acquire locks in the same global order across all code paths. This breaks circular wait.

```csharp
// Both methods acquire in the same order: LockA → LockB
public void First()
{
    lock (LockA) { lock (LockB) { /* ... */ } }
}

public void Second()
{
    lock (LockA) { lock (LockB) { /* ... */ } }
}
```

**2. `Monitor.TryEnter` with timeout**
Use a timeout to break the "no preemption" condition — if you can't acquire within the deadline, back off and retry.

```csharp
bool acquired = Monitor.TryEnter(LockA, TimeSpan.FromMilliseconds(500));
if (!acquired)
{
    // Log, retry, or throw — don't wait forever
    throw new TimeoutException("Could not acquire LockA within 500ms");
}
try { /* critical section */ }
finally { Monitor.Exit(LockA); }
```

**3. Async all the way — never block on tasks**
The async deadlock is eliminated by never calling `.Result` or `.Wait()` on tasks in a context-aware environment.

```csharp
// Correct: await all the way up
public async Task OnLoadAsync()
{
    var data = await LoadDataAsync();
    Display(data);
}
```

If you must call async code from sync code (e.g., in a constructor), use `ConfigureAwait(false)` in the async method to prevent context capture, or restructure to avoid the sync boundary.

**4. Minimize lock scope**
Hold locks for the shortest possible time. Don't perform I/O, blocking calls, or complex computation while holding a lock.

```csharp
// Bad: I/O inside lock
lock (_lock) { var result = _http.GetStringAsync(url).Result; }

// Good: I/O outside lock
var result = await _http.GetStringAsync(url);
lock (_lock) { _cache[key] = result; }
```

## ThreadPool-Starvation Deadlock

This is the deadlock that _does_ strike ASP.NET Core (no `SynchronizationContext` required). Each request that blocks on `.Result`/`.Wait()` parks a pool thread. The continuation it's waiting on needs a pool thread to run — but under load every thread is parked the same way, and the pool injects new threads only slowly (~1 per 500ms). The app hangs even though no single-thread cycle exists; throughput collapses to near zero.

```csharp
// Under concurrency this exhausts the ThreadPool and the app appears "deadlocked"
public IActionResult Get() => Ok(_service.LoadAsync().Result); // never block — await instead
```

The fix is the same as the classic case — **async all the way up** — but the failure mode is different (resource exhaustion, not a wait cycle). See [[ThreadPool]].

## Related Failure Modes

- **Livelock** — threads are not blocked but make no progress because they keep reacting to each other (e.g. two `Monitor.TryEnter`/back-off loops that always collide). Add randomized back-off (jitter) to break the symmetry.
- **Lock convoy** — many threads serialize through one hot lock; no deadlock, but throughput craters and latency spikes as threads queue and context-switch. Reduce lock scope, shard the lock, or use a lock-free/`Interlocked` structure.

## Pitfalls

**Async deadlock is invisible in logs**
The process stays alive and healthy from the outside. No exception is thrown. The only signal is a hung request or frozen UI. Use thread dump analysis or `dotnet-dump` to identify blocked threads.

**`lock` inside `async` method**
`lock` cannot span an `await` — the compiler rejects it. Use `SemaphoreSlim` for async-compatible mutual exclusion.

```csharp
private readonly SemaphoreSlim _gate = new(1, 1);

public async Task UpdateAsync()
{
    await _gate.WaitAsync();
    try { /* critical section */ }
    finally { _gate.Release(); }
}
```

> [!WARNING]
> **`SemaphoreSlim` is not reentrant.** Unlike `Monitor`/`lock` (and `Mutex`), it has no thread affinity and no recursion count. If a method that already holds the gate calls another method that tries to acquire the _same_ 1-permit semaphore, it **self-deadlocks**. Don't make `WaitAsync`-guarded methods call each other; restructure so the lock is taken once at the top.

**`lock` on a shared/public object**
Never `lock(this)`, `lock(typeof(X))`, or lock on an interned `string`. These objects are visible to other code that may lock on the same instance, creating cross-component lock-ordering cycles you can't see. Always lock on a `private readonly object _gate = new();` (or use `System.Threading.Lock` in .NET 9+).

**Nested locks in library code**
Third-party libraries may acquire internal locks. Calling library methods while holding your own lock can create unexpected lock ordering dependencies you cannot control.

**Database deadlocks are a separate layer**
The DB engine has its own lock manager: two transactions touching rows/indexes in opposite order deadlock, and the engine kills one as the _deadlock victim_ (SQL Server error 1205). Fix with consistent access order, smaller transactions, and retry-on-1205 — not with CLR locks. See [[Data Persistence/SQL/SQL|SQL]].

## Questions

> [!QUESTION]- What are the four Coffman conditions and which is easiest to break in practice?
> Mutual exclusion, hold-and-wait, no preemption, circular wait. Circular wait is easiest to break: enforce a global lock acquisition order across all code paths. This requires discipline but no runtime overhead.
> The cost of consistent ordering: you must document and enforce the order, which adds coordination overhead in large codebases.

> [!QUESTION]- Why does calling `.Result` on a `Task` deadlock in a UI app but not in a console app?
> UI apps have a `SynchronizationContext` that marshals continuations back to the UI thread. `.Result` blocks that thread; the continuation needs it to resume — circular wait.
> Console apps and ASP.NET Core have no `SynchronizationContext`, so continuations resume on any pool thread and `.Result` merely blocks the calling thread without creating a _classic_ cycle.
> **But ASP.NET Core is not safe from sync-over-async** — see the ThreadPool-starvation note below. The absence of a `SynchronizationContext` removes the single-thread cycle, not the risk of hanging the whole app.

> [!QUESTION]- How do you diagnose a deadlock in a production .NET service?
> Capture a process dump with `dotnet-dump collect` or `procdump`. Analyze with `dotnet-dump analyze` and `clrthreads`/`syncblk` commands to find threads blocked on monitors. For async deadlocks, look for threads blocked in `.Result` or `.Wait()` while holding a `SynchronizationContext`.
> Cost: dump capture briefly pauses the process; plan for a maintenance window or use a non-blocking snapshot tool.

## References

- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices) — official guidance on avoiding deadlocks, race conditions, and starvation in .NET.
- [Monitor class and synchronization (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-threading-monitor) — `Monitor.TryEnter` with timeout as a deadlock-prevention tool.
- [Await, UI, and deadlocks (Stephen Toub, Microsoft)](https://devblogs.microsoft.com/dotnet/await-and-ui-and-deadlocks-oh-my/) — canonical explanation of the async deadlock pattern and how `ConfigureAwait(false)` prevents it.
- [Threading in C#: Deadlocks (Joe Albahari)](https://www.albahari.com/threading/part2.aspx#_Deadlocks) — lock-based deadlock examples with step-by-step analysis.
- [Threading in C#: Monitor.TryEnter (Joe Albahari)](https://www.albahari.com/threading/part2.aspx#_MonitorEnter_and_MonitorExit) — timeout-based lock acquisition to break the no-preemption condition.
- [Diagnosing .NET deadlocks with dotnet-dump (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-deadlock) — production diagnosis workflow using `dotnet-dump` and `syncblk`.
