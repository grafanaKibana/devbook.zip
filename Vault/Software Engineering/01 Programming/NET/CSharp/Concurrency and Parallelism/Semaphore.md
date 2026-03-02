---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---

# Intro

`Semaphore` controls concurrent access by allowing up to N holders at once. It is useful when you need bounded parallelism instead of full serialization. In modern .NET, `SemaphoreSlim` is typically preferred for in-process async workflows because it supports `WaitAsync` with lower overhead.

## How It Works

A semaphore tracks a permit count:

- `Semaphore`: `WaitOne` consumes one permit.
- `SemaphoreSlim`: `Wait`/`WaitAsync` consumes one permit.
- If no permits are available, callers wait.
- `Release` returns a permit and wakes a waiter.
- `System.Threading.Semaphore` can be named for cross-process coordination; `SemaphoreSlim` is in-process only.

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

- Forgetting `Release` leaks permits and eventually stalls all waiters. Always release in `finally`.
- For `Semaphore` and `SemaphoreSlim` with an explicit `maxCount`, over-release can throw `SemaphoreFullException`; for `SemaphoreSlim` created without `maxCount`, over-release can silently increase concurrency beyond your intended limit. Keep acquire/release symmetry explicit in one scope.
- Using `Semaphore`/`SemaphoreSlim` as a fairness guarantee is risky under load because scheduling order is not strict FIFO. If ordering matters, use queue-based coordination (`Channel<T>`).
- Semaphores do not provide ownership identity checks for correctness of release pairing in async flows. If one code path releases without a matching acquire, throttling math drifts and bugs become hard to detect.

## Tradeoffs

- `SemaphoreSlim` vs `Semaphore`: `SemaphoreSlim` is lighter and async-friendly in-process; `Semaphore` supports named cross-process coordination.
- Semaphore vs mutex/lock: semaphore allows bounded parallelism; mutex/lock allows only one owner at a time.
- Semaphore vs unbounded `Task.WhenAll`: semaphore caps pressure on dependencies and connection pools at the cost of a little orchestration complexity.

## Questions

> [!QUESTION]- When should you choose `SemaphoreSlim` over `lock`?
> Choose `SemaphoreSlim` when critical sections include `await` and you need asynchronous waiting. `lock` cannot contain `await` safely.

> [!QUESTION]- Why is a semaphore useful for fan-out HTTP calls?
> It limits in-flight requests, protecting downstream dependencies and your own resources from overload while preserving concurrency.

> [!QUESTION]- What bug pattern most often breaks semaphore-based code?
> Missing or unbalanced `Release` calls. The safe pattern is acquire then `try/finally` release in the same method scope.

## Links

- [Semaphore class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphore)
- [SemaphoreSlim class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim)
- [Overview of synchronization primitives (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives)
- [Threading in C#: Event wait handles, mutexes, and semaphores (Joe Albahari)](https://www.albahari.com/threading/part2.aspx)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken|CancellationToken]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Mutex|Mutex]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]
<!-- whats-next:end -->
