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

A deadlock happens when two or more execution paths wait forever on resources held by each other. In .NET systems, deadlocks appear both in classic lock-based code and in async flows that block on tasks. They are high-severity failures because throughput can drop to zero without obvious crashes.

## Deeper Explanation

Deadlocks require all Coffman conditions:

1. **Mutual exclusion**: a resource cannot be shared at the same time (for example, a monitor lock), which protects correctness but introduces contention risk.
2. **Hold and wait**: a thread holds one resource while waiting for another, which is the common trigger in nested locking.
3. **No preemption**: a resource cannot be forcibly taken and the owner must release it, so blocked threads can wait forever if no timeout or cancellation path exists.
4. **Circular wait**: the wait graph has a cycle (A waits for B, B waits for A, or longer cycle), and this is usually the easiest condition to break with deterministic lock ordering.

Break any one condition and the deadlock cannot happen.

### Example

```csharp
private static readonly object A = new();
private static readonly object B = new();

public void First()
{
    lock (A)
    {
        // Simulate work while holding A.
        Thread.Sleep(10);

        // Then attempt B.
        lock (B)
        {
            // Critical section using A + B.
        }
    }
}

public void Second()
{
    lock (B)
    {
        // Simulate work while holding B.
        Thread.Sleep(10);

        // Then attempt A (reverse order of First).
        lock (A)
        {
            // Critical section using B + A.
        }
    }
}
```

Two threads running `First` and `Second` can deadlock because lock ordering is inconsistent.

### How this deadlock forms

1. Thread T1 enters `First`, acquires `A`.
2. Thread T2 enters `Second`, acquires `B`.
3. T1 tries to acquire `B` and blocks (owned by T2).
4. T2 tries to acquire `A` and blocks (owned by T1).
5. Neither thread can continue: classic circular wait.

This example covers all four Coffman conditions in a minimal two-lock scenario.

### Async variant to watch for

Even without explicit `lock`, you can deadlock by blocking on async work in constrained synchronization contexts:

```csharp
// Problematic on UI / legacy ASP.NET synchronization contexts.
var value = GetDataAsync().Result;
```

The continuation needs the same context that is currently blocked by `.Result`.

### Prevention patterns

- **Enforce global lock ordering**: assign a stable order for lock acquisition in all code paths; this breaks circular wait.
- **Use timed acquisition for secondary locks**: `Monitor.TryEnter` or `SemaphoreSlim.WaitAsync` with timeout lets you back off instead of waiting forever.
- **Keep critical sections minimal**: do only shared-state mutation while holding lock; move I/O and long CPU work outside.
- **Avoid sync-over-async**: never use `.Result`/`.Wait()` on async flows where continuations might need the current context.
- **Prefer higher-level coordination**: channels, immutable data, and actor-like ownership reduce nested lock graphs.

## Questions

> [!QUESTION]- Why does lock ordering prevent deadlocks?
> A consistent acquisition order removes circular wait, which breaks one required deadlock condition.

> [!QUESTION]- Can async code deadlock without explicit `lock`?
> Yes. Blocking on async continuations (`.Result`/`.Wait`) under constrained synchronization contexts can create wait cycles.

> [!QUESTION]- What is a practical first response when production shows suspected deadlock?
> Capture process dumps, inspect blocked/waiting stacks, identify owned monitors/semaphores, then enforce ordering or remove blocking boundaries.

## Links

- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
- [Monitor class and synchronization (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-threading-monitor)
- [Async deadlocks and context capture (Stephen Toub)](https://devblogs.microsoft.com/dotnet/await-and-ui-and-deadlocks-oh-my/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken|CancellationToken]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]
<!-- whats-next:end -->
