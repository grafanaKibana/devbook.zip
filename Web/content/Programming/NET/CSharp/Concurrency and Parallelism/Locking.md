---
publish: true
created: 2026-08-20T20:41:15.651Z
modified: 2026-08-20T20:41:15.652Z
published: 2026-08-20T20:41:15.652Z
topic:
  - Programming
subtopic:
  - NET
summary: "The default in-process mutual-exclusion primitive: one thread in the critical section at a time."
level:
  - "4"
priority: High
status: Creation
---

`lock` gives one thread at a time access to a synchronous critical section. It fits small in-process state changes such as updating a counter or taking a snapshot of a shared dictionary. Awaited I/O should normally happen outside that mutation and publish its result inside a short lock. When an invariant genuinely must span asynchronous work, `SemaphoreSlim.WaitAsync` can gate that bounded span; cross-process coordination needs [[Mutex]], and N concurrent holders need [[Semaphore]] rather than mutual exclusion.

# How It Works

`lock (obj) { body }` is sugar over `Monitor`:

```csharp
lock (_gate) { _count++; }

// the compiler emits:
bool lockTaken = false;
try
{
    Monitor.Enter(_gate, ref lockTaken);
    _count++;
}
finally
{
    if (lockTaken) Monitor.Exit(_gate);
}
```

`lockTaken` records whether `Monitor.Enter` succeeded. If acquisition throws, the `finally` block does not attempt to release a monitor the thread never owned.

**`Monitor`/`lock` is reentrant.** Its owning thread can acquire the same monitor again. Each acquisition increments a recursion count, so the thread must exit the same number of times. A one-permit [[Semaphore|semaphore]] has no such ownership model and self-deadlocks on a nested wait.

**`System.Threading.Lock` (.NET 9+)** makes this intent explicit. When the operand has type `Lock`, the statement uses `Lock.EnterScope()` and disposes its `ref struct` scope at the closing brace instead of lowering to `Monitor.Enter`:

```csharp
private readonly Lock _gate = new();   // .NET 9+

lock (_gate) { _count++; }             // compiler calls _gate.EnterScope()
```

A dedicated `Lock` field is harder to misuse than a general `object`. With either type, the gate stays `private readonly`. Locking on `this`, a `Type`, or an interned string exposes the monitor to unrelated code and can create invisible [[Deadlocks|lock-ordering cycles]].

# Example

```csharp
public sealed class MetricsBuffer
{
    private readonly Lock _gate = new();          // .NET 9+; an `object` pre-9
    private readonly Dictionary<string, long> _counts = new();

    public void Increment(string name)
    {
        lock (_gate)
        {
            _counts.TryGetValue(name, out long n);
            _counts[name] = n + 1;
        }
    }

    public IReadOnlyDictionary<string, long> Snapshot()
    {
        lock (_gate)
            return new Dictionary<string, long>(_counts);  // copy out under the lock
    }
}
```

Both reads and writes use `_gate`. `Snapshot` copies the dictionary while protected, then returns data that callers can enumerate after the live lock has been released.

# Pitfalls

- **A monitor cannot span `await`.** Monitor ownership has thread affinity, while a continuation may resume on another thread. The compiler reports CS1996. Async mutual exclusion uses a [[Semaphore|semaphore]] and `WaitAsync`.
- **I/O inside a lock turns latency into contention.** Every waiter queues behind the slow operation, increasing the chance of convoys and [[Deadlocks|deadlocks]]. Compute or fetch outside the lock, then protect only the shared-state update.
- **A public gate leaks synchronization.** `this`, a `Type`, and interned strings can all be locked by unrelated code.
- **`Monitor.TryEnter(obj, timeout)` bounds acquisition.** It is useful when an external lock order cannot be fully controlled. [[Deadlocks]] covers the ordering mechanics.

# Tradeoffs

- **`lock`/`Monitor`** is synchronous, in-process, reentrant mutual exclusion. Its fast path stays in user mode.
- **`SemaphoreSlim`** is in-process, supports `WaitAsync`, and can expose more than one permit. It has no thread ownership or reentrancy.
- **`Mutex`** supplies thread-owned mutual exclusion through an operating-system object and can coordinate named participants across processes.

For short synchronous state changes inside one process, `lock` is the smallest correct primitive. Restructure ordinary async flows so awaited I/O completes before the protected mutation. Use `SemaphoreSlim` only when the invariant must remain gated across asynchronous work, and keep that span bounded because remote latency becomes contention. A real process boundary justifies `Mutex`. N concurrent entrants make the problem a [[Semaphore]] problem regardless of whether callers wait synchronously or asynchronously.

# Questions

> [!QUESTION]- What does `lock (obj) { ... }` compile to?
> `Monitor.Enter(obj, ref lockTaken)` surrounds the body with a `try/finally`, and the `finally` calls `Monitor.Exit` only when `lockTaken` is true. This preserves release on every normal or exceptional exit without releasing an unowned monitor.

> [!QUESTION]- Why can't a `lock` block contain `await`?
> `Monitor` ownership belongs to the acquiring thread. Since an async continuation may resume elsewhere, the compiler rejects `await` in a `lock` block with CS1996. `SemaphoreSlim.WaitAsync` models asynchronous waiting without monitor ownership.

> [!QUESTION]- What does `System.Threading.Lock` improve over locking on a plain `object` in .NET 9+?
> A dedicated `Lock` field makes its purpose clear and avoids reusing an arbitrary object that other code may also lock or expose. The compiler recognizes the type and lowers the block to its scoped `EnterScope` API instead of the usual `Monitor.Enter` and `Monitor.Exit` pattern. It is still a synchronous lock, so it does not make `await` valid inside the block.

> [!QUESTION]- How does reentrancy differ between `lock`/`Monitor` and `SemaphoreSlim`?
> `lock` and `Monitor` track the owning thread and a recursion count, so the same thread can enter the same lock again and must exit it the same number of times. `SemaphoreSlim` tracks permits, not an owner or recursion count. If code holding the only permit waits on that semaphore again, the second wait blocks and can deadlock the operation.

# References

- [lock statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)
