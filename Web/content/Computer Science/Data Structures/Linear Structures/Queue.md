---
publish: true
created: 2026-07-18T14:02:44.042Z
modified: 2026-07-18T14:02:44.042Z
published: 2026-07-18T14:02:44.042Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A FIFO collection where the earliest enqueued item is processed first, used for buffering, BFS, and pipelines.
level:
  - "4"
priority: Medium
status: Done
---

A service accepts jobs faster than a single worker drains them, and fairness requires that the earliest arrival is served first. Storing arrivals in a plain array and always removing index `0` re-shifts every remaining element on each removal — an `O(n)` cost that grows with the backlog. A queue keeps the same arrival order while making both the arrival and the departure `O(1)`: new items enter at the back, the oldest leaves from the front, and nothing in between moves.

The structure records only order of arrival. It cannot reach the middle by position, and it cannot promote an urgent item ahead of an older one — retrieval by priority needs [[Heap|a priority queue]], not a FIFO queue. What it retains is exactly the front-to-back sequence and nothing more.

**Core shape:** enqueue at the back → dequeue from the front → first in, first out → both ends `O(1)` → `O(n)` storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a ring-buffer card showing head and tail indices advancing modulo capacity as enqueue and dequeue wrap the live region around the backing array, plus the resize that copies into a larger array with head reset to `0`. No matching renderer exists in `engine.js` yet.

# Representation and invariants

Two competing physical layouts back the same FIFO contract.

A [[Circular Buffer|circular buffer]] stores elements in a fixed backing array with separate `head` and `tail` indices. Enqueue writes at `tail`, dequeue reads from `head`, and each index advances modulo the array length. The live region therefore wraps past the array end back to index `0` instead of shifting elements downward. This is what avoids the naive `O(n)` shift: removing from the front is a single `head` increment, not a copy of everything behind it. The wrap arithmetic and the empty-versus-full ambiguity it introduces — a `head == tail` that could mean either state — are the concern of [[Circular Buffer|the circular buffer]] itself; the queue simply consumes its `O(1)` ends.

A [[LinkedList|linked list]] backs the same contract with `head` and `tail` node references: enqueue appends after `tail`, dequeue unlinks after `head`. Each operation touches two nodes and allocates or frees one, so there is no shift and no shared backing array to resize, at the cost of a node object and pointer per element.

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

# When the FIFO shape stops fitting

Random access and priority both fall outside the contract. The queue exposes only the front for removal and the back for insertion; there is no index into the middle and no way to serve the smallest key first. A workload that must dequeue by priority rather than by arrival needs [[Heap|a priority queue]], which pays `O(log n)` per operation to keep the extremum reachable.

The naive array implementation fails specifically at the front. Because dequeue removes index `0`, the runtime slides indices `1..n-1` down by one on every call, so a queue that processes `n` items does `Θ(n²)` shifting work overall. The observable state stays correct — items still leave in arrival order — but throughput collapses under load. A circular buffer removes the shift entirely by moving `head` instead of the data.

A fixed-capacity circular queue has a hard ceiling. Once the live region occupies every slot, `head` has wrapped to meet `tail` and there is nowhere to write; the next enqueue must either block, drop the item, or overwrite the oldest, depending on the chosen policy. This bounded design is deliberate — it caps memory and applies backpressure — and it is the direct trade against an unbounded queue that accepts every arrival and risks unbounded memory growth when producers outpace consumers.

# Reference drawer

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
>
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
>
> `Queue<T>` is the growable circular buffer described above; `Dequeue` and `Peek` throw `InvalidOperationException` when empty, so a `Count` guard or the `Try*` variants are required at boundaries where the queue can drain.

# Questions

> [!QUESTION]- Why does a queue use a circular buffer or linked list instead of a plain array?
> A plain array that dequeues from index `0` must shift every remaining element down one slot, making each dequeue `O(n)` and a full drain `Θ(n²)`. A circular buffer moves a `head` index modulo capacity instead of moving data, and a linked list unlinks a node — both keep dequeue `O(1)` while preserving arrival order.

> [!QUESTION]- What does "amortized `O(1)` enqueue" mean for a growable queue?
> A single enqueue is `O(1)` until the backing array is full; that enqueue triggers an `O(n)` copy into a larger array. Because the array doubles, the copy happens once per `n` insertions, so the total cost of `n` enqueues is `O(n)` and the per-operation average stays `O(1)`, even though one operation spikes.

> [!QUESTION]- When is a queue the wrong structure, and what replaces it?
> When the next item must be chosen by priority rather than by arrival time, a FIFO queue would serve an older low-priority item ahead of an urgent newer one. A priority queue backed by a [[Heap]] restores correct order at `O(log n)` per operation. When both ends must be read and written, a [[Deque]] fits instead.

# References

- [`Queue<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1) — .NET API contract for Enqueue, Dequeue, Peek, and the growable circular-buffer semantics.
- [`Queue<T>` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Queue.cs) — the `_head`, `_tail`, `_array`, and `SetCapacity` fields implementing the wrap-around ring and its resize.
- [`PriorityQueue<TElement, TPriority>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — the by-priority alternative when dequeue order is a key rather than arrival time.
- [Queue (abstract data type)](https://en.wikipedia.org/wiki/Queue_\(abstract_data_type\)) — the FIFO ADT, circular-buffer and linked-list implementations, and bounded-versus-unbounded designs.
