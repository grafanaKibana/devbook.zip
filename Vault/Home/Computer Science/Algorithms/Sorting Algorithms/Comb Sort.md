---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Bubble sort with a shrinking gap that reduces turtle-driven slowdown on practical inputs."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

[[Home/Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]] compares adjacent elements and swaps the inverted ones, sweeping until a pass makes no swap. Its cost comes from one asymmetry: a small value stranded near the end — a *turtle* — moves left at most one position per pass, so it needs `O(n)` passes to reach the front. Large values near the front ("rabbits") race right in a single pass; the mismatch is what pins bubble sort at `Θ(n²)`.

Comb sort keeps the compare-and-swap but widens the distance between the two compared elements. It starts with a gap of about `n / 1.3` instead of `1`, compares `a[i]` against `a[i + gap]` across the array, then divides the gap by roughly `1.3` on each pass until it reaches `1`. A wide gap carries a turtle up to `gap` positions toward the front in one swap instead of one step at a time; the shrinking gap resolves the increasingly local disorder that remains, and the final `gap == 1` pass is an ordinary bubble sort over a nearly sorted array. Comb sort is to [[Home/Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]] what [[Home/Computer Science/Algorithms/Sorting Algorithms/Shell Sort|Shell Sort]] is to [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] — the same gapped-pass idea layered onto a different base comparison.

**Core condition:** comparison-based, in-place swaps → each pass compares elements a shrinking gap apart → wide early gaps evict the turtles that keep bubble sort quadratic.

The shrinking gap is the state worth watching: wide pairs move turtles first, then the gap-1 passes remove the remaining adjacent inversions.

```steptrace
{ "algorithm": "comb-sort", "array": [8, 4, 1, 6, 3, 2], "shrinkFactor": 1.3 }
```

## Why the gap accelerates the sort

A pass at gap `g` walks `i` from `0` while `i + g < n`, comparing `a[i]` with `a[i + g]` and swapping any inverted pair. Unlike [[Home/Computer Science/Algorithms/Sorting Algorithms/Shell Sort|Shell Sort]], the pass does not fully sort the `g` interleaved subsequences — each gap value gets a single sweep before the gap shrinks again. What one wide sweep does change is reach: an element far from its correct side moves up to `g` positions toward it per swap, so a turtle at the tail travels in leaps of `g` rather than steps of `1`.

Correctness does not come from the wide passes; they only rearrange. The loop terminates only when a full pass at `gap == 1` performs no swap. A gap-1 pass with no swap means no adjacent pair is inverted, which for a comparison sort is exactly the certificate that the array is sorted. The wide gaps are a heuristic that leaves few inversions for that final bubble phase to resolve — drop them and comb sort is bubble sort; keep them and the gap-1 phase starts from nearly ordered input.

