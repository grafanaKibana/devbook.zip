---
publish: true
created: 2026-08-20T20:41:15.653Z
modified: 2026-08-20T20:41:15.653Z
published: 2026-08-20T20:41:15.653Z
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

A semaphore represents a fixed number of permits. At most N callers may hold one at the same time, which makes the primitive useful for bounded concurrency rather than single-owner exclusion. `SemaphoreSlim` is the usual in-process choice in .NET because waiting can be asynchronous through `WaitAsync`. The operating-system-backed `Semaphore` exists for synchronous and named cross-process coordination.

# How It Works

A wait consumes one permit. `Release` puts it back:

- `Semaphore`: `WaitOne` consumes one permit.
- `SemaphoreSlim`: `Wait`/`WaitAsync` consumes one permit.
- With no permits available, another caller waits.
- A release allows one waiter to compete for the returned permit.
- `System.Threading.Semaphore` can be named for cross-process coordination. `SemaphoreSlim` stays inside one process. Named semaphores are Windows-only, and construction with a name throws `PlatformNotSupportedException` on Linux and macOS.

# Example

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

# Pitfalls

- **A leaked permit shrinks capacity.** If an exception path skips `Release`, the semaphore permanently admits fewer callers. With four permits, four leaks stop all future work. Acquisition and release belong in one `try/finally` scope.
- **An extra release expands capacity.** A `SemaphoreSlim` created without an explicit `maxCount` can grow beyond its intended limit. Setting `maxCount` turns the mistake into `SemaphoreFullException` instead of a silent throttle failure.
- **Waiters are not guaranteed FIFO order.** A later caller may acquire before an earlier one. A bounded [[Channels|channel]] is a better model when queue order belongs to the contract.
- **There is no owner or recursion count.** Unlike [[Mutex]] or [[Locking|lock/Monitor]], any code path may call `Release`. A method that holds the only permit and then waits on the same semaphore blocks itself. One boundary should own the acquire/release pair.
- **Contention creates async waiter state.** An immediately available permit is cheap. A blocked `WaitAsync` must enqueue state for later completion. A bounded [[Channels|channel]] can combine the throttle with the queue when producer/consumer flow is the real problem.

# Tradeoffs

- `SemaphoreSlim` supports asynchronous waiting in one process. `Semaphore` is operating-system-backed and can be named on Windows.
- A semaphore models capacity. A mutex or lock models one owner.
- `Task.WhenAll` only composes the tasks supplied to it. If callers eagerly create an unbounded set of async operations, all of them may reach the dependency before `WhenAll` observes completion. Acquiring a semaphore inside each operation limits how many enter the protected work at once.

`SemaphoreSlim` is the direct choice for an in-process async throttle. A named `Semaphore` only earns its heavier boundary when Windows processes on the same machine must share the count. Ordering or buffering turns the problem into a bounded [[Channels|channel]] rather than a bare permit counter.

# Questions

> [!QUESTION]- When is `SemaphoreSlim` a better fit than `lock`?
> `SemaphoreSlim` fits asynchronous work or a resource that may allow more than one operation at a time. `WaitAsync` lets a caller wait for a permit without blocking a thread, and the permit can be released after an `await`. A `lock` is better for a short synchronous critical section that allows only one thread at a time. Because a semaphore has no owner, its acquire and release still need one clear `try/finally` boundary.

# References

- [Overview of synchronization primitives](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives)
