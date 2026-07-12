---
publish: true
created: 2026-07-11T21:42:20.120Z
modified: 2026-07-11T21:42:20.121Z
published: 2026-07-11T21:42:20.121Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A double-ended queue with O(1) push and pop at both ends, the superset of stack and queue.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

A deque (double-ended queue, "deck") supports O(1) push and pop at _both_ ends — the superset of [[Stack]] (one end only) and [[Queue]] (in one end, out the other). You reach for it when an algorithm needs both disciplines on the same sequence: keep a window that grows at the back and shrinks at the front _and_ evict from the back when new data invalidates old candidates.

.NET has no built-in `Deque<T>` — a genuine gap in the BCL. `Queue<T>` is already a ring buffer internally, but its head end is exposed only for reading, so you either simulate a deque badly (`List<T>.Insert(0, x)` is O(n) — every element shifts) or bring your own.

## Two Implementations

- **Ring buffer** (see [[Circular Buffer]] for the layout): one array, `head` and `tail` indices that wrap modulo capacity. Pushing front decrements `head` (with wrap), pushing back increments `tail`. Contiguous storage, zero per-item allocation, O(1) everything, occasional O(n) grow-and-copy. C++'s `std::deque` and Python's `collections.deque` take the same contiguous-storage bet via chains of fixed-size blocks rather than one wrapping array; a single ring is the simple version of the same idea, and it's what you want in .NET.
- **Doubly-linked list**: `LinkedList<T>` gives O(1) `AddFirst`/`AddLast`/`RemoveFirst`/`RemoveLast` out of the box — a working deque today with zero code. The cost is one heap allocation per element (a `LinkedListNode<T>` with prev/next/list references — roughly 40 bytes of pure overhead per item on x64, ~48 bytes per node before the element's own data) and pointer-chasing traversal that loses badly to the ring on cache locality (see [[Arrays]]).

**Decision rule**: `LinkedList<T>` is fine when the deque is small or cold, or when you also need O(1) removal of arbitrary held nodes. On a hot path — parsers, schedulers, per-frame work — use a ring-buffer deque; the allocation-free steady state and locality are the whole point. `System.Collections.Immutable` offers `ImmutableQueue<T>` and `ImmutableStack<T>` but no deque; the closest stand-in there is `ImmutableList<T>`, whose AVL-tree internals make both-end inserts O(log n).

## Example

A minimal ring-buffer deque — the two "front" operations are the only lines `Queue<T>` doesn't already have:

```csharp
public class Deque<T>
{
    private T[] _buffer = new T[8];
    private int _head, _count; // _head = index of front element

    public int Count => _count;

    public void PushBack(T item)
    {
        if (_count == _buffer.Length) Grow();
        _buffer[(_head + _count) % _buffer.Length] = item;
        _count++;
    }

    public void PushFront(T item)
    {
        if (_count == _buffer.Length) Grow();
        _head = (_head - 1 + _buffer.Length) % _buffer.Length; // wrap backwards
        _buffer[_head] = item;
        _count++;
    }

    public T PopFront()
    {
        if (_count == 0) throw new InvalidOperationException("Deque is empty.");
        var item = _buffer[_head];
        _buffer[_head] = default!;                             // release for GC
        _head = (_head + 1) % _buffer.Length;
        _count--;
        return item;
    }

    public T PopBack()
    {
        if (_count == 0) throw new InvalidOperationException("Deque is empty.");
        var index = (_head + _count - 1) % _buffer.Length;
        var item = _buffer[index];
        _buffer[index] = default!;
        _count--;
        return item;
    }

    private void Grow() // copy into a larger array, front rebased to index 0
    {
        var next = new T[_buffer.Length * 2];
        for (var i = 0; i < _count; i++)
            next[i] = _buffer[(_head + i) % _buffer.Length];
        (_buffer, _head) = (next, 0);
    }
}
```

## Where Deques Earn Their Keep

**Sliding-window maximum** — the canonical deque interview problem. Keep a deque of candidate indices, values decreasing front to back: pop the back while the new element is larger or equal (those can never be a future maximum), push the new index at the back, drop the front when it slides out of the window. The front is always the window's max. Every index enters and leaves the deque once, so the whole pass is O(n) — versus O(n·k) for rescanning each window.

**Work stealing in the .NET ThreadPool.** Each worker thread owns a local queue used as a deque: the owner pushes and pops its own tasks LIFO at one end (freshest task first — its data is still warm in cache), while idle threads _steal_ from the opposite end, FIFO (the oldest task — least likely to conflict with the owner). Two-ended access is exactly what lets owner and thief mostly avoid contending on the same slot; a plain stack or queue can't separate them this way.

## Questions

> [!QUESTION]- What does a deque add over a stack and a queue, and when is that worth it?
> O(1) insert and remove at both ends — a stack mutates only one end, a queue inserts at one and removes at the other. It's worth it when one algorithm needs both disciplines on the same sequence, like sliding-window maximum (push back, evict from back, expire from front) or a work-stealing queue (owner LIFO on one end, thieves FIFO on the other).

> [!QUESTION]- Ring buffer vs doubly-linked list as the deque backbone — how do you choose?
> The ring buffer stores elements contiguously: zero per-item allocation, cache-friendly, O(1) ends with an occasional O(n) grow. The linked list gives O(1) ends with no resizes but pays a node allocation (~40 bytes of overhead on x64) per element and a potential cache miss per traversal step. Default to the ring buffer; take `LinkedList<T>` only for small/cold deques or when you also need O(1) removal of arbitrary nodes you hold references to.

> [!QUESTION]- Why does the ThreadPool's work-stealing queue need to be a deque?
> The owning thread pushes and pops LIFO at one end — the newest task's data is still hot in its cache. Idle threads steal FIFO from the _other_ end — the oldest task, farthest from what the owner is touching. Separating owner and thief onto opposite ends is what keeps contention rare; a single-ended structure would put them on the same slot.

> [!QUESTION]- Why is the sliding-window-maximum deque solution O(n) when each window looks like its own scan?
> Amortization over the whole pass: each index is pushed onto the deque exactly once and popped at most once (from the back when dominated by a newer larger value, or from the front when it expires). Total deque operations are bounded by 2n regardless of window size, versus O(n·k) for rescanning every k-wide window.

## References

- [Double-ended queue (Wikipedia)](https://en.wikipedia.org/wiki/Double-ended_queue) — operations, ring-buffer vs linked implementations, and complexity summary.
- [`LinkedList<T>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.linkedlist-1) — the built-in doubly-linked option; note the per-node `LinkedListNode<T>` allocation.
- [ThreadPool work-stealing queues (dotnet/runtime source)](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/ThreadPoolWorkQueue.cs) — the real work-stealing deque behind `ThreadPool`, owner LIFO / thief FIFO.
- [Sliding window maximum (LeetCode 239)](https://leetcode.com/problems/sliding-window-maximum/) — the canonical monotonic-deque problem.
