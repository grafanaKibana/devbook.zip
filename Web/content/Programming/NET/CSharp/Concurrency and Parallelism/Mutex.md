---
publish: true
created: 2026-08-20T20:41:15.652Z
modified: 2026-08-20T20:41:15.652Z
published: 2026-08-20T20:41:15.652Z
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

`Mutex` gives one thread ownership of an operating-system synchronization object. Its useful boundary is the process boundary: a named mutex can keep two local processes from entering the same critical section. Inside one process, `lock` or `SemaphoreSlim` is usually smaller and cheaper.

# How It Works

`Mutex` derives from `WaitHandle` and wraps a native handle exposed through `SafeWaitHandle`. Unlike a semaphore, it tracks an owning thread:

- A thread acquires ownership with `WaitOne`.
- Other waiters block until the owner releases it.
- The owning thread must call `ReleaseMutex`.
- Named mutexes can coordinate processes on one machine. The `Global\` and `Local\` prefixes describe Windows Terminal Services scope. They are not portable naming conventions.

**`Mutex` is reentrant.** The owning thread can call `WaitOne` again without blocking, but every successful wait increments a recursion count. Another thread cannot acquire the mutex until the owner has called `ReleaseMutex` the same number of times. `SemaphoreSlim` has no thread ownership and no reentrancy. A nested wait on its only permit blocks itself.

```csharp
using var m = new Mutex();
m.WaitOne();      // count = 1
m.WaitOne();      // count = 2 — same thread, does not block
// ...
m.ReleaseMutex(); // count = 1 — still owned
m.ReleaseMutex(); // count = 0 — now released for other threads
```

## Acquiring Multiple Handles

The `WaitHandle` base type allows several handles to be considered together. `WaitAll` waits for the full set and avoids holding one mutex while sequentially waiting for the next. `WaitAny` returns when one handle becomes available. Abandonment still needs explicit handling: `AbandonedMutexException` can report that a mutex was abandoned while granting ownership of the mutex handles.

```csharp
var handles = new WaitHandle[] { mutexA, mutexB };
WaitHandle.WaitAll(handles);   // wait for the set without partial sequential ownership
// ...
mutexB.ReleaseMutex();
mutexA.ReleaseMutex();
```

> [!WARNING]
> `WaitAll` is unsupported on an STA thread, including the usual WinForms and WPF UI threads, and throws `NotSupportedException` there.

# Example

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

# Pitfalls

- **The operating-system path is expensive on a hot in-process lock.** A monitor can complete uncontended acquisition in user mode, while `Mutex.WaitOne` crosses the native wait-handle boundary. That cost buys cross-process coordination. Without that requirement it is wasted.
- **The wrong thread cannot release ownership.** `ReleaseMutex` from a non-owner throws `ApplicationException`. Because an async continuation may move threads, acquisition and release belong in the same synchronous scope. Async in-process code normally uses `SemaphoreSlim.WaitAsync`.
- **Abandonment transfers ownership, not correctness.** If the owner exits before release, the next waiter receives `AbandonedMutexException` and owns the mutex. The protected file or memory-mapped state may still be inconsistent and must be checked before use.
- **A shared name is also a security boundary.** Other processes may be able to open or create the same named object. Windows deployments can apply `MutexSecurity`. Other platforms have different backing and permission rules. The deployment needs an explicit threat model rather than assuming process isolation.
- **Platform behavior is not identical.** Naming scope, backing storage, and lifetime differ across operating systems. A named mutex coordinates local processes, not machines. Distributed ownership needs a lease or lock managed by the shared database or service.

# Tradeoffs

- `Mutex` crosses a process boundary. `lock` stays in-process and avoids the native handle cost.
- A mutex has one thread owner. A semaphore represents a count and may admit several callers.
- `SemaphoreSlim` supports asynchronous in-process waiting but cannot be named for process-to-process coordination.

The decision follows the ownership boundary. A [[Locking|lock]] covers synchronous state inside one process. `Mutex` earns its native cost when separate local processes need one owner. Neither primitive can establish ownership across machines.

# Questions

> [!QUESTION]- When is a named `Mutex` appropriate in .NET?
> A named `Mutex` fits mutual exclusion between processes on the same machine, for example a single-instance application or several processes writing the same local file. The thread that acquires it owns it and must release it. For coordination inside one process, `lock` is usually lighter; for distributed coordination across machines, a named mutex is not enough.

> [!QUESTION]- What does `AbandonedMutexException` signal?
> It means the previous owning thread ended without releasing the mutex. The waiting thread receives the exception but also acquires the mutex, so it must treat the protected state as possibly incomplete or corrupted. Recovery may require validating or rebuilding that state before the mutex is released in a `finally` block.

# References

- [Mutex class](https://learn.microsoft.com/en-us/dotnet/api/system.threading.mutex)
