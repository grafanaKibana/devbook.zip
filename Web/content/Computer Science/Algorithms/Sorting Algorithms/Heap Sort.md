---
publish: true
created: 2026-07-12T14:27:20.413Z
modified: 2026-07-12T14:27:20.413Z
published: 2026-07-12T14:27:20.413Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Heapifies the array then repeatedly extracts the max; the only common O(n log n), in-place comparison sort.
level:
  - "4"
status: Creation
priority: Medium
---

# Intro

An array of `n` comparable keys has to be put in order. Selection sort produces the answer by scanning the unsorted region for its maximum on every round — each scan is `O(n)`, and `n` scans cost `O(n²)`. The waste is that each scan re-derives an ordering the previous scans already partly established.

Heap sort removes that waste by keeping the unsorted region as a [[Heap|max-heap]] instead of a flat span. The maximum is then always at the root, read in `O(1)`, and removing it costs only `O(log n)` to repair the heap rather than `O(n)` to rescan. The heap lives inside the same array — the node at index `i` stores its children at `2i + 1` and `2i + 2` — so nothing is allocated beyond the input.

**Core shape:** array reinterpreted as an in-place max-heap → repeated extract-max grows a sorted suffix from the back → guaranteed `O(n log n)` time in `O(1)` auxiliary space.

## One sort

The trace sorts the eight-element array `[8, 3, 5, 1, 9, 2, 7, 4]`.

```steptrace
{"algorithm":"heap-sort","array":[8,3,5,1,9,2,7,4]}
```

The first phase makes a single bottom-up pass, sifting each internal node down until every parent dominates its children; this rearranges the whole array into a max-heap in `O(n)`, with nothing yet in its final sorted position. From there every step is identical: the root — the largest remaining key — is swapped with the last cell still inside the heap, the heap boundary retreats by one, and the new root sifts down until heap order holds again. The swapped-out maximum now sits at its final index, so a sorted suffix grows leftward from the end of the array while the heap shrinks toward the front. When the heap holds one element the array is ordered.

## Array as an implicit heap

Heap sort never materialises a tree of node objects. The array _is_ the tree: the element at index `i` is the parent of the elements at `2i + 1` and `2i + 2`, and the last node with any child is at `n/2 - 1`. The structure and its full operation set live in [[Heap]]; heap sort borrows only the max-heap variant and a single primitive, sift-down.

Sift-down repairs one broken position. A value that may be smaller than a child is swapped with the _larger_ of its two children, and the check repeats one level lower, stopping when the value dominates both children or reaches a leaf. The invariant it preserves is heap order — every parent is at least as large as each child. The subtrees beside and above the repaired path already satisfied that order and are left untouched, which is what keeps a single repair to the height of one subtree.

Two phases use nothing but sift-down:

1. **Build-heap** runs sift-down from index `n/2 - 1` down to `0`. Going bottom-up means each call only has to descend its own subtree, and most nodes sit near the leaves over short subtrees; summing subtree heights across all nodes converges to `O(n)`, not `O(n log n)`.
2. **Extraction** swaps `a[0]` with the last heap slot, shrinks the heap bound by one, and sifts the new root down over the reduced range. After `n − 1` extractions the array is sorted.

Both phases move data only by swapping array cells, so no auxiliary buffer is needed — heap sort is in-place. Those same swaps are why it is **not stable**: an extraction swap can carry one of two equal keys across the array past the other, and no step restores their input order.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n log n)` | `O(1)` | `Θ(n)` build, then `n − 1` extractions each sift down up to the heap's `Θ(log n)` height. |
| Average | `O(n log n)` | `O(1)` | Same two phases; input order shifts constants, not the bound. |
| Worst | `O(n log n)` | `O(1)` | No arrangement forces a sift-down deeper than the tree's height — there is no degenerate input. |

The absence of a bad case is the point: the `Θ(n)` build plus `n` extractions of `Θ(log n)` hold for every input, which is exactly where heap sort differs from quicksort. The one real exception is an array of all-equal keys, where every sift-down stops on its first comparison and the whole sort collapses to `Θ(n)`; it is an edge case, not something to plan around. The `O(1)` space assumes the iterative sift-down in the drawer below — a recursive sift-down adds `O(log n)` of call-stack space.

## Where the layout costs

**Memory locality.** Sift-down's access pattern is the opposite of sequential: from index `i` it reaches to `2i + 1` and `2i + 2`, and near the root of a large array those children lie half the array away. Successive descents touch cells on different cache lines that the prefetcher cannot anticipate, so heap sort takes cache misses exactly where quicksort's partitioning walks contiguous memory. On large arrays this constant factor commonly makes heap sort roughly twice as slow as quicksort despite the identical `O(n log n)` — and it is why introsort runs quicksort by default and only drops to heap sort under duress.

**Stability.** Label three items by key and input position: `2ᵃ, 2ᵇ, 1ᶜ`. Nothing in build-heap or extraction preserves the `a`-before-`b` order of the two equal keys; the extraction swaps relocate them by heap geometry, so the sorted result may emerge as `1ᶜ, 2ᵇ, 2ᵃ`, silently reversing the pair. A stable sort such as [[Merge Sort]] keeps `2ᵃ` ahead of `2ᵇ`, which matters when the keys are a secondary sort over an already-meaningful order.

## Reference drawer

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
>
> `size` is the live heap boundary and shrinks each extraction round; the `l < size` / `r < size` guards keep sift-down out of the sorted suffix. The iterative loop is what holds auxiliary space at `O(1)`.

## Questions

> [!QUESTION]- Why does build-heap cost `O(n)` rather than `O(n log n)`?
> Bottom-up sift-down moves each node down only as far as its own subtree height. Most nodes are near the leaves and barely descend; only the few near the root can travel `log n`. Summing height × count across the levels converges to `O(n)`. Inserting `n` elements one at a time, by contrast, pays up to `O(log n)` each and totals `O(n log n)`.

> [!QUESTION]- Where does heap sort's instability come from?
> The extraction swaps. Moving the root to the end and sifting a new root down relocates elements by heap geometry, not by input order, so two equal keys can be swapped past each other with nothing to restore their original sequence. Merge sort's merge step, choosing the left element on ties, keeps equal keys in input order.

## References

- [`ArraySortHelper<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — the `IntroSort`/`HeapSort` source behind `Array.Sort`, showing the recursion-depth limit that hands a partition to heap sort.
- [Heapsort (Wikipedia)](https://en.wikipedia.org/wiki/Heapsort) — sift-down, the summation proving the `O(n)` build, and the stability argument.
- [Introsort (Wikipedia)](https://en.wikipedia.org/wiki/Introsort) — Musser's hybrid of quicksort, heap sort, and insertion sort, and the depth-limit rule that triggers the heap-sort fallback.
