---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Heapifies the array then repeatedly extracts the max; a common in-place comparison sort with guaranteed Θ(n log n) worst-case time."
level:
  - "4"
status: Creation
publish: true
priority: Medium
---

An array of `n` comparable keys has to be put in order. Selection sort produces the answer by scanning the unsorted region for its maximum on every round — each scan is `O(n)`, and `n` scans cost `O(n²)`. The waste is that each scan re-derives an ordering the previous scans already partly established.

Heap sort removes that waste by keeping the unsorted region as a [[Heap|max-heap]] instead of a flat span. The maximum is then always at the root, read in `O(1)`, and removing it costs only `O(log n)` to repair the heap rather than `O(n)` to rescan. The heap lives inside the same array — the node at index `i` stores its children at `2i + 1` and `2i + 2` — so nothing is allocated beyond the input.

**Core shape:** array reinterpreted as an in-place max-heap → repeated extract-max grows a sorted suffix from the back → guaranteed `O(n log n)` time in `O(1)` auxiliary space.

~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"heap-sort","array":[8,3,5,1,9,2,7,4]}
```

# Trace

The trace sorts the eight-element array `[8, 3, 5, 1, 9, 2, 7, 4]`.

The first phase makes a single bottom-up pass, sifting each internal node down until every parent dominates its children; this rearranges the whole array into a max-heap in `O(n)`, with nothing yet in its final sorted position. From there every step is identical: the root — the largest remaining key — is swapped with the last cell still inside the heap, the heap boundary retreats by one, and the new root sifts down until heap order holds again. The swapped-out maximum now sits at its final index, so a sorted suffix grows leftward from the end of the array while the heap shrinks toward the front. When the heap holds one element the array is ordered.

# Array as an Implicit Heap

Heap sort never materialises a tree of node objects. The array *is* the tree: the element at index `i` is the parent of the elements at `2i + 1` and `2i + 2`, and the last node with any child is at `n/2 - 1`. The structure and its full operation set live in [[Heap]]; heap sort borrows only the max-heap variant and a single primitive, sift-down.

Sift-down repairs one broken position. A value that may be smaller than a child is swapped with the *larger* of its two children, and the check repeats one level lower, stopping when the value dominates both children or reaches a leaf. The invariant it preserves is heap order — every parent is at least as large as each child. The subtrees beside and above the repaired path already satisfied that order and are left untouched, which is what keeps a single repair to the height of one subtree.

Two phases use nothing but sift-down:

1. **Build-heap** runs sift-down from index `n/2 - 1` down to `0`. Going bottom-up means each call only has to descend its own subtree, and most nodes sit near the leaves over short subtrees; summing subtree heights across all nodes converges to `O(n)`, not `O(n log n)`.
2. **Extraction** swaps `a[0]` with the last heap slot, shrinks the heap bound by one, and sifts the new root down over the reduced range. After `n − 1` extractions the array is sorted.

Both phases move data only by swapping array cells, so no auxiliary buffer is needed — heap sort is in-place. Those same swaps are why it is **not stable**: an extraction swap can carry one of two equal keys across the array past the other, and no step restores their input order.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Heap Sort complexity",
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
          "formula": "Θ(n)",
          "curveId": "linear"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "Θ(n log n)",
          "curveId": "n-log-n"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "Θ(n log n)",
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

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n)` | `O(1)` | With all-equal keys, every sift-down stops after its first child comparisons, so build and extraction are both linear. |
| Average | `Θ(n log n)` | `O(1)` | The `Θ(n)` build is followed by `n − 1` extractions whose sift-downs average logarithmic depth. |
| Worst | `Θ(n log n)` | `O(1)` | Each extraction can sift through the heap's full `Θ(log n)` height, but no arrangement creates a deeper path. |

The absence of a quadratic bad case is the point: the `Θ(n)` build plus at most `n` logarithmic-height extractions keeps the worst case at `Θ(n log n)`, which is exactly where heap sort differs from quicksort. An array of all-equal keys is the best case: every sift-down stops on its first child comparisons and the whole sort collapses to `Θ(n)`. The `O(1)` space assumes the iterative sift-down in the drawer below — a recursive sift-down adds `O(log n)` of call-stack space.

