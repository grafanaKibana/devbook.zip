---
publish: true
created: 2026-08-20T20:41:15.543Z
modified: 2026-08-20T20:41:15.544Z
published: 2026-08-20T20:41:15.544Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Stable divide-and-conquer sort that repeatedly merges ordered runs.
level:
  - "4"
priority: Low
status: Ready to Repeat
---

A sequential data source or a linked list has no cheap random access, so merging fits better than pivot-based array partitioning. Compare the front values of two sorted sequences, emit the smaller one, and advance that side. Merge sort builds the whole algorithm from this operation. It splits by position until every piece holds one element, then merges those runs pairwise. Their lengths double from 1 to 2, 2 to 4, and onward until one sorted run remains.

Ordering happens only during the merge. When both runs are sorted, the smaller front value is the smallest value still waiting in either run. One left-to-right pass can therefore compare only the two fronts and never look back. Splitting uses positions rather than values, so input order does not change the recursion shape.

**Core condition:** two sorted runs → emit the smaller front element → merge pairwise until one ordered run remains.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"merge-sort-tree","array":[8,3,5,1,9,2,7,4]}
```



The decisive step is the final merge. By then the left half has become `[1, 3, 5, 8]` and the right half `[2, 4, 7, 9]`; one pass compares the two fronts, emits the smaller, and advances that read head, producing `[1, 2, 3, 4, 5, 7, 8, 9]` after at most seven comparisons for eight elements. That same merge runs at every level below it — length-1 runs merge into length-2, then length-4 — so the number of comparisons is bounded by the number of levels, `⌈log₂ 8⌉ = 3`, times the n elements each level touches. No comparison depends on how disordered the input was; it depends only on how the two current fronts relate.

#### Why the Merge Stays Sorted

A merge holds one invariant: the output already contains, in sorted order, the smallest elements drawn from the two runs so far, and each run's read head points at the smallest element that run has not yet contributed. Taking the smaller of the two heads appends the next-smallest element overall and advances one head, so both halves of the invariant survive. When one run empties, whatever remains in the other is already sorted and no smaller than anything placed, so it copies over directly.

Nothing sorts on the way down. The split only partitions indices, and the leaves are single elements that are already sorted. Every comparison happens in the merges on the way up; input order does not change that split-and-merge schedule.

Stability rides on one comparison. The left run holds the elements that appeared earlier in the original array, so on a tie the merge must emit the left element first to keep equal keys in their original order. The implementation does this with `a[i] <= a[j]`: equal keys take the left branch. Switching to `a[i] < a[j]` pulls the right element ahead on ties and quietly makes the sort unstable — the whole distinction between a stable and an unstable merge is that one operator.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Merge Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the input sequence being merged"
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
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(n)",
          "curveId": "linear"
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

The auxiliary figure is the merge buffer. A top-down array merge sort copies each merge's output into an `O(n)` scratch array and adds `O(log n)` call-stack space for the recursion; a bottom-up variant merges adjacent runs of width 1, 2, 4… in loops and keeps the `O(n)` buffer while dropping the stack entirely. A linked-list merge is the outlier: splicing existing nodes needs `O(1)` merge workspace. Top-down list merge sort still uses `O(log n)` total auxiliary space for recursion, while a bottom-up list implementation can keep total auxiliary space at `O(1)`.

````

# Diagram and C# Implementation

> [!ABSTRACT]- Divide-and-merge structure
>
> ```mermaid
> graph TD
>   A[mergeSort A from l to r] --> B{size at most 1}
>   B -->|Yes| R[return]
>   B -->|No| C[Compute mid]
>   C --> D[mergeSort A from l to mid]
>   C --> E[mergeSort A from mid plus 1 to r]
>   D --> F[merge two sorted halves]
>   E --> F
>   F --> R
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void MergeSort(int[] a, int left, int right)
> {
>     if (left >= right) return;
>
>     int mid = left + (right - left) / 2;
>     MergeSort(a, left, mid);
>     MergeSort(a, mid + 1, right);
>     Merge(a, left, mid, right);
> }
>
> private static void Merge(int[] a, int left, int mid, int right)
> {
>     int[] temp = new int[right - left + 1];
>     int i = left, j = mid + 1, k = 0;
>
>     while (i <= mid && j <= right)
>         temp[k++] = a[i] <= a[j] ? a[i++] : a[j++];
>
>     while (i <= mid)  temp[k++] = a[i++];
>     while (j <= right) temp[k++] = a[j++];
>
>     Array.Copy(temp, 0, a, left, temp.Length);
> }
> ```
>
> The `a[i] <= a[j]` comparison keeps the merge stable. This teaching version allocates a temporary array for each merge. A production implementation normally reuses one shared buffer.

# References

- [Mergesort](https://algs4.cs.princeton.edu/22mergesort/)
