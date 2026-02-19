---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/concurrency-and-parallelism/tasks/","noteIcon":"1"}
---


# Intro

`Task` is the core .NET abstraction for asynchronous work. It models eventual completion, result/error propagation, and composition (`WhenAll`, `WhenAny`) without forcing you to manage raw threads. For production systems, understanding `Task` semantics is critical for avoiding deadlocks, thread starvation, and unbounded fan-out.

## How It Works

`Task` represents an operation, not a thread. A task might run on a pooled worker, or it might represent asynchronous I/O that completes later without occupying a worker while waiting. It is the preferred high-level entry point over older ThreadPool APIs for most application code.

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


### Failure aggregation example

```csharp
public async Task SyncAllAsync(CancellationToken cancellationToken)
{
    Task a = _catalog.SyncAsync(cancellationToken);
    Task b = _pricing.SyncAsync(cancellationToken);
    Task c = _inventory.SyncAsync(cancellationToken);

    try
    {
        await Task.WhenAll(a, b, c);
    }
    catch
    {
        // Inspect all faults, not only the first observed one.
        var failures = new[] { a, b, c }
            .Where(t => t.IsFaulted)
            .SelectMany(t => t.Exception!.Flatten().InnerExceptions)
            .ToArray();

        throw new AggregateException("Batch sync failed", failures);
    }
}
```

### Task composition patterns

- `Task.WhenAll`: wait for all operations and aggregate failures.
- `Task.WhenAny`: race multiple operations (first-success / timeout fallback patterns).
- `TaskCompletionSource<T>`: bridge callback/event APIs into task-based APIs.
- `ValueTask`: use only when performance measurements justify it and consumption rules are respected.
- 

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
- [Threading in C#: Task Parallelism (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_Task_Parallelism)
- [Threading in C#: Working with AggregateException (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_Working_with_AggregateException)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Async Await\|Async Await]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken\|CancellationToken]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Mutex\|Mutex]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Semaphore\|Semaphore]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]]
<!-- whats-next:end -->
