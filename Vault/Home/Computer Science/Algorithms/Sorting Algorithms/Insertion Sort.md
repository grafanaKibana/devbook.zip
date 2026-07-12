---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Grows a sorted prefix by inserting each element into place; fast on small or nearly-sorted inputs."
level:
  - "4"
priority: Low
status: Ready to Repeat
publish: true
---
# Intro

A mostly-ordered array arrives—a sorted log with a few late entries appended out of sequence. Re-sorting it with a general algorithm discards the order that is already present and pays the same cost as sorting random data. Insertion sort keeps that order: it treats the elements left of the current position as a sorted prefix and folds one more element into that prefix per step.

Each incoming element—the key—is compared against the prefix from its right end leftward. Every element larger than the key copies one slot to the right, opening a gap; the key drops into the gap. Because the prefix was sorted before the key arrived, one leftward pass suffices: the walk stops at the first element that is not larger than the key, and everything it shifted was already in order relative to itself.

**Core condition:** a sorted prefix and one incoming key → shift the larger prefix elements right until the key lands → `O(n)` when few elements move, `O(n²)` when every key crosses the whole prefix, `O(1)` auxiliary space.

## One pass

The trace sorts the eight-element array `[8, 3, 5, 1, 9, 2, 7, 4]`, extending the sorted prefix one key at a time.

```steptrace
{"algorithm":"insertion-sort","array":[8,3,5,1,9,2,7,4]}
```

The prefix left of the active index is sorted before each step and stays sorted after it. When a key is smaller than its left neighbour, every larger prefix element copies one position right until a smaller element—or the start of the array—halts the walk, and the key fills the vacated slot. A key that already fits, like `9` following `1, 3, 5, 8`, triggers no shift and the prefix simply grows by one. The number of shifts a key performs equals the count of larger elements standing to its left, so the further a key is out of place, the more work it does.

## Why the sorted prefix holds

Before iteration `j`, the subarray `a[0..j-1]` holds the first `j` elements in sorted order. The step copies `a[j]` into `key`, then scans left while `a[i] > key`, moving each such element into `a[i+1]`. The loop stops at the first `a[i] <= key` (or at `i = -1`) and writes `key` into `a[i+1]`. Nothing left of that slot exceeds `key`, and everything right of it was already shifted up, so `a[0..j]` is sorted—the invariant carries to the next iteration.

Two properties fall out of the shift-and-drop move:

- **Stable.** The scan stops on the first element that is `<=` the key rather than `<`, so an incoming element never crosses an equal one already placed. Equal keys keep their original relative order.
- **In-place.** The only storage beyond the array is `key` and two indices, so auxiliary space is `O(1)`. Elements move by copying within the array, not into a second buffer.

