---
publish: true
created: 2026-08-20T20:41:15.649Z
modified: 2026-08-20T20:41:15.650Z
published: 2026-08-20T20:41:15.650Z
topic:
  - Programming
subtopic:
  - NET
summary: Bounded async producer-consumer handoff with explicit backpressure.
level:
  - "4"
priority: High
status: Creation
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

`Channel<T>` documents waiting and drop behavior, not a wait-free guarantee. Treat capacity as the overload contract. Formal progress claims belong only where the chosen implementation documents them.

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

Use a bounded `Channel<T>` for asynchronous producer-consumer work that belongs to one process. It combines an async wait with a fixed overload policy.

`ConcurrentQueue<T>` is enough when consumers poll on their own schedule. `BlockingCollection<T>` fits a dedicated synchronous thread where blocking is intentional. A locked `Queue<T>` earns its extra code when the buffer itself must support deduplication or reprioritization. If work must survive a crash, none of these structures qualify. That requires durable storage or a broker.

# Questions

> [!QUESTION]- What does a bounded `Channel<T>` provide that `SemaphoreSlim` does not?
> A bounded channel stores queued work and lets producers wait asynchronously when the buffer is full. Consumers receive items in accepted FIFO order. `SemaphoreSlim` only limits how many callers may enter at once; it does not store work and provides no fairness guarantee. A channel therefore fits producer-consumer handoff, while a semaphore fits throttling access to an operation.

> [!QUESTION]- Why is `Channel.CreateUnbounded<T>()` a risky default?
> An unbounded channel never slows a producer because of capacity. If producers stay faster than consumers, queued items keep accumulating and memory use can grow until the process is under pressure. A bounded channel forces an overload policy: either producers wait for space or the channel drops items according to an explicit rule.

> [!QUESTION]- When is `BoundedChannelFullMode.DropOldest` a reasonable policy?
> It is reasonable when the newest value replaces older state, such as a progress update or sampled metric. When the buffer is full, the oldest queued value is discarded so a newer one can be accepted, and that loss should be observable. It is not suitable when every item represents separate work or a business obligation that must be processed.

# References

- [System.Threading.Channels API](https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels)
- [An introduction to System.Threading.Channels](https://devblogs.microsoft.com/dotnet/an-introduction-to-system-threading-channels/)
