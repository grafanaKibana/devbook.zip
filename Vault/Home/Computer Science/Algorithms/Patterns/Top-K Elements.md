---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finds the k largest, smallest, or most frequent items in O(n log k) using a size-k heap over a stream."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A feed produces millions of latency samples and a dashboard needs the ten slowest. Sorting the whole feed answers the question in `O(n log n)` and forces every sample into memory at once, yet nine hundred and ninety-nine of every thousand comparisons order values that never appear in the result. The task only needs a fixed `k`, not a full ranking.

Keeping a size-`k` heap while scanning removes that waste. To surface the `k` **largest** values the heap is a **min**-heap: its root is the smallest of the `k` best elements seen so far — the weakest survivor. A new element only matters if it beats that root, and when it does the root is evicted and the newcomer inserted, so the heap size never leaves `k`. After one pass the heap holds exactly the `k` largest, and it held no more than `k` elements at any moment, so the input can arrive as a stream. The symmetric problem — the `k` smallest — uses a max-heap the same way.

**Core shape:** `k ≪ n`, possibly streaming → a size-`k` min-heap whose root is the weakest survivor → `O(n log k)` time, `O(k)` space.

> [!NOTE] Visualization pending
> Planned StepTrace: a size-k min-heap card showing each input element compared against the heap's smallest and replacing it when larger, so the heap always holds the k largest seen so far. No matching renderer exists in `engine.js` yet.

## Why a min-heap holds the largest

The invariant carried across the scan is that the heap contains the `k` largest of every element seen so far, with the `k`-th largest at the root. The first `k` elements fill the heap outright. Each later element `x` faces one comparison against the root:

- `x > root` proves `x` belongs to the top `k` — it beats the current weakest survivor. The root leaves, `x` enters, and the heap again holds the `k` largest seen so far.
- `x ≤ root` proves `x` cannot belong to the top `k` — it is no larger than an element already outside it. Discarding `x` preserves the invariant untouched.

The polarity is the load-bearing choice. Exposing the *minimum* of the retained set at the root is what makes the "does this element deserve to be kept" test a single `O(1)` peek, and what makes eviction remove the right element. A max-heap of size `k` would expose the *largest* retained element, which is never the one to drop, so it cannot support this scan.

Because the heap never exceeds `k` entries, each insert and evict is `O(log k)` rather than `O(log n)`. Over `n` elements that is `O(n log k)` time, and the resident set is `O(k)` regardless of how large `n` grows — the property that lets the input be a stream rather than a materialized array.

For a static, in-memory array where the order among the top `k` is irrelevant, [[Quick Sort|Quickselect]] partitions around a pivot and recurses into only the side holding the `k`-th position, discarding the other half. The problem size falls geometrically, giving `O(n)` average time, at the cost of mutating the array and holding all of it in memory.

## Complexity

Finding the `k` largest of `n` elements:

| Approach | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Size-`k` min-heap | `O(n log k)` | `O(k)` | `n` elements each cost one `O(1)` peek and, at most, one `O(log k)` replace on a heap capped at `k`. |
| Quickselect | `O(n)` average, `O(n²)` worst | `O(1)` | Geometric shrink from partitioning gives linear average; adversarial pivots leave the size nearly unchanged each step. A median-of-medians pivot forces `O(n)` worst case at a larger constant. |
| Full sort | `O(n log n)` | depends on sort | Ranks all `n` elements when only `k` are needed. |

Quickselect's space is `O(1)` extra beyond the input it mutates in place; its average bound assumes a randomized or otherwise non-adversarial pivot. The heap's `O(k)` is the only column that stays bounded when `n` is unbounded, which is why it is the streaming choice.

## When the assumptions stop holding

Using a max-heap for the `k` largest inverts the mechanism. A max-heap of all `n` elements — pop `k` times — does return the right answer, but it holds every element, so its `O(n)` resident set defeats the whole point of the pattern: no streaming, and no memory saving over materializing the input. Its time is not the problem — heapify builds in `O(n)` and `k` extractions cost `O(k log n)`, so the total is `O(n + k log n)`, which for `k ≪ n` is roughly `O(n)` and actually beats a full sort. The space is what disqualifies it against the size-`k` heap's `O(k)`. A size-`k` *max*-heap is worse still: its root is the strongest retained element, so the comparison keeps the wrong side and the scan collects the `k` *smallest*. The result passes symmetric test data and fails everything else.

`k ≥ n` erases the advantage. Once the heap must hold every element, `O(n log k)` is `O(n log n)` and the extra bookkeeping only adds constant-factor overhead over sorting outright.

Quickselect cannot run on a stream. It needs the whole array addressable to partition it, and it reorders that array as a side effect, so an input that arrives incrementally or must stay immutable rules it out. Its `O(n²)` worst case is a second constraint: a naive pivot on already-sorted or adversarial input barely shrinks the problem each step, the same degradation as [[Quick Sort]]. A randomized pivot makes that improbable; median-of-medians makes it impossible at a higher constant.

## Reference drawer

> [!ABSTRACT]- Streaming min-heap for the k largest
> ```mermaid
> flowchart TD
>   A[Empty min-heap, capacity k] --> B{More input}
>   B -->|No| Z[Heap holds the k largest]
>   B -->|Yes| C[Read next element x]
>   C --> D{Heap size less than k}
>   D -->|Yes| E[Push x]
>   D -->|No| F{x greater than root}
>   F -->|Yes| G[Pop root, push x]
>   F -->|No| H[Discard x]
>   E --> B
>   G --> B
>   H --> B
> ```

