---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A contiguous, index-addressable buffer that grows automatically, giving O(1) random access and amortized O(1) append."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

# Intro

A sequence needs to keep growing at the tail while still supporting `O(1)` access by position. A fixed [[Arrays|array]] gives the cheap indexing but has a hard capacity; allocating a fresh array on every append and copying the old contents would make each append `O(n)`. A dynamic array keeps the contiguous backing buffer but over-allocates it, so most appends write into spare room already reserved and only an occasional append pays for growth.

The representation is a backing array plus two counters: a `count` of live elements and a `capacity` of allocated slots. What it gives up relative to a raw array is a stable buffer address — a growth event moves every element to a new allocation — and cheap edits away from the tail, since keeping the elements contiguous forces a shift on any front or middle insert.

**Core shape:** backing array + `count` + `capacity` → append writes at `count` while `count < capacity` → overflow doubles the buffer and copies → amortized `O(1)` append, `O(1)` index, `O(n)` middle edit.

> [!NOTE] Visualization pending
> Planned StepTrace: a growing-array card showing a backing buffer filling to capacity, an overflow event that allocates a larger buffer and copies every element across, then appends resuming into the new spare slots in `O(1)`. No matching renderer exists in `engine.js` yet.

## Representation and growth

Three fields define the state. The backing array holds the elements in index order; `count` is the logical size the caller sees; `capacity` is the physical length of the backing array. The two counters are distinct on purpose: `capacity - count` is the reserved slack that lets an append skip allocation.

`Append(x)` has two paths:

- `count < capacity`: write `buffer[count] = x`, increment `count`. One store, no allocation.
- `count == capacity`: allocate a new buffer of size `capacity * FACTOR` (a geometric growth factor, typically `2`), copy all `count` elements into it, drop the old buffer, then perform the write. This single append costs `O(n)`.

Geometric growth is the whole reason append stays cheap on average. If the buffer instead grew by a fixed amount each time, resizes would recur every constant number of appends and the copies would sum to `O(n²)` over `n` appends. Doubling makes resizes exponentially rarer as the array grows. Consider the copy work across `n` appends that trigger resizes at sizes `1, 2, 4, …, n`: the total elements copied is `1 + 2 + 4 + … + n < 2n`. Fewer than two copies per element amortizes to `O(1)` per append, even though the append that triggers a resize is individually `O(n)`.

In .NET this structure is `List<T>`; other ecosystems call it a *vector* or *array list*. `List<T>` doubles the capacity on overflow and exposes `Count` and `Capacity` directly, so `new List<T>(capacity)` pre-reserves the buffer and skips the intermediate resizes when the final size is known.

## Complexity

Bounds are per operation and assume geometric (doubling) growth of the backing array.

| Operation | Best time | Amortized time | Worst single operation | Structure space |
| --- | --- | --- | --- | --- |
| Index `a[i]` (read/write) | `O(1)` | `O(1)` | `O(1)` | — |
| `Append(x)` | `O(1)` | `O(1)` | `O(n)` on a resize | `O(n)` with up to ~2× slack |
| `Insert(i, x)` / `RemoveAt(i)` mid or front | `O(n)` | `O(n)` | `O(n)` shift | `O(n)` |
| Construct `n` elements | `Θ(n)` | `Θ(n)` | `Θ(n)` | `Θ(n)` |

The amortized `O(1)` on append is a sequence-level guarantee, not a per-call one. Total copy work across `n` appends is under `2n`, so the average cost per append is constant; the append that overflows the buffer is still `O(n)` in isolation. That gap between the amortized sequence bound and the single-operation worst case is the defining property to keep separate — a latency-sensitive caller feels the `O(n)` spike even though throughput over the whole sequence is linear.

Space is `O(n)` but with slack: immediately after a doubling the buffer is half empty, so a dynamic array can hold up to roughly `2×` its live elements in allocated slots.

## Boundaries tied to the backing array

The resize is an `O(n)` **latency spike**, not just an accounting curiosity. A real-time loop or a very large array can stall on the single append that copies millions of elements, so a steady-state `O(1)` throughput hides a tail-latency outlier at each power-of-two boundary. Pre-sizing with a known capacity removes those spikes entirely.

Growth also has a transient memory peak. During a resize the old and new buffers are both live until the copy finishes, so a doubling from `n` to `2n` needs `n + 2n ≈ 3×` the element memory momentarily. Large arrays can therefore fail to grow even when steady-state usage would fit.

The growth `FACTOR` is a direct memory-versus-copy trade. A factor of `2` wastes up to half the buffer but copies rarely; a factor of `1.5` wastes less slack but resizes more often and copies more total elements over the array's life. The choice is fixed at the mechanism level, not per call.

Editing away from the tail is `O(n)` because contiguity must be preserved. `Insert(0, x)` shifts every existing element one slot right; `RemoveAt(0)` shifts every element left. A [[Deque]] avoids this by giving `O(1)` insertion and removal at both ends. And because a resize allocates a fresh buffer, any reference, index-derived pointer, or iterator bound to the old backing array is invalidated the moment the array grows — mutating a dynamic array while iterating it is unsound for exactly this reason.

