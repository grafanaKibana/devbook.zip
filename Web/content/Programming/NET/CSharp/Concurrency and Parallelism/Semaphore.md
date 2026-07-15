---
publish: true
created: 2026-07-15T06:12:10.155Z
modified: 2026-07-15T06:12:10.155Z
published: 2026-07-15T06:12:10.155Z
topic:
  - Programming
subtopic:
  - NET
summary: A primitive allowing up to N concurrent holders, for bounded parallelism.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

`Semaphore` controls concurrent access by allowing up to N holders at once, unlike `Mutex` and `lock` which allow exactly one. This is the right primitive when you need **bounded parallelism** — for example, limiting an HTTP client to 10 concurrent outbound requests to avoid overwhelming a downstream API (which returns 429 at 15 concurrent connections), or capping database connection usage below the pool maximum during batch processing. In modern .NET, `SemaphoreSlim` is preferred for in-process async workflows because it supports `WaitAsync` and avoids kernel transitions.

## How It Works

A semaphore tracks a permit count:

- `Semaphore`: `WaitOne` consumes one permit.
- `SemaphoreSlim`: `Wait`/`WaitAsync` consumes one permit.
- If no permits are available, callers wait.
- `Release` returns a permit and wakes a waiter.
- `System.Threading.Semaphore` can be named for cross-process coordination; `SemaphoreSlim` is in-process only. **Named (cross-process) semaphores are Windows-only** — constructing one on Linux/macOS throws `PlatformNotSupportedException`, so don't rely on them for cross-platform IPC (same caveat as named `Mutex`).

## Example

```csharp
using var gate = new SemaphoreSlim(initialCount: 4, maxCount: 4);

await gate.WaitAsync(cancellationToken);
try
{
    await ProcessAsync(cancellationToken);
}
finally
{
    gate.Release();
}
```

Named `Semaphore` for cross-process bounded access:

```csharp
// Limit 3 concurrent processes accessing a shared resource
const string SemName = "MyApp.ResourceGate";
using var sem = new Semaphore(initialCount: 3, maximumCount: 3, name: SemName);

if (!sem.WaitOne(TimeSpan.FromSeconds(5)))
    throw new TimeoutException("Could not acquire semaphore slot.");
try
{
    AccessSharedResource();
}
finally
{
    sem.Release();
}
```

## Pitfalls

- **Leaked permits stall all waiters** — forgetting `Release` in an exception path permanently reduces available permits. With a maxCount of 4, one leaked permit drops throughput by 25%; four leaked permits deadlock the system. Always release in `finally`.
- **Over-release inflates concurrency** — for `SemaphoreSlim` without an explicit `maxCount`, calling `Release` without a matching `Wait` silently increases the permit count beyond your intended limit. Your "max 10 concurrent" throttle quietly becomes 11, then 12. With explicit `maxCount`, over-release throws `SemaphoreFullException` — which is noisy but at least detectable. Always set `maxCount` and keep acquire/release symmetry in one scope.
  <<<<<<< HEAD
- **No fairness guarantee** — `SemaphoreSlim` does not guarantee FIFO ordering under contention. A request that arrives later can acquire the permit before an earlier waiter, causing starvation in pathological cases. If ordering matters, use a bounded [[Channels|channel]] instead.
- **No ownership tracking, and not reentrant** — unlike [[Mutex]] or [[Locking|lock/Monitor]], semaphores have no thread affinity: any code path can `Release`, even without a matching `Wait`, which makes leaks hard to trace (instrument `Wait`/`Release` in production throttling code). The flip side is there is **no recursion count** — a method holding the only permit that calls another method which also `WaitAsync`s the _same_ semaphore self-deadlocks. Take the permit once at the top of the call chain.
- **`WaitAsync` allocates under contention** — an immediately-available permit is cheap, but when callers have to wait, `WaitAsync` enqueues an async waiter (a `Task`/state object) per caller. On a very hot throttle this allocation shows up; for high-throughput producer/consumer flows a bounded [[Channels|channel]] (which also gives true FIFO) is often the better primitive.
  \=======
- **No fairness guarantee** — `SemaphoreSlim` does not guarantee FIFO ordering under contention. A request that arrives later can acquire the permit before an earlier waiter, causing starvation in pathological cases. If ordering matters, use `Channel<T>` as a bounded queue (see [[Channels]]).
- **No ownership tracking, and not reentrant** — unlike `Mutex`, semaphores have no thread affinity: any code path can `Release`, even without a matching `Wait`, which makes leaks hard to trace (instrument `Wait`/`Release` in production throttling code). The flip side is there is **no recursion count** — a method holding the only permit that calls another method which also `WaitAsync`s the _same_ semaphore self-deadlocks. Take the permit once at the top of the call chain.
- **`WaitAsync` allocates under contention** — an immediately-available permit is cheap, but when callers have to wait, `WaitAsync` enqueues an async waiter (a `Task`/state object) per caller. On a very hot throttle this allocation shows up; for high-throughput producer/consumer flows a bounded `Channel<T>` (which also gives true FIFO) is often the better primitive — see [[Channels]].

> > > > > > > origin/notes/byte-byte-go-adoption

## Tradeoffs

- `SemaphoreSlim` vs `Semaphore`: `SemaphoreSlim` is lighter and async-friendly in-process; `Semaphore` supports named cross-process coordination.
- Semaphore vs mutex/lock: semaphore allows bounded parallelism; mutex/lock allows only one owner at a time.
- Semaphore vs unbounded `Task.WhenAll`: semaphore caps pressure on dependencies and connection pools at the cost of a little orchestration complexity.

**Default to `SemaphoreSlim`** for anything in-process — it is the only one of these that supports `await`. Reach for the named `Semaphore` only when the count has to be shared across processes on one machine, and then only on Windows. If you also need ordering or buffering rather than just a count, a bounded [[Channels|channel]] is the better primitive.

## Questions

> [!QUESTION]- When should you choose `SemaphoreSlim` over `lock`?
> Choose `SemaphoreSlim` when critical sections include `await` and you need asynchronous waiting. `lock` cannot contain `await` safely.

> [!QUESTION]- Why is a semaphore useful for fan-out HTTP calls?
> It limits in-flight requests, protecting downstream dependencies and your own resources from overload while preserving concurrency.

> [!QUESTION]- What bug pattern most often breaks semaphore-based code?
> Missing or unbalanced `Release` calls. The safe pattern is acquire then `try/finally` release in the same method scope.

## References

- [Semaphore class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphore) — the OS-backed, nameable variant; the ctor overloads and the Windows-only constraint on named semaphores.
- [SemaphoreSlim class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim) — the in-process async variant: `WaitAsync` overloads, `CurrentCount`, and the `SemaphoreFullException` contract on over-release.
- [Overview of synchronization primitives (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives) — where the semaphore sits among `lock`, `Mutex`, and the rest, with a decision table.
- [Threading in C#: Event wait handles, mutexes, and semaphores (Joe Albahari)](https://www.albahari.com/threading/part2.aspx) — mechanism-level treatment of `WaitHandle`-based waiting and the slim vs OS-backed split.
