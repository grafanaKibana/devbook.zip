---
publish: true
created: 2026-07-21T18:52:02.852Z
modified: 2026-07-21T19:06:18.350Z
published: 2026-07-21T19:06:18.350Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Hybrid that runs quicksort but falls back to heap sort on deep recursion, removing the O(n²) tail.
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

Quicksort partitions an array around a pivot and averages `O(n log n)`, but a crafted input can force maximally unbalanced partitions at every level — one element on one side, the rest on the other — collapsing it to `O(n²)` time and `O(n)` recursion depth. Because a runtime exposes its default sort to untrusted data, that quadratic path is a denial-of-service vector rather than a benchmark curiosity.

Introsort (David Musser, 1997) keeps quicksort's partitioning but watches its own recursion depth. Once the current partition exceeds a fixed budget of `2⌊log₂ n⌋` levels — a depth quicksort only reaches when its partitions stay badly unbalanced — it stops recursing and finishes that partition with [[Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]], whose `O(n log n)` worst case is guaranteed. Partitions that shrink below a small threshold (~16 elements) are left partially ordered and swept up by one [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] pass at the end, which is cheaper than recursing over tiny ranges. The average case stays quicksort's; the worst case becomes heap sort's ceiling. Common `std::sort` implementations and .NET's `Array.Sort` use related introspective hybrids, but their exact depth formulas and small-partition handling are implementation-specific.

**Core condition:** [[Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]] speed on ordinary input + a depth counter that hands off to [[Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]] past `2⌊log₂ n⌋` → guaranteed `O(n log n)` time, `O(log n)` stack, no stability guarantee.

The behavior worth animating is the switch itself: quicksort partitioning and recursing until the depth budget hits zero, at which point heap sort takes over the offending partition.

## Trace

This compact trace deliberately lowers the depth limit to `1` and the insertion cutoff to `3`. Those are illustrative values, not runtime defaults: they keep quicksort, the heap fallback, and a visible insertion cleanup inside nine bars.

```steptrace
{ "algorithm": "introsort", "array": [2, 1, 9, 8, 7, 6, 5, 4, 3], "depthLimit": 1, "smallPartitionThreshold": 3 }
```

## Why the worst case stays bounded

The depth budget is `2⌊log₂ n⌋`. Balanced partitions bottom out after about `⌊log₂ n⌋` levels; the factor of two tolerates ordinary imbalance. Reaching the budget means partitions have stayed lopsided level after level — the signature of a run drifting toward `O(n²)`. At that point the current partition is finished with [[Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]] instead of recursing further.

That single rule is what caps the worst case. Every partition either completes inside its depth budget as quicksort or is handed to heap sort, and neither branch exceeds `O(n log n)`. The guarantee comes entirely from the switch — the depth limit is the invariant, not the pivot choice. This guaranteed ceiling, not any speedup, is the reason introsort exists.

