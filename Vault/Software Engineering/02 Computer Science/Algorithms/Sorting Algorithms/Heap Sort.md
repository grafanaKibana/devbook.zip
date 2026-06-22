---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
status: Ready to Repeat
dg-publish: true
tags:
  - FolderNote
priority: Low
---

# Intro

Heap sort turns the array into a [[Software Engineering/02 Computer Science/Data Structures/Heap|binary heap]] and then repeatedly extracts the maximum to build the sorted output from the back. It is the only common comparison sort that is **both O(n log n) in the worst case *and* O(1) extra space (in-place)** — the combination merge sort and quicksort each give up one of. That guaranteed worst case with no extra memory is exactly why .NET's `Array.Sort` (introsort) uses heap sort as its **fallback** when quicksort's recursion goes too deep, defending against quicksort's O(n²) blow-up.

## Mechanism

Two phases over the same array:

1. **Build a max-heap** in place via [[Software Engineering/02 Computer Science/Data Structures/Heap|heapify]] — sift down from the last internal node up to the root. This is **O(n)**, not O(n log n).
2. **Sort-down** — repeatedly swap the root (the current maximum) with the last unsorted element, shrink the heap by one, and sift the new root down to restore the heap. Each of the n extractions costs O(log n).

The largest element "bubbles" to the end of the array on each round, growing a sorted suffix while the heap shrinks — all within the original array, no buffer.

```mermaid
graph TD
  A[Build max-heap O(n)] --> B[Swap root with last heap element]
  B --> C[Shrink heap by 1]
  C --> D[Sift new root down O(log n)]
  D --> E{heap size > 1}
  E -->|Yes| B
  E -->|No| Z[Sorted]
```

## Complexity

| Case | Time | Space |
|------|------|-------|
| Best | O(n log n) | O(1) |
| Average | O(n log n) | O(1) |
| Worst | O(n log n) | O(1) |

**Properties:** in-place, **not stable**, O(1) extra space, guaranteed O(n log n) regardless of input.

## C# Implementation

```csharp
public static void HeapSort(int[] a)
{
    int n = a.Length;

    // Phase 1: build max-heap (heapify) — O(n)
    for (int i = n / 2 - 1; i >= 0; i--)
        SiftDown(a, i, n);

    // Phase 2: repeatedly move the max to the end
    for (int end = n - 1; end > 0; end--)
    {
        (a[0], a[end]) = (a[end], a[0]);   // largest to its final position
        SiftDown(a, 0, end);               // restore heap on the shrunk range
    }
}

private static void SiftDown(int[] a, int root, int size)
{
    while (true)
    {
        int largest = root, l = 2 * root + 1, r = 2 * root + 2;
        if (l < size && a[l] > a[largest]) largest = l;
        if (r < size && a[r] > a[largest]) largest = r;
        if (largest == root) return;
        (a[root], a[largest]) = (a[largest], a[root]);
        root = largest;
    }
}
```

## When to Use

- **Worst-case guarantee with no extra memory:** when you need O(n log n) *and* O(1) space and cannot tolerate quicksort's O(n²) risk — real-time/embedded contexts, or as a safety net.
- **Introsort fallback:** .NET's `Array.Sort` switches to heap sort once quicksort recursion exceeds ~2·log(n) depth, guaranteeing O(n log n) overall.
- **Selecting the top-k (partial sort):** stop the sort-down phase after k extractions to get the k largest in O(n + k log n) — or just use a bounded heap / `PriorityQueue`.

For general in-memory sorting, `Array.Sort` (introsort) is the right default; heap sort's poor cache locality usually makes it slower than quicksort on average despite the matching asymptotics.

## Pitfalls

- **Not stable** — equal elements can be reordered by the swaps, so heap sort is wrong when you need to preserve the order of equal keys (e.g. a secondary sort). Use [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Merge Sort|merge sort]] or `OrderBy` for stability.
- **Poor cache locality** — sift-down jumps between parent index `i` and children `2i+1`/`2i+2`, which are far apart in memory for large arrays, causing cache misses. This is why heap sort is typically ~2× slower than quicksort in practice even with identical Big-O.
- **Building the heap the slow way** — inserting elements one at a time is O(n log n); the bottom-up heapify above is O(n). Using the slow build wastes the algorithm's one structural advantage.
- **Index errors in sift-down** — off-by-one in the child indices or the `size` bound (which shrinks each round) silently corrupts the result; the `l < size`/`r < size` guards are essential.

## Tradeoffs

| Algorithm | Time (worst) | Space | Stable | Cache | Use when |
|-----------|-------------|-------|--------|-------|----------|
| **Heap sort** | O(n log n) | O(1) | No | Poor | Worst-case guarantee + in-place both required |
| Quick sort (introsort) | O(n log n) (introsort) | O(log n) | No | Excellent | General-purpose; fastest in practice |
| Merge sort | O(n log n) | O(n) | Yes | Good | Stability required; linked lists; external sort |

**Decision rule**: choose heap sort when you specifically need **guaranteed O(n log n) and O(1) space**. Otherwise use `Array.Sort` (introsort), which already *contains* heap sort as its worst-case shield while getting quicksort's cache-friendly average case.

## Questions

> [!QUESTION]- Why does introsort use heap sort as a fallback instead of just using quicksort?
> Quicksort averages O(n log n) with great cache behaviour but degrades to O(n²) on adversarial pivots. Introsort tracks recursion depth and, when it exceeds ~2·log(n) (a sign quicksort is going quadratic), switches the offending partition to heap sort — which guarantees O(n log n) in O(1) space. You get quicksort's speed normally and heap sort's safety in the worst case.

> [!QUESTION]- Why is building the heap O(n) rather than O(n log n)?
> Bottom-up heapify sifts each node down only as far as its subtree height. Most nodes are near the leaves and barely move; the few near the root are rare. Summing height·count across levels converges to O(n), unlike inserting n elements one at a time (each up to O(log n)) which is O(n log n).

> [!QUESTION]- Why is heap sort usually slower than quicksort despite the same average complexity?
> Cache locality. Quicksort scans memory sequentially during partitioning, which the CPU cache loves. Heap sort's sift-down hops between a parent and its far-apart children (`2i+1`, `2i+2`), causing frequent cache misses on large arrays. Same Big-O, but a worse constant factor in practice.

## References

- [Heapsort (Wikipedia)](https://en.wikipedia.org/wiki/Heapsort) — algorithm, heapify analysis, and stability discussion.
- [Introsort (Wikipedia)](https://en.wikipedia.org/wiki/Introsort) — the hybrid (quick + heap + insertion) used by `Array.Sort`.
- [Sorting algorithms comparison (Big-O Cheat Sheet)](https://www.bigocheatsheet.com/) — time/space complexity of all common sorts side by side.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms|Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Merge Sort|Merge Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]]
> - [[Software Engineering/02 Computer Science/Algorithms/Sorting Algorithms/Selection Sort|Selection Sort]]
<!-- whats-next:end -->
