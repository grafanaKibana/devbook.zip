---
publish: true
created: 2026-07-18T14:02:44.025Z
modified: 2026-08-02T11:09:57.204Z
published: 2026-08-02T11:09:57.204Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Heapifies the array, then repeatedly extracts the maximum into a growing sorted suffix.
level:
  - "4"
status: Creation
priority: Medium
---

An array of comparable keys has to be put in order. Selection sort scans the unsorted region again to find its maximum on every round. The waste is that each scan re-derives an ordering the previous scans already partly established.

Heap sort removes that waste by keeping the unsorted region as a [[Computer Science/Data Structures/Trees/Heap-like/Heap|max-heap]] instead of a flat span. The maximum is always at the root; after extracting it, only one root-to-leaf path may need repair. The node at index `i` stores its children at `2i + 1` and `2i + 2`, so the array itself carries the heap shape.

**Core shape:** array reinterpreted as a max-heap → repeated extract-max grows a sorted suffix from the back → sift-down restores the shrinking heap.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"heap-sort","array":[8,3,5,1,9,2,7,4]}
```



The first phase sifts each internal node down until every parent dominates its children, rearranging the array into a max-heap with nothing yet in its final sorted position. From there every step is identical: the root — the largest remaining key — is swapped with the last cell still inside the heap, the heap boundary retreats by one, and the new root sifts down until heap order holds again. The swapped-out maximum now sits at its final index, so a sorted suffix grows leftward from the end of the array while the heap shrinks toward the front. When the heap holds one element the array is ordered.

#### Array as an Implicit Heap

Heap sort never materialises a tree of node objects. The array *is* the tree: the element at index `i` is the parent of the elements at `2i + 1` and `2i + 2`, and the last node with any child is at `n/2 - 1`. The structure and its full operation set live in [[Computer Science/Data Structures/Trees/Heap-like/Heap|heap]]; heap sort borrows only the max-heap variant and a single primitive, sift-down.

Sift-down repairs one broken position. A value that may be smaller than a child is swapped with the *larger* of its two children, and the check repeats one level lower, stopping when the value dominates both children or reaches a leaf. The invariant it preserves is heap order — every parent is at least as large as each child. The subtrees beside and above the repaired path already satisfied that order and are left untouched, which is what keeps a single repair to the height of one subtree.

Two phases use nothing but sift-down:

1. **Build-heap** runs sift-down from index `n/2 - 1` down to `0`. Going bottom-up means each call descends only through its own subtree, and most nodes sit near the leaves over short subtrees.
2. **Extraction** swaps `a[0]` with the last heap slot, shrinks the heap bound by one, and sifts the new root down over the reduced range. After `n − 1` extractions the array is sorted.

Those swaps are why heap sort is **not stable**: an extraction can carry one of two equal keys across the array past the other, and no step restores their input order.

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

The best curve assumes all keys compare equal, so each sift-down stops after its first child comparisons. The space curves assume iterative sift-down; a recursive version adds call-stack storage.


````

# Stability

Heap geometry does not preserve equal-key order. `2ᵃ, 2ᵇ, 1ᶜ` may emerge as `1ᶜ, 2ᵇ, 2ᵃ`; use a stable sort such as [[Computer Science/Algorithms/Sorting Algorithms/Merge Sort|Merge Sort]] when prior order must survive as a tiebreak.

# Reference Drawer

> [!ABSTRACT]- Phase structure
>
> ```mermaid
> graph TD
>   A["Build max-heap"] --> B[Swap root with last heap element]
>   B --> C[Shrink heap by 1]
>   C --> D["Sift new root down"]
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
>     // Phase 1: build max-heap (heapify)
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

# Questions

> [!QUESTION]- Where does heap sort's instability come from?
> The extraction swaps. Moving the root to the end and sifting a new root down relocates elements by heap geometry, not by input order, so two equal keys can be swapped past each other with nothing to restore their original sequence. Merge sort's merge step, choosing the left element on ties, keeps equal keys in input order.

# References

- [`ArraySortHelper<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — the `IntroSort`/`HeapSort` source behind `Array.Sort`, showing the recursion-depth limit that hands a partition to heap sort.
- [Heapsort (Wikipedia)](https://en.wikipedia.org/wiki/Heapsort) — the bottom-up heap construction, extraction loop, stability, and implementation variants.
- [Introsort (Wikipedia)](https://en.wikipedia.org/wiki/Introsort) — Musser's hybrid of quicksort, heap sort, and insertion sort, and the depth-limit rule that triggers the heap-sort fallback.
