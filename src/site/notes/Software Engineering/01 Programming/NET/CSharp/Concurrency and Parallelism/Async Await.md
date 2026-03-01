---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/c-sharp/concurrency-and-parallelism/async-await/"}
---

# Intro

`async` and `await` are .NET's default model for non-blocking I/O. The goal is responsiveness and scalability: while code waits on network, disk, or database I/O, the thread is released so it can do other work. This is why async code keeps UIs responsive and helps servers handle more concurrent requests.

The most important mental model is that async is not the same as "run on another thread". In many cases, no thread is actively executing your method while an awaited I/O operation is in flight.

## How It Works

An `async` method is compiled into a state machine. Each `await` can split execution into two phases:

1. Run synchronously until the first incomplete awaitable.
2. Register a continuation and return control to the caller.
3. Resume later when the awaited operation completes.

This is why `await` differs from `Task.Result` and `Task.Wait()`:

- `await` is non-blocking for the current thread.
- `Result`/`Wait()` block the current thread and can cause deadlocks under a synchronization context.
- 

## Example

```csharp
public async Task<OrderDto?> LoadOrderAsync(
    int id,
    CancellationToken cancellationToken)
{
    using var response = await _httpClient.GetAsync(
        $"orders/{id}",
        cancellationToken);

    response.EnsureSuccessStatusCode();

    return await response.Content.ReadFromJsonAsync<OrderDto>(
        cancellationToken: cancellationToken);
}
```

The method does not hold a thread while waiting on network I/O. The continuation runs only when the response is available.


## Questions

> [!QUESTION]- How is asynchrony different from multithreading?
> Asynchrony is about not blocking while waiting (especially for I/O). An `async` method can release the current thread while awaiting, and continue later.
> Multithreading is about executing work on multiple threads concurrently (for example, for parallel CPU-bound work). Async code can be single-threaded and still be asynchronous.

> [!QUESTION]- What is the difference between `Thread` and `Task`?
> `Thread` is an OS thread you manage directly (heavier, dedicated execution).
> `Task` is a higher-level abstraction representing an asynchronous operation or a unit of work, typically scheduled on the thread pool (and for I/O it may not require a dedicated thread while waiting).

> [!QUESTION]- What is the difference between `await` and `Task.Result`?
> `await` waits asynchronously: it does not block the current thread and it unwraps exceptions.
> `Task.Result` waits synchronously: it blocks the current thread, can cause deadlocks under a `SynchronizationContext` (UI / legacy ASP.NET), and wraps exceptions in `AggregateException`.

> [!QUESTION]- If async does not always use extra threads, why does it improve scalability?
> Because waiting time is no longer paid by tying up worker threads. Released threads can process other requests while I/O is pending.

> [!QUESTION]- When should you use `Task.Run` with async code?
> Mostly for CPU-bound work that you intentionally offload. Do not use it to wrap already-async I/O APIs.

## Links

- [Threading in C#: Thread Pooling and TPL context (Joe Albahari)](https://www.albahari.com/threading/)
- [Threading in C#: Task Parallelism and task exceptions (Joe Albahari)](https://www.albahari.com/threading/part5.aspx#_Task_Parallelism)
- [Async programming scenarios (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/async-scenarios)
- [Await, UI, and deadlocks (Stephen Toub)](https://devblogs.microsoft.com/dotnet/await-and-ui-and-deadlocks-oh-my/)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/CSharp/CSharp\|CSharp]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/CancellationToken\|CancellationToken]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Deadlocks\|Deadlocks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Mutex\|Mutex]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Parallelism\|Parallelism]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Semaphore\|Semaphore]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/Tasks\|Tasks]]
> - [[Software Engineering/01 Programming/NET/CSharp/Concurrency and Parallelism/ThreadPool\|ThreadPool]]
<!-- whats-next:end -->