# Where the Layout Costs

**Memory locality.** Sift-down follows a nonsequential path through the array: the root's children are adjacent at indices `1` and `2`, but each descent moves from `i` to `2i + 1` or `2i + 2`, so the jumps grow deeper in the heap. Those accesses can cross cache lines in a pattern that is harder to prefetch than quicksort's contiguous partition scan. This locality cost is one reason introsort runs quicksort by default and only falls back to heap sort when the recursion-depth limit is reached.

**Stability.** Label three items by key and input position: `2ᵃ, 2ᵇ, 1ᶜ`. Nothing in build-heap or extraction preserves the `a`-before-`b` order of the two equal keys; the extraction swaps relocate them by heap geometry, so the sorted result may emerge as `1ᶜ, 2ᵇ, 2ᵃ`, silently reversing the pair. A stable sort such as [[Merge Sort]] keeps `2ᵃ` ahead of `2ᵇ`, which matters when the keys are a secondary sort over an already-meaningful order.

# Reference Drawer

> [!ABSTRACT]- Phase structure
>
> ```mermaid
> graph TD
>   A["Build max-heap O(n)"] --> B[Swap root with last heap element]
>   B --> C[Shrink heap by 1]
>   C --> D["Sift new root down O(log n)"]
>   D --> E{heap size > 1}
>   E -->|Yes| B
>   E -->|No| Z[Sorted]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void HeapSort(int[] a)
> {
>     int n = a.Length;
>
>     // Phase 1: build max-heap (heapify) — O(n)
>     for (int i = n / 2 - 1; i >= 0; i--)
>         SiftDown(a, i, n);
>
>     // Phase 2: repeatedly move the max to the end
>     for (int end = n - 1; end > 0; end--)
>     {
>         (a[0], a[end]) = (a[end], a[0]);   // largest to its final position
>         SiftDown(a, 0, end);               // restore heap on the shrunk range
>     }
> }
>
> private static void SiftDown(int[] a, int root, int size)
> {
>     while (true)
>     {
>         int largest = root, l = 2 * root + 1, r = 2 * root + 2;
>         if (l < size && a[l] > a[largest]) largest = l;
>         if (r < size && a[r] > a[largest]) largest = r;
>         if (largest == root) return;
>         (a[root], a[largest]) = (a[largest], a[root]);
>         root = largest;
>     }
> }
> ```
> `size` is the live heap boundary and shrinks each extraction round; the `l < size` / `r < size` guards keep sift-down out of the sorted suffix. The iterative loop is what holds auxiliary space at `O(1)`.

# Questions

> [!QUESTION]- Why does build-heap cost `O(n)` rather than `O(n log n)`?
> Bottom-up sift-down moves each node down only as far as its own subtree height. Most nodes are near the leaves and barely descend; only the few near the root can travel `log n`. Summing height × count across the levels converges to `O(n)`. Inserting `n` elements one at a time, by contrast, pays up to `O(log n)` each and totals `O(n log n)`.

> [!QUESTION]- Where does heap sort's instability come from?
> The extraction swaps. Moving the root to the end and sifting a new root down relocates elements by heap geometry, not by input order, so two equal keys can be swapped past each other with nothing to restore their original sequence. Merge sort's merge step, choosing the left element on ties, keeps equal keys in input order.

# References

- [`ArraySortHelper<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — the `IntroSort`/`HeapSort` source behind `Array.Sort`, showing the recursion-depth limit that hands a partition to heap sort.
- [Heapsort (Wikipedia)](https://en.wikipedia.org/wiki/Heapsort) — sift-down, the summation proving the `O(n)` build, and the stability argument.
- [Introsort (Wikipedia)](https://en.wikipedia.org/wiki/Introsort) — Musser's hybrid of quicksort, heap sort, and insertion sort, and the depth-limit rule that triggers the heap-sort fallback.
