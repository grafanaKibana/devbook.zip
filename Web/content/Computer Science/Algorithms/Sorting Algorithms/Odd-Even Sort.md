---
publish: true
created: 2026-08-10T07:58:46.989Z
modified: 2026-08-10T08:02:51.071Z
published: 2026-08-10T08:02:51.071Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Alternates disjoint odd and even adjacent compare-swap phases until neither changes the array.
level:
  - "4"
priority: Low
status: Not-Started
---

Odd-even sort, or odd-even transposition sort, alternates two adjacent compare-swap phases. The odd phase compares `(1,2), (3,4), …`; the even phase compares `(0,1), (2,3), …`. Pairs within one phase are disjoint, so they can run in parallel without writing the same element.

A complete odd/even phase pair covers every adjacent boundary. If neither phase swaps, no adjacent inversion exists and the array is sorted. The algorithm matters mainly as a simple sorting network for parallel processors.

````tabsdown
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
````

# Boundary and implementation

Strict `>` comparison makes the sequential form stable because equal adjacent values never cross. A real parallel implementation needs a barrier between phases so the next set does not start while the previous set still owns array positions.

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
> A real parallel implementation needs a barrier between odd and even phases; running both phases concurrently would introduce overlapping writes.

# Questions

> [!QUESTION]- Why can comparisons inside one phase run concurrently?
> Every pair is disjoint, so no two comparisons read or write the same array position during that phase.

> [!QUESTION]- What does a swap-free pair of phases prove?
> Odd and even phases together cover every adjacent boundary. If none is inverted, the array is sorted.

# References

- [N. Habermann, “Parallel Neighbor-Sort (or the Glory of the Induction Principle)”](https://apps.dtic.mil/sti/pdfs/AD0759248.pdf) — the 1972 primary report proving the alternating neighbor-sort process.
- [NIST Dictionary of Algorithms and Data Structures: sorting](https://www.nist.gov/dads/HTML/sort.html) — authoritative terminology for comparison sorting and mutation of the input array.
