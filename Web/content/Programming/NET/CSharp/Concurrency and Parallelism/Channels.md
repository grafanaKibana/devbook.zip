---
publish: true
created: 2026-10-28T12:27:02.938Z
modified: 2026-10-28T12:33:02.654Z
published: 2026-10-28T12:33:02.654Z
topic:
  - Programming
subtopic:
  - NET
summary: Bounded async producer-consumer handoff with explicit backpressure.
level:
  - "4"
priority: High
status: Creation
qard-deck: Programming
qard-topic: NET/CSharp/Concurrency and Parallelism/Channels
flashcard_uid: a3dbcc37
---

`Channel<T>` is an in-memory handoff between producers and consumers. Both sides can wait asynchronously, and a bounded channel makes overload behavior explicit. One common shape is an HTTP endpoint that queues a thumbnail job while a `BackgroundService` drains the work.

The boundary matters: a channel lives inside one process. It provides no crash recovery, cross-host delivery, or durable retry history.

# How It Works

`Channel.CreateBounded<T>(capacity)` creates a fixed buffer. `Channel.CreateUnbounded<T>()` can keep growing. The channel exposes `Writer` and `Reader` ends, which lets ownership follow the data flow instead of exposing the whole queue to every component.

- `WriteAsync` follows the configured full-buffer policy. In the default `Wait` mode, it suspends a producer until space becomes available, without parking a thread. With a drop policy, successful completion does not mean the item remained in the buffer. **The wait in `Wait` mode is the backpressure.**
- `TryWrite` returns `false` immediately when the channel is completed. In `Wait` mode it also returns `false` while a full buffer cannot accept the item. `WaitToWriteAsync` awaits capacity only in `Wait` mode and returns `false` after completion. Drop modes do not wait for capacity: the API accepts the write while the configured policy drops an item. Looping `TryWrite` with `WaitToWriteAsync` avoids per-item await machinery on hot `Wait`-mode paths.
- `reader.ReadAllAsync()` returns an `IAsyncEnumerable<T>`, so a consumer can use `await foreach`. Items are read in FIFO order, unlike admission through [[Programming/NET/CSharp/Concurrency and Parallelism/Semaphore|SemaphoreSlim]]. Multiple consumers can still finish their work out of order.
- `writer.Complete()` closes the input side. Readers drain buffered items, `ReadAllAsync` ends, and `reader.Completion` reaches its terminal state. Without completion, an empty channel still means "more may arrive."

`BoundedChannelFullMode`, fixed at construction, is the entire backpressure decision:

| Mode | When the buffer is full |
|---|---|
| `Wait` (default) | Producer awaits. Pressure propagates upstream |
| `DropWrite` | The incoming item is discarded; buffered items remain |
| `DropOldest` | The oldest buffered item is evicted; the incoming item is admitted |
| `DropNewest` | The newest item already buffered is evicted; the incoming item is admitted |

A full bounded buffer must either slow producers or discard data. The selected mode makes that decision once, at construction. `SingleReader` and `SingleWriter` are concurrency contracts that enable cheaper internal paths, so they must match actual usage.

## Blocking, Lock-free, Starvation-free, and Wait-free Progress

API waiting and formal progress guarantees answer different questions. On a full bounded channel, `WriteAsync` deliberately suspends until capacity exists. No thread is parked, but the operation still waits. `TryWrite` reports an admission decision immediately. A `false` result says only that the item was not accepted now.

A lock-free queue may update its head or tail with compare-and-swap. Under contention, one operation succeeds while another retries. Lock-free progress guarantees movement for the system as a whole, not for each specific caller. Starvation freedom covers each contender. Wait freedom goes further and bounds the number of steps for every operation.

`Channel<T>` documents waiting and drop behavior, not a wait-free guarantee. Capacity is the overload contract. Formal progress claims belong only where the chosen implementation documents them.

# Example

```csharp
builder.Services.AddSingleton(_ => Channel.CreateBounded<ThumbnailJob>(
    new BoundedChannelOptions(capacity: 100)
    {
        FullMode = BoundedChannelFullMode.Wait,
        SingleReader = true,   // one BackgroundService drains it
        SingleWriter = false   // many concurrent requests write
    }));
builder.Services.AddHostedService<ThumbnailWorker>();

app.MapPost("/thumbnails", async (
    ThumbnailJob job, Channel<ThumbnailJob> channel, CancellationToken ct) =>
{
    // With 100 buffered, this waits asynchronously until the worker takes one out.
    // The request gets slower; the queue does not grow.
    await channel.Writer.WriteAsync(job, ct);
    return Results.Accepted();
});
```

```csharp
public sealed class ThumbnailWorker(
    Channel<ThumbnailJob> channel,
    ILogger<ThumbnailWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var job in channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await RenderAsync(job, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex) // an escaping exception kills the pump
            {
                logger.LogError(ex, "Thumbnail failed for {Path}", job.BlobPath);
            }
        }
    }
}
```

# Pitfalls

- **Unbounded growth hides overload.** `CreateUnbounded` applies no backpressure. If production stays faster than consumption, memory usage keeps climbing.
- **No `writer.Complete()`, no end.** `ReadAllAsync` cannot distinguish an idle writer from a finished writer. Shutdown needs one owner that completes the channel after the last write.
- **`BlockingCollection<T>` parks a thread.** Its blocking `Take` and `Add` APIs are reasonable for dedicated synchronous workers, but they waste pool threads in an asynchronous pipeline.
- **Drop modes make loss part of normal operation.** A write can complete while the configured policy discards an item. That fits sampled telemetry and is a bad contract for business events unless loss is explicit and measured.

