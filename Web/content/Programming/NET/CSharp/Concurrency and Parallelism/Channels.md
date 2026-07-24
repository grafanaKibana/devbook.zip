---
publish: true
created: 2026-07-18T14:02:44.105Z
modified: 2026-07-18T14:02:44.106Z
published: 2026-07-18T14:02:44.106Z
topic:
  - Programming
subtopic:
  - NET
summary: Bounded async producer-consumer handoff between threads, with backpressure.
level:
  - "4"
priority: High
status: Creation
---

`Channel<T>` in `System.Threading.Channels` is an in-memory queue for the **Producer-Consumer** pattern: producers hand items to consumers inside one process, and both ends wait asynchronously instead of blocking a thread. Reach for it when work arrives faster than it is processed and the buffer between them needs a _limit_ — an endpoint that returns `202` while a `BackgroundService` renders the upload, or one stage of an ingestion pipeline feeding the next.

# How It Works

`Channel.CreateBounded<T>(capacity)` gives a fixed buffer; `Channel.CreateUnbounded<T>()` one that grows without limit. The channel exposes two façades, `channel.Writer` and `channel.Reader`, so each end can be handed to a different component.

- `WriteAsync` follows the configured full-buffer policy. In the default `Wait` mode, it completes after the item is accepted and suspends the producer on a full channel until space frees up, without parking a thread. In `DropWrite` mode, completion does not prove acceptance: a full buffer can discard the incoming item. **Waiting in `Wait` mode is the backpressure.**
- `TryWrite` returns `false` immediately instead of waiting; `WaitToWriteAsync` awaits capacity, returning `false` once the channel is completed. Looping the two avoids per-item await machinery on hot paths.
- `reader.ReadAllAsync()` returns an `IAsyncEnumerable<T>`, so a consumer is an `await foreach`. Items come out **FIFO** — the ordering [[Programming/NET/CSharp/Concurrency and Parallelism/Semaphore|SemaphoreSlim]] does not guarantee.
- `writer.Complete()` says _no more items_: the reader drains the buffer, `ReadAllAsync` ends the loop, `reader.Completion` completes. Without it the reader cannot know the stream ended.

`BoundedChannelFullMode`, fixed at construction, is the entire backpressure decision:

| Mode | When the buffer is full |
|---|---|
| `Wait` (default) | Producer awaits; pressure propagates upstream |
| `DropWrite` | The incoming item is discarded |
| `DropOldest` | The oldest buffered item is evicted |
| `DropNewest` | The newest buffered item is evicted |

Either you slow the producer or you throw data away; choosing a capacity is choosing which. `SingleReader`/`SingleWriter` are promises about how many threads touch each end — the channel takes a cheaper path when you make them, and breaks when you lie.

## Blocking, lock-free, starvation-free, and wait-free progress

API waiting and implementation progress answer different questions. On a full bounded channel, `WriteAsync` deliberately suspends until capacity exists: that is backpressure, even though no thread is blocked. `TryWrite` reports the admission decision immediately, but `false` means only _not accepted now_; it does not define the channel as formally non-blocking.

A lock-free queue can update its head or tail with compare-and-swap (CAS). When two threads race, one wins and the other retries. Lock-free means the system as a whole keeps completing operations despite those retries; it does not guarantee that a particular thread wins. Starvation-free means every contender eventually makes progress. Wait-free is stronger again: every operation finishes within a bounded number of its own steps.

`Channel<T>` exposes waiting and drop semantics, not a wait-free guarantee. Its progress properties depend on the runtime implementation and the options used. Treat bounded capacity as an overload contract, and use the formal progress terms only when the chosen data structure documents them.

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
            catch (Exception ex) // an escaping exception kills the pump
            {
                logger.LogError(ex, "Thumbnail failed for {Path}", job.BlobPath);
            }
        }
    }
}
```

# Pitfalls

- **Unbounded is a memory leak with extra steps** — `CreateUnbounded` applies no backpressure; writes always succeed. A consumer that falls behind grows the buffer until the process OOMs. Use it only when something else already rate-limits the producer.
- **No `writer.Complete()`, no end** — `ReadAllAsync` waits for an item or for completion, so the consumer loop and any shutdown awaiting `reader.Completion` hang forever. Complete the writer in `StopAsync`, or a `finally` around production.
- **`BlockingCollection<T>` parks a ThreadPool thread** — `Take()`/`Add()` block the caller, so in async code the thread sits doing nothing. Enough of them and thread-pool starvation shows up as latency on _every_ endpoint, not just this one.
- **Drop modes lose data silently** — under `DropOldest`/`DropWrite`, `TryWrite` still returns `true`. Nothing throws, nothing logs. Fine for sampled telemetry; wrong for payment events. Pick one on purpose, and count the drops.

# Tradeoffs

| Option | Full buffer | Blocks the caller | Async API | FIFO |
|---|---|---|---|---|
| `lock` + `Queue<T>` | Grows unbounded | Inside the lock | No | Yes, but you build the waiting |
| `ConcurrentQueue<T>` | Grows unbounded | No | No — consumers poll | Yes |
| `BlockingCollection<T>` | Producer blocks the thread | Yes | No | Yes |
| `Channel<T>` | Producer awaits, or a drop policy fires | No — it awaits | Yes | Yes |

**Use a bounded `Channel<T>`** for in-process producer-consumer in async code: it alone has an asynchronous wait, an explicit full-buffer policy, and no parked thread.

What flips it: `ConcurrentQueue<T>` when nobody waits — the consumer runs on a timer and an empty queue just means nothing to do. `BlockingCollection<T>` when the consumer is a dedicated long-running `Thread` and blocking it is the point. `lock` + `Queue<T>` when you must inspect or mutate queued items (dedupe, reprioritise), because `Channel<T>` never exposes its buffer. If the work must survive a crash, none of the four qualify: the buffer dies with the process, so use a durable broker.

# Questions

> [!QUESTION]- What does a bounded `Channel<T>` give you that `SemaphoreSlim` does not?
> FIFO ordering and a buffer. `SemaphoreSlim` throttles concurrent entrants with no fairness guarantee; a channel queues the work, hands it out in arrival order, and pushes back on producers when full.

> [!QUESTION]- Why is `Channel.CreateUnbounded<T>()` a risky default?
> It removes backpressure. Writes always succeed, so a consumer that falls behind causes unbounded memory growth. A capacity forces you to decide what happens under overload.

> [!QUESTION]- When is `BoundedChannelFullMode.DropOldest` acceptable?
> When newer data supersedes older and losing items is cheaper than stalling the producer: live metrics, a progress feed, sensor samples. Never for events with business meaning, and always with a counter on the drops.

# References

- [System.Threading.Channels namespace (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels) — the API surface, including every `BoundedChannelFullMode` value.
- [An Introduction to System.Threading.Channels (.NET Blog)](https://devblogs.microsoft.com/dotnet/an-introduction-to-system-threading-channels/) — design rationale for the writer/reader split and the `SingleReader`/`SingleWriter` fast paths.
- [Thread-safe collections (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/collections/thread-safe/) — `ConcurrentQueue<T>` and `BlockingCollection<T>`, and the blocking behaviour that rules the latter out of async code.
- [Threading in C#: Parallel programming (Joe Albahari)](https://www.albahari.com/threading/part5.aspx) — the classic `BlockingCollection<T>` producer-consumer walkthrough that channels replaced.
- [Blocking vs. non-blocking queue (ByteByteGo, pinned source)](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/blocking-vs-non-blocking-queue.md) — editorial comparison of waiting and progress terminology; its diagram conflates admission behavior with formal progress guarantees, so it is not reproduced here.
