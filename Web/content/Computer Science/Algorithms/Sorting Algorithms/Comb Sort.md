---
publish: true
created: 2026-08-10T06:36:38.090Z
modified: 2026-08-10T06:36:38.090Z
published: 2026-08-10T06:36:38.090Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Bubble sort with a shrinking gap that moves small tail values toward the front sooner.
level:
  - "4"
priority: Medium
status: Creation
---

[[Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]] compares adjacent elements and swaps the inverted ones, sweeping until a pass makes no swap. A small value stranded near the end — a _turtle_ — moves left at most one position per pass, while a large value near the front can race right through a full pass. Comb sort targets that asymmetry.

Comb sort keeps the compare-and-swap but widens the distance between the two compared elements. It starts with a gap of about `n / 1.3` instead of `1`, compares `a[i]` against `a[i + gap]` across the array, then divides the gap by roughly `1.3` on each pass until it reaches `1`. A wide gap carries a turtle up to `gap` positions toward the front in one swap instead of one step at a time; the shrinking gap resolves the increasingly local disorder that remains, and the final `gap == 1` pass is an ordinary bubble sort over a nearly sorted array. Comb sort is to [[Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]] what [[Computer Science/Algorithms/Sorting Algorithms/Shell Sort|Shell Sort]] is to [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] — the same gapped-pass idea layered onto a different base comparison.

**Core condition:** comparison-based swaps → each pass compares elements a shrinking gap apart → wide early gaps move turtles toward the front before the final adjacent pass.

````tabsdown
tab: Visualization



```steptrace
{ "algorithm": "comb-sort", "array": [8, 4, 1, 6, 3, 2], "shrinkFactor": 1.3 }
```



The shrinking gap is the state worth watching: wide pairs move turtles first, then the gap-1 passes remove the remaining adjacent inversions.

#### Why the Gap Accelerates the Sort

A pass at gap `g` walks `i` from `0` while `i + g < n`, comparing `a[i]` with `a[i + g]` and swapping any inverted pair. Unlike [[Computer Science/Algorithms/Sorting Algorithms/Shell Sort|Shell Sort]], the pass does not fully sort the `g` interleaved subsequences — each gap value gets a single sweep before the gap shrinks again. What one wide sweep does change is reach: an element far from its correct side moves up to `g` positions toward it per swap, so a turtle at the tail travels in leaps of `g` rather than steps of `1`.

Correctness does not come from the wide passes; they only rearrange. The loop terminates only when a full pass at `gap == 1` performs no swap. A gap-1 pass with no swap means no adjacent pair is inverted, which for a comparison sort is exactly the certificate that the array is sorted. The wide gaps are a heuristic that leaves few inversions for that final bubble phase to resolve — drop them and comb sort is bubble sort; keep them and the gap-1 phase starts from nearly ordered input.

The shrink factor governs how fast the gap collapses. Lacey and Box selected `1.3` because it minimized comparisons in their experiments on random input. A smaller factor contracts slowly and spends more full sweeps at wide gaps; a larger one reaches `gap == 1` quickly and can leave more turtles for the bubble phase.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Comb Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the input array"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n log n)",
              "curveId": "n-log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Empirically near O(n log n) on random input; generally O(n²)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n²)",
              "curveId": "quadratic"
            }
          ]
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

The performance rests on an empirical constant. `1.3` is not derived from a convergence proof; it is the factor that minimized comparisons in the original experiments. Some gap values also interact badly with real inputs: when the shrink sequence passes through a gap of `9` or `10`, a residual pattern survives that the next pass fails to clear, so the "combsort11" variant forces those gaps to `11`. A hand-tuned special case is a symptom that the sub-quadratic behavior is measured rather than guaranteed — an adversary can still drive the algorithm to `Θ(n²)`.
````

Gapped swaps can reorder equal keys when a wide-gap swap lifts one past the other, and no later pass restores their input order. Bubble sort keeps equal keys in place because it swaps only strictly inverted adjacent pairs; widening the gap removes that guarantee.

# Reference Drawer

> [!ABSTRACT]- Pass structure
>
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
>
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

> [!QUESTION]- Why must comb sort keep running after the gap first reaches `1`?
> Wide-gap passes only reduce disorder; they do not prove the array is sorted. The algorithm needs a complete gap-1 pass with no swaps, because the absence of adjacent inversions is the certificate that the final order is sorted.

# References

- [Comb sort — Wikipedia](https://en.wikipedia.org/wiki/Comb_sort) — origin (Włodzimierz Dobosiewicz, 1980; popularized by Lacey and Box, _BYTE_, 1991), the `1.3` shrink factor, the combsort11 gap fix, and the turtle/rabbit framing.
- [Lacey and Box, “A Fast, Easy Sort,” _BYTE_, April 1991](https://www.worldradiohistory.com/Archive-Byte/90s/1991/Byte-1991-04.pdf) — original Comb Sort article; the experiments on pages 315–318 motivate the `1.3` shrink factor by comparison count.
- [Dobosiewicz, "An efficient variation of bubble sort," _Information Processing Letters_ 11(1), 1980](https://doi.org/10.1016/0020-0190%2880%2990022-8) — the original analysis of shrinking-gap bubble variants that comb sort's shrink factor descends from.
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/) — comb sort's time and space bounds tabulated against the standard comparison sorts.
