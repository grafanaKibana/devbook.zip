---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Runs insertion sort over decreasing gaps so elements jump far, beating O(n²) with no recursion or scratch memory."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A reverse-sorted array of `n` elements is the worst input for [[Insertion Sort]]: it only ever swaps *adjacent* elements, so an element that belongs `k` positions away needs `k` one-slot shifts to get there. Summed over a fully inverted array that is `Θ(n²)` shift operations — the total shift work equals the number of inversions.

Shell sort attacks that distance before it attacks the order. It runs an insertion sort over elements `h` positions apart (an `h`-sort) for a decreasing sequence of gaps ending at `h = 1`. A move inside an `h`-spaced subsequence relocates an element by `h` slots at once, so a far-out-of-place element covers most of its journey in a few coarse moves. Each pass leaves the array closer to sorted without undoing the last, and the final `h = 1` pass is a plain insertion sort over data that is already nearly ordered — near-linear work.

**Core condition:** a decreasing gap sequence ending at `h = 1` → each pass `h`-sorts interleaved subsequences and never undoes an earlier pass → the `h = 1` pass runs on nearly-sorted data → `O(1)` auxiliary space, with the time bound set entirely by the gap sequence.

The shrinking gap is the transition worth animating.

> [!NOTE] Visualization pending
> Planned StepTrace: a gapped-insertion card showing `h`-sorted passes over interleaved subsequences as the gap `h` shrinks to 1. No matching renderer exists in `engine.js` yet.

## Why h-sorting cuts the shift work

An array is *`h`-sorted* when `a[i] ≤ a[i + h]` for every valid `i`. A gap-`h` pass treats the array as `h` interleaved subsequences — indices `{0, h, 2h, …}`, `{1, h+1, …}`, and so on — and insertion-sorts each one independently. Because the stride is `h`, a single shift moves an element `h` positions rather than one, so the coarse early passes pay down long-distance disorder cheaply.

The pass ordering is valid because sortedness accumulates. An array that has been `h`-sorted stays `h`-sorted after it is later `k`-sorted for any `k < h`: no smaller-gap pass can reintroduce a large-gap inversion. Residual disorder therefore only shrinks. By the time the gap reaches 1, every element sits within a small distance of its final slot, and insertion sort's near-linear behaviour on nearly-sorted input means the final pass does almost nothing.

On the reverse-sorted `[9, 8, 7, 6, 5, 4, 3, 2, 1]`, a plain insertion sort pays 36 shifts (the inversion count `8 + 7 + … + 1`). A gap-4 pass first sorts the four subsequences `{9,5,1}`, `{8,4}`, `{7,3}`, `{6,2}` in place, yielding `[1, 4, 3, 2, 5, 8, 7, 6, 9]`. That array holds only 6 inversions, so the closing `h = 1` pass performs 6 shifts instead of 36. The long moves were front-loaded into the cheap coarse pass.

The algorithm is in place — only a temporary `key` holds the element being inserted, so auxiliary space is `O(1)`. It is **not stable**: a shift jumps `h` positions and can carry a key past an equal key sitting between them, and no later pass restores their original relative order.

## Complexity

