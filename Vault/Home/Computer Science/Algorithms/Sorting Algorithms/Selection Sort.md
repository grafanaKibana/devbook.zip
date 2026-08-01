---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Repeatedly selects the minimum of the unsorted suffix; always O(n²) comparisons but only O(n) swaps."
level:
  - "4"
priority: Low
status: Ready to Repeat
publish: true
---

An array must be ordered on a medium where a write costs far more than a comparison — a flash or EEPROM cell rated for a limited number of erase cycles, for instance. Most sorts move elements repeatedly before they settle into their final slots. Selection sort limits that movement: pass `i` scans the unsorted suffix `a[i..n-1]`, finds its minimum, and swaps that minimum into position `i`. The classic guarded implementation performs at most `n − 1` swaps and therefore `O(n)` array writes, whatever the starting order. Index `i` becomes final after its swap, but the other physical position written by that swap remains in the unsorted suffix and may be written again on a later pass.

The scan that finds each minimum is unconditional. It inspects every remaining element, and nothing about the data — already sorted, reversed, random — changes that count. The write budget is linear; the comparison budget is fixed.

**Core condition:** unsorted array, writes dearer than comparisons → at most one swap finalizes each prefix position → at most `n − 1` swaps and `O(n)` array writes, but always `Θ(n²)` comparisons.

~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"selection-sort","array":[8,3,5,1,9,2,7,4]}
```

## Trace

The trace sorts the eight-element array `[8, 3, 5, 1, 9, 2, 7, 4]`.

The first pass scans all eight elements, finds the minimum `1` at index 3, and swaps it with `a[0]`. That swap writes both indices 0 and 3, and it fixes index 0 permanently: no smaller value remains in the suffix, so index 0 is never revisited. Index 3 remains in the unsorted suffix and may be written again. The second pass repeats the scan over `a[1..7]`, now seven elements, and places `2`. Each pass performs at most one swap and shortens the unsorted suffix by one, so the sorted prefix on the left grows by one element per pass while the comparison work on the right falls by one — the sorted region and the scanning cost move in opposite directions.

## Why Each Placement is Final

After pass `i` completes, `a[0..i]` holds the `i + 1` smallest values in sorted order, and each of them is less than or equal to every value still in `a[i+1..n-1]`. Pass `i` establishes that invariant by choosing the true minimum of the suffix: no later pass can surface a smaller value to displace it, so the placement is settled and the prefix stays sorted without ever being re-examined.

The comparison count follows from the scan alone and ignores the data. Pass `i` tests the running minimum against each of the `n − 1 − i` remaining elements; summing `n−1, n−2, …, 1` gives `n(n−1)/2` comparisons — the same total whether the input arrives sorted, reversed, or shuffled. There is no `a[j] < a[min]` shortcut that ends a pass early and no outer flag that notices an already-sorted array, so the algorithm is non-adaptive: a sorted input costs exactly what a reversed one does.

Writes run the opposite way. Each pass ends in at most one swap — no more than `n − 1` across the whole sort. A swap writes two array positions, so the classic implementation performs at most `2(n − 1)` array writes, which is `O(n)`. The prefix position becomes final; the suffix position does not and can be written again. That split, quadratic comparisons against linear writes, is the property that separates selection sort from every other elementary sort.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Selection Sort complexity",
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
          "formula": "Θ(n²)",
          "curveId": "quadratic"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "Θ(n²)",
          "curveId": "quadratic"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "Θ(n²)",
          "curveId": "quadratic"
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```
~~~~~

## Complexity

| Case | Time | Swaps | Auxiliary space | Cause |
| --- | --- | --- | --- | --- |
| Best | `Θ(n²)` | `0` | `O(1)` | Sorted input still triggers all `n(n−1)/2` comparisons; the minimum already sits at `a[i]`, so the guarded swap is skipped every pass. |
| Average | `Θ(n²)` | `O(n)` | `O(1)` | The suffix scan is fixed at `n(n−1)/2` comparisons; roughly `n` out-of-place minima each move once. |
| Worst | `Θ(n²)` | `n − 1` | `O(1)` | Every pass finds its minimum away from `a[i]` and performs its one swap; the comparison count is unchanged from the best case. |

