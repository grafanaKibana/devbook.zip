---
publish: true
created: 2026-10-21T13:29:32.440Z
modified: 2026-10-21T13:29:32.440Z
published: 2026-10-21T13:29:32.440Z
topic:
  - Programming
subtopic:
  - NET
summary: When execution paths wait forever on resources each other holds, halting progress.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Concurrency and Parallelism/Deadlocks
flashcard_uid: f9642578
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

**One lock order.** Every code path acquires the same set of locks in the same order. Circular wait then has no way to form.

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

**Bounded waits.** `Monitor.TryEnter` gives the caller a chance to abandon the attempt, release anything already held, and retry later. The timeout does not preempt another owner. It prevents the caller from waiting forever.

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

**Async call chains stay async.** Awaiting a task yields the thread instead of holding it while the continuation waits to run.

```csharp
// Correct: await all the way up
public async Task OnLoadAsync()
{
    var data = await LoadDataAsync();
    Display(data);
}
```

`ConfigureAwait(false)` can avoid context capture inside library code, but it is not a general bridge from synchronous code to async code. A synchronous boundary should usually be moved outward or given a separate synchronous implementation.

**Lock scope stays small.** I/O and blocking calls stay outside the critical section. The lock protects the state change, not the work used to compute it.

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

The service looks deadlocked, but the mechanism is resource starvation rather than a closed wait cycle. Keeping the request path async releases pool threads while I/O is pending. Thread-pool behavior is covered in [[ThreadPool]].

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

**Database deadlocks belong to the database lock manager.** Two transactions can touch rows or indexes in opposite orders, after which SQL Server chooses a victim and reports error 1205. The usual response combines consistent access order and short transactions with a bounded retry for the victim. CLR locks do not repair this layer. Database lock behavior is covered in [[Database Locks]].

# Questions

<!-- qard-id: fedf92a4-d6ae-45c5-a26f-25debb161739 -->

> [!qard]- What are the four Coffman conditions for a resource deadlock?
> The four conditions are mutual exclusion, hold and wait, no preemption and circular wait. A classical resource deadlock occurs only when all four hold at the same time.
>
> 1. **Mutual exclusion:** a resource can be held by only one participant at a time, as with a lock.
> 2. **Hold and wait:** a participant keeps the resources it holds while waiting for another.
> 3. **No preemption:** a resource cannot be taken from its holder; only the holder can release it.
> 4. **Circular wait:** the waiting participants form a closed chain, each waiting for a resource held by the next.
>
> For example, thread T1 holds lock A and waits for lock B, while T2 holds B and waits for A. Both locks are exclusive, each thread holds one while waiting, neither lock can be taken away, and the two waits close a cycle.
>
> Because all four conditions are required, breaking any one prevents this kind of deadlock. Which condition is practical to break depends on the resources and design. For locks, a single global acquisition order that every code path follows makes circular wait impossible.
>
> [Coffman, Elphick and Shoshani: System Deadlocks](https://doi.org/10.1145/356586.356588) · [Microsoft: Dynamic-link library best practices](https://learn.microsoft.com/en-us/windows/win32/Dlls/dynamic-link-library-best-practices)

> [!qard]- How can lock-based deadlocks be prevented in .NET code?
> Lock-based deadlocks are prevented by making a closed wait cycle impossible, or by ensuring that a thread does not wait forever while it holds locks.
>
> - **One global lock order:** every code path that needs several locks acquires them in the same order, such as A before B. No thread can then hold B while waiting for A, so circular wait cannot form.
> - **Bounded acquisition:** a timed `Monitor.TryEnter` lets a thread give up instead of waiting forever. On failure, the thread releases any locks it already holds, then reports an error or retries after a randomized delay. The timeout does not take the lock from its owner, and identical retry timing could make two threads keep colliding (livelock).
> - **Short critical sections:** I/O, blocking waits and calls into unknown library code stay outside the lock. Code called while a lock is held may take its own locks, which adds an ordering dependency that is hard to see.
> - **Private lock objects:** a `private readonly` lock object keeps the lock under the component's control. Locking on `this`, a `Type` or a string lets unrelated code take the same lock and join the ordering.
>
> For example, if `First` locks A then B while `Second` locks B then A, two threads can each hold one lock and wait for the other. Changing `Second` to lock A then B removes the cycle.
>
> [Microsoft: Dynamic-link library best practices](https://learn.microsoft.com/en-us/windows/win32/Dlls/dynamic-link-library-best-practices) · [Microsoft: `lock` statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)

<!-- qard-id: 17deb6e3-a3c1-4265-9148-1a96302dca83 -->

> [!qard]- When does blocking on an incomplete task deadlock a UI thread?
> Blocking deadlocks a UI thread when the task cannot complete without running code on that same UI thread. This happens when an `await` inside the task captured the UI `SynchronizationContext`, which runs continuations only on the UI thread.
>
> The cycle forms in five steps:
>
> 1. A UI event handler calls an async method, such as `LoadDataAsync()`.
> 2. Inside it, `await` on incomplete I/O captures the UI context, and the method returns an incomplete task.
> 3. The handler calls `.Result` or `.Wait()` on that task, blocking the UI thread.
> 4. The I/O completes, and the rest of `LoadDataAsync()` is queued to run on the UI thread.
> 5. The UI thread waits for the task, while the task waits for the UI thread. Neither can proceed.
>
> Awaiting through the whole call chain breaks the cycle, because the handler yields the UI thread instead of blocking it. `ConfigureAwait(false)` in library code avoids capturing the context for those awaits, but it does not make blocking on asynchronous code a safe general bridge.
>
> Without a single-threaded context, as in ASP.NET Core, this particular cycle does not form. Blocking still holds a thread-pool thread for each waiting call and can starve the pool under load.
>
> [Microsoft: Common async bugs](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/common-async-bugs) · [Microsoft: Synchronous wrappers for async methods](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/synchronous-wrappers-for-asynchronous-methods)

<!-- qard-id: 7c1fe64c-c539-4207-887a-8a8ad04d355b -->

> [!qard]- How can a production .NET deadlock be diagnosed?
> A production deadlock is diagnosed from a process dump by finding a closed wait-for cycle, in which each blocked thread or task waits for something that another member of the cycle holds or must run.
>
> 1. **Dump:** `dotnet-dump collect` saves the memory and thread state of the hung process.
> 2. **Blocked threads:** in `dotnet-dump analyze`, `clrstack -all` shows every managed stack. Deadlocked threads sit in lock acquisitions such as `Monitor.Enter`, or in synchronous task waits such as `.Result` or `.Wait()`.
> 3. **Monitor owners:** `syncblk` lists which thread owns each monitor. Matching each waiting thread to the lock it wants, and that lock to its owner, shows whether the waits close a cycle.
> 4. **Async waits:** for a thread blocked on a task, the analysis also needs the task's pending continuation and the context or scheduler it must run on. For example, a continuation bound to the UI context cannot run while the UI thread itself is blocked on that task.
>
> The cycle is the evidence. A high thread count, or many blocked threads without a cycle, points to a different problem such as thread-pool starvation.
>
> [Microsoft: Debug a .NET deadlock](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-deadlock) · [Microsoft: dotnet-dump](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/dotnet-dump)

# References

- [Diagnosing .NET deadlocks with dotnet-dump](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/debug-deadlock)
- [Await, UI, and deadlocks](https://devblogs.microsoft.com/dotnet/await-and-ui-and-deadlocks-oh-my/)