The bound is not a fixed property of the algorithm — it is a property of the gap sequence, which is a free parameter. Different sequences move the same code between complexity classes.

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n log n)` | `O(1)` | Already sorted: each of the `Θ(log n)` gap passes is a single linear scan with no shifts. |
| Average | `~Θ(n^1.3)` measured for Ciura's gaps | `O(1)` | Empirical only — Ciura's sequence has no proven tight bound. |
| Worst | `Θ(n²)` with Shell's `n/2, n/4, …`; `Θ(n^1.5)` with Hibbard's `2^k − 1`; `O(n^4/3)` with Sedgewick's | `O(1)` | The proven worst case is set entirely by how the gaps interleave positions, not by the input alone. |

Shell's original `n/2^k` gaps keep every gap even until the last one, so even-indexed and odd-indexed elements never compare until `h = 1`; that leaves `Θ(n²)` work. Hibbard's `1, 3, 7, 15, …` provably reaches `Θ(n^1.5)`, and Sedgewick's sequences carry a proven `O(n^4/3)` worst-case bound. Ciura's tuned gaps run at roughly `Θ(n^1.3)` in measurements but carry no proven asymptotic bound at all. Auxiliary space stays `O(1)` regardless. Because the tight bound rides on the sequence, no single clean asymptotic describes Shell sort.

## Where it breaks down

The gap-sequence choice is the whole game, and it is genuinely unsettled: the optimal general sequence is an open problem. The trap is concrete — Shell's original `n/2^k` looks reasonable but all its gaps except the last share the factor 2, so `h`-sorting only ever interleaves within a parity class and the two halves stay uncompared until the `h = 1` pass inherits `Θ(n²)` work. Coprime-mixing sequences (Hibbard, Sedgewick, Ciura) avoid this.

There is also no way to buy a proven bound and top speed at once. Pratt's 3-smooth gaps give a proven `Θ(n log² n)` worst case, but they use so many passes that constant factors make them slower in practice than Ciura's unproven-but-fast sequence. A workload that needs a contractual `O(n log n)` guarantee cannot get it from Shell sort — [[Heap Sort]] or [[Introsort]] can.

Instability follows directly from the `h`-stride. Sorting the records `[(5, a), (5, b), (3, c)]` by key, a gap that spans both fives can lift `(5, a)` over `(5, b)`, emitting `… (5, b), (5, a) …` — the original `a`-before-`b` order is lost. A stable secondary sort (the classic radix-style pipeline) cannot be layered on top of Shell sort for that reason.

## Reference drawer

> [!ABSTRACT]- Pass structure
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
> The inner loop is line-for-line an insertion sort with stride `gap` in place of `1`. Fixed gaps cap `n` at the largest usable gap; a production version generates the sequence from `n` instead.

## Questions

> [!QUESTION]- Why is Shell sort faster than a plain insertion sort when its final pass is a full insertion sort?
> The coarse gap passes move far-out-of-place elements `h` slots at a time, so most long-distance disorder is cleared before the `h = 1` pass runs. Insertion sort is near-linear on nearly-sorted input, so the final pass has little left to shift. The speedup comes from relocating *where* the shift work happens — into cheap coarse passes — not from a cheaper comparison.

> [!QUESTION]- Why does the gap sequence, rather than the input, decide Shell sort's complexity class?
> A pass only guarantees the array is `h`-sorted, and how much disorder survives into the next pass depends on how the gaps interleave positions. Shell's `n/2^k` keeps every gap even until the last, so parity classes never mix and the worst case is `Θ(n²)`; Hibbard's coprime gaps provably reach `Θ(n^1.5)`; Ciura's tuned gaps measure fastest but have no proven bound. The sequence is a tunable parameter, so Shell sort is a family of algorithms rather than one.

> [!QUESTION]- Why is Shell sort unstable?
> A shift relocates an element by a whole gap `h`, so it can carry a key past an equal key that lies between them. No later pass records or restores their original relative order, so records that compare equal can emerge reversed.

> [!QUESTION]- Why can Shell sort not offer a contractual `O(n log n)`?
> The sequences with the best proven worst-case bounds are not the fastest: Pratt's 3-smooth gaps prove `Θ(n log² n)` but run slowly due to many passes, while the fast Ciura sequence has no proven bound at all, and the optimal general sequence is an open problem. A workload needing a guaranteed bound uses [[Heap Sort]] or [[Introsort]] instead.

## References

- [Shellsort (Wikipedia)](https://en.wikipedia.org/wiki/Shellsort) — gap sequences, proven and empirical bounds, and the open problem of the optimal sequence.
- [Best Increments for the Average Case of Shellsort (Marcin Ciura, 2001)](https://web.archive.org/web/20180923235211/http://sun.aei.polsl.pl/~mciura/publikacje/shellsort.pdf) — the paper deriving the `1, 4, 10, 23, 57, 132, 301, 701` sequence and its measured behaviour.
- [Shellsort and Sorting Networks (Donald E. Knuth, TAOCP Vol. 3, §5.2.1)](https://cs.stanford.edu/~knuth/taocp.html) — the `h`-sorting theorem that a `k`-sorted array stays `k`-sorted after later `h`-sorting.
- [Shellsort (Princeton Algorithms)](https://algs4.cs.princeton.edu/21elementary/) — Sedgewick's treatment with `h`-sorting intuition and gap-sequence experiments.
