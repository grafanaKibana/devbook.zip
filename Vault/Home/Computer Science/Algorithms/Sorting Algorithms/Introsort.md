---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Hybrid that runs quicksort but falls back to heap sort when recursion becomes too deep."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

Quicksort partitions an array around a pivot. A crafted input can force the worst split at every level: one element on one side and everything else on the other. When a standard library sorts untrusted data, this repeated degeneration creates a denial-of-service risk.

Introsort, introduced by David Musser in 1997, keeps quicksort's partitioning and tracks recursion depth. Once a partition spends its budget of `2⌊log₂ n⌋` levels, it stops recursing and finishes that range with [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]]. Small partitions, often around 16 elements, are left partially ordered for one final [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] pass. This avoids recursive overhead on tiny ranges. Common `std::sort` implementations and .NET's `Array.Sort` use related hybrids, though their depth formulas and small-partition rules differ.

**Core condition:** quicksort partitioning + a depth counter that hands off to [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]] past `2⌊log₂ n⌋` → insertion sort finishes tiny partitions.

~~~~~tabsdown
tab: Visualization



```steptrace
{ "algorithm": "introsort", "array": [2, 1, 9, 8, 7, 6, 5, 4, 3], "depthLimit": 1, "smallPartitionThreshold": 3 }
```



This compact trace deliberately lowers the depth limit to `1` and the insertion cutoff to `3`. Those are illustrative values, not runtime defaults: they keep quicksort, the heap fallback, and a visible insertion cleanup inside nine bars.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Introsort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the input array"
    }
  },
  "resources": {
    "time": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(log n)",
          "curveId": "log-n"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(log n)",
          "curveId": "log-n"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(log n)",
          "curveId": "log-n"
        }
      ]
    }
  }
}
```

The depth budget is `2⌊log₂ n⌋`. Balanced partitions bottom out after about `⌊log₂ n⌋` levels; the factor of two tolerates ordinary imbalance. Reaching the budget means partitions have stayed lopsided level after level — the signature of a run drifting toward `O(n²)`. At that point the current partition is finished with [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]] instead of recursing further.

The small-partition cutoff is a separate optimization. Ranges below ~16 elements are left unsorted during recursion; because each such range is bounded by pivots already in their final positions, no element sits more than about 16 slots from where it belongs. A single [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] pass over the whole array afterward closes those local gaps in near-linear time. Skipping that pass leaves the array unsorted; recursing on the tiny ranges instead pays the recursion overhead the cutoff exists to avoid.

The depth multiplier (`2`) and the small-partition threshold (~16) are tunable and implementation-specific. Raising the multiplier tolerates deeper imbalance before heap sort intervenes; lowering the cutoff recurses further on small ranges before the final pass. Both shift constant factors and the point where the switch fires; neither changes the `O(n log n)` asymptotic guarantee, because that guarantee rests on the switch existing, not on its exact threshold.

~~~~~

Introsort does not preserve equal-key order once quicksort partitioning or heap sort runs. A small input may happen to use only the insertion-sort finish, but that does not make the algorithm stable.

# Diagram and C# Implementation

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
>         // Recurse on the smaller side, then loop on the larger side.
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
> `Partition`, `HeapSortRange`, and `InsertionSort` are the standard helpers from [[Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]], [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]], and [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]]. The load-bearing lines are the `depth == 0` handoff to heap sort and the inclusive range-size check that defers at most 16 values to the single final pass.

# References

- [Introspective Sorting and Selection Algorithms (David Musser, 1997)](https://www.cs.rpi.edu/~musser/gp/introsort.ps)
- [.NET `ArraySortHelper` source](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs)