The shrink factor governs how fast the gap collapses. Lacey and Box selected `1.3` because it minimized comparisons in their experiments on random input. A smaller factor contracts slowly and spends more full sweeps at wide gaps; a larger one reaches `gap == 1` quickly and can leave more turtles for the bubble phase.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n log n)` | `O(1)` | Even sorted input runs one sweep per gap value; the gap sequence has `Θ(log n)` terms, each an `O(n)` sweep. There is no `O(n)` early-exit shortcut. |
| Average | Empirically near `O(n log n)` on random input; generally `O(n²)` | `O(1)` | Measurements with the `1.3` shrink factor are near linearithmic, but no tight average-case bound is established. |
| Worst | `Θ(n²)` | `O(1)` | Adversarial inputs where the wide passes achieve little leave a quadratic gap-1 bubble phase; the bound tracks the chosen shrink factor. |

The near-`O(n log n)` average is an empirical observation on random inputs, not a proven bound. `O(n²)` remains the safe general upper bound because comb sort has no established sub-quadratic guarantee; its measured behavior depends on the shrink factor rather than a structural argument like the one behind [[Home/Computer Science/Algorithms/Sorting Algorithms/Merge Sort|Merge Sort]] or [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|Heap Sort]]. Auxiliary space is `O(1)` in every case: the algorithm holds only the current gap and a swap temporary, and the loop is iterative, so no call stack grows.

## Where the guarantees thin out

The performance rests on an empirical constant. `1.3` is not derived from a convergence proof; it is the factor that minimized comparisons in the original experiments. Some gap values also interact badly with real inputs: when the shrink sequence passes through a gap of `9` or `10`, a residual pattern survives that the next pass fails to clear, so the "combsort11" variant forces those gaps to `11`. A hand-tuned special case is a symptom that the sub-quadratic behavior is measured rather than guaranteed — an adversary can still drive the algorithm to `Θ(n²)`.

Gapped swaps also cost stability. Two elements with equal keys can be reordered when a wide-gap swap lifts one past the other, and no later pass restores their input order because comb sort compares by value alone. Bubble sort keeps equal keys in place because it only ever swaps strictly-inverted adjacent pairs; widening the gap is exactly what removes that guarantee. Comb sort is therefore in-place but not stable — unusable where a prior sort order must survive as a tiebreak.

## Reference drawer

> [!ABSTRACT]- Pass structure
> ```mermaid
> flowchart TD
>   A[Start gap equals n] --> B[Shrink gap by factor 1.3]
>   B --> C[Clamp gap to at least one]
>   C --> D[Sweep and swap pairs a gap apart]
>   D --> E{gap is one and no swaps this pass}
>   E -->|No| B
>   E -->|Yes| Z[Array sorted]
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public static void CombSort(int[] a)
> {
>     int n = a.Length;
>     int gap = n;
>     bool swapped = true;
>
>     while (gap > 1 || swapped)
>     {
>         // Shrink the gap by ~1.3 each pass, floor at 1.
>         gap = (int)(gap / 1.3);
>         if (gap < 1) gap = 1;
>
>         swapped = false;
>         for (int i = 0; i + gap < n; i++)
>         {
>             if (a[i] > a[i + gap])
>             {
>                 (a[i], a[i + gap]) = (a[i + gap], a[i]);
>                 swapped = true;
>             }
>         }
>     }
> }
> ```
>
> The loop condition `gap > 1 || swapped` keeps the gap-1 phase running until one sweep makes no swap. That no-swap pass is the sorted certificate; removing it can leave adjacent inversions the wide passes never inspected.

## Questions

> [!QUESTION]- What is a turtle, and how does the gap remove it?
> A turtle is a small value near the end of the array. A bubble-style adjacent pass moves it left one position at a time, so it needs `O(n)` passes to reach the front — the asymmetry that keeps bubble sort quadratic. A wide initial gap compares distant pairs, so one swap can carry the turtle up to `gap` positions toward the front, and the shrinking gap then resolves the remaining local disorder.

> [!QUESTION]- Why is comb sort's sub-quadratic behavior not a guarantee?
> Measurements on random input can look near `O(n log n)` with a `1.3` shrink factor, but that is not a proven average-case bound. No structural argument prevents `Θ(n²)`, and adversarial inputs still reach it. The combsort11 special case for gaps of `9` and `10` exists precisely because the constant was tuned by experiment rather than derived.

## References

- [Comb sort — Wikipedia](https://en.wikipedia.org/wiki/Comb_sort) — origin (Włodzimierz Dobosiewicz, 1980; popularized by Lacey and Box, *BYTE*, 1991), the `1.3` shrink factor, the combsort11 gap fix, and the turtle/rabbit framing.
- [Lacey and Box, “A Fast, Easy Sort,” *BYTE*, April 1991](https://www.worldradiohistory.com/Archive-Byte/90s/1991/Byte-1991-04.pdf) — original Comb Sort article; the experiments on pages 315–318 motivate the `1.3` shrink factor by comparison count.
- [Dobosiewicz, "An efficient variation of bubble sort," *Information Processing Letters* 11(1), 1980](https://doi.org/10.1016/0020-0190%2880%2990022-8) — the original analysis of shrinking-gap bubble variants that comb sort's shrink factor descends from.
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) — comb sort's time and space bounds tabulated against the standard comparison sorts.
