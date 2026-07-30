---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A FIFO collection where the earliest enqueued item is processed first, used for buffering, BFS, and pipelines."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

A service accepts jobs faster than a single worker drains them, and fairness requires that the earliest arrival is served first. Storing arrivals in a plain array and always removing index `0` re-shifts every remaining element on each removal — an `O(n)` cost that grows with the backlog. A queue keeps the same arrival order while making dequeue `O(1)` and enqueue amortized `O(1)`: new items enter at the back, the oldest leaves from the front, and nothing in between moves. A growable array-backed queue occasionally pays `O(n)` to resize.

The structure records only order of arrival. It cannot reach the middle by position, and it cannot promote an urgent item ahead of an older one — retrieval by priority needs [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|a priority queue]], not a FIFO queue. What it retains is exactly the front-to-back sequence and nothing more.

**Core shape:** enqueue at the back in amortized `O(1)` → dequeue from the front in `O(1)` → first in, first out → occasional `O(n)` resize → `O(n)` storage.

The interactive view isolates circular wraparound and fixed-capacity full behavior; the growable resize remains explained in the prose below.

```steptrace
{"algorithm":"queue"}
```

# Representation and Invariants

Two competing physical layouts back the same FIFO contract.

A [[Home/Computer Science/Data Structures/Linear Structures/Circular Buffer|circular buffer]] stores elements in a fixed backing array with separate `head` and `tail` indices. Enqueue writes at `tail`, dequeue reads from `head`, and each index advances modulo the array length. The live region therefore wraps past the array end back to index `0` instead of shifting elements downward. This is what avoids the naive `O(n)` shift: removing from the front is a single `head` increment, not a copy of everything behind it. The wrap arithmetic and the empty-versus-full ambiguity it introduces — a `head == tail` that could mean either state — are the concern of [[Home/Computer Science/Data Structures/Linear Structures/Circular Buffer|the circular buffer]] itself; the queue simply consumes its `O(1)` ends.

A [[Home/Computer Science/Data Structures/Linear Structures/LinkedList|linked list]] backs the same contract with `head` and `tail` node references: enqueue allocates a new node and appends it after `tail`; dequeue removes the current `head` and advances `head` to the next node, clearing `tail` when the queue becomes empty. Each operation changes a constant number of references, so there is no shift and no shared backing array to resize. The removed node becomes eligible for reclamation, but when its memory is reclaimed depends on the runtime.

Three facts hold across every operation:

1. The front is always the element that has been resident longest; the back is the most recent arrival.
2. An element's position relative to the others never changes once enqueued — the queue neither reorders nor reaches inside the sequence.
3. In the circular-buffer form, `head` and `tail` are indices modulo capacity; the count of live elements, not the raw index values, distinguishes an empty region from a full one.

A growable circular buffer adds one more rule: when the live region fills the whole array, the next enqueue allocates a larger array, copies the elements in front-to-back order, and resets `head` to `0`. That copy is `O(n)`, but it happens once per doubling, so its cost spreads across the many `O(1)` enqueues that triggered it.

# Complexity

| Operation | Best time | Amortized time | Worst single operation | Structure space |
| --- | --- | --- | --- | --- |
| `Enqueue(x)` | `O(1)` | `O(1)` | `O(n)` on the resize that doubles a full circular buffer | `O(n)` |
| `Dequeue()` | `O(1)` | `O(1)` | `O(1)` | `O(n)` |
| `Peek()` | `O(1)` | `O(1)` | `O(1)` | `O(n)` |

The `O(1)` bounds assume a circular-buffer or linked-list backing. The naive alternative — an array that removes from index `0` — makes `Dequeue` `O(n)`, because every surviving element shifts one slot toward the front; that single failure is the reason the circular buffer exists. For a growable circular buffer, only enqueue carries a worst case: the resize copy is `O(n)` for that one operation but amortizes to `O(1)` across the sequence of enqueues that filled the array. A fixed-capacity circular queue has no resize and therefore no `O(n)` spike, but it can reject an enqueue when full.

# When the FIFO Shape Stops Fitting

