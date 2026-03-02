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

`Mutex` is an OS-backed synchronization primitive that enforces single-owner access to a critical section. In .NET it is most useful when synchronization must work across process boundaries (named mutex). For purely in-process code, `lock` or `SemaphoreSlim` is usually a better default.

## How It Works

`Mutex` has ownership semantics:

- A thread acquires ownership with `WaitOne`.
- Other waiters block until the owner releases it.
- The owning thread must call `ReleaseMutex`.
- Named mutexes can coordinate multiple processes on the same machine; `Global\` / `Local\` prefixes are Windows Terminal Services scope controls, not general cross-platform naming defaults.

## Example

```csharp
using var mutex = new Mutex(initiallyOwned: false, name: "MyApp.SingleWriter");

if (!mutex.WaitOne(TimeSpan.FromSeconds(1)))
{
    return;
}

try
{
    WriteSharedFile();
}
finally
{
    mutex.ReleaseMutex();
}
```

Single-instance application guard using a global mutex:

```csharp
// Global\ prefix makes the mutex visible across all Terminal Services sessions on Windows
const string MutexName = @"Global\MyApp.SingleInstance";
using var mutex = new Mutex(initiallyOwned: false, name: MutexName, createdNew: out bool created);

if (!mutex.WaitOne(0)) // non-blocking check
{
    Console.Error.WriteLine("Another instance is already running.");
    return;
}
try
{
    RunApplication();
}
finally
{
    mutex.ReleaseMutex();
}
```

## Pitfalls

- Using `Mutex` for simple in-process locks adds kernel transition overhead and can degrade throughput. Prefer `lock` for short synchronous in-process sections.
- Calling `ReleaseMutex` from a thread that does not own it throws and can destabilize control flow. Keep ownership scope explicit (`WaitOne`/`ReleaseMutex` in same method block).
- Abandoned mutexes (owner thread exits unexpectedly) can surface as `AbandonedMutexException`. Treat it as a consistency warning and validate shared state before continuing.
- Named mutexes are not automatically restricted to your process/user context, which can become a security or interference risk on shared machines. Use appropriate access-control settings on Windows (`MutexSecurity`/`MutexAcl`); on Unix-like systems there is currently no way to restrict access to a named mutex, so avoid named mutexes on machines with untrusted users.

## Tradeoffs

- `Mutex` vs `lock`: mutex supports cross-process coordination, while `lock` is faster and simpler for in-process synchronization.
- `Mutex` vs `Semaphore`: mutex serializes to one owner; semaphore allows bounded parallel entrants.
- `Mutex` vs `SemaphoreSlim`: `SemaphoreSlim` is better for in-process async throttling, but it cannot be named for cross-process locking.

## Questions

> [!QUESTION]- When is a named `Mutex` the right tool in .NET?
> When you need to coordinate access across multiple processes on the same machine (for example single-writer protection for shared file/database artifacts).

> [!QUESTION]- Why is `Mutex` often a poor default for web request hot paths?
> It is OS-backed and blocking, so heavy contention can increase latency. In-process patterns (`lock`, `SemaphoreSlim`, `Channel<T>`) are usually more efficient.

> [!QUESTION]- What does `AbandonedMutexException` signal?
> A previous owner exited without releasing the mutex, which means exclusive ownership was recovered but shared state may be inconsistent and must be validated.

## Links

- [Mutex class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.mutex)
- [Overview of synchronization primitives (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives)
- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
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
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Semaphore|Semaphore]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]
<!-- whats-next:end -->