The cost of one step is its shift count, which equals the number of prefix elements greater than the key. On already-sorted input that count is zero everywhere: the inner loop tests one neighbour, fails, and advances, for `O(n)` total. This adaptivity is why insertion sort serves as the base case inside larger sorts—[[Merge Sort]]-based hybrids such as [[Tim Sort|Timsort]] sort short runs with it before merging, and [[Introsort]] falls back to it once a quicksort partition drops below roughly sixteen elements. At that size the guaranteed-small shift count beats the overhead of recursion and pivot selection.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n)` | `O(1)` | Input already sorted; each key tests one neighbour and shifts nothing. |
| Average | `O(n²)` | `O(1)` | A random key crosses about half the prefix; expected inversions are `n(n-1)/4`. |
| Worst | `O(n²)` | `O(1)` | Reverse-sorted input; every key shifts the whole prefix, `n(n-1)/2` moves. |

The bound is set by element shifts, not comparisons. In the average and worst cases the two counts differ only by an additive `O(n)` term, so both are `Θ(n²)`; in the best case the comparisons stay `O(n)` while the shifts fall to zero. The shifts are the physical array movement, which is what makes them the deciding cost.

## When shifts dominate

Reverse-sorted input is the worst case because it maximizes shifts: the key at index `j` is smaller than all `j` elements to its left, so it walks the full prefix every time. Sorting `[5, 4, 3, 2, 1]` performs `4 + 3 + 2 + 1 = 10` shifts for five elements, the quadratic `n(n-1)/2` pattern. The result is never wrong, only slow.

Cutting comparisons does not fix this. Since the prefix is sorted, [[Binary Search]] can locate the key's slot in `O(log j)` comparisons instead of a linear scan—binary insertion sort. But locating the slot is not the bottleneck: the elements between the slot and the key still shift right one at a time, so the array movement stays `O(n²)`. Binary insertion only pays off when a comparison costs far more than a move, such as ordering long strings through an expensive comparator.

## Reference drawer

> [!ABSTRACT]- Control flow
> ```mermaid
> graph TD
>   A[Start array A] --> B[Set j to 1]
>   B --> C{j less than n}
>   C -->|No| Z[Done]
>   C -->|Yes| D[Set key to A at j and set i to j minus 1]
>   D --> E{i nonneg and A at i greater than key}
>   E -->|Yes| F[Shift right and decrement i]
>   F --> E
>   E -->|No| G[Insert key at i plus 1]
>   G --> H[Increment j]
>   H --> C
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public static void InsertionSort(int[] a)
> {
>     for (int j = 1; j < a.Length; j++)
>     {
>         int key = a[j];
>         int i = j - 1;
>         while (i >= 0 && a[i] > key)
>         {
>             a[i + 1] = a[i];
>             i--;
>         }
>         a[i + 1] = key;
>     }
> }
> ```
> The strict `a[i] > key` test is what makes the sort stable; relaxing it to `>=` would shift equal elements and reverse their original order.

## Comparison

| Algorithm | Time (avg / best) | Space | Stable | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Insertion sort | `O(n²)` / `O(n)` | `O(1)` | Yes | Small or nearly-sorted arrays; hybrid base case | Large unordered input |
| [[Bubble Sort]] | `O(n²)` / `O(n)` | `O(1)` | Yes | Same bounds and stability | A swap per inversion moves more data than a single shift |
| [[Selection Sort]] | `O(n²)` / `O(n²)` | `O(1)` | No | Writes are the scarce resource—only `n-1` swaps | No adaptivity; unstable; always scans for the minimum |
| [[Shell Sort]] | `~O(n^1.3)` / `O(n log n)` | `O(1)` | No | Mid-size arrays with no spare memory | Not stable; bound depends on the gap sequence |
| [[Merge Sort]] | `O(n log n)` / `O(n log n)` | `O(n)` | Yes | Large arrays needing a guaranteed stable `O(n log n)` | Allocation overhead loses to insertion sort on tiny inputs |

Insertion sort is the default for small and nearly-sorted arrays and the base case that `O(n log n)` sorts drop into for small partitions: it allocates nothing, stays stable, and reaches linear time when little is out of place. [[Bubble Sort]] matches its bounds but moves more data per inversion; [[Selection Sort]] trades adaptivity and stability for the fewest writes; [[Shell Sort]] breaks the one-step-at-a-time shift to reach sub-quadratic time without extra memory. Against a true `O(n log n)` sort such as [[Merge Sort]], the quadratic shift count is decisive as `n` grows—that crossover, a few dozen elements, is exactly where the hybrids stop delegating to insertion sort.

## Questions

> [!QUESTION]- What keeps the prefix sorted after each insertion?
> The inner loop shifts every prefix element greater than the key one slot right and stops at the first element `<= key`. The key is written into that gap, so nothing to its left is larger and everything to its right was already ordered; `a[0..j]` is sorted for the next step.

> [!QUESTION]- Why is reverse-sorted input the worst case?
> Each key is smaller than every element already placed, so it shifts the entire prefix before landing at the front. The shifts sum to `n(n-1)/2`, making the run `O(n²)`—the maximum possible number of inversions.

> [!QUESTION]- Why does binary insertion sort not lower the asymptotic time?
> Binary search finds the insertion slot in `O(log j)` comparisons, but the elements between that slot and the key must still be shifted right one at a time. The shifts stay `O(n²)`, so the total is unchanged; only comparison-heavy workloads gain.

> [!QUESTION]- Why do Timsort and Introsort fall back to insertion sort on small partitions?
> On a few dozen elements the quadratic term is small and bounded, while insertion sort allocates nothing, accesses memory sequentially, and reaches `O(n)` on the nearly-sorted runs those algorithms produce. Below the crossover it beats the recursion and constant-factor overhead of an `O(n log n)` sort.

## References

- [Insertion sort (Wikipedia)](https://en.wikipedia.org/wiki/Insertion_sort) — the shift-based algorithm, the binary insertion variant, and the move-count analysis behind the `O(n²)` bound.
- [`ArraySortHelper<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — `Array.Sort`'s introspective sort switches to an `InsertionSort` routine for small partitions; the runtime's real base case.
- [`listsort.txt` (CPython)](https://github.com/python/cpython/blob/main/Objects/listsort.txt) — Tim Peters's notes on Timsort, including the binary insertion sort that builds minimal runs before merging.
