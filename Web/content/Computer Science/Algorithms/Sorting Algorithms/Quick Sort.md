---
publish: true
created: 2026-07-10T18:51:00.502Z
modified: 2026-07-10T18:51:00.503Z
published: 2026-07-10T18:51:00.503Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Low
status: Ready to Repeat
---

# Intro

Sorting a large array in place, with no room for a second copy, rules out any method that merges through scratch space. Quick sort works entirely within the input: it picks one element as a pivot and rearranges the array so everything not greater than the pivot sits to its left and everything greater sits to its right. That single pass — the partition — drops the pivot onto the index it will hold in the finished array and cleaves the rest into two runs that share no element's final destination. Each run is then sorted the same way.

The cost is decided before any comparison, by where the pivot lands. A pivot near the median halves the work at every level and the array orders in `~n log n` comparisons. A pivot that is always the smallest or largest element peels off one element per pass, and the same array costs `~n²`.

**Core shape:** partition around a pivot → pivot fixed at its final index, smaller-left / larger-right → two independent subarrays → `O(n log n)` on balanced splits, `O(n²)` on degenerate ones, `O(log n)`–`O(n)` stack.

## One partition, two subproblems

The trace sorts the eight-element array `[8, 3, 5, 1, 9, 2, 7, 4]`, choosing a pivot and partitioning around it before each recursive descent.

```steptrace
{"algorithm":"quick-sort","array":[8,3,5,1,9,2,7,4]}
```

Each partition ends with one bar fixed in place: the pivot has reached the index it occupies in the sorted array and never moves again. Everything to its left is not greater than it, everything to its right is greater, so no later comparison can cross the boundary the pivot draws. The two sides are now separate sorting problems over disjoint index ranges, and quick sort recurses into each without ever consulting the other. The array is ordered once every subrange has shrunk to a single fixed pivot.

## The partition invariant

The implementation below uses the **Lomuto** scheme: a single index `j` scans the range left to right while `i` marks the end of the "not greater than pivot" prefix, and the pivot is held at the last position. Whenever `a[j] <= pivot`, `i` advances and `a[j]` swaps into the prefix; otherwise `j` moves on and the element stays in the "greater" suffix. The loop keeps one invariant: `a[left..i]` are all `≤ pivot` and `a[i+1..j-1]` are all `> pivot`. When `j` reaches the pivot, one final swap moves the pivot to index `i + 1`, between the two regions.

That final swap is what makes recursion valid. The pivot is now at its sorted index — no element `≤` it lies to its right, none greater lies to its left — so sorting `a[left..i]` and `a[i+2..right]` proceeds in isolation. Quick sort never merges the results: correct placement of every pivot is the only combine step.