Random access and priority both fall outside the contract. The queue exposes only the front for removal and the back for insertion; there is no index into the middle and no way to serve the smallest key first. A workload that must dequeue by priority rather than by arrival needs [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|a priority queue]], which pays `O(log n)` for enqueue and removal while keeping peek at `O(1)`.

The naive array implementation fails specifically at the front. Because dequeue removes index `0`, the runtime slides indices `1..n-1` down by one on every call, so a queue that processes `n` items does `Θ(n²)` shifting work overall. The observable state stays correct — items still leave in arrival order — but throughput collapses under load. A circular buffer removes the shift entirely by moving `head` instead of the data.

A fixed-capacity circular queue has a hard ceiling. Once the live region occupies every slot, `head` has wrapped to meet `tail` and there is nowhere to write; the next enqueue must either block, reject, drop the item, or overwrite the oldest, depending on the chosen policy. The bound always caps memory. It creates backpressure only when the policy blocks or rejects producers; dropping or overwriting sheds data instead. This is the direct trade against an unbounded queue that accepts every arrival and risks unbounded memory growth when producers outpace consumers.

# Reference Drawer

> [!ABSTRACT]- Circular-buffer layout
>
> ```mermaid
> flowchart LR
>   subgraph Ring[Backing array, capacity 6]
>     direction LR
>     S0[ ] --- S1[job-3] --- S2[job-4] --- S3[job-5] --- S4[ ] --- S5[ ]
>   end
>   H[head] --> S1
>   T[tail] --> S4
> ```
> `head` marks the next element to dequeue; `tail` marks the next free slot to enqueue. Both advance modulo capacity, wrapping from slot 5 back to slot 0.

> [!EXAMPLE]- C# usage of `Queue<T>`
>
> ```csharp
> var jobs = new Queue<string>();
> jobs.Enqueue("job-1");
> jobs.Enqueue("job-2");
>
> string first = jobs.Dequeue(); // "job-1" — oldest leaves the front
> string next = jobs.Peek();      // "job-2" — inspected, not removed
>
> if (jobs.TryDequeue(out var value))
> {
>     // TryDequeue avoids the InvalidOperationException that
>     // Dequeue/Peek throw on an empty queue.
> }
> ```
> `Queue<T>` is the growable circular buffer described above; `Dequeue` and `Peek` throw `InvalidOperationException` when empty, so a `Count` guard or the `Try*` variants are required at boundaries where the queue can drain.

# Questions

> [!QUESTION]- Why does a queue use a circular buffer or linked list instead of a plain array?
> A plain array that dequeues from index `0` must shift every remaining element down one slot, making each dequeue `O(n)` and a full drain `Θ(n²)`. A circular buffer moves a `head` index modulo capacity instead of moving data, and a linked list unlinks a node — both keep dequeue `O(1)` while preserving arrival order.

> [!QUESTION]- What does "amortized `O(1)` enqueue" mean for a growable queue?
> A single enqueue is `O(1)` until the backing array is full; that enqueue triggers an `O(n)` copy into a larger array. Because the array doubles, the copy happens once per `n` insertions, so the total cost of `n` enqueues is `O(n)` and the per-operation average stays `O(1)`, even though one operation spikes.

> [!QUESTION]- When is a queue the wrong structure, and what replaces it?
> When the next item must be chosen by priority rather than by arrival time, a FIFO queue would serve an older low-priority item ahead of an urgent newer one. A priority queue backed by a [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|heap]] restores correct order with `O(log n)` enqueue and removal and `O(1)` peek. When both ends must be read and written, a [[Home/Computer Science/Data Structures/Linear Structures/Deque|deque]] fits instead.

# References

- [`Queue<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1) — .NET API contract for Enqueue, Dequeue, Peek, and the growable circular-buffer semantics.
- [`Queue<T>` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Queue.cs) — the `_head`, `_tail`, `_array`, and `SetCapacity` fields implementing the wrap-around ring and its resize.
- [`PriorityQueue<TElement, TPriority>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — the by-priority alternative when dequeue order is a key rather than arrival time.
- [Queue (abstract data type)](https://en.wikipedia.org/wiki/Queue_(abstract_data_type)) — the FIFO ADT, circular-buffer and linked-list implementations, and bounded-versus-unbounded designs.