# Tradeoffs

| Option | Full buffer | Blocks the caller | Async API | FIFO |
|---|---|---|---|---|
| `lock` + `Queue<T>` | Grows unbounded | Inside the lock | No | Yes; waiting must be implemented separately |
| `ConcurrentQueue<T>` | Grows unbounded | No | No — consumers poll | Yes |
| `BlockingCollection<T>` | Producer blocks the thread | Yes | No | Yes |
| `Channel<T>` | Producer awaits, or a drop policy fires | No — it awaits | Yes | Yes |

A bounded `Channel<T>` fits asynchronous producer-consumer work that belongs to one process. It combines an async wait with a fixed overload policy.

`ConcurrentQueue<T>` is enough when consumers poll on their own schedule. `BlockingCollection<T>` fits a dedicated synchronous thread where blocking is intentional. A locked `Queue<T>` earns its extra code when the buffer itself must support deduplication or reprioritization. If work must survive a crash, none of these structures qualify. That requires durable storage or a broker.

# Questions

<!-- qard-id: a09669e4-9708-4a01-a2a2-f26c9e01c72f -->

> [!qard]- What is a `Channel<T>`, and what reliability does it provide?
> `Channel<T>` is an in-process, in-memory queue that hands items from producers to consumers, with asynchronous waiting on both sides. Its reliability ends at the process boundary. Queued items are not persisted, so a crash loses them, and code on other hosts cannot read them.
>
> How it works:
>
> - **Writer and reader:** producers write through `channel.Writer`, for example with `WriteAsync`. Consumers read through `channel.Reader`, often with `await foreach` over `ReadAllAsync()`. A reader waiting on an empty channel, or a writer waiting on a full bounded channel, waits without blocking a thread.
> - **Capacity:** `Channel.CreateBounded<T>(capacity)` has a fixed buffer and a full-mode policy that either makes producers wait or drops an item. `Channel.CreateUnbounded<T>()` keeps growing.
> - **Completion:** `Writer.Complete()` signals that no more items will arrive, so readers drain the buffer and their read loop ends.
>
> A typical use is an HTTP endpoint that queues a job while a `BackgroundService` in the same process handles it.
>
> Reliability limits:
>
> - **No persistence:** buffered items exist only in that process's memory and are lost if it crashes.
> - **No cross-host delivery:** only code inside the same process can read the channel.
> - **No durable retry:** reading an item removes it from the channel, and nothing redelivers it if processing then fails.
>
> Work that must survive a crash or be retried durably needs a database, message broker or other persistent store.
>
> [Microsoft: Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels) · [Microsoft: Queued background tasks](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services?view=aspnetcore-10.0)

<!-- qard-id: ea5e2167-2696-4823-be5c-605359a6f69b -->

> [!qard]- What does a bounded `Channel<T>` provide that `SemaphoreSlim` does not?
> A bounded `Channel<T>` stores the work itself and hands it to separate consumers, using a fixed buffer and an overload policy. `SemaphoreSlim` stores no work. It only counts permits, which limits how many callers run an operation at the same time.
>
> | Aspect | Bounded `Channel<T>` | `SemaphoreSlim` |
> |---|---|---|
> | What it holds | Up to `capacity` queued items | Only a count of free permits |
> | Who does the work | A producer writes an item and continues; a consumer reads and processes it later | The caller that gets a permit runs the operation itself, then releases the permit |
> | At the limit | In `Wait` mode, `WriteAsync` waits for buffer space, which slows producers; drop modes discard an item instead | `WaitAsync` waits for a permit; nothing is stored or dropped |
> | Order | Items are read in the order they were queued; with several consumers, they can finish in a different order | Waiting callers have no guaranteed order, such as FIFO, for receiving permits |
>
> A channel therefore fits producer-consumer handoff, such as a request queuing a job for a background worker. A semaphore fits admission control, such as capping concurrent calls to a dependency.
>
> [Microsoft: Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels) · [SemaphoreSlim API](https://learn.microsoft.com/en-us/dotnet/api/system.threading.semaphoreslim?view=net-10.0)

<!-- qard-id: 5eab3f2c-b214-40c6-88e8-067ae43706e4 -->

> [!qard]- Why is `Channel.CreateUnbounded<T>()` a risky default?
> An unbounded channel does not apply capacity backpressure. If producers continue to outpace consumers, queued items accumulate and consume memory until the process is pressured. A bounded channel forces an explicit overload choice: wait for capacity or drop according to a chosen policy. [Microsoft: Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)

<!-- qard-id: 2de35e05-694b-4701-b1f5-0edd419f02bd -->

> [!qard]- When is `BoundedChannelFullMode.DropOldest` a reasonable policy?
> `DropOldest` is reasonable when each newer item makes older buffered items obsolete, so only the latest values matter. Examples are progress snapshots, current status updates and sampled metrics.
>
> When the buffer is full, the channel removes the oldest buffered item and accepts the incoming one. The write still succeeds, so the producer is not slowed, and the write result does not report the discard; only an `itemDropped` callback, when configured for the channel, signals that an item was discarded. Losing a stale snapshot is harmless when a newer one is already queued, but counting or logging drops keeps unexpected loss visible.
>
> It is the wrong policy for independent jobs, commands or business events that must each be processed. Dropping one of those silently loses work. The default `Wait` mode instead makes producers wait for space and discards nothing.
>
> [Microsoft: Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)

# References

- [System.Threading.Channels API](https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels)
- [An introduction to System.Threading.Channels](https://devblogs.microsoft.com/dotnet/an-introduction-to-system-threading-channels/)
