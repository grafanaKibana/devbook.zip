---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A fixed-size array with wrapping read/write indices, giving O(1) allocation-free enqueue/dequeue for streaming and bounded-history scenarios."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A stream produces items faster than a consumer drains them, and only a bounded window of recent items needs to survive: the last N log lines, one frame of audio samples, packets waiting for a socket. A growable [[Home/Computer Science/Data Structures/Linear Structures/Queue|Queue]] also uses circular indexing but occasionally allocates and copies when it runs out of capacity; a fixed circular buffer chooses the memory bound up front and moves indices without ever resizing.

The array is treated as if its ends were joined. A `head` index marks the front (next read), a `tail` index marks the back (next write), and every advance is taken modulo the capacity so an index running off the end reappears at `0`. Enqueue writes at `tail` and sets `tail = (tail + 1) % capacity`; dequeue reads at `head` and advances `head` the same way. No element is ever copied to a new slot — the indices circle a stationary array — which makes this the standard O(1), allocation-free backing for a bounded [[Home/Computer Science/Data Structures/Linear Structures/Queue|Queue]].

What it gives up is growth and history: capacity is chosen once, and once the ring is full the next write either overwrites the oldest element or is refused. There is no record of items that scrolled past.

**Core shape:** fixed array + `head`/`tail`/`count` → indices wrap `mod capacity` → O(1) enqueue/dequeue with no per-element allocation → a full write overwrites the oldest element or is rejected, according to policy.

