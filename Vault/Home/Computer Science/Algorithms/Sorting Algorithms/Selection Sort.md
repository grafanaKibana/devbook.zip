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
# Intro

An array must be ordered on a medium where a write costs far more than a comparison — a flash or EEPROM cell rated for a limited number of erase cycles, for instance. Most sorts move an element many times before it settles into its final slot, and each of those moves is a write. Selection sort commits each element with a single write instead: pass `i` scans the unsorted suffix `a[i..n-1]`, finds its minimum, and swaps that minimum into position `i`. Every position is written at most once, so ordering an n-element array costs at most `n − 1` swaps, whatever the starting order.

The scan that finds each minimum is unconditional. It inspects every remaining element, and nothing about the data — already sorted, reversed, random — changes that count. The write budget is minimal; the comparison budget is fixed.

**Core condition:** unsorted array, writes dearer than comparisons → one swap places each element's final value → at most `n − 1` writes but always `Θ(n²)` comparisons.

## One pass

The trace sorts the eight-element array `[8, 3, 5, 1, 9, 2, 7, 4]`.

```steptrace
{"algorithm":"selection-sort","array":[8,3,5,1,9,2,7,4]}
```

The first pass scans all eight elements, finds the minimum `1` at index 3, and swaps it with `a[0]`. That single write fixes index 0 permanently: no smaller value remains in the suffix, so index 0 is never revisited. The second pass repeats the scan over `a[1..7]`, now seven elements, and places `2`. Each pass performs one swap and shortens the unsorted suffix by one, so the sorted prefix on the left grows by one element per pass while the comparison work on the right falls by one — the sorted region and the scanning cost move in opposite directions.

## Why each placement is final

After pass `i` completes, `a[0..i]` holds the `i + 1` smallest values in sorted order, and each of them is less than or equal to every value still in `a[i+1..n-1]`. Pass `i` establishes that invariant by choosing the true minimum of the suffix: no later pass can surface a smaller value to displace it, so the placement is settled and the prefix stays sorted without ever being re-examined.

The comparison count follows from the scan alone and ignores the data. Pass `i` tests the running minimum against each of the `n − 1 − i` remaining elements; summing `n−1, n−2, …, 1` gives `n(n−1)/2` comparisons — the same total whether the input arrives sorted, reversed, or shuffled. There is no `a[j] < a[min]` shortcut that ends a pass early and no outer flag that notices an already-sorted array, so the algorithm is non-adaptive: a sorted input costs exactly what a reversed one does.

Writes run the opposite way. Each pass ends in one swap — `n − 1` across the whole sort in the classic formulation, and never more. That split, quadratic comparisons against linear writes, is the property that separates selection sort from every other elementary sort.

## Complexity

| Case | Time | Swaps | Auxiliary space | Cause |
| --- | --- | --- | --- | --- |
| Best | `Θ(n²)` | `0` | `O(1)` | Sorted input still triggers all `n(n−1)/2` comparisons; the minimum already sits at `a[i]`, so the guarded swap is skipped every pass. |
| Average | `Θ(n²)` | `O(n)` | `O(1)` | The suffix scan is fixed at `n(n−1)/2` comparisons; roughly `n` out-of-place minima each move once. |
| Worst | `Θ(n²)` | `n − 1` | `O(1)` | Every pass finds its minimum away from `a[i]` and performs its one swap; the comparison count is unchanged from the best case. |

Comparisons dominate the running time and are identical across all three rows — the direct consequence of an unconditional scan. Swaps are the axis that varies, yet even the worst case stays linear at one swap per pass. Auxiliary space is `O(1)`: the sort runs in place over the original array using a handful of index variables.

## Boundaries

Selection sort is not stable, and the instability comes straight from the long-distance swap. Sorting `[5a, 3, 5b, 1]` by value: pass 0 finds the minimum `1` at index 3 and swaps it into `a[0]`, giving `[1, 3, 5b, 5a]`. That swap carried `5a` to the far end, behind `5b`, even though `5a` started ahead of it. Two keys that compared equal have had their original order reversed, and no later pass touches either again. This matters when selection sort runs as a secondary key sort: it silently scrambles the ordering the primary sort established.

A stable variant exists but abandons the write budget that motivates the algorithm. Rather than swapping the minimum into place, it removes the minimum and shifts the intervening elements up by one — the same move [[Insertion Sort]] makes. Preserving equal-key order costs `Θ(n)` writes per pass, restoring the `Θ(n²)` write total that the swap-based form was chosen to avoid.

## Reference drawer

