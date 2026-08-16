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

A queue preserves arrival order. When a service accepts work faster than one worker can drain it, the oldest waiting job remains at the front.

The structure records nothing beyond that order. It cannot address the middle by position or promote urgent work ahead of an older item. Retrieval by priority needs [[Home/Computer Science/Data Structures/Trees/Heap-like/Heap|a priority queue]], not FIFO.

The interactive view isolates circular wraparound and fixed-capacity full behavior. The growable resize remains explained in the prose below.

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
      "description": "number of elements currently stored in the queue"
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
              "role": "Best/Amortized",
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
              "role": "Best/Amortized",
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
              "role": "Best/Amortized",
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

Random access and priority fall outside the contract. The queue exposes the front for removal and the back for insertion. It has no middle index and cannot serve the smallest key first.

A naive array implementation pays at the front. Items still leave in arrival order, but every dequeue shifts the remaining elements. A circular buffer moves `head` instead of the data and removes that cost.

A fixed-capacity circular queue has a hard ceiling. Once every slot is live, the next enqueue must block, reject the item, drop it, or overwrite the oldest entry. The bound caps memory. Blocking or rejection creates backpressure. Dropping or overwriting sheds data. An unbounded queue accepts every arrival instead and can exhaust memory when producers stay ahead of consumers.

# Diagram and C# Implementation

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
> `head` marks the next element to dequeue. `tail` marks the next free slot to enqueue. Both advance modulo capacity, wrapping from slot 5 back to slot 0.

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
> `Queue<T>` is the growable circular buffer described above. `Dequeue` and `Peek` throw `InvalidOperationException` when empty, so a `Count` guard or the `Try*` variants are required at boundaries where the queue can drain.

# References

- [`Queue<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.queue-1)
- [`Queue<T>` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Queue.cs)
