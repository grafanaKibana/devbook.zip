---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Bubble sort with a shrinking gap that kills turtles, curing bubble sort's quadratic flaw in practice."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

[[Bubble Sort]] compares adjacent elements and swaps the inverted ones, sweeping until a pass makes no swap. Its cost comes from one asymmetry: a small value stranded near the end — a *turtle* — moves left at most one position per pass, so it needs `O(n)` passes to reach the front. Large values near the front ("rabbits") race right in a single pass; the mismatch is what pins bubble sort at `Θ(n²)`.

Comb sort keeps the compare-and-swap but widens the distance between the two compared elements. It starts with a gap of about `n / 1.3` instead of `1`, compares `a[i]` against `a[i + gap]` across the array, then divides the gap by roughly `1.3` on each pass until it reaches `1`. A wide gap carries a turtle up to `gap` positions toward the front in one swap instead of one step at a time; the shrinking gap resolves the increasingly local disorder that remains, and the final `gap == 1` pass is an ordinary bubble sort over a nearly sorted array. Comb sort is to [[Bubble Sort]] what [[Shell Sort]] is to [[Insertion Sort]] — the same gapped-pass idea layered onto a different base comparison.

**Core condition:** comparison-based, in-place swaps → each pass compares elements a shrinking gap apart → wide early gaps evict the turtles that keep bubble sort quadratic.

A trace of comb sort on a small array would show the gap contracting across passes as gapped pairs are compared and swapped.

> [!NOTE] Visualization pending
> Planned StepTrace: a shrinking-gap card showing gapped compare-and-swap passes with the gap divided by ~1.3 each pass until it reaches 1. No matching renderer exists in `engine.js` yet.

# Why the gap accelerates the sort

A pass at gap `g` walks `i` from `0` while `i + g < n`, comparing `a[i]` with `a[i + g]` and swapping any inverted pair. Unlike [[Shell Sort]], the pass does not fully sort the `g` interleaved subsequences — each gap value gets a single sweep before the gap shrinks again. What one wide sweep does change is reach: an element far from its correct side moves up to `g` positions toward it per swap, so a turtle at the tail travels in leaps of `g` rather than steps of `1`.

Correctness does not come from the wide passes; they only rearrange. The loop terminates only when a full pass at `gap == 1` performs no swap. A gap-1 pass with no swap means no adjacent pair is inverted, which for a comparison sort is exactly the certificate that the array is sorted. The wide gaps are a heuristic that leaves few inversions for that final bubble phase to resolve — drop them and comb sort is bubble sort; keep them and the gap-1 phase starts from nearly ordered input.

The shrink factor governs how fast the gap collapses. `1.3` is empirical: Lacey and Box selected it, and later analysis refined it, because it minimized total comparisons on random input. A larger factor shrinks the gap too slowly and wastes passes; a smaller one collapses toward `gap == 1` before the wide passes have displaced the turtles.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n log n)` | `O(1)` | Even sorted input runs one sweep per gap value; the gap sequence has `Θ(log n)` terms, each an `O(n)` sweep. There is no `O(n)` early-exit shortcut. |
| Average | `≈ Θ(n log n)` (empirical) | `O(1)` | Commonly cited for the `1.3` shrink factor and modeled as `Θ(n² / 2^p)` for `p` gap shrinks; measured on random data, not a proven bound. |
| Worst | `Θ(n²)` | `O(1)` | Adversarial inputs where the wide passes achieve little leave a quadratic gap-1 bubble phase; the bound tracks the chosen shrink factor. |

The average `≈ Θ(n log n)` is an empirical observation on random inputs, not a proven bound. Comb sort has no established sub-quadratic guarantee, and its analysis rests on the specific shrink factor rather than a structural argument like the one behind [[Merge Sort]] or [[Heap Sort]]. Auxiliary space is `O(1)` in every case: the algorithm holds only the current gap and a swap temporary, and the loop is iterative, so no call stack grows.

# Where the guarantees thin out

The performance rests on an empirical constant. `1.3` is not derived from a convergence proof; it is the factor that minimized comparisons in the original experiments. Some gap values also interact badly with real inputs: when the shrink sequence passes through a gap of `9` or `10`, a residual pattern survives that the next pass fails to clear, so the "combsort11" variant forces those gaps to `11`. A hand-tuned special case is a symptom that the sub-quadratic behavior is measured rather than guaranteed — an adversary can still drive the algorithm to `Θ(n²)`.

Gapped swaps also cost stability. Two elements with equal keys can be reordered when a wide-gap swap lifts one past the other, and no later pass restores their input order because comb sort compares by value alone. Bubble sort keeps equal keys in place because it only ever swaps strictly-inverted adjacent pairs; widening the gap is exactly what removes that guarantee. Comb sort is therefore in-place but not stable — unusable where a prior sort order must survive as a tiebreak.

# Reference drawer

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

# Questions

> [!QUESTION]- What is a turtle, and how does the gap remove it?
> A turtle is a small value near the end of the array. A bubble-style adjacent pass moves it left one position at a time, so it needs `O(n)` passes to reach the front — the asymmetry that keeps bubble sort quadratic. A wide initial gap compares distant pairs, so one swap can carry the turtle up to `gap` positions toward the front, and the shrinking gap then resolves the remaining local disorder.

> [!QUESTION]- Why is comb sort's sub-quadratic behavior not a guarantee?
> The `≈ n log n` figure is an empirical measurement on random input tied to the `1.3` shrink factor, not a proven bound. No structural argument prevents `Θ(n²)`, and adversarial inputs still reach it. The combsort11 special case for gaps of `9` and `10` exists precisely because the constant was tuned by experiment rather than derived.

# References

- [Comb sort — Wikipedia](https://en.wikipedia.org/wiki/Comb_sort) — origin (Włodzimierz Dobosiewicz, 1980; popularized by Lacey and Box, *BYTE*, 1991), the `1.3` shrink factor, the combsort11 gap fix, and the turtle/rabbit framing.
- [Dobosiewicz, "An efficient variation of bubble sort," *Information Processing Letters* 11(1), 1980](https://doi.org/10.1016/0020-0190%2880%2990022-8) — the original analysis of shrinking-gap bubble variants that comb sort's shrink factor descends from.
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) — comb sort's time and space bounds tabulated against the standard comparison sorts.