~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"circular-buffer"}
```

The interactive view keeps the ring state between operations. Fill it past capacity to see `tail` wrap and the oldest slot yield as `head` advances.

## Representation and Invariants

Four fields hold the entire state:

- A backing array of `capacity` slots, allocated once at construction and never resized.
- `head` — the index of the front element, where the next dequeue reads.
- `tail` — the index one past the back, where the next enqueue writes.
- `count` — the number of live elements, or equivalently a full/empty flag.

The stored elements occupy `head, head+1, …, head+count-1`, each index taken `mod capacity`. That span can wrap across the physical end of the array: with `capacity = 5`, `head = 3`, `count = 3`, the live elements sit at indices `3, 4, 0`. The two logical ends of the queue are not the two physical ends of the array.

The invariant that needs a deliberate design decision is the **`head == tail` ambiguity**. Both an empty ring and a completely full ring satisfy `head == tail`: an empty ring because nothing separates the read and write cursors, a full ring because `tail` has wrapped all the way back to `head`. The index pair alone cannot tell the two apart. Two standard resolutions:

1. **Explicit `count`.** Store the element count directly. Empty is `count == 0`, full is `count == capacity`, and `head == tail` is disambiguated by which of those holds. This uses the whole array and costs one extra field.
2. **Sacrificial slot.** Keep one cell permanently empty. Full becomes `(tail + 1) % capacity == head` and empty stays `head == tail`, so the two states never collide. This needs no counter but stores at most `capacity - 1` elements.

A monotonic-counter variant (never-wrapped 64-bit `head`/`tail`, masked to the array on access) achieves the same disambiguation because `tail - head` is the true count; power-of-two capacities then replace `% capacity` with `& (capacity - 1)`. Whichever scheme is chosen, enqueue and dequeue may change only the cursor they own plus `count`; no operation touches or relocates a slot that another element still occupies.

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
~~~~~

## Complexity

| Operation | Time | Aux space per op | Cause |
| --- | --- | --- | --- |
| `Enqueue(x)` | `O(1)` | `O(1)` | One slot write and one modulo increment of `tail`; no shift, no allocation. |
| `Dequeue()` | `O(1)` | `O(1)` | One slot read and one modulo increment of `head`. |
| `Peek()` | `O(1)` | `O(1)` | Direct index into `head`. |
| Construct | `O(capacity)` | `O(capacity)` | Allocate the backing array once. |

Structure space is `O(capacity)` and fixed at construction — the array is sized up front and never reallocated, so steady-state operation allocates nothing and produces no per-element garbage. That is the property that separates it from a growable queue: the bounds above are true worst-case per operation, not amortized over resizes, because no resize ever happens.

# When the Capacity is Reached

Every boundary here follows from the two design commitments — a fixed array and wrap arithmetic.

A **full buffer** forces a choice, not a bug. Overwrite-oldest advances `head` on top of the write, dropping the front element so the newest N always survive; this is the lossy ring behind debug logs, telemetry, and audio frame buffers, where stale data is disposable. Reject-on-full leaves the buffer unchanged and signals the producer to wait, applying backpressure; this is what a bounded work queue wants, so that no task is silently discarded. The same structure serves both — the policy lives entirely in the enqueue path when `count == capacity`.

The **empty-vs-full ambiguity** becomes a real failure when neither a `count` nor a sacrificial slot is used: code that treats `head == tail` as unconditionally empty will report a full ring as empty and refuse to drain it, or the mirror bug on the write side, corrupting the stream. The ambiguity is not avoidable by clever index math alone; it requires one of the disambiguation schemes above.

The ring **does not grow**. Reaching capacity never triggers a resize — that is the point of a bounded footprint. A "growable" ring is a different structure: it allocates a larger array and re-linearizes the wrapped contents (copying the `head…end` segment then the `0…tail` segment into contiguous order), an `O(count)` operation that reintroduces the allocation spikes a fixed ring exists to avoid.

# Reference Drawer

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
> `capacity = 5`, `head = 3`, `count = 3`. Live elements `a, b, c` occupy indices `3, 4, 0`; `tail = 1`.

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
> The `count` field is what disambiguates `head == tail`. Clearing the dequeued slot matters when `T` is a reference type or contains references: otherwise the backing array keeps objects that are logically gone alive, causing avoidable retention in a long-lived ring.

# Questions

> [!QUESTION]- Why do a full ring and an empty ring both satisfy `head == tail`, and how is the collision resolved?
> Empty rings put the read and write cursors on the same slot with nothing between them; a full ring wraps `tail` all the way around until it lands back on `head`. The index pair is identical in both states. Resolutions: store an explicit `count` (empty is `0`, full is `capacity`), or leave one slot unused so full becomes `(tail + 1) % capacity == head` while empty stays `head == tail`.

> [!QUESTION]- Why are the O(1) operation bounds worst-case rather than amortized, unlike a growable queue?
> The backing array is allocated once and never resized, so no operation can ever trigger a copy of existing elements. Each enqueue or dequeue is a single slot access plus a modulo increment, with a constant cost every time. A growable queue's O(1) is amortized precisely because occasional writes pay for a resize.

> [!QUESTION]- On reaching capacity, what distinguishes an overwrite ring from a reject ring, and when does each fit?
> Overwrite advances `head` over the write, dropping the oldest element so the newest N always remain — right for logs, telemetry, and frame buffers where old data is disposable. Reject leaves the buffer unchanged and signals the producer to back off — right for a work queue where every item must be processed. The structure is identical; only the full-buffer branch of enqueue differs.

> [!QUESTION]- Why must a ring whose `T` contains references clear dequeued slots?
> The backing array retains references in every physical slot, including slots whose logical element was already dequeued. Until such a slot is overwritten, those stale references keep their objects alive. Assigning `default` on dequeue releases them for collection.

# References

- [Circular buffer (Wikipedia)](https://en.wikipedia.org/wiki/Circular_buffer) — index schemes, the full-versus-empty disambiguation, and the mirroring/sacrificial-slot techniques.
- [System.Threading.Channels](https://learn.microsoft.com/en-us/dotnet/core/extensions/channels) — .NET's bounded producer/consumer abstraction exposes explicit full modes such as wait, drop-oldest, and drop-newest, mirroring the policy choice a bounded buffer must make.
- [The LMAX Disruptor](https://lmax-exchange.github.io/disruptor/) — a high-throughput ring buffer using monotonic sequence counters instead of a `count` field to disambiguate and to coordinate producers and consumers lock-free.
