---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A double-ended queue with O(1) push and pop at both ends, the superset of stack and queue."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

An algorithm maintains a sequence that grows and shrinks at *both* ends: a sliding window that admits new elements at the back while expiring old ones at the front, or a scheduler where the owner takes work from one end and thieves take it from the other. A [[Dynamic Array]] answers this badly — appending at the tail is `O(1)`, but every front insert or remove shifts all `n` elements. A double-ended queue keeps `O(1)` insert and `O(1)` remove at *each* end by tracking a front index and a live count over one wrapping array, so either end can advance without shifting the other.

The structure generalizes two narrower ones. A [[Stack]] mutates a single end; a [[Queue]] inserts at one end and removes at the opposite end. A deque supports every combination of those, and pays for it by giving up cheap access to the *middle*: there is no held position between the ends, so an insert or remove that is not at an end costs `O(n)`.

**Core shape:** elements → a ring buffer tracking a `head` index and a `count` (the back position derived mod capacity) → both ends `O(1)` amortized → no efficient middle → `O(n)` storage.

## Visualization

No StepTrace renderer covers a double-ended queue yet.

> [!NOTE] Visualization pending
> Planned StepTrace: a ring-buffer card showing elements pushed and popped at both the front and the back in `O(1)`, a `head` index and a `count` bounding a live region that wraps over the array. No matching renderer exists in `engine.js` yet.

The salient state is a `head` index and a `count`; the back position is derived as `(head + count - 1) % capacity` rather than stored. Representation below owns the index mechanics.

## Representation and invariants

Two backings satisfy the same interface with different tradeoffs.

**Growable ring buffer** — one contiguous array (see [[Circular Buffer]]) plus a `head` index and a `count`. The occupied slots are `head, head+1, …, head+count-1`, each taken modulo capacity, so the live region can straddle the array's physical end. `PushBack` writes at `(head + count) % cap`; `PushFront` moves `head` to `(head - 1 + cap) % cap` and writes there; both pops read an end slot and adjust `head` or `count`. Storage is contiguous and allocation-free in steady state, and any element is reachable by index in `O(1)` as `_buffer[(head + i) % cap]`. When `count == cap` a push first copies into a larger array, rebasing the front to index 0 — a single `O(n)` operation amortized to `O(1)` across the sequence of pushes.

**Doubly-[[LinkedList|linked list]]** — a node per element with `prev`/`next` pointers and cached head/tail references. All four end operations are unconditionally `O(1)` with no resize spike, but there is no index: reaching position `i` walks `i` nodes, so indexing is `O(n)`. Each element also carries a heap-allocated node (`~40` bytes of overhead on x64) and the traversal chases pointers across the heap, so locality is poor.

Invariants that define a valid state (ring-buffer form):

1. `0 <= count <= cap`; when `count == cap` the next push must resize before writing.
2. The front element is at `head`; the back element is at `(head + count - 1) % cap`. No slot outside that range holds a live element.
3. `head` always stays in `[0, cap)`; every index derived from it is taken modulo capacity, so the region wraps rather than overflowing.
4. A pop clears its released slot (`default!`) so the array does not pin a reference the deque no longer owns.

The `head` index and `count` are internal identity, not domain values: a resize renumbers every physical slot while preserving the logical front-to-back order.

## Complexity

Bounds are for the growable ring buffer unless the row names the linked backing.

| Operation | Best time | Amortized time | Worst single op | Structure space | Cause |
| --- | --- | --- | --- | --- | --- |
| `PushFront` / `PushBack` | `O(1)` | `O(1)` | `O(n)` | `O(n)` | Write one end slot; a full buffer triggers one grow-and-copy |
| `PopFront` / `PopBack` | `O(1)` | `O(1)` | `O(1)` | `O(n)` | Read an end slot and adjust an index; no resize on removal |
| Index `this[i]` (array-backed) | `O(1)` | `O(1)` | `O(1)` | `O(n)` | Address arithmetic `(head + i) % cap` over contiguous storage |
| Index `this[i]` (linked) | `O(n)` | `O(n)` | `O(n)` | `O(n)` | No random access; must walk `i` nodes from an end |
| Insert / remove at the middle | `O(n)` | `O(n)` | `O(n)` | `O(n)` | Shift (array) or locate then splice (linked); no held mid-position |

The amortized `O(1)` on the ring buffer assumes geometric growth: doubling on overflow spreads the `O(n)` copy across the `n` cheap pushes that preceded it, so a run of `m` pushes costs `O(m)` total. A single push that lands on a full buffer is still `O(n)` in isolation, which matters for latency-sensitive paths even when throughput is fine. The linked backing removes that spike entirely at the cost of an allocation per element and no `O(1)` index.

## When the structure stops fitting

The middle is the hard boundary, and it follows directly from the both-ends design. Both backings optimize the two ends: the ring buffer keeps only `head` and `count`, and the linked list caches only head and tail. Neither holds a position between them, so inserting or removing at an interior offset is `O(n)` — shifting a block of the array, or walking to the node first. A workload dominated by middle splices at positions it already holds wants a plain doubly-[[LinkedList|linked list]] with retained node references, or a balanced tree; a deque has thrown that information away.

The ring buffer's resize is a latency boundary rather than a throughput one. Amortized `O(1)` is a sequence-level guarantee; the one push that overflows a full buffer copies every element in a single `O(n)` step. In a real-time or per-frame loop that tail-latency spike can miss a deadline even though the average is constant, which is a reason to pre-size the buffer or choose the linked backing when worst-case per-op time is the constraint.

