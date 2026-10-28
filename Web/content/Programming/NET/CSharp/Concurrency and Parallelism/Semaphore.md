---
publish: true
created: 2026-10-28T12:27:02.945Z
modified: 2026-10-28T12:27:15.070Z
published: 2026-10-28T12:27:15.070Z
topic:
  - Programming
subtopic:
  - NET
summary: A primitive allowing up to N concurrent holders, for bounded parallelism.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/CSharp/Concurrency and Parallelism/Semaphore
flashcard_uid: d136a9b7
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
- **An extra release expands capacity.** A `SemaphoreSlim` created without an explicit `maxCount` can grow beyond its intended limit. Setting `maxCount` turns the mistake into `SemaphoreFullException` only when the release would raise the count above that maximum. An extra release made while permits are still held stays within the maximum, succeeds, and silently admits one more caller than intended.
- **Waiters are not guaranteed FIFO order.** A later caller may acquire before an earlier one. A bounded [[Channels|channel]] is a better model when queue order belongs to the contract.
- **There is no owner or recursion count.** Unlike [[Mutex]] or [[Locking|lock/Monitor]], any code path may call `Release`. A method that holds the only permit and then waits on the same semaphore blocks itself. One boundary should own the acquire/release pair.
- **Contention creates async waiter state.** An immediately available permit is cheap. A blocked `WaitAsync` must enqueue state for later completion. A bounded [[Channels|channel]] can combine the throttle with the queue when producer/consumer flow is the real problem.

# Tradeoffs

- `SemaphoreSlim` supports asynchronous waiting in one process. `Semaphore` is operating-system-backed and can be named on Windows.
- A semaphore models capacity. A mutex or lock models one owner.
- `Task.WhenAll` only composes the tasks supplied to it. If callers eagerly create an unbounded set of async operations, all of them may reach the dependency before `WhenAll` observes completion. Acquiring a semaphore inside each operation limits how many enter the protected work at once.

`SemaphoreSlim` is the direct choice for an in-process async throttle. A named `Semaphore` only earns its heavier boundary when Windows processes on the same machine must share the count. Ordering or buffering turns the problem into a bounded [[Channels|channel]] rather than a bare permit counter.

# Questions

<!-- qard-id: 6d43729c-6478-465f-afd9-5b432d9ad3ae -->

> [!qard]- When is `SemaphoreSlim` a better fit than `lock`?
> `SemaphoreSlim` is the better fit when waiting must be asynchronous, such as protected work that contains `await`, or when up to N callers may proceed at once. `lock` remains the simpler fit for a short synchronous section that one thread at a time may enter.
>
> | Aspect | `lock` | `SemaphoreSlim` |
> |---|---|---|
> | Callers inside at once | One thread, so it only provides mutual exclusion. | Up to the configured count. A count of 1 gives mutual exclusion, and a higher count throttles concurrency. |
> | How a caller waits | The waiting thread blocks until the lock is free. | `WaitAsync` returns a task, so the caller waits without holding a thread. `Wait` blocks like a lock. |
> | `await` inside the section | Not allowed by the compiler, because the lock belongs to the thread that entered it. | Allowed, because a permit is not tied to any thread. |
> | Release | Automatic when the block exits, including after an exception. | Only through an explicit `Release` call, which any code can make. |
>
> Because a semaphore tracks no owner, each successful wait is paired with exactly one `Release`, normally in a `finally` block. A missed release permanently removes a permit. An extra release adds a permit beyond the intended limit. A `maxCount` does not reliably prevent this: `Release` throws `SemaphoreFullException` only when it would raise the count above that maximum, so an extra release made while permits are still held succeeds silently.
>
> [Microsoft: SemaphoreSlim](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim?view=net-10.0) · [Microsoft: SemaphoreSlim.Release](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim.release?view=net-10.0) · [Microsoft: C# lock statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/lock)

# References

- [Overview of synchronization primitives](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives)
