---
publish: true
created: 2026-07-14T19:14:44.976Z
modified: 2026-07-14T19:14:44.976Z
published: 2026-07-14T19:14:44.976Z
topic:
  - Programming
subtopic:
  - NET
summary: An OS-backed primitive enforcing single-owner access, useful across processes.
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

`Mutex` is an OS-backed synchronization primitive that enforces single-owner access to a critical section. In .NET it is most useful for **cross-process coordination** via named mutexes — for example, ensuring only one instance of a Windows service writes to a shared log file, or preventing concurrent database migrations from two deployment slots. For purely in-process code, `lock` or `SemaphoreSlim` is a better default because they avoid the kernel transition overhead that makes `Mutex` 10-50x slower than `Monitor.Enter` for uncontended acquisitions.

## How It Works

`Mutex` derives from `WaitHandle` (it wraps an OS handle exposed through `SafeWaitHandle`), and has ownership semantics:

- A thread acquires ownership with `WaitOne`.
- Other waiters block until the owner releases it.
- The owning thread must call `ReleaseMutex`.
- Named mutexes can coordinate multiple processes on the same machine; `Global\` / `Local\` prefixes are Windows Terminal Services scope controls, not general cross-platform naming defaults.

**`Mutex` is reentrant (recursive).** The owning thread can call `WaitOne` multiple times without blocking itself — but ownership is reference-counted, so it must call `ReleaseMutex` an equal number of times before another thread can acquire it. This differs from `SemaphoreSlim`, which has no thread affinity and is **not** reentrant (a recursive acquire on a 1-permit semaphore self-deadlocks).

```csharp
using var m = new Mutex();
m.WaitOne();      // count = 1
m.WaitOne();      // count = 2 — same thread, does not block
// ...
m.ReleaseMutex(); // count = 1 — still owned
m.ReleaseMutex(); // count = 0 — now released for other threads
```

### Acquiring multiple handles

Because `Mutex` is a `WaitHandle`, you can acquire several at once with `WaitHandle.WaitAll` (atomic — avoids the lock-ordering deadlocks of nested `WaitOne` calls) or race them with `WaitAny`:

```csharp
var handles = new WaitHandle[] { mutexA, mutexB };
WaitHandle.WaitAll(handles);   // acquire both atomically, no ordering deadlock
// ...
mutexB.ReleaseMutex();
mutexA.ReleaseMutex();
```

> [!WARNING]
> `WaitAll` is not supported on an STA thread (e.g. a WinForms/WPF UI thread) and throws `NotSupportedException` there.

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

- **Kernel transition overhead on hot paths** — `Mutex.WaitOne` is a kernel call that costs 1-5 µs per uncontended acquisition, versus 20-50 ns for `lock` (which uses `Monitor.Enter` with a user-mode spin before escalating). An API endpoint using `Mutex` for in-process synchronization at 10K req/s adds 10-50 ms of cumulative wait time per second. Use `lock` for in-process, `Mutex` only when cross-process is required.
- **Release from wrong thread throws** — calling `ReleaseMutex` from a thread that does not own it throws `ApplicationException`. In async code where continuations can run on different threads, this is a landmine. Keep `WaitOne`/`ReleaseMutex` in the same synchronous method scope; for async patterns, use `SemaphoreSlim.WaitAsync` instead.
- **Abandoned mutex corruption risk** — if the owner thread exits without releasing (crash, `Thread.Abort`, unhandled exception), the next waiter gets `AbandonedMutexException`. This means the protected resource may be in an inconsistent state. Always validate shared state after acquiring an abandoned mutex.
- **Security on shared machines** — named mutexes are not automatically restricted to your process or user context. On Windows, another process can open your named mutex and interfere with coordination. Use `MutexAccessRule`/`MutexSecurity` to restrict access. On Linux, named mutexes use shared memory files with no ACL support — avoid named mutexes on multi-tenant machines.
- **Named-mutex lifetime is not the same across platforms** — on Windows a named mutex is a kernel object that survives as long as a handle is open. On Linux/macOS, .NET backs named mutexes with shared-memory files under `/tmp` (or `TMPDIR`) that are tied to the process/boot lifetime, not kernel-persistent; the `Global\`/`Local\` session prefixes are also Windows-only concepts. Don't assume identical cross-machine semantics — for distributed single-instance guards use a real distributed lock (database row lock, Redis `SETNX`, lease), not a named `Mutex`.

## Tradeoffs

- `Mutex` vs `lock`: mutex supports cross-process coordination, while `lock` is faster and simpler for in-process synchronization.
- `Mutex` vs `Semaphore`: mutex serializes to one owner; semaphore allows bounded parallel entrants.
- `Mutex` vs `SemaphoreSlim`: `SemaphoreSlim` is better for in-process async throttling, but it cannot be named for cross-process locking.

## Questions

> [!QUESTION]- When is a named `Mutex` the right tool in .NET?
> When you need to coordinate access across multiple processes on the same machine (for example single-writer protection for shared file/database artifacts).

> [!QUESTION]- Why is `Mutex` often a poor default for web request hot paths?
> It is OS-backed and blocking, so heavy contention can increase latency. In-process patterns (`lock`, `SemaphoreSlim`, `Channel<T>` — see [[Channels]]) are usually more efficient.

> [!QUESTION]- What does `AbandonedMutexException` signal?
> A previous owner exited without releasing the mutex, which means exclusive ownership was recovered but shared state may be inconsistent and must be validated.

## References

- [Mutex class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.mutex)
- [Overview of synchronization primitives (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/overview-of-synchronization-primitives)
- [Managed threading best practices (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/threading/managed-threading-best-practices)
- [Threading in C#: Event wait handles, mutexes, and semaphores (Joe Albahari)](https://www.albahari.com/threading/part2.aspx)