Sliding-window *maximum* is a common target, but a raw deque does not provide it — the technique is a **monotonic** deque, covered in [[Monotonic Stack and Queue]]. The deque holds candidate indices whose values stay ordered because each push first pops dominated elements off the back; the both-ends interface is what makes that possible (evict stale maxima from the back, expire out-of-window indices from the front), but the ordering invariant lives in the algorithm, not the container.

## Reference drawer

> [!ABSTRACT]- Ring-buffer layout
> ```mermaid
> flowchart LR
>   subgraph Buffer["array, capacity 8"]
>     s0["0"] --- s1["1: F"] --- s2["2"] --- s3["3"] --- s4["4"] --- s5["5"] --- s6["6: B"] --- s7["7"]
>   end
>   H["head = 1"] --> s1
>   T["back = (head + count - 1) % cap = 6"] --> s6
> ```
> The live region runs from `head` forward for `count` slots and wraps past index 7 back to 0 when it reaches the physical end.

> [!EXAMPLE]- C# implementation
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
> The BCL ships no `Deque<T>`. `Queue<T>` is already a ring buffer but exposes only one end for insertion; `LinkedList<T>` supplies `AddFirst`/`AddLast`/`RemoveFirst`/`RemoveLast` as a ready doubly-linked deque at the cost of a node per element.

## Comparison

Alternatives for a sequence mutated at its ends:

| Structure | Front insert/remove | Back insert/remove | Index `i` | Locality | Stronger case |
| --- | --- | --- | --- | --- | --- |
| Deque (ring buffer) | `O(1)` amortized | `O(1)` amortized | `O(1)` | Contiguous | Both ends are hot and indexed reads matter |
| [[Stack]] | — | `O(1)` amortized (one end) | `O(1)` top only | Contiguous | LIFO on a single end; nothing touches the other |
| [[Queue]] | remove `O(1)` | insert `O(1)` (opposite ends) | — | Contiguous | Strict FIFO; producer and consumer never swap ends |
| [[Dynamic Array]] | `O(n)` shift | `O(1)` amortized | `O(1)` | Contiguous | Only the tail is hot; front is rarely touched |
| [[LinkedList|Doubly-linked list]] | `O(1)` | `O(1)` | `O(n)` | Pointer-chasing | Middle splices at *held* node references dominate |

A deque is the `O(1)`-both-ends contiguous default: it keeps a dynamic array's cache behaviour and index while removing the front-shift penalty, which is why it backs work-stealing schedulers, sliding-window passes, and browser back/forward history. A [[Dynamic Array]] wins when only the tail is ever mutated and the front-shift cost never arises — the deque's index-and-count bookkeeping is then unused. A doubly-[[LinkedList|linked list]] becomes stronger only when splices in the middle at already-held nodes dominate the workload, the one thing the contiguous deque cannot do cheaply; it pays for that with an allocation per element and no `O(1)` index.

## Questions

> [!QUESTION]- What does a deque add over a stack and a queue, and what does it give up?
> `O(1)` insert and remove at *both* ends, where a stack mutates one end and a queue uses opposite ends for insert and remove. In exchange it gives up cheap access to the middle: neither the ring-buffer nor the linked backing holds an interior position, so a non-end insert or remove is `O(n)`.

> [!QUESTION]- How do a `head` index and a `count` let a ring-buffer deque touch both ends in `O(1)`?
> The occupied slots are `head` through `(head + count - 1) % cap`. `PushBack` writes at `(head + count) % cap` and increments `count`; `PushFront` decrements `head` (mod capacity), writes there, and increments `count`; each pop reads an end slot and adjusts `head` or `count`. Because every access wraps modulo capacity and only `head` and `count` change, no element is ever shifted.

> [!QUESTION]- Why is the ring-buffer push `O(1)` amortized but not `O(1)` worst case?
> A push onto a full buffer must copy all `n` elements into a larger array — an `O(n)` single operation. Geometric doubling makes that copy happen rarely enough that a run of `m` pushes costs `O(m)` total, so the amortized cost is `O(1)`; but any individual overflowing push is still `O(n)`, which shows up as a latency spike.

> [!QUESTION]- Ring buffer versus doubly-linked list as the deque backing — how do they differ?
> The ring buffer stores elements contiguously: `O(1)` index, good locality, no per-element allocation, but an occasional `O(n)` resize. The linked list gives unconditional `O(1)` ends with no resize spike, at the cost of a node allocation (~40 bytes overhead on x64) per element, no `O(1)` index, and pointer-chasing traversal. The ring buffer is the default; the linked list fits when worst-case per-op latency or `O(1)` removal of held interior nodes matters more than locality.

## References

- [Double-ended queue (Wikipedia)](https://en.wikipedia.org/wiki/Double-ended_queue) — operation set and the ring-buffer versus linked-list implementations with their complexity summary.
- [`collections.deque` (CPython docs)](https://docs.python.org/3/library/collections.html#collections.deque) — a production deque backed by a doubly-linked list of fixed-size blocks, with the `O(1)` end operations and `O(n)` middle indexing spelled out.
- [`LinkedList<T>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1) — the BCL's doubly-linked list, usable as a deque via `AddFirst`/`AddLast`/`RemoveFirst`/`RemoveLast`; note the per-node allocation.
- [ThreadPool work-stealing queues (dotnet/runtime source)](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/ThreadPoolWorkQueue.cs) — the real work-stealing deque behind `ThreadPool`: owner pushes/pops LIFO on one end, thieves steal FIFO from the other.