The small-partition cutoff is a separate optimization. Ranges below ~16 elements are left unsorted during recursion; because each such range is bounded by pivots already in their final positions, no element sits more than about 16 slots from where it belongs. A single [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] pass over the whole array afterward closes those local gaps in near-linear time. Skipping that pass leaves the array unsorted; recursing on the tiny ranges instead pays the recursion overhead the cutoff exists to avoid.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n log n)` | `O(log n)` | Well-chosen pivots; quicksort completes within the depth budget and heap sort never fires. |
| Average | `O(n log n)` | `O(log n)` | Quicksort's expected partition balance over random pivots. |
| Worst | `O(n log n)` | `O(log n)` | The depth-limit switch finishes adversarial partitions with heap sort — the guaranteed ceiling is the point. |

All three rows share the `O(n log n)` bound: best and average come from the quicksort phase, and the worst case holds to the same order only because heap sort takes over once the depth budget is spent. Auxiliary space is the `O(log n)` recursion stack — recursing on the smaller partition and looping on the larger keeps that depth logarithmic even when partitions are skewed. The average bound assumes pivots (median-of-three or randomized) good enough to keep the heap-sort branch rare; a poor pivot rule does not break the ceiling but makes the branch fire more often, and heap sort's cache behavior then surfaces in the constant factors.

## Boundaries

Introsort provides no stability guarantee once quicksort partitioning or heap sort can run: either phase may move equal keys past one another. A small input handled only by a stable insertion pass can preserve equal-key order, but callers cannot rely on that behavior across input sizes or strategy switches. Sorting records by a single key may therefore lose any secondary ordering carried by the input.

The depth multiplier (`2`) and the small-partition threshold (~16) are tunable and implementation-specific. Raising the multiplier tolerates deeper imbalance before heap sort intervenes; lowering the cutoff recurses further on small ranges before the final pass. Both shift constant factors and the point where the switch fires; neither changes the `O(n log n)` asymptotic guarantee, because that guarantee rests on the switch existing, not on its exact threshold.

The switch reacts to cumulative recursion depth, not to the quality of any single partition. An input tuned to the pivot rule but that never sustains deep imbalance stays under the budget and is sorted entirely by the quicksort phase, at quicksort's normal constant factors — introsort does not make partitioning itself cheaper, it only bounds how long a bad run may continue.

## Reference drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Sort range with depth budget] --> B{Range size at most sixteen}
>   B -->|Yes| C[Leave for final insertion sort pass]
>   B -->|No| D{Depth budget is zero}
>   D -->|Yes| E[Heap sort this range]
>   D -->|No| F[Partition around pivot and decrement budget]
>   F --> G[Recurse on smaller side, loop on larger]
>   G --> B
>   E --> H[Return]
>   C --> H
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void IntroSort(int[] a)
> {
>     if (a.Length < 2)
>         return;
>
>     int depthLimit = 2 * (int)Math.Log2(a.Length);
>     IntroSortRange(a, 0, a.Length - 1, depthLimit);
>     InsertionSort(a);            // single final pass over the whole array
> }
>
> private static void IntroSortRange(int[] a, int lo, int hi, int depth)
> {
>     while (hi - lo + 1 > 16)
>     {
>         if (depth == 0)
>         {
>             HeapSortRange(a, lo, hi);   // depth budget spent: cap the worst case
>             return;
>         }
>
>         depth--;
>         int p = Partition(a, lo, hi);   // linked helper uses the last value as pivot
>         // Recurse on the smaller side, loop on the larger: caps the stack at O(log n).
>         if (p - lo < hi - p)
>         {
>             IntroSortRange(a, lo, p - 1, depth);
>             lo = p + 1;
>         }
>         else
>         {
>             IntroSortRange(a, p + 1, hi, depth);
>             hi = p - 1;
>         }
>     }
>     // Ranges of <= 16 are left for the final insertion-sort pass.
> }
> ```
>
> `Partition`, `HeapSortRange`, and `InsertionSort` are the standard helpers from [[Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]], [[Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]], and [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]]. The load-bearing lines are the `depth == 0` handoff to heap sort and the inclusive range-size check that defers at most 16 values to the single final pass.

## Questions

> [!QUESTION]- What makes introsort switch to heap sort, and why is `2⌊log₂ n⌋` the threshold?
> The switch fires when the current partition's recursion depth reaches `2⌊log₂ n⌋`. Balanced quicksort bottoms out near `⌊log₂ n⌋` levels, so twice that depth is reached only when partitions stay badly unbalanced — the path toward `O(n²)`. Finishing that partition with heap sort caps its cost at `O(n log n)`.

> [!QUESTION]- Why does introsort provide no general stability guarantee?
> Quicksort partitioning and heap sort may both move equal keys past one another. An insertion-only small input can preserve their order, but once either other strategy runs the order is not guaranteed, so callers cannot rely on stability across input sizes.

> [!QUESTION]- Why doesn't an input that is bad for the pivot rule always trigger the fallback?
> The depth limit reacts to cumulative recursion depth, not to any single partition's balance. Imbalance that never sustains past `2⌊log₂ n⌋` levels stays in the quicksort phase and is sorted at quicksort's normal constants; the fallback bounds sustained degeneration, not one bad split.

> [!QUESTION]- The heap-sort branch almost never runs — why keep it?
> Runtimes sort untrusted input, so quicksort's `O(n²)` path is a denial-of-service vector. The branch existing at all is what turns the bound into a contract: whether or not it fires on a given input, no input can exceed `O(n log n)`. The ceiling is a correctness property, not a speedup.

## References

- [Introspective Sorting and Selection Algorithms (David Musser, 1997)](https://www.cs.rpi.edu/~musser/gp/introsort.ps) — the primary source: the depth-limit fallback and the `2·log n` bound.
- [A Killer Adversary for Quicksort (McIlroy, 1999)](https://www.cs.dartmouth.edu/~doug/mdmspe.pdf) — constructs inputs that force median-of-three quicksort to `O(n²)`, the attack the depth switch defends against.
- [Array.Sort Method (.NET API)](https://learn.microsoft.com/dotnet/api/system.array.sort) — documents that `Array.Sort` uses introspective sort and is not stable.
- [.NET `ArraySortHelper` source](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — shows the runtime-specific depth budget and immediate insertion-sort branches for small partitions.
- [Introsort (Wikipedia)](https://en.wikipedia.org/wiki/Introsort) — overview of the depth limit, insertion-sort cutoff, and Musser's design.
