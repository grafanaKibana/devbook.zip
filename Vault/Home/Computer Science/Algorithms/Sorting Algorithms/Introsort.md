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

Quicksort partitions an array around a pivot, but a crafted input can force maximally unbalanced partitions at every level — one element on one side, the rest on the other. Because a runtime exposes its default sort to untrusted data, that repeated degeneration is a denial-of-service vector rather than a benchmark curiosity.

Introsort (David Musser, 1997) keeps quicksort's partitioning but watches its own recursion depth. Once the current partition exceeds a fixed budget of `2⌊log₂ n⌋` levels — a depth quicksort only reaches when its partitions stay badly unbalanced — it stops recursing and finishes that partition with [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]]. Partitions that shrink below a small threshold (about 16 elements) are left partially ordered and swept up by one [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] pass at the end, avoiding recursive overhead on tiny ranges. Common `std::sort` implementations and .NET's `Array.Sort` use related introspective hybrids, but their exact depth formulas and small-partition handling are implementation-specific.

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
      "description": "number of input elements or states"
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

Introsort does not preserve equal-key order once quicksort partitioning or heap sort runs; callers cannot infer stability from a small input that happened to use only the insertion-sort finish.

# Reference Drawer

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

# Questions

> [!QUESTION]- Why does introsort provide no general stability guarantee?
> Quicksort partitioning and heap sort may both move equal keys past one another. An insertion-only small input can preserve their order, but once either other strategy runs the order is not guaranteed, so callers cannot rely on stability across input sizes.

> [!QUESTION]- Why doesn't an input that is bad for the pivot rule always trigger the fallback?
> The depth limit reacts to cumulative recursion depth, not to any single partition's balance. Imbalance that never sustains past `2⌊log₂ n⌋` levels stays in the quicksort phase and is sorted at quicksort's normal constants; the fallback bounds sustained degeneration, not one bad split.

# References

- [Introspective Sorting and Selection Algorithms (David Musser, 1997)](https://www.cs.rpi.edu/~musser/gp/introsort.ps) — the primary source: the depth-limit fallback and the `2·log n` bound.
- [A Killer Adversary for Quicksort (McIlroy, 1999)](https://www.cs.dartmouth.edu/~doug/mdmspe.pdf) — primary construction of inputs that defeat deterministic median-of-three quicksort, motivating introsort's defensive fallback.
- [Array.Sort Method (.NET API)](https://learn.microsoft.com/dotnet/api/system.array.sort) — documents that `Array.Sort` uses introspective sort and is not stable.
- [.NET `ArraySortHelper` source](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — shows the runtime-specific depth budget and immediate insertion-sort branches for small partitions.
- [Introsort (Wikipedia)](https://en.wikipedia.org/wiki/Introsort) — overview of the depth limit, insertion-sort cutoff, and Musser's design.
