---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Runs insertion sort over decreasing gaps so elements jump toward their final positions."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A reverse-sorted array exposes insertion sort's movement problem: it only shifts across adjacent slots, so an element that belongs `k` positions away needs `k` one-slot shifts to get there. Across a fully inverted array, the total shift work equals the number of inversions.

Shell sort attacks that distance before it attacks the order. It runs an insertion sort over elements `h` positions apart (an `h`-sort) for a decreasing sequence of gaps ending at `h = 1`. A move inside an `h`-spaced subsequence relocates an element by `h` slots at once, so a far-out-of-place element can cover much of its journey during the coarse passes. The final `h = 1` pass is a plain insertion sort; earlier passes reduce its remaining displacement on favorable inputs, but the gap sequence determines how much they help.

**Core condition:** a decreasing gap sequence ending at `h = 1` → each pass `h`-sorts interleaved subsequences → the final adjacent pass completes the ordering.

~~~~~tabsdown
tab: Visualization



```steptrace
{ "algorithm": "shell-sort", "array": [9, 8, 7, 6, 5, 4, 3, 2, 1], "gaps": [4, 1] }
```



The shrinking gap is the transition worth animating: after the `h = 4` lanes move distant values close to their destinations, the `h = 1` pass only resolves the remaining local inversions.

#### Why H-sorting Cuts the Shift Work

An array is *`h`-sorted* when `a[i] ≤ a[i + h]` for every valid `i`. A gap-`h` pass treats the array as `h` interleaved subsequences — indices `{0, h, 2h, …}`, `{1, h+1, …}`, and so on — and insertion-sorts each one independently. Because the stride is `h`, a single shift moves an element `h` positions rather than one.

The pass ordering is valid because the sequence ends at gap 1, which directly compares adjacent positions and completes the ordering. Earlier gaps move distant elements toward their destinations; they do not guarantee that every element is already close to its final slot before that last pass.

On the reverse-sorted `[9, 8, 7, 6, 5, 4, 3, 2, 1]`, a gap-4 pass sorts the four subsequences `{9,5,1}`, `{8,4}`, `{7,3}`, `{6,2}` and yields `[1, 4, 3, 2, 5, 8, 7, 6, 9]`. The closing `h = 1` pass then resolves the remaining adjacent disorder.

The algorithm is **not stable**: a shift jumps `h` positions and can carry a key past an equal key sitting between them, and no later pass restores their original relative order.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Shell Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the array"
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
              "formula": "Θ(n log n) for a geometric Θ(log n)-pass sequence",
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
              "formula": "Around n^1.3 in measurements of Ciura-style increments"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(n²) with Shell's n/2, n/4, …; Θ(n^1.5) with Hibbard's 2^k − 1; O(n^4/3) with Sedgewick's"
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

The bound belongs to the gap sequence, not to Shell sort alone. For power-of-two lengths, Shell's original schedule keeps even and odd positions separate until the final pass and retains quadratic worst-case work. Hibbard and Sedgewick sequences improve the proven tail; Ciura's tuned gaps perform well in measurements but have no tight nontrivial asymptotic bound.

There is also no way to buy a proven bound and top speed at once. Pratt's 3-smooth gaps give a proven `Θ(n log² n)` worst case, but they use so many passes that constant factors make them slower in practice than Ciura's unproven-but-fast sequence. A workload that needs a contractual `O(n log n)` guarantee cannot get it from Shell sort — [[Home/Computer Science/Algorithms/Sorting Algorithms/Heap Sort|heap sort]] or [[Home/Computer Science/Algorithms/Sorting Algorithms/Introsort|introsort]] can.

~~~~~

The `h`-stride can lift one equal key over another, so Shell sort is not suitable as a stable secondary sort.

# Reference Drawer

> [!ABSTRACT]- Pass structure
>
> ```mermaid
> flowchart TD
>   A[Input array and gap sequence] --> B[Take next largest gap h]
>   B --> C[Insertion-sort each h-spaced subsequence]
>   C --> D{h equals 1}
>   D -->|No| E[Shrink to next smaller gap]
>   E --> B
>   D -->|Yes| Z[Array sorted]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void ShellSort(int[] a)
> {
>     int n = a.Length;
>
>     // Ciura's empirically tuned gaps, largest first.
>     int[] gaps = { 701, 301, 132, 57, 23, 10, 4, 1 };
>
>     foreach (int gap in gaps)
>     {
>         if (gap >= n) continue;
>
>         // Gapped insertion sort: h interleaved subsequences at stride `gap`.
>         for (int i = gap; i < n; i++)
>         {
>             int key = a[i];
>             int j = i;
>             while (j >= gap && a[j - gap] > key)
>             {
>                 a[j] = a[j - gap];   // shift by a whole gap, not by one
>                 j -= gap;
>             }
>             a[j] = key;
>         }
>     }
> }
> ```
> The inner loop is line-for-line an insertion sort with stride `gap` in place of `1`. Fixed gaps still sort any input length because the final gap is `1`, but a scalable implementation extends the sequence from `n` to preserve useful coarse passes.

# Questions

> [!QUESTION]- Why is Shell sort unstable?
> A shift relocates an element by a whole gap `h`, so it can carry a key past an equal key that lies between them. No later pass records or restores their original relative order, so records that compare equal can emerge reversed.

# References

- [Shellsort (Wikipedia)](https://en.wikipedia.org/wiki/Shellsort) — gap sequences, proven and empirical bounds, and the open problem of the optimal sequence.
- [Best Increments for the Average Case of Shellsort (Marcin Ciura, 2001)](https://web.archive.org/web/20180923235211/http://sun.aei.polsl.pl/~mciura/publikacje/shellsort.pdf) — the paper deriving the `1, 4, 10, 23, 57, 132, 301, 701` sequence and its measured behaviour.
- [Shellsort and Sorting Networks (Donald E. Knuth, TAOCP Vol. 3, §5.2.1)](https://cs.stanford.edu/~knuth/taocp.html) — the `h`-sorting theorem that a `k`-sorted array stays `k`-sorted after later `h`-sorting.
- [Shellsort (Princeton Algorithms)](https://algs4.cs.princeton.edu/21elementary/) — Sedgewick's treatment with `h`-sorting intuition and gap-sequence experiments.