> [!ABSTRACT]- Control flow
> ```mermaid
> graph TD
>   A[Start array A] --> B[Set i to 0]
>   B --> C{i less than n minus 1}
>   C -->|No| Z[Done]
>   C -->|Yes| D[Set min to i and set j to i plus 1]
>   D --> E{j less than n}
>   E -->|No| F[Swap A at i and A at min]
>   F --> G[Increment i]
>   G --> C
>   E -->|Yes| H{A at j less than A at min}
>   H -->|Yes| I[Set min to j]
>   H -->|No| J[No op]
>   I --> K[Increment j]
>   J --> K
>   K --> E
> ```

> [!EXAMPLE]- C# implementation
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

## Comparison

| Algorithm | Average time | Writes | Stable | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Selection sort | `Θ(n²)` | `≤ n − 1` swaps | No | Writes cost far more than comparisons (flash, EEPROM) | Comparisons are the bottleneck, or stability is required |
| [[Bubble Sort]] | `Θ(n²)` | `O(n²)` swaps | Yes | A flagged early exit detects already-sorted input | Its swap count is worse on random or reversed input when a write is the dear operation |
| [[Insertion Sort]] | `Θ(n²)` | `O(n²)` shifts, `O(n)` when nearly sorted | Yes | Small or nearly-sorted input, or stability is needed | Large random input, where shifts accumulate |
| [[Heap Sort]] | `Θ(n log n)` | `O(n log n)` | No | Large input where "repeatedly extract the extreme" must scale | Small arrays, and cache locality weaker than quicksort |

Selection sort and [[Bubble Sort]] share the same `Θ(n²)` comparison cost, but bubble sort spends it in `Θ(n²)` swaps, so selection sort dominates it outright wherever a write is the expensive operation — the only setting either belongs in. [[Insertion Sort]] carries the identical asymptotic comparison cost yet collapses to `Θ(n)` on nearly-sorted data and keeps equal keys in order, which makes it the better default across ordinary in-memory workloads. The one property that keeps selection sort alive is its write budget: on flash or EEPROM, where an erase-write cycle costs orders of magnitude more than a compare and the cells wear out, capping the sort at `n − 1` swaps is worth the fixed quadratic scan. When the aim is instead to scale the "repeatedly extract the minimum" idea itself, [[Heap Sort]] replaces the linear suffix scan with a heap that surrenders its extreme in `O(log n)`, turning the whole sort into `O(n log n)`.

## Questions

> [!QUESTION]- Why are the comparisons `Θ(n²)` even on already-sorted input?
> The suffix scan is unconditional: pass `i` compares the running minimum against all `n − 1 − i` remaining elements, with no early-exit test and no check for existing order. The `n(n−1)/2` total depends only on `n`, not on arrangement, so a sorted array costs exactly what a reversed one does. The algorithm is non-adaptive.

> [!QUESTION]- What single property justifies selection sort, and over which sibling?
> Its write budget: at most `n − 1` swaps, one per pass, against the `Θ(n²)` swaps of [[Bubble Sort]] and the `Θ(n²)` shifts of [[Insertion Sort]] on unfavourable input. That only matters where a write is far costlier than a comparison — flash or EEPROM with wear limits. On ordinary RAM the advantage is invisible and insertion sort wins.

> [!QUESTION]- Why is standard selection sort unstable, and what does the stable fix cost?
> The swap that places the suffix minimum can carry an equal-keyed element across its partner: `[5a, 3, 5b, 1]` becomes `[1, 3, 5b, 5a]`, reversing the two 5s. Restoring stability means shifting the intervening elements instead of swapping, which raises writes to `Θ(n)` per pass and forfeits the linear-write property that was the reason to use it.

> [!QUESTION]- How does heap sort descend from selection sort?
> Both repeatedly extract the current extreme. Selection sort locates it with an `O(n)` linear scan of the unsorted region, giving `Θ(n²)`. [[Heap Sort]] stores that region as a heap that yields its extreme in `O(log n)`, so the same "select the extreme `n` times" strategy runs in `O(n log n)`.

## References

- [Selection sort (Wikipedia)](https://en.wikipedia.org/wiki/Selection_sort) — the exchange count, the non-adaptive comparison total, and the shift-based stable variant.
- [Elementary Sorts (Sedgewick & Wayne, algs4)](https://algs4.cs.princeton.edu/21elementary/) — analysis showing `~N²/2` compares and `N` exchanges, and why the running time is insensitive to input order.
- [Sorting visualizations (VisuAlgo)](https://visualgo.net/en/sorting) — side-by-side animation of the elementary sorts, useful for contrasting selection sort's swap count with bubble and insertion sort.
