---
topic:
  - Programming
subtopic:
  - NET
level:
  - "4"
priority: High
status:
  - Creation
dg-publish: true
---

# Intro

A deadlock happens when two or more execution paths wait forever on resources held by each other. In .NET systems, deadlocks appear both in classic lock-based code and in async flows that block on tasks. They are high-severity failures because throughput can drop to zero without obvious crashes.

## Deeper Explanation

Deadlocks require all Coffman conditions:

1. Mutual exclusion: a resource cannot be shared at the same time (for example, a monitor lock), which protects correctness but introduces contention risk.
2. Hold and wait: a thread holds one resource while waiting for another, which is the common trigger in nested locking.
3. No preemption: a resource cannot be forcibly taken and the owner must release it, so blocked threads can wait forever if no timeout or cancellation path exists.
4. Circular wait: the wait graph has a cycle (A waits for B, B waits for A, or longer cycle), and this is usually the easiest condition to break with deterministic lock ordering.

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

**How this deadlock forms:**
1. Thread T1 enters `First`, acquires `A`.
2. Thread T2 enters `Second`, acquires `B`.
3. T1 tries to acquire `B` and blocks (owned by T2).
4. T2 tries to acquire `A` and blocks (owned by T1).
5. Neither thread can continue: classic circular wait.

This example covers all four Coffman conditions in a minimal two-lock scenario.

### Prevention patterns

- TODO

## Questions

- TODO


## Links

- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
- [Monitor class and synchronization (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/fundamentals/runtime-libraries/system-threading-monitor)
- [Async deadlocks and context capture (Stephen Toub)](https://devblogs.microsoft.com/dotnet/await-and-ui-and-deadlocks-oh-my/)
- [Threading in C#: Deadlocks section (Joe Albahari)](https://www.albahari.com/threading/part2.aspx#_Deadlocks)
- [Threading in C#: Locking and Monitor.TryEnter (Joe Albahari)](https://www.albahari.com/threading/part2.aspx#_MonitorEnter_and_MonitorExit)

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
