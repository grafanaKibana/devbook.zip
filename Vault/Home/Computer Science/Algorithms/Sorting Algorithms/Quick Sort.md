---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Partitions around a pivot, fixes it in place, then recursively sorts both sides."
level:
  - "4"
priority: Low
status: Ready to Repeat
publish: true
---

# Intro

Quick sort picks one element as a pivot and rearranges the array so everything not greater than the pivot sits to its left and everything greater sits to its right. That single pass — the partition — drops the pivot onto the index it will hold in the finished array and cleaves the rest into two runs that share no element's final destination. Each run is then sorted the same way.

The pivot position decides the recursion shape. A pivot near the median splits the remaining work evenly; a pivot that is always the smallest or largest element peels off one element per pass and leaves the recursion maximally unbalanced.

**Core shape:** partition around a pivot → pivot fixed at its final index, smaller-left / larger-right → recursively sort two independent subarrays.

~~~~~tabsdown
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

A first- or last-element pivot turns the expected case into the worst on the most ordinary inputs. On already-sorted or reverse-sorted data every pivot is an extreme value: one partition holds `n − 1` elements, the other holds none, and the recursion becomes a linear chain of `n` frames. That is `O(n²)` comparisons and, because the given code recurses before returning, `O(n)` stack depth — a stack overflow on a large array rather than a slow-but-correct sort. With distinct keys, choosing each pivot uniformly at random gives expected `O(n log n)` for any fixed input. Median-of-three improves ordinary ordered inputs but remains deterministic: a constructed input can still force extreme partitions and `O(n²)`.

Many equal keys break the two-way scheme for a different reason. Lomuto sends every element `≤ pivot` to the left partition, so an array that is mostly one repeated value piles almost everything on one side of each pivot — the same unbalanced split, now driven by duplicates instead of order. Three-way partitioning (the Dutch national flag) splits into `< pivot`, `= pivot`, and `> pivot`; the entire equal block is placed at once and dropped from both recursive calls, so an array of identical keys finishes in `O(n)`.
~~~~~

## Reference drawer

> [!ABSTRACT]- Recursion structure
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

## Questions

> [!QUESTION]- Why can the two sides of a partition be sorted without ever combining them?
> Partitioning places the pivot at its final sorted index and guarantees every element to its left is not greater and every element to its right is greater. No element on one side belongs on the other, so the two subranges are independent sorting problems. Correct placement of each pivot is the only merge step quick sort performs.

## References

- [Quicksort](https://doi.org/10.1093/comjnl/5.1.10) — C. A. R. Hoare's 1962 paper in *The Computer Journal* introducing partition-based sorting and the two-pointer partition.
- [`ArraySortHelper<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — the introspective sort behind `Array.Sort`: quick sort with a median-of-three pivot and a heap-sort fallback past a depth limit.
- [Quicksort](https://algs4.cs.princeton.edu/23quicksort/) — Sedgewick & Wayne: the partitioning invariant and 3-way (Dutch national flag) partitioning for duplicate-heavy input.
- [Introsort (Wikipedia)](https://en.wikipedia.org/wiki/Introsort) — the quicksort/heap-sort hybrid used to cap repeated pivot degeneration in production sort implementations.
