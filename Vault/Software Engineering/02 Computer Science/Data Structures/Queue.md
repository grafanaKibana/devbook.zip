---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Ready To Repeat
dg-publish: true
---

# Intro

`Queue<T>` is a FIFO (first in, first out) collection. The earliest enqueued item is processed first. Use it for buffering, breadth-first traversal, and producer-consumer style pipelines.

`Queue<T>` is implemented as a circular buffer in .NET:

- `Enqueue` adds at the tail; `Dequeue` removes from the head.
- Head/tail indices wrap around instead of shifting elements.
- Operations are O(1) on average, with occasional O(n) resize copies.

### Example

```csharp
var jobs = new Queue<string>();
jobs.Enqueue("job-1");
jobs.Enqueue("job-2");

Console.WriteLine(jobs.Dequeue()); // job-1
Console.WriteLine(jobs.Peek());    // job-2
```

### Pitfalls

- `Dequeue`/`Peek` on an empty queue throws `InvalidOperationException`. Guard with `Count` when queue emptiness is expected.
- Using a queue where priority matters can delay urgent work. Switch to `PriorityQueue<TElement, TPriority>` when ordering by priority is required.
- Unbounded enqueues can grow memory silently in bursty systems. Apply backpressure or capacity policies at architecture boundaries.

### Tradeoffs

- `Queue<T>` vs `Stack<T>`: queue preserves arrival order, stack prioritizes newest items.
- `Queue<T>` vs `Channel<T>`: queue is simple in-memory buffering, channels provide richer async coordination for concurrent producers/consumers.

## Questions

> [!QUESTION]- Why is `Queue<T>` suitable for BFS?
> BFS processes nodes in discovery order by levels. FIFO behavior naturally enforces this traversal order.

> [!QUESTION]- When should you replace `Queue<T>` with `PriorityQueue<TElement, TPriority>`?
> When business correctness depends on priority rather than arrival time, such as shortest-path, scheduler, or SLA-driven dispatching.

> [!QUESTION]- Why can a queue become a production reliability problem even if operations are O(1)?
> Complexity is not the only risk. If producers outpace consumers, memory grows and latency spikes. Throughput and backpressure design matter more than method complexity.

## Links

- [Queue<T> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1)
- [PriorityQueue<TElement, TPriority> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2)
- [Collections in .NET](https://learn.microsoft.com/en-us/dotnet/standard/collections/)
- [System.Threading.Channels library](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)
- [Why are Stack<T> and Queue<T> array-backed?](https://stackoverflow.com/questions/3000410/why-are-stackt-and-queuet-implemented-with-an-array)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/02 Computer Science|02 Computer Science]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Data Structures/Dictionary|Dictionary]]
> - [[Software Engineering/02 Computer Science/Data Structures/Graph|Graph]]
> - [[Software Engineering/02 Computer Science/Data Structures/HashSet|HashSet]]
> - [[Software Engineering/02 Computer Science/Data Structures/Hashtable|Hashtable]]
> - [[Software Engineering/02 Computer Science/Data Structures/LinkedList|LinkedList]]
> - [[Software Engineering/02 Computer Science/Data Structures/List|List]]
> - [[Software Engineering/02 Computer Science/Data Structures/Span|Span]]
> - [[Software Engineering/02 Computer Science/Data Structures/Stack|Stack]]
> - [[Software Engineering/02 Computer Science/Data Structures/Trees|Trees]]
<!-- whats-next:end -->
