---
topic:
  - Programming
subtopic:
  - NET
summary: "When execution paths wait forever on resources each other holds, halting progress."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

A deadlock is a closed waiting cycle: every participant holds something another participant needs, so none can move. In .NET this can happen with ordinary locks or when synchronous code blocks an async continuation. The process may stay healthy enough to answer a liveness probe while the affected work has stopped completely.

# The Four Conditions

Classical resource or lock deadlocks are characterized by all four Coffman conditions simultaneously:

1. **Mutual exclusion** means a resource cannot be shared, as with a [[Locking|lock]] or monitor.
2. **Hold and wait** means one path keeps a resource while waiting for another.
3. **No preemption** means the owner must release the resource. Another thread cannot simply take it.
4. **Circular wait** closes the cycle: A waits for B while B waits for A.

Such a classical resource deadlock needs all four at once. Consistent lock ordering is usually the cleanest prevention because it removes circular wait.

# Classic Lock Deadlock

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

The cycle forms in five steps:
1. Thread T1 enters `First`, acquires `LockA`.
2. Thread T2 enters `Second`, acquires `LockB`.
3. T1 tries to acquire `LockB` — blocked (owned by T2).
4. T2 tries to acquire `LockA` — blocked (owned by T1).
5. Neither thread can continue. The wait graph now contains a cycle.

# Async Deadlock (Sync-Over-Async)

Async code can create the same shape without two explicit locks. The common case blocks a thread that owns a `SynchronizationContext`, while the awaited continuation is queued back to that context.

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

The dependency is small but fatal:
- `.Result` blocks the UI/context thread.
- The `await` inside `LoadDataAsync` captured the `SynchronizationContext` and needs that same thread to resume.
- Neither can proceed.

# Prevention

**Use one lock order.** Every code path acquires the same set of locks in the same order. Circular wait then has no way to form.

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

**Bound the wait.** `Monitor.TryEnter` gives the caller a chance to abandon the attempt, release anything already held, and retry later. The timeout does not preempt another owner. It prevents the caller from waiting forever.

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

**Keep async call chains async.** Awaiting a task yields the thread instead of holding it while the continuation waits to run.

```csharp
// Correct: await all the way up
public async Task OnLoadAsync()
{
    var data = await LoadDataAsync();
    Display(data);
}
```

`ConfigureAwait(false)` can avoid context capture inside library code, but it is not a general bridge from synchronous code to async code. A synchronous boundary should usually be moved outward or given a separate synchronous implementation.

**Keep lock scope small.** I/O and blocking calls stay outside the critical section. The lock protects the state change, not the work used to compute it.

```csharp
// Bad: I/O inside lock
lock (_lock) { var result = _http.GetStringAsync(url).Result; }

// Good: I/O outside lock
var result = await _http.GetStringAsync(url);
lock (_lock) { _cache[key] = result; }
```

# Thread-pool Starvation Can Look the Same

ASP.NET Core does not need a `SynchronizationContext` for sync-over-async to cause an outage. Each request blocked on `.Result` or `.Wait()` occupies a pool thread. Under load, continuations compete for the same depleted pool and throughput can collapse before thread injection catches up.

```csharp
// Under concurrency this exhausts the ThreadPool and the app appears "deadlocked"
public IActionResult Get() => Ok(_service.LoadAsync().Result); // never block — await instead
```

The service looks deadlocked, but the mechanism is resource starvation rather than a closed wait cycle. Keeping the request path async releases pool threads while I/O is pending. See [[ThreadPool]].

# Related Failure Modes

- **Livelock** keeps threads active but unproductive because each reacts to the other. Two identical `Monitor.TryEnter` retry loops can collide indefinitely. Jitter breaks that symmetry.
- **Lock convoy** queues many threads behind one hot lock. Progress continues, but latency rises and throughput falls as the queue grows.

# Pitfalls

**There may be no exception.** A frozen UI or request timeout may be the first signal. A process dump reveals threads blocked on monitors or synchronous task waits.

**A `lock` cannot span `await`.** The compiler rejects the construct because monitor ownership belongs to a thread, and an async continuation may resume elsewhere. `SemaphoreSlim` supplies async-compatible waiting.

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
> **`SemaphoreSlim` is not reentrant.** Unlike `Monitor`/`lock` (and `Mutex`), it has no thread affinity or recursion count. A method holding the only permit self-deadlocks if it calls another method that waits on the same semaphore. The permit belongs at one clear boundary in the call chain.

**Public lock objects hide dependencies.** `lock(this)`, `lock(typeof(X))`, and an interned `string` expose the same monitor to unrelated code. A private `readonly` gate keeps lock ordering inside the component.

**Library calls may take internal locks.** Calling unknown code while holding an application lock creates an ordering dependency that is difficult to see or control.

**Database deadlocks belong to the database lock manager.** Two transactions can touch rows or indexes in opposite orders, after which SQL Server chooses a victim and reports error 1205. The usual response combines consistent access order and short transactions with a bounded retry for the victim. CLR locks do not repair this layer. See [[Database Locks]].

# Questions

> [!QUESTION]- What are the four Coffman conditions and which is easiest to break in practice?
> The four conditions are mutual exclusion, hold-and-wait, no preemption, and circular wait. In practice, circular wait is usually the easiest to remove by defining one lock order and following it everywhere. If every code path takes the locks in the same order, the cycle cannot form.

> [!QUESTION]- Why can calling `.Result` on a `Task` deadlock in a UI app but usually not in a console app?
> A deadlock can happen when the task is still incomplete and its continuation needs the UI thread. `.Result` blocks that thread, while the continuation waits to get back onto it, so neither can finish. Console applications and ASP.NET Core normally run continuations on thread-pool threads, so this specific cycle is usually absent. Blocking is still harmful because it ties up a thread and can cause thread-pool starvation under load.

> [!QUESTION]- What steps help diagnose a deadlock in a production .NET service?
> Start with a process dump. Inspect thread stacks for waits in `Monitor.Enter`, `.Result`, or `.Wait()`, then check which thread owns each monitor; `syncblk` shows that ownership. For an async deadlock, find the continuation that cannot run and the context or scheduler it is waiting for. Together, those waits reveal the cycle.

# References

- [Diagnosing .NET deadlocks with dotnet-dump](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-deadlock)
- [Await, UI, and deadlocks](https://devblogs.microsoft.com/dotnet/await-and-ui-and-deadlocks-oh-my/)
