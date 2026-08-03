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

A service accepts jobs faster than a single worker drains them, and fairness requires that the earliest arrival is served first.

The structure records only order of arrival. It cannot reach the middle by position, and it cannot promote an urgent item ahead of an older one — retrieval by priority needs [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|a priority queue]], not a FIFO queue. What it retains is exactly the front-to-back sequence and nothing more.

The interactive view isolates circular wraparound and fixed-capacity full behavior; the growable resize remains explained in the prose below.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"queue"}
```

#### Representation and Invariants

Two competing physical layouts back the same FIFO contract.

A [[Home/Computer Science/Data Structures/Linear Structures/Circular Buffer|circular buffer]] stores elements in a fixed backing array with separate `head` and `tail` indices. Enqueue writes at `tail`, dequeue reads from `head`, and each index advances modulo the array length. The live region therefore wraps past the array end back to index `0` instead of shifting elements downward.

A [[Home/Computer Science/Data Structures/Linear Structures/LinkedList|linked list]] backs the same contract with `head` and `tail` node references: enqueue allocates a new node and appends it after `tail`; dequeue removes the current `head` and advances `head` to the next node, clearing `tail` when the queue becomes empty. Each operation changes a constant number of references, so there is no shift and no shared backing array to resize. The removed node becomes eligible for reclamation, but when its memory is reclaimed depends on the runtime.

Three facts hold across every operation:

1. The front is always the element that has been resident longest; the back is the most recent arrival.
2. An element's position relative to the others never changes once enqueued — the queue neither reorders nor reaches inside the sequence.
3. In the circular-buffer form, `head` and `tail` are indices modulo capacity; the count of live elements, not the raw index values, distinguishes an empty region from a full one.

A growable circular buffer adds one more rule: when the live region fills the whole array, the next enqueue allocates a larger array, copies the elements in front-to-back order, and resets `head` to `0`.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Queue complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Enqueue(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(n) on the resize that doubles a full circular buffer",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Dequeue()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Peek()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Enqueue(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Dequeue()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Peek()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Structure space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the FIFO Shape Stops Fitting

Random access and priority both fall outside the contract. The queue exposes only the front for removal and the back for insertion; there is no index into the middle and no way to serve the smallest key first.

The naive array implementation fails specifically at the front. The observable state stays correct — items still leave in arrival order — but throughput collapses under load. A circular buffer removes the shift entirely by moving `head` instead of the data.

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

> [!QUESTION]- Which bounded-queue full policies create backpressure, and which shed data?
> Blocking or rejecting an enqueue forces the producer to slow down or handle refusal, so the capacity limit becomes backpressure. Dropping the new item or overwriting the oldest keeps the producer moving by sacrificing data instead.

# References

- [`Queue<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1) — .NET API contract for Enqueue, Dequeue, Peek, and the growable circular-buffer semantics.
- [`Queue<T>` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Queue.cs) — the `_head`, `_tail`, `_array`, and `SetCapacity` fields implementing the wrap-around ring and its resize.
- [`PriorityQueue<TElement, TPriority>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — the by-priority alternative when dequeue order is a key rather than arrival time.
- [Queue (abstract data type)](https://en.wikipedia.org/wiki/Queue_(abstract_data_type)) — the FIFO ADT, circular-buffer and linked-list implementations, and bounded-versus-unbounded designs.
