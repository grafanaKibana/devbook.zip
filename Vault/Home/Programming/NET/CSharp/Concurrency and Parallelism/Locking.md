---
topic:
  - Programming
subtopic:
  - NET
summary: "The default in-process mutual-exclusion primitive: one thread in the critical section at a time."
level:
  - "4"
priority: High
status: Creation
publish: true
---

# Intro

`lock` is the default in-process mutual-exclusion primitive: one thread in the critical section at a time. Reach for it first for a short **synchronous** critical section — incrementing a shared counter, mutating a `Dictionary` several threads touch, publishing a computed value. It protects in-memory state inside one process, and nothing more. It's the wrong tool when the section must `await` (use [[Semaphore]]), when coordination crosses process boundaries (use [[Mutex]]), or when you want N concurrent holders instead of one (use [[Semaphore]]).

## How It Works

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

The `lockTaken` flag exists so that if `Monitor.Enter` throws before the lock is taken, the `finally` doesn't call `Monitor.Exit` on a lock it never held.

**`Monitor`/`lock` is reentrant.** The owning thread can re-acquire the same lock without blocking itself; ownership is reference-counted and must be exited the same number of times. (`SemaphoreSlim` is not — a recursive acquire of a 1-permit [[Semaphore|semaphore]] self-deadlocks.)

**`System.Threading.Lock` (.NET 9+)** is a dedicated type for this. Declare the field as `Lock` and the `lock` statement recognizes it, calling `Lock.EnterScope()` — which returns a `ref struct` scope disposed at the closing brace — instead of `Monitor.Enter`:

```csharp
private readonly Lock _gate = new();   // .NET 9+

lock (_gate) { _count++; }             // compiler calls _gate.EnterScope()
```

Prefer it over locking on a plain `object`: it's purpose-built (you can't accidentally lock on a boxed value, a `string`, or `this`), the API makes intent explicit, and it's slightly faster. **What to lock on** either way is a `private readonly object _gate = new();` (or `private readonly Lock _gate = new();`). Never `lock(this)`, `lock(typeof(X))`, or an interned `string` — those are visible to other code, which creates [[Deadlocks|lock-ordering cycles]] you can't see.

## Example

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

Readers and writers take the same `_gate`. `Snapshot` copies inside the lock so callers iterate a private copy while writers keep mutating the live dictionary.

## Pitfalls

- **Cannot span `await`.** `Monitor` has **thread affinity** — the releasing thread must be the acquiring thread — but a continuation after `await` can resume on a different thread and call `Monitor.Exit` as a non-owner. The compiler rejects `await` inside a `lock` block (CS1996). For async mutual exclusion, reach for a [[Semaphore|semaphore]]'s `WaitAsync`.
- **Don't hold a lock across I/O or a blocking call.** It serializes every other thread behind the slowest operation and invites lock convoys and [[Deadlocks|deadlocks]]. Do the work outside the lock; take it only to swap the result in.
- **Locking on the wrong object** — `this`, a `Type`, or a `string` — leaks the lock to unrelated code and forms cross-component cycles.
- **`Monitor.TryEnter(obj, timeout)`** bounds the wait instead of blocking forever, useful when acquiring in an order you can't fully control (the ordering mechanics are in [[Deadlocks]]).

## Tradeoffs

- **`lock`/`Monitor`** — in-process, synchronous, one owner. User-mode spin before escalating to the kernel; ~20-50 ns uncontended. Reentrant.
- **`SemaphoreSlim`** — in-process, supports `await` via `WaitAsync`, allows N permits. No thread affinity, not reentrant.
- **`Mutex`** — one owner across processes via a named kernel object. ~1-5 µs per acquire from the kernel transition.

Use `lock` in-process by default. Switch to `SemaphoreSlim` the moment the critical section must `await` — the compiler forces the issue anyway. Reach for `Mutex` only when the boundary is genuinely cross-process (single-instance guard, shared file), and accept the kernel cost. If you need N concurrent entrants rather than one, that's a [[Semaphore]] regardless of sync versus async.

## Questions

> [!QUESTION]- What does `lock (obj) { ... }` compile to?
> `Monitor.Enter(obj, ref lockTaken)` followed by `try { ... } finally { if (lockTaken) Monitor.Exit(obj); }`. The `lockTaken` flag ensures `Exit` runs only if the lock was actually acquired, even if `Enter` throws.

> [!QUESTION]- Why can't a `lock` block contain `await`?
> `Monitor` has thread affinity: the thread that releases must be the one that acquired. A continuation after `await` can resume on a different thread, which would exit a lock it doesn't own. The compiler rejects it (CS1996); use `SemaphoreSlim.WaitAsync` for async mutual exclusion.

> [!QUESTION]- Why prefer `System.Threading.Lock` over locking on a plain `object` in .NET 9+?
> It's purpose-built: you can't accidentally lock on a `string`, a boxed value, or `this`; `EnterScope` makes intent explicit; and it's slightly faster. The `lock` statement recognizes a `Lock`-typed operand and calls the new API for you.

> [!QUESTION]- Is `lock`/`Monitor` reentrant, and is `SemaphoreSlim`?
> `lock`/`Monitor` is reentrant — the owning thread can re-acquire and must exit the same number of times. `SemaphoreSlim` is not; a recursive acquire of a 1-permit [[Semaphore|semaphore]] self-deadlocks.

## References

- [lock statement (C# reference) — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock) — the lowering to `Monitor.Enter`/`Exit`, and how the statement dispatches to `System.Threading.Lock` when the operand is that type.
- [Monitor class — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/api/system.threading.monitor) — `Enter`/`Exit`/`TryEnter` semantics, ownership, and reentrancy.
- [System.Threading.Lock class — Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/api/system.threading.lock) — the .NET 9+ type and `EnterScope`'s disposable `ref struct` scope.
- [Threading in C#: Locking and thread safety (Joe Albahari)](https://www.albahari.com/threading/part2.aspx) — `lock` versus other primitives, and why you lock on a private object.