> [!EXAMPLE]- C# implementations
> ```csharp
> // Streaming: k largest via a size-k min-heap. O(n log k) time, O(k) space.
> public static int[] KLargest(IEnumerable<int> stream, int k)
> {
>     var heap = new PriorityQueue<int, int>();   // min-heap: priority == value
>     foreach (int x in stream)
>     {
>         if (heap.Count < k)
>         {
>             heap.Enqueue(x, x);                 // still filling the first k
>         }
>         else if (x > heap.Peek())               // x beats the weakest survivor
>         {
>             heap.Dequeue();                     // evict the current minimum of the top k
>             heap.Enqueue(x, x);
>         }
>         // else: x cannot be in the top k, discard it
>     }
>     return heap.UnorderedItems.Select(e => e.Element).ToArray();
> }
>
> // Static array: k-th largest via Quickselect. O(n) average, mutates input.
> public static int QuickSelectKthLargest(int[] a, int k)
> {
>     int target = a.Length - k;                  // k-th largest == index target when sorted ascending
>     int lo = 0, hi = a.Length - 1;
>     var rng = new Random();
>     while (true)
>     {
>         int p = Partition(a, lo, hi, rng.Next(lo, hi + 1));
>         if (p == target) return a[p];
>         if (p < target) lo = p + 1; else hi = p - 1;
>     }
> }
>
> private static int Partition(int[] a, int lo, int hi, int pivotIndex)
> {
>     int pivot = a[pivotIndex];
>     (a[pivotIndex], a[hi]) = (a[hi], a[pivotIndex]);
>     int store = lo;
>     for (int i = lo; i < hi; i++)
>         if (a[i] < pivot) { (a[i], a[store]) = (a[store], a[i]); store++; }
>     (a[store], a[hi]) = (a[hi], a[store]);
>     return store;
> }
> ```
> `KLargest` returns the top `k` in unspecified order; a caller needing them ranked sorts the `k`-element result. `QuickSelectKthLargest` returns a single order statistic — the top `k` are then the elements left of `target` after the loop, already partitioned but unsorted.

## Comparison

Selecting the `k` largest of `n` elements:

| Approach | Time | Space | Input assumption | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Full sort ([[Heap Sort]] / [[Quick Sort]]) | `O(n log n)` | `O(n)` resident | Whole input in memory | The full ordering is also needed | `k ≪ n` with no need for the rest |
| Size-`k` [[Heap\|min-heap]] | `O(n log k)` | `O(k)` | Elements arrive one at a time; nothing else | Streaming input or `k ≪ n` | `k` near `n`, where it degenerates to a sort |
| Quickselect | `O(n)` average, `O(n²)` worst | `O(1)` extra, mutates input | Whole array addressable and mutable | Static array, fastest single top-`k`, order within top `k` irrelevant | Streams, immutable input, or adversarial data without a good pivot |

A size-`k` heap is the fit for streaming input or `k ≪ n`: it pays a `log k` factor per element to keep the resident set at `O(k)`, the only cost model that survives an unbounded feed. Quickselect is faster for a static in-memory array when the order among the top `k` does not matter, trading stream support and a worst-case guarantee for a linear average. A full sort wins only when the complete ordering is part of the result, since it does strictly more work than either selection method to produce it.

## Questions

> [!QUESTION]- To find the `k` largest elements, why is the heap a min-heap rather than a max-heap?
> The size-`k` min-heap keeps its root as the smallest of the `k` best elements seen so far — the weakest survivor. A new element is relevant only when it beats that root, which a min-heap exposes as an `O(1)` peek, and when it does the root is the correct element to evict. A max-heap would surface the largest retained element, which is never the one to drop, so it cannot drive the scan.

> [!QUESTION]- Why is the streaming heap `O(n log k)` rather than `O(n log n)`, and where does that matter beyond speed?
> The heap is capped at `k` entries, so each insert or replace is `O(log k)`, giving `O(n log k)` over `n` elements. The bound beats a full sort when `k ≪ n`, but the decisive property is the `O(k)` resident set: it never needs all `n` elements in memory, so it is the only option that runs on a stream too large to hold.

> [!QUESTION]- What disqualifies Quickselect for a top-`k` problem, and what is its worst case?
> Quickselect needs the entire array addressable and mutates it in place, so a streaming or immutable input rules it out. On a static array it is `O(n)` average from geometric partition shrink, but degrades to `O(n²)` when pivots are consistently bad, such as a naive pivot on sorted input. A randomized pivot makes that improbable; median-of-medians guarantees `O(n)` worst case at a larger constant.

## References

- [Kth Largest Element in an Array (LeetCode #215)](https://leetcode.com/problems/kth-largest-element-in-an-array/) — the canonical problem contrasting the size-`k` heap with Quickselect.
- [Quickselect](https://en.wikipedia.org/wiki/Quickselect) — average and worst-case analysis and pivot strategies for partition-based selection.
- [Median of medians](https://en.wikipedia.org/wiki/Median_of_medians) — the deterministic pivot rule that forces Quickselect's worst case to `O(n)`.
- [`PriorityQueue<TElement,TPriority>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — .NET's binary-heap priority queue used for the streaming implementation, including its min-heap ordering contract.
