---
publish: true
created: 2026-07-12T14:27:20.414Z
modified: 2026-07-18T11:30:04.513Z
published: 2026-07-18T11:30:04.513Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Divide-and-conquer sort that is stable and O(n log n) in all cases at the cost of O(n) space.
level:
  - "4"
priority: Low
status: Ready to Repeat
---

A dataset too large to hold in memory, or a linked list with no random access, rules out the in-place array sorts that quick sort and heap sort rely on. What stays cheap is merging: combining two already-sorted sequences into one takes a single linear pass — compare the two front elements, emit the smaller, advance that side, and repeat. Merge sort turns all of sorting into that one operation. It splits the input by position until each piece holds one element — a run of length 1 is sorted by definition — then merges runs pairwise, doubling the sorted run length each pass: 1 into 2, 2 into 4, up to a single run of length n.

The merge is the only place ordering happens, and it is valid because of one fact: when both runs are sorted, the smaller of their two front elements is the smallest element neither run has placed yet. A single left-to-right pass therefore merges two runs totalling m elements in `O(m)` time, comparing only their fronts and never looking back. Because the split is by position rather than by value, the recursion has the same shape — `⌈log₂ n⌉` levels of n elements — for sorted, reversed, or random input, which pins the total cost at `O(n log n)` in every case.

**Core condition:** two sorted runs → one linear-time merge takes the smaller front element → `⌈log₂ n⌉` merge levels → `O(n log n)` time on every input, `O(n)` merge buffer for arrays.

# Splitting, then merging

The trace sorts the eight-element array `[8, 3, 5, 1, 9, 2, 7, 4]`.

```steptrace
{"algorithm":"merge-sort","array":[8,3,5,1,9,2,7,4]}
```

The decisive step is the final merge. By then the left half has become `[1, 3, 5, 8]` and the right half `[2, 4, 7, 9]`; one pass compares the two fronts, emits the smaller, and advances that read head, producing `[1, 2, 3, 4, 5, 7, 8, 9]` after at most seven comparisons for eight elements. That same merge runs at every level below it — length-1 runs merge into length-2, then length-4 — so the number of comparisons is bounded by the number of levels, `⌈log₂ 8⌉ = 3`, times the n elements each level touches. No comparison depends on how disordered the input was; it depends only on how the two current fronts relate.

# Why the merge stays sorted

A merge holds one invariant: the output already contains, in sorted order, the smallest elements drawn from the two runs so far, and each run's read head points at the smallest element that run has not yet contributed. Taking the smaller of the two heads appends the next-smallest element overall and advances one head, so both halves of the invariant survive. When one run empties, whatever remains in the other is already sorted and no smaller than anything placed, so it copies over directly.

Nothing sorts on the way down. The split only partitions indices, and the leaves are single elements that are already sorted. Every comparison happens in the merges on the way up, which is why the algorithm's behaviour does not depend on the initial arrangement — there is no pivot to unbalance and no run to detect.

Stability rides on one comparison. The left run holds the elements that appeared earlier in the original array, so on a tie the merge must emit the left element first to keep equal keys in their original order. The implementation does this with `a[i] <= a[j]`: equal keys take the left branch. Switching to `a[i] < a[j]` pulls the right element ahead on ties and quietly makes the sort unstable — the whole distinction between a stable and an unstable merge is that one operator.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n log n)` | `O(n)` | Positional split gives `⌈log₂ n⌉` levels regardless of order; no early exit shortcuts a sorted input. |
| Average | `O(n log n)` | `O(n)` | Same recursion tree; element values decide which head is taken, not how many merges run. |
| Worst | `O(n log n)` | `O(n)` | No partition to skew and no termination test, so the bound is a ceiling rather than an expectation. |

The auxiliary figure is the merge buffer. A top-down array merge sort copies each merge's output into an `O(n)` scratch array and adds `O(log n)` call-stack space for the recursion; a bottom-up variant merges adjacent runs of width 1, 2, 4… in loops and keeps the `O(n)` buffer while dropping the stack entirely. A linked-list merge sort is the outlier: it splices existing nodes by pointer instead of copying, so it needs only `O(1)` extra cells beyond the `O(log n)` stack, and it never asks for `a[mid]` by index.

# Where the memory goes

The `O(n)` buffer is not incidental. A comparison-only merge of two sorted array segments cannot be done in place without extra work, because writing the next output element would overwrite an input element that has not been read yet. In-place merge variants exist — block merge and related "in-place merge sort" schemes — that keep the `O(n log n)` time bound while pushing auxiliary space toward `O(1)`, but they replace the single linear copy with rotations and block swaps, run several times slower in practice, and are harder to keep stable. The standard tradeoff is therefore explicit: pay `O(n)` memory for a simple, fast, stable merge, or pay a constant-factor slowdown for `O(1)` space.

Where the input is sequential rather than indexed, the buffer stops mattering for a different reason. External merge sort streams sorted runs off disk, merges them with the same take-the-smaller-front rule, and streams the result back, so a dataset larger than RAM is sorted with predictable sequential I/O rather than random seeks. Timsort ([[Tim Sort]]) generalizes the same core: it scans the input for runs that are already ascending or descending and merges them with the identical front-comparison rule, layering galloping and a minimum run length on top. Merge sort's merge step is the primitive both of those build on.

# Reference drawer

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
> The `a[i] <= a[j]` comparison is what keeps the merge stable. This version allocates a buffer inside every `Merge` call; a production implementation hoists one shared `n`-element buffer instead, cutting allocations from `O(n log n)` to `O(1)`.

# Questions

> [!QUESTION]- Why is merge sort `O(n log n)` on every input, with no faster best case?
> The split is by position, not by value, so the recursion tree has the same `⌈log₂ n⌉` levels for sorted, reversed, or random input, and every level merges all n elements. Element values only decide which read head is taken at each step, not how many merges run, and there is no early-exit test on an already-sorted input.

> [!QUESTION]- What single line makes the array merge stable, and why?
> The comparison `a[i] <= a[j]`, which emits the left run's element on a tie. The left run holds elements that appeared earlier in the original array, so taking it first preserves the original order of equal keys. Using `a[i] < a[j]` instead emits the right element on ties and makes the sort unstable.

> [!QUESTION]- Why does a linked-list merge sort need only `O(1)` extra space while the array version needs `O(n)`?
> A linked-list merge re-links existing nodes by pointer, so it never copies elements into a scratch array and never needs index access to `a[mid]`. The array merge must write its output somewhere while both inputs are still being read, which forces an `O(n)` buffer. Both still carry `O(log n)` recursion-stack space.

> [!QUESTION]- What does an in-place block merge trade to remove the `O(n)` buffer?
> It keeps the `O(n log n)` time bound but replaces the single linear copy with rotations and block swaps, adding a constant-factor slowdown and making stability harder to preserve. The buffer exists to avoid overwriting unread input; removing it means doing that bookkeeping with in-place moves instead.

# References

- [Mergesort](https://algs4.cs.princeton.edu/22mergesort/) — Princeton Algorithms: top-down and bottom-up merge, the stability argument, and the doubling of run lengths.
- [Merge sort](https://en.wikipedia.org/wiki/Merge_sort) — stability proof, bottom-up variant, and the external / multiway merge used for out-of-core data.
- [listsort.txt](https://github.com/python/cpython/blob/main/Objects/listsort.txt) — CPython's description of Timsort: run detection and galloping merge built on the same take-the-smaller-front rule.
