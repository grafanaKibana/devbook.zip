---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Alternates disjoint odd and even adjacent compare-swap phases until neither changes the array."
level:
  - "4"
priority: Low
status: Not-Started
publish: true
---

Odd-even sort, also called odd-even transposition sort, alternates between two adjacent compare-swap phases. The odd phase checks `(1,2), (3,4), …`. The even phase checks `(0,1), (2,3), …`. Pairs within one phase do not overlap, so they can run in parallel without writing the same element.

Together, one odd phase and one even phase cover every adjacent boundary. If neither phase swaps, no adjacent inversion remains and the array is sorted. The algorithm is mainly useful as a simple sorting network for parallel processors.

~~~~~tabsdown
tab: Visualization

```steptrace
{ "algorithm": "odd-even-sort", "array": [6, 3, 8, 1, 7, 2, 5, 4] }
```

The trace alternates odd-start and even-start pairs. Values move at most one position per phase, so a value far from its destination needs multiple phases even though comparisons inside a phase are independent.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Odd-Even Sort sequential complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the array"
    }
  },
  "resources": {
    "time": {
      "mode": "cases",
      "entries": [
        { "kind": "case", "role": "Best", "formula": "O(n)", "curveId": "linear" },
        { "kind": "case", "role": "Average", "formula": "O(n²)", "curveId": "quadratic" },
        { "kind": "case", "role": "Worst", "formula": "O(n²)", "curveId": "quadratic" }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        { "kind": "case", "role": "Best", "formula": "O(1)", "curveId": "constant" },
        { "kind": "case", "role": "Average", "formula": "O(1)", "curveId": "constant" },
        { "kind": "case", "role": "Worst", "formula": "O(1)", "curveId": "constant" }
      ]
    }
  }
}
```

With enough processors, one phase performs about `n/2` comparisons concurrently and sorting takes `O(n)` parallel phases, while total work remains `O(n²)`. The plotted table describes sequential execution.
~~~~~

# Phase barriers and stability

The sequential form is stable when it uses a strict `>` comparison, since equal adjacent values never cross. A parallel implementation needs a barrier between phases. Otherwise the next set of comparisons may begin while the previous set still owns array positions.

> [!EXAMPLE]- C# sequential implementation
>
> ```csharp
> public static void OddEvenSort(int[] values)
> {
>     bool swapped;
>     do
>     {
>         swapped = false;
>         foreach (var start in new[] { 1, 0 })
>             for (var i = start; i + 1 < values.Length; i += 2)
>                 if (values[i] > values[i + 1])
>                 {
>                     (values[i], values[i + 1]) = (values[i + 1], values[i]);
>                     swapped = true;
>                 }
>     } while (swapped);
> }
> ```
>
> A real parallel implementation needs a barrier between odd and even phases. Running both phases concurrently would introduce overlapping writes.

# References

- [N. Habermann, “Parallel Neighbor-Sort (or the Glory of the Induction Principle)”](https://apps.dtic.mil/sti/pdfs/AD0759248.pdf)
