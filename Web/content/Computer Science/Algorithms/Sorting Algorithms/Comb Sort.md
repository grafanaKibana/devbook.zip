---
publish: true
created: 2026-08-20T20:41:15.540Z
modified: 2026-08-20T20:41:15.541Z
published: 2026-08-20T20:41:15.541Z
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

[[Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]] swaps adjacent inversions until a pass makes no swap. A small value near the end, called a _turtle_, can move left by only one position per pass. Comb sort gives it a faster route.

Comb sort keeps compare-and-swap but widens the distance between the elements. It starts with a gap near `n / 1.3`, compares `a[i]` with `a[i + gap]`, and divides the gap by roughly `1.3` after each pass until it reaches `1`. Early wide gaps move turtles several positions at once. The final gap-1 phase runs over a much less disordered array. Comb sort applies to [[Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]] the same gapped-pass idea that [[Computer Science/Algorithms/Sorting Algorithms/Shell Sort|Shell Sort]] applies to [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]].

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

A wide-gap swap can carry one equal key past another, and later passes do not restore their original order. Bubble Sort avoids this because it swaps only strictly inverted adjacent pairs. Comb sort is therefore unstable.

# Diagram and C# Implementation

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
> The condition `gap > 1 || swapped` keeps the gap-1 phase running until a full sweep makes no swap. That final sweep proves the array is sorted. Stopping when the gap first reaches `1` can leave adjacent inversions behind.

# References

- [Dobosiewicz, "An efficient variation of bubble sort," _Information Processing Letters_ 11(1), 1980](https://doi.org/10.1016/0020-0190%2880%2990022-8)
