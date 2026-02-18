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

`Task` is the core .NET abstraction for asynchronous work. It models eventual completion, result/error propagation, and composition (`WhenAll`, `WhenAny`) without forcing you to manage raw threads. For production systems, understanding `Task` semantics is critical for avoiding deadlocks, thread starvation, and unbounded fan-out.

## Example

```csharp
public async Task<IReadOnlyList<UserDto>> LoadUsersAsync(
    IEnumerable<int> ids,
    CancellationToken cancellationToken)
{
    var tasks = ids.Select(id => _client.GetUserAsync(id, cancellationToken));
    var users = await Task.WhenAll(tasks);
    return users;
}
```

This pattern gives structured concurrency: one parent operation owns all child tasks and observes all failures.

### Task composition patterns

- `Task.WhenAll`: wait for all operations and aggregate failures.
- `Task.WhenAny`: race multiple operations (first-success / timeout fallback patterns).
- `TaskCompletionSource<T>`: bridge callback/event APIs into task-based APIs.
- `ValueTask`: use only when performance measurements justify it and consumption rules are respected.

## Pitfalls

- Using `.Result`/`.Wait()` inside async flows can deadlock and block pool threads.
- Wrapping naturally async I/O in `Task.Run` adds scheduling overhead without benefit.
- Fire-and-forget tasks hide failures unless explicitly observed/logged.
- Starting thousands of tasks without throttling can saturate dependencies.


## Questions

> [!QUESTION]- Why is `Task` not equivalent to a thread?
> `Task` models completion and scheduling, while threads are execution resources. Many async tasks complete I/O without holding a thread during waiting.

> [!QUESTION]- When should `Task.Run` be used in ASP.NET Core?
> Rarely for request I/O. Mostly for CPU-bound work that must be isolated from the request thread, ideally with bounded concurrency.

> [!QUESTION]- Why is `Task.WhenAll` usually better than sequential `await` in independent calls?
> It allows overlap of independent waits, reducing total latency and preserving structured error aggregation.

## Links

- [Task class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task)
- [Task.WhenAll documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.task.whenall)
- [Async guidance by Stephen Cleary](https://blog.stephencleary.com/2013/11/there-is-no-thread.html)

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
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool|ThreadPool]]
<!-- whats-next:end -->