Because elements are swapped by value inside the shared array, quick sort is **in-place** but **not stable** — a swap can lift an element past an equal one, discarding original order. Equal keys are compared, never tracked.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n log n)` | `O(log n)` | Each partition splits near the middle, so recursion depth is `~log₂ n` and every level does `O(n)` comparison work. |
| Average | `O(n log n)` | `O(log n)` | With a randomized (or median-of-three) pivot, balanced-enough splits are the expected outcome over all inputs; the `log n` depth holds in expectation, not for every input. |
| Worst | `O(n²)` | `O(n)` | Every pivot is the minimum or maximum of its range, so one side holds `n − 1` elements; `n` levels of `O(n)` work, and the recursion nests `n` deep. |

The average bound is a statement about the pivot distribution, not the input: a fixed first-or-last pivot carries no such guarantee and meets its `O(n²)` case on ordered input (below). Auxiliary space counts only the recursion stack — quick sort allocates no output buffer. The `O(n)` worst-case stack reflects the reference code, which recurses into both sides directly; recursing into the smaller side first and looping on the larger caps the live stack at `O(log n)` regardless of pivot quality.

## When partitions degenerate

A first- or last-element pivot turns the expected case into the worst on the most ordinary inputs. On already-sorted or reverse-sorted data every pivot is an extreme value: one partition holds `n − 1` elements, the other holds none, and the recursion becomes a linear chain of `n` frames. That is `O(n²)` comparisons and, because the given code recurses before returning, `O(n)` stack depth — a stack overflow on a large array rather than a slow-but-correct sort. A random pivot, or the median of the first, middle, and last elements, restores the expected `O(n log n)`: an adversarial input can no longer force extreme pivots.

Many equal keys break the two-way scheme for a different reason. Lomuto sends every element `≤ pivot` to the left partition, so an array that is mostly one repeated value piles almost everything on one side of each pivot — the same unbalanced split, now driven by duplicates instead of order. Three-way partitioning (the Dutch national flag) splits into `< pivot`, `= pivot`, and `> pivot`; the entire equal block is placed at once and dropped from both recursive calls, so an array of identical keys finishes in `O(n)`.

## Reference drawer

> [!ABSTRACT]- Recursion structure
>
> ```mermaid
> graph TD
>   A[quickSort A from l to r] --> B{l at least r}
>   B -->|Yes| R[return]
>   B -->|No| C[Choose pivot]
>   C --> D[Partition A around pivot]
>   D --> E[Get pivot index p after partition]
>   E --> F[quickSort A from l to p minus 1]
>   E --> G[quickSort A from p plus 1 to r]
>   F --> R
>   G --> R
> ```

> [!EXAMPLE]- C# implementation (Lomuto partition, randomized pivot)
>
> ```csharp
> private static readonly Random _rng = new();
>
> public static void QuickSort(int[] a, int left, int right)
> {
>     if (left >= right) return;
>
>     // Randomized pivot to avoid O(n²) on sorted/reverse-sorted input
>     int pivotIdx = _rng.Next(left, right + 1);
>     (a[pivotIdx], a[right]) = (a[right], a[pivotIdx]);
>
>     int p = Partition(a, left, right);
>     QuickSort(a, left, p - 1);
>     QuickSort(a, p + 1, right);
> }
>
> private static int Partition(int[] a, int left, int right)
> {
>     int pivot = a[right];
>     int i = left - 1;
>     for (int j = left; j < right; j++)
>     {
>         if (a[j] <= pivot)
>         {
>             i++;
>             (a[i], a[j]) = (a[j], a[i]);
>         }
>     }
>     (a[i + 1], a[right]) = (a[right], a[i + 1]);
>     return i + 1;
> }
> ```
>
> The randomized swap before partitioning is what buys the expected `O(n log n)`. Both recursive calls run directly, so worst-case stack is `O(n)`; recursing into the smaller side first and looping on the larger bounds it to `O(log n)`.

## Comparison

| Algorithm | Average time | Worst time | Auxiliary space | Stable | Distinguishing property |
| --- | --- | --- | --- | --- | --- |
| Quick sort (randomized) | `O(n log n)` | `O(n²)` | `O(log n)` stack | No | In-place with the smallest constants and sequential access; the worst case is rare but real |
| [[Merge Sort]] | `O(n log n)` | `O(n log n)` | `O(n)` buffer | Yes | Guaranteed bound and stable; the natural fit for linked lists and external sorts |
| [[Heap Sort]] | `O(n log n)` | `O(n log n)` | `O(1)` | No | Guaranteed bound fully in place, but scattered access defeats the cache |
| [[Introsort]] | `O(n log n)` | `O(n log n)` | `O(log n)` stack | No | Runs quick sort until recursion passes `2 log₂ n`, then switches to heap sort to cap the worst case |

Quick sort is the default in-place comparison sort: its sequential partition scans use the cache well and its constant factors beat the alternatives on typical in-memory arrays. It pays a genuine `O(n²)` worst case, which introsort removes by falling back to heap sort once recursion runs too deep, and it gives up the stability that merge sort keeps at the cost of an `O(n)` buffer. .NET's `Array.Sort` is introsort for exactly this reason.

## Questions

> [!QUESTION]- Why can the two sides of a partition be sorted without ever combining them?
> Partitioning places the pivot at its final sorted index and guarantees every element to its left is not greater and every element to its right is greater. No element on one side belongs on the other, so the two subranges are independent sorting problems. Correct placement of each pivot is the only merge step quick sort performs.

> [!QUESTION]- What input drives quick sort to `O(n²)` with a first- or last-element pivot, and why?
> Two different inputs, failing for two different reasons. Ordered data — already-sorted or reverse-sorted — makes a fixed first- or last-element pivot the extreme of its range, so each partition peels off one element into an `n − 1` side; `n` levels of `O(n)` work give `O(n²)`. A randomized or median-of-three pivot removes that case. Input dominated by one repeated key degenerates independently of the pivot: Lomuto sends every element `≤ pivot` to the left, so identical keys pile onto one side no matter which pivot is chosen — randomization does not help, and three-way (Dutch-flag) partitioning is the fix.

> [!QUESTION]- Why is quick sort's worst-case stack `O(n)`, and how is it bounded to `O(log n)`?
> Degenerate partitions nest the recursion `n` deep, and a naive version that recurses into both sides holds all those frames. Recursing into the smaller side first and iterating on the larger (tail-call elimination) keeps at most `O(log n)` frames live, because the smaller side is at most half the range.

> [!QUESTION]- What does quick sort trade against merge sort and introsort?
> It gives up stability — swaps move equal elements past one another — which merge sort preserves using an `O(n)` buffer. It also carries an `O(n²)` worst case that introsort caps by switching to heap sort past a recursion-depth limit, while keeping quick sort's fast average case.

## References

- [Quicksort](https://doi.org/10.1093/comjnl/5.1.10) — C. A. R. Hoare's 1962 paper in _The Computer Journal_ introducing partition-based sorting and the two-pointer partition.
- [`ArraySortHelper<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — the introspective sort behind `Array.Sort`: quick sort with a median-of-three pivot and a heap-sort fallback past a depth limit.
- [Quicksort](https://algs4.cs.princeton.edu/23quicksort/) — Sedgewick & Wayne: the partitioning invariant and 3-way (Dutch national flag) partitioning for duplicate-heavy input.
- [Introsort](https://en.wikipedia.org/wiki/Introsort) — Musser's hybrid of quick sort, heap sort, and insertion sort, and the depth limit that guarantees `O(n log n)`.