Comparisons dominate the running time and are identical across all three rows — the direct consequence of an unconditional scan. Swaps are the axis that varies, yet even the worst case stays linear at no more than one swap per pass. Auxiliary space is `O(1)`: the sort runs in place over the original array using a handful of index variables.

# Boundaries

Selection sort is not stable, and the instability comes straight from the long-distance swap. Sorting `[5a, 3, 5b, 1]` by value: pass 0 finds the minimum `1` at index 3 and swaps it into `a[0]`, giving `[1, 3, 5b, 5a]`. That swap carried `5a` to the far end, behind `5b`, even though `5a` started ahead of it. Two keys that compared equal have had their original order reversed, and no later pass touches either again. This matters when selection sort runs as a secondary key sort: it silently scrambles the ordering the primary sort established.

A stable variant exists but abandons the write budget that motivates the algorithm. Rather than swapping the minimum into place, it removes the minimum and shifts the intervening elements up by one — the same move [[Insertion Sort]] makes. Preserving equal-key order costs `Θ(n)` writes per pass, restoring the `Θ(n²)` write total that the swap-based form was chosen to avoid.

# Reference Drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> graph TD
>   A[Start array A] --> B[Set i to 0]
>   B --> C{i less than n minus 1}
>   C -->|No| Z[Done]
>   C -->|Yes| D[Set min to i and set j to i plus 1]
>   D --> E{j less than n}
>   E -->|No| L{min != i}
>   L -->|No| G[Increment i]
>   L -->|Yes| F[Swap A at i and A at min]
>   F --> G
>   G --> C
>   E -->|Yes| H{A at j less than A at min}
>   H -->|Yes| I[Set min to j]
>   H -->|No| J[No op]
>   I --> K[Increment j]
>   J --> K
>   K --> E
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void SelectionSort(int[] a)
> {
>     int n = a.Length;
>     for (int i = 0; i < n - 1; i++)
>     {
>         int minIdx = i;
>         for (int j = i + 1; j < n; j++)
>         {
>             if (a[j] < a[minIdx])
>                 minIdx = j;
>         }
>         if (minIdx != i)
>             (a[i], a[minIdx]) = (a[minIdx], a[i]);
>     }
> }
> ```
> The `minIdx != i` guard skips the write when the minimum already sits in place, which is why a sorted input performs zero swaps while still running every comparison.

# Questions

> [!QUESTION]- Why are the comparisons `Θ(n²)` even on already-sorted input?
> The suffix scan is unconditional: pass `i` compares the running minimum against all `n − 1 − i` remaining elements, with no early-exit test and no check for existing order. The `n(n−1)/2` total depends only on `n`, not on arrangement, so a sorted array costs exactly what a reversed one does. The algorithm is non-adaptive.

> [!QUESTION]- Why is standard selection sort unstable, and what does the stable fix cost?
> The swap that places the suffix minimum can carry an equal-keyed element across its partner: `[5a, 3, 5b, 1]` becomes `[1, 3, 5b, 5a]`, reversing the two 5s. Restoring stability means shifting the intervening elements instead of swapping, which raises writes to `Θ(n)` per pass and forfeits the linear-write property that was the reason to use it.

# References

- [Selection sort (Wikipedia)](https://en.wikipedia.org/wiki/Selection_sort) — the exchange count, the non-adaptive comparison total, and the shift-based stable variant.
- [Elementary Sorts (Sedgewick & Wayne, algs4)](https://algs4.cs.princeton.edu/21elementary/) — analysis showing `~N²/2` compares and `N` exchanges, and why the running time is insensitive to input order.
- [Sorting visualizations (VisuAlgo)](https://visualgo.net/en/sorting) — side-by-side animation of the elementary sorts, useful for contrasting selection sort's swap count with bubble and insertion sort.
