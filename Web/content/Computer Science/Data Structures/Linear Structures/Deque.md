---
publish: true
created: 2026-07-29T20:22:59.989Z
modified: 2026-08-03T07:58:17.390Z
published: 2026-08-03T07:58:17.390Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A double-ended queue that pushes and pops at both ends, generalizing stacks and queues.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

An algorithm maintains a sequence that grows and shrinks at _both_ ends: a sliding window that admits new elements at the back while expiring old ones at the front, or a scheduler where the owner takes work from one end and thieves take it from the other.

The structure generalizes two narrower ones. A [[Computer Science/Data Structures/Linear Structures/Stack|Stack]] mutates a single end; a [[Computer Science/Data Structures/Linear Structures/Queue|Queue]] inserts at one end and removes at the opposite end.

**Core shape:** elements → a ring buffer tracking a `head` index and a `count` (the back position derived mod capacity) → no efficient middle mutation

The interactive view keeps the deque state between actions. Push or pop at either end to watch `head`, `count`, and wrapping slots change without shifting live elements.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"deque"}
```

The salient state is a `head` index and a `count`; the back position is derived as `(head + count - 1) % capacity` rather than stored. Representation below owns the index mechanics.

#### Representation and Invariants

Two backings satisfy the same interface with different tradeoffs.

**Growable ring buffer** — one contiguous array (see [[Computer Science/Data Structures/Linear Structures/Circular Buffer|Circular Buffer]]) plus a `head` index and a `count`. The occupied slots are `head, head+1, …, head+count-1`, each taken modulo capacity, so the live region can straddle the array's physical end. `PushBack` writes at `(head + count) % cap`; `PushFront` moves `head` to `(head - 1 + cap) % cap` and writes there; both pops read an end slot and adjust `head` or `count`.

**Doubly-[[Computer Science/Data Structures/Linear Structures/LinkedList|linked list]]** — a node per element with `prev`/`next` pointers and cached head/tail references. Each element also carries a heap-allocated node, and traversal chases pointers across the heap, so locality is poor.

Invariants that define a valid state (ring-buffer form):

1. `0 <= count <= cap`; when `count == cap` the next push must resize before writing.
2. The front element is at `head`; the back element is at `(head + count - 1) % cap`. No slot outside that range holds a live element.
3. `head` always stays in `[0, cap)`; every index derived from it is taken modulo capacity, so the region wraps rather than overflowing.
4. A pop clears its released slot (`default!`) so the array does not keep referenced objects alive after the deque releases them.

The `head` index and `count` are internal identity, not domain values: a resize renumbers every physical slot while preserving the logical front-to-back order.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Deque complexity",
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
          "operation": "PushFront / PushBack",
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
              "role": "Worst single op",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "PopFront / PopBack",
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
              "role": "Worst single op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Index this[i] (array-backed)",
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
              "role": "Worst single op",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Index this[i] (linked)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert / remove at the middle",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst single op",
              "formula": "O(n)",
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
          "operation": "PushFront / PushBack",
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
          "operation": "PopFront / PopBack",
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
          "operation": "Index this[i] (array-backed)",
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
          "operation": "Index this[i] (linked)",
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
          "operation": "Insert / remove at the middle",
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
````

# When the Structure Stops Fitting

The middle is the hard boundary, and it follows directly from the both-ends design. Both backings optimize the two ends: the ring buffer keeps only `head` and `count`, and the linked list caches only head and tail. A workload dominated by middle splices at positions it already holds wants a plain doubly-[[Computer Science/Data Structures/Linear Structures/LinkedList|linked list]] with retained node references, or a balanced tree; a deque has thrown that information away.

The ring buffer's resize is a latency boundary rather than a throughput one. The push that overflows a full buffer allocates a larger array and copies every live element before returning. In a real-time or per-frame loop that pause can miss a deadline, which is a reason to pre-size the buffer or choose the linked backing when one long operation is unacceptable.

Sliding-window _maximum_ is a common target, but a raw deque does not provide it — the technique is a **monotonic** deque, covered in [[Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|Monotonic Stack and Queue]]. The deque holds candidate indices whose values stay ordered because each push removes dominated values from the back, while indices that fall outside the window expire from the front. The ordering invariant lives in the algorithm, not the container.

# Reference Drawer

> [!ABSTRACT]- Ring-buffer layout
>
> ```mermaid
> flowchart LR
>   subgraph Buffer["array, capacity 8"]
>     s0["0"] --- s1["1: F"] --- s2["2"] --- s3["3"] --- s4["4"] --- s5["5"] --- s6["6: B"] --- s7["7"]
>   end
>   H["head = 1"] --> s1
>   T["back = (head + count - 1) % cap = 6"] --> s6
> ```
>
> The live region runs from `head` forward for `count` slots and wraps past index 7 back to 0 when it reaches the physical end.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class Deque<T>
> {
>     private T[] _buffer = new T[8];
>     private int _head;   // index of the front element
>     private int _count;
>
>     public int Count => _count;
>
>     public T this[int i] =>
>         (uint)i < (uint)_count
>             ? _buffer[(_head + i) % _buffer.Length]
>             : throw new IndexOutOfRangeException();
>
>     public void PushBack(T item)
>     {
>         if (_count == _buffer.Length) Grow();
>         _buffer[(_head + _count) % _buffer.Length] = item;
>         _count++;
>     }
>
>     public void PushFront(T item)
>     {
>         if (_count == _buffer.Length) Grow();
>         _head = (_head - 1 + _buffer.Length) % _buffer.Length;
>         _buffer[_head] = item;
>         _count++;
>     }
>
>     public T PopFront()
>     {
>         if (_count == 0) throw new InvalidOperationException("Deque is empty.");
>         var item = _buffer[_head];
>         _buffer[_head] = default!;                 // release for GC
>         _head = (_head + 1) % _buffer.Length;
>         _count--;
>         return item;
>     }
>
>     public T PopBack()
>     {
>         if (_count == 0) throw new InvalidOperationException("Deque is empty.");
>         var index = (_head + _count - 1) % _buffer.Length;
>         var item = _buffer[index];
>         _buffer[index] = default!;
>         _count--;
>         return item;
>     }
>
>     private void Grow()  // copy into a larger array, front rebased to index 0
>     {
>         var next = new T[_buffer.Length * 2];
>         for (var i = 0; i < _count; i++)
>             next[i] = _buffer[(_head + i) % _buffer.Length];
>         (_buffer, _head) = (next, 0);
>     }
> }
> ```
>
> The BCL ships no `Deque<T>`. `Queue<T>` is already a ring buffer but exposes only one end for insertion; `LinkedList<T>` supplies `AddFirst`/`AddLast`/`RemoveFirst`/`RemoveLast` as a ready doubly-linked deque at the cost of a node per element.

# Questions

> [!QUESTION]- When does a linked backing fit better than a growable ring buffer for a deque?
> A ring buffer is the default when locality, compact storage, and constant-time indexing matter. A linked backing trades those properties and a node allocation per element for end operations without the ring buffer's occasional `O(n)` resize pause.

# References

- [Double-ended queue (Wikipedia)](https://en.wikipedia.org/wiki/Double-ended_queue) — operation set and the ring-buffer versus linked-list implementations with their complexity summary.
- [`collections.deque` (Python docs)](https://docs.python.org/3/library/collections.html#collections.deque) — documents the two-ended operation contract without making its implementation part of the API contract.
- [`LinkedList<T>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1) — the BCL's doubly-linked list, usable as a deque via `AddFirst`/`AddLast`/`RemoveFirst`/`RemoveLast`; note the per-node allocation.
- [ThreadPool work-stealing queues (dotnet/runtime source)](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/ThreadPoolWorkQueue.cs) — the real work-stealing deque behind `ThreadPool`: owner pushes/pops LIFO on one end, thieves steal FIFO from the other.
