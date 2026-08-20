---
publish: true
created: 2026-08-20T20:41:15.599Z
modified: 2026-08-20T20:41:15.600Z
published: 2026-08-20T20:41:15.600Z
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

A deque serves sequences that grow and shrink at _both_ ends. A sliding window admits new elements at the back and expires old ones at the front. A work-stealing scheduler lets the owner take from one end while other threads steal from the other.

It generalizes two narrower structures. A [[Computer Science/Data Structures/Linear Structures/Stack|Stack]] mutates one end. A [[Computer Science/Data Structures/Linear Structures/Queue|Queue]] inserts at one end and removes from the other.

**Core shape:** elements → a ring buffer tracking a `head` index and a `count` (the back position derived mod capacity) → no efficient middle mutation

The interactive view keeps the deque state between actions. Push or pop at either end to watch `head`, `count`, and wrapping slots change without shifting live elements.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"deque"}
```

The salient state is a `head` index and a `count`; the back position is derived as `(head + count - 1) % capacity` rather than stored. The implementation below shows how each operation wraps those indices.

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
      "description": "number of elements currently stored in the deque"
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
              "role": "Best/Amortized",
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
              "role": "Best/Amortized",
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
              "role": "Best/Amortized",
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
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Average",
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
              "role": "Best/Amortized",
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

The middle is the hard boundary. Both backings optimize the ends: the ring stores `head` and `count`, while the linked form caches its first and last nodes. Repeated middle splices at positions already held fit a plain doubly-[[Computer Science/Data Structures/Linear Structures/LinkedList|linked list]] with retained node references, or a balanced tree. A deque does not preserve that access path.

Ring-buffer resize is a latency boundary. The push that overflows capacity allocates a larger array and copies every live element before it returns. That pause can miss a real-time or per-frame deadline. Pre-sizing removes known growth points. A linked backing avoids bulk copies when even one long operation is unacceptable.

A raw deque does not produce a sliding-window _maximum_. That algorithm needs a **monotonic** deque, covered in [[Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|Monotonic Stack and Queue]]. Each push removes dominated candidates from the back, and expired indices leave from the front. The ordering invariant belongs to the algorithm, not the container.

# Diagram and C# Implementation

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
> The BCL ships no `Deque<T>`. `Queue<T>` is already a ring buffer but exposes only one end for insertion. `LinkedList<T>` supplies `AddFirst`/`AddLast`/`RemoveFirst`/`RemoveLast` as a ready doubly-linked deque at the cost of a node per element.

# References

- [ThreadPool work-stealing queues (dotnet/runtime source)](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/ThreadPoolWorkQueue.cs)
