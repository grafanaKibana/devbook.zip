---
publish: true
created: 2026-08-20T20:41:15.599Z
modified: 2026-08-20T20:41:15.599Z
published: 2026-08-20T20:41:15.599Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A fixed-size array with wrapping read and write indices for streaming and bounded-history workloads.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A circular buffer keeps a bounded slice of a stream, such as the last N log lines or one frame of audio samples. A growable [[Computer Science/Data Structures/Linear Structures/Queue|Queue]] also uses circular indexing, but it occasionally allocates and copies when capacity runs out. A fixed ring chooses its capacity once and moves indices without resizing.

The backing array behaves as though its ends were joined. `head` marks the next read and `tail` the next write. Advancing either index modulo the capacity sends it back to `0` after the last physical slot. Enqueue writes at `tail` and sets `tail = (tail + 1) % capacity`. Dequeue reads at `head` and advances `head` the same way.

The trade is explicit. Capacity never grows, and a full ring must either overwrite the oldest element or refuse the next write. Anything that has scrolled past is gone.

**Core shape:** fixed array + `head`/`tail`/`count` → indices wrap `mod capacity` → a full write overwrites the oldest element or is rejected, according to policy.

````tabsdown
tab: Visualization


```steptrace
{"algorithm":"circular-buffer"}
```

The interactive view keeps the ring state between operations. Fill it past capacity to see `tail` wrap and the oldest slot yield as `head` advances.

#### Representation and Invariants

Four fields hold the entire state:

- A backing array of `capacity` slots, allocated once at construction and never resized.
- `head` — the index of the front element, where the next dequeue reads.
- `tail` — the index one past the back, where the next enqueue writes.
- `count` — the number of live elements, or equivalently a full/empty flag.

The stored elements occupy `head, head+1, …, head+count-1`, each index taken `mod capacity`. That span can wrap across the physical end of the array: with `capacity = 5`, `head = 3`, `count = 3`, the live elements sit at indices `3, 4, 0`. The two logical ends of the queue are not the two physical ends of the array.

The invariant that needs a deliberate design decision is the **`head == tail` ambiguity**. Both an empty ring and a completely full ring satisfy `head == tail`: an empty ring because nothing separates the read and write cursors, a full ring because `tail` has wrapped all the way back to `head`. The index pair alone cannot tell the two apart. Two standard resolutions:

1. **Explicit `count`.** Store the element count directly. Empty is `count == 0`, full is `count == capacity`, and `head == tail` is disambiguated by which of those holds. This uses the whole array and costs one extra field.
2. **Sacrificial slot.** Keep one cell permanently empty. Full becomes `(tail + 1) % capacity == head` and empty stays `head == tail`, so the two states never collide. This needs no counter but stores at most `capacity - 1` elements.

A monotonic-counter variant uses increasing 64-bit `head` and `tail` counters that are not reduced modulo capacity and are masked only for array access. Their difference is the true count while arithmetic remains within the supported counter range; an implementation must either tolerate unsigned wraparound correctly or prevent overflow. Power-of-two capacities then replace `% capacity` with `& (capacity - 1)`. Under reject-on-full or wait-on-full, enqueue changes `tail` and `count`, while dequeue changes `head` and `count`. Under overwrite-oldest, a full enqueue also advances `head`, logically evicting the oldest slot before replacing it.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Circular Buffer complexity",
  "variables": {
    "configuredCapacity": {
      "symbol": "capacity",
      "description": "configured backing-storage capacity"
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
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Dequeue()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
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
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Construct",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(capacity)",
              "curveId": "linear"
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
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Dequeue()",
          "bounds": [
            {
              "kind": "curve",
              "role": "Aux space per op",
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
              "role": "Aux space per op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Construct",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure",
              "formula": "O(capacity)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
````

# When the Capacity is Reached

The boundaries come from the fixed array and wrap arithmetic.

A **full buffer** forces a policy choice. Overwrite-oldest advances `head` after the write and drops the front element, preserving the newest N items. That fits lossy logs or frame buffers. Reject-on-full leaves the ring unchanged and immediately reports refusal. Wait-on-full is a separate policy that suspends the producer until capacity becomes available, applying backpressure when every work item matters. The selected policy runs when enqueue finds `count == capacity`.

The **empty-vs-full ambiguity** becomes a bug when the representation has neither a `count` nor a sacrificial slot. Code that treats `head == tail` as always empty can report a full ring as empty and refuse to drain it. Index arithmetic alone cannot distinguish the states.

The ring **does not grow**. Reaching capacity never triggers a resize. Bounded memory is the point.

# Diagram and C# Implementation

> [!ABSTRACT]- Index layout of a wrapped ring
>
> ```mermaid
> flowchart LR
>   S0["0: c"] --> S1["1: (free)"]
>   S1 --> S2["2: (free)"]
>   S2 --> S3["3: a  (head)"]
>   S3 --> S4["4: b"]
>   S4 --> S0
> ```
>
> `capacity = 5`, `head = 3`, `count = 3`. Live elements `a, b, c` occupy indices `3, 4, 0`. `tail = 1`.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class CircularBuffer<T>
> {
>     private readonly T[] _buffer;
>     private int _head;
>     private int _tail;
>     private int _count;
>
>     public CircularBuffer(int capacity)
>     {
>         if (capacity <= 0)
>             throw new ArgumentOutOfRangeException(nameof(capacity));
>
>         _buffer = new T[capacity];
>     }
>
>     public int Count => _count;
>     public bool IsFull => _count == _buffer.Length;
>
>     // Overwrite-oldest policy: the ring always holds the most recent capacity items.
>     public void Enqueue(T item)
>     {
>         _buffer[_tail] = item;
>         _tail = (_tail + 1) % _buffer.Length;
>
>         if (IsFull)
>         {
>             _head = (_head + 1) % _buffer.Length; // drop the oldest element
>         }
>         else
>         {
>             _count++;
>         }
>     }
>
>     public bool TryDequeue(out T item)
>     {
>         if (_count == 0)
>         {
>             item = default!;
>             return false;
>         }
>
>         item = _buffer[_head];
>         _buffer[_head] = default!; // release contained references for collection
>         _head = (_head + 1) % _buffer.Length;
>         _count--;
>         return true;
>     }
> }
> ```
>
> The `count` field is what disambiguates `head == tail`. Clearing the dequeued slot matters when `T` is a reference type or contains references: otherwise the backing array keeps objects that are logically gone alive, causing avoidable retention in a long-lived ring.

# References

- [System.Threading.Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels)
- [The LMAX Disruptor](https://lmax-exchange.github.io/disruptor/)
