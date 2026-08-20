---
publish: true
created: 2026-08-20T20:41:15.546Z
modified: 2026-08-20T20:41:15.546Z
published: 2026-08-20T20:41:15.546Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Partitions around a pivot, fixes it in place, then recursively sorts both sides.
level:
  - "4"
priority: Low
status: Ready to Repeat
---

Quick sort chooses a pivot and partitions the active range around it. Values not greater than the pivot move left. Greater values move right. The partition places the pivot at its final index, leaving two independent ranges that can be sorted by the same procedure.

The pivot position determines the recursion tree. A pivot near the median divides the work roughly in half. Repeatedly choosing an extreme value removes only one element per partition and turns the recursion into a chain.

**Operating idea:** each partition fixes one pivot permanently, then recursion continues on the disjoint ranges beside it.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"quick-sort","array":[8,3,5,1,9,2,7,4]}
```



Each partition ends with one bar fixed in place: the pivot has reached the index it occupies in the sorted array and never moves again. Everything to its left is not greater than it, everything to its right is greater, so no later comparison can cross the boundary the pivot draws. The two sides are now separate sorting problems over disjoint index ranges, and quick sort recurses into each without ever consulting the other. The array is ordered once every subrange has shrunk to a single fixed pivot.

#### The partition invariant

The implementation below uses the **Lomuto** scheme: a single index `j` scans the range left to right while `i` marks the end of the "not greater than pivot" prefix, and the pivot is held at the last position. Whenever `a[j] <= pivot`, `i` advances and `a[j]` swaps into the prefix; otherwise `j` moves on and the element stays in the "greater" suffix. The loop keeps one invariant: `a[left..i]` are all `≤ pivot` and `a[i+1..j-1]` are all `> pivot`. When `j` reaches the pivot, one final swap moves the pivot to index `i + 1`, between the two regions.

That final swap is what makes recursion valid. The pivot is now at its sorted index — no element `≤` it lies to its right, none greater lies to its left — so sorting `a[left..i]` and `a[i+2..right]` proceeds in isolation. Quick sort never merges the results: correct placement of every pivot is the only combine step.

Quick sort is **not stable**: a swap can lift an element past an equal one, discarding original order. Equal keys are compared, never tracked.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Quick Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the array being partitioned"
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
          "formula": "O(n log n) expected",
          "curveId": "n-log-n"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(n²)",
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
          "formula": "O(log n)",
          "curveId": "log-n"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(log n) expected",
          "curveId": "log-n"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```

A deterministic first- or last-element pivot makes already sorted and reverse-sorted input a worst case. On already-sorted or reverse-sorted data every pivot is an extreme value: one partition holds `n − 1` elements, the other holds none, and the recursion becomes a linear chain of `n` frames. That is `O(n²)` comparisons and, because the given code recurses before returning, `O(n)` stack depth — a stack overflow on a large array rather than a slow-but-correct sort. With distinct keys, choosing each pivot uniformly at random gives expected `O(n log n)` for any fixed input. Median-of-three improves ordinary ordered inputs but remains deterministic: a constructed input can still force extreme partitions and `O(n²)`.

Many equal keys break the two-way scheme for a different reason. Lomuto sends every element `≤ pivot` to the left partition, so an array that is mostly one repeated value piles almost everything on one side of each pivot — the same unbalanced split, now driven by duplicates instead of order. Three-way partitioning (the Dutch national flag) splits into `< pivot`, `= pivot`, and `> pivot`; the entire equal block is placed at once and dropped from both recursive calls, so an array of identical keys finishes in `O(n)`.
````

# Diagram and C# Implementation

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
>     // Randomize the pivot before partitioning distinct keys.
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

# References

- [Quicksort](https://doi.org/10.1093/comjnl/5.1.10)
- [Quicksort](https://algs4.cs.princeton.edu/23quicksort/)