## Reference drawer

> [!ABSTRACT]- Append with overflow
> ```mermaid
> flowchart TD
>   A[Append x] --> B{count < capacity}
>   B -->|Yes| C[buffer at count = x]
>   B -->|No| D[Allocate buffer of capacity * FACTOR]
>   D --> E[Copy all count elements]
>   E --> F[Drop old buffer]
>   F --> C
>   C --> G[count = count + 1]
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public sealed class DynamicArray<T>
> {
>     private const int Factor = 2;
>     private T[] _buffer = new T[4];
>
>     public int Count { get; private set; }
>     public int Capacity => _buffer.Length;
>
>     public T this[int index]
>     {
>         get => _buffer[index];
>         set => _buffer[index] = value;
>     }
>
>     public void Append(T value)
>     {
>         if (Count == _buffer.Length)
>         {
>             var grown = new T[_buffer.Length * Factor];
>             Array.Copy(_buffer, grown, Count);
>             _buffer = grown;
>         }
>
>         _buffer[Count++] = value;
>     }
>
>     public void Insert(int index, T value)
>     {
>         if (Count == _buffer.Length)
>         {
>             var grown = new T[_buffer.Length * Factor];
>             Array.Copy(_buffer, grown, Count);
>             _buffer = grown;
>         }
>
>         Array.Copy(_buffer, index, _buffer, index + 1, Count - index);
>         _buffer[index] = value;
>         Count++;
>     }
> }
> ```
>
> The `Append` fast path is a single store; the grow branch runs only when `Count == Capacity`. `Insert` always shifts the suffix, which is what makes non-tail insertion `O(n)` regardless of capacity.

## Comparison

| Structure | Index access | Tail append | Front/middle edit | Both-ends ops | Memory locality |
| --- | --- | --- | --- | --- | --- |
| Dynamic array (`List<T>`) | `O(1)` | `O(1)` amortized | `O(n)` shift | `O(n)` at front | Contiguous, cache-friendly |
| [[Arrays]] (`T[]`) | `O(1)` | Not supported (fixed capacity) | `O(n)` shift | `O(n)` at front | Contiguous, cache-friendly |
| [[LinkedList]] | `O(n)` | `O(1)` with a tail ref | `O(1)` splice with a node ref | `O(1)` with end refs | Pointer-chasing, cache-hostile |
| [[Deque]] | `O(1)` | `O(1)` amortized | `O(n)` | `O(1)` both ends | Contiguous (ring buffer) |

A dynamic array is the default growable indexed sequence: it pairs amortized `O(1)` append with `O(1)` random access over contiguous, cache-friendly storage, paying only the periodic resize copy and up to `2×` slack. A [[Deque]] becomes the stronger fit when both ends are hot, since it keeps `O(1)` insertion and removal at the front where a dynamic array degrades to `O(n)`. A [[LinkedList]] wins only when frequent splices happen in the middle and a cursor already holds the relevant node — it trades away `O(1)` indexing and cache locality to get `O(1)` structural edits at a held position.

## Questions

> [!QUESTION]- Why is append amortized `O(1)` even though a resize copies every element?
> Doubling the buffer makes resizes exponentially rarer as the array grows. Over `n` appends the resizes copy `1 + 2 + 4 + … + n < 2n` elements total — fewer than two copies per element — so the average cost per append is constant. The individual append that triggers a resize is still `O(n)`; the constant bound is a property of the whole sequence, not any single call.

> [!QUESTION]- What breaks if the buffer grows by a fixed amount instead of a constant factor?
> Fixed-increment growth resizes every constant number of appends, so the copies sum to `O(n²)` across `n` appends and append degrades to `O(n)` amortized. Geometric growth (e.g. `2×`) is what spaces resizes far enough apart to keep the amortized cost constant.

> [!QUESTION]- Why does a resize invalidate held references and iterators?
> Growth allocates a new backing array and copies elements into it, then drops the old buffer. Any pointer, cached index target, or iterator bound to the old array now refers to a stale allocation, which is why appending during iteration is unsound.

> [!QUESTION]- When does a deque or linked list beat a dynamic array?
> A deque wins when both ends are mutated, since it keeps `O(1)` front operations where a dynamic array shifts `O(n)`. A linked list wins for frequent middle splices when a node reference is already held, trading away `O(1)` indexing and cache locality for `O(1)` structural edits.

## References

- [`List<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.list-1) — .NET's dynamic array, with remarks separating `Count` from `Capacity` and describing capacity-doubling on growth.
- [`List<T>` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/List.cs) — the `EnsureCapacity`/`Grow` logic showing the doubling factor and the array copy on resize.
- [When to use generic collections](https://learn.microsoft.com/en-us/dotnet/standard/collections/when-to-use-generic-collections) — where `List<T>` fits relative to linked lists, queues, and other collection shapes.
- [Amortized Analysis (CLRS, Chapter 17)](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) — the aggregate and accounting methods behind the amortized `O(1)` bound for table doubling.
