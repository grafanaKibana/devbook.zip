---
publish: true
created: 2026-07-18T14:02:44.032Z
modified: 2026-07-18T14:02:44.032Z
published: 2026-07-18T14:02:44.032Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Natural merge sort that exploits existing runs; stable, adaptive, and the default in Python and Java.
level:
  - "4"
priority: Medium
status: Creation
---

CPython's `list.sort`/`sorted` and Java's `Arrays.sort` for object arrays lean on one fact about production data: it is rarely random. Log lines arrive mostly time-ordered, an appended list is sorted except at its tail, exported records come pre-grouped. A plain [[Merge Sort]] ignores that structure and pays `Θ(n log n)` comparisons on every input, re-discovering order that was already present.

Tim sort is the _natural_ merge sort both runtimes use. It reads the existing order first: it splits the array into maximal already-sorted stretches — **runs** — spends work only where order is missing, and merges the runs back together. On an input that is already a single ascending (or single descending) run it finishes in one `Θ(n)` pass; on unstructured input it degrades to the same `Θ(n log n)` as merge sort, staying stable throughout. The only precondition is that exploitable order exists: on uniformly random keys there are no long runs to find, and the extra machinery earns nothing over a plain merge.

**Core shape:** partially ordered input → detect natural runs → pad short runs to `minrun` with binary insertion sort → merge under stack size invariants → `Θ(n)` on ordered input, `Θ(n log n)` worst, stable, `O(n)` merge buffer.

# Decisive move

Tim sort's turning point is the moment the run stack collapses two adjacent runs because their sizes have just violated the merge invariant. The intended animation would play that over a small partially-ordered array.

> [!NOTE] Visualization pending
> Planned StepTrace: a run-and-merge card showing natural ascending and descending runs being detected (descending ones reversed in place), short runs extended to `minrun` with binary insertion sort, and the run stack collapsing merges under its size invariants. No matching renderer exists in `engine.js` yet.

Consider `[5, 6, 7, 3, 2, 1, 4, 4, 8]` with an illustrative `minrun = 4`. The left-to-right scan produces `[5,6,7]` (ascending, extended by binary-inserting `3` into `[3,5,6,7]`), then `[2,1]` (strictly descending, reversed to `[1,2]`, extended with `4,4` into `[1,2,4,4]`), then a trailing `[8]`. The run stack now holds lengths `[4, 4, 1]`, and that third push is what forces a decision.

```text
runs (lengths)                 contents
[4]              run 1 ->      [3,5,6,7]
[4, 4]           run 2 ->      [1,2,4,4]
[4, 4, 1]        run 3 ->      [8]        X=1, Y=4, Z=4  ->  Z > Y+X?  4 > 5  false
                 merge Y with the smaller neighbour X:
[4, 5]                         [1,2,4,4] + [8] = [1,2,4,4,8]
                 two runs left, merge:
[9]                            [3,5,6,7] + [1,2,4,4,8] = [1,2,3,4,4,5,6,7,8]
```

The invariant `Z > Y + X` fails the instant `[8]` lands (`4 > 4 + 1` is false), so `Y` merges with the smaller neighbour `X` before the scan continues. Both `4`s keep their input order because every merge resolves ties toward the earlier run. The state that changed is the stack shape, not correctness: the collapse only ever merges _adjacent_ runs, so the partition of the array stays contiguous and the eventual merges stay near-balanced.

# Runs, minrun, and the merge stack

Four mechanisms carry the algorithm.

**Run detection.** From the current position the scan extends a run as long as elements stay ascending (`a[i] <= a[i+1]`) or _strictly_ descending (`a[i] > a[i+1]`). A descending run is reversed in place. The asymmetry is load-bearing: because descent is strict, a stretch of equal keys can never form a descending run, so the in-place reversal never disturbs equal keys — which is why the reversal preserves stability.

**`minrun`.** A natural run shorter than `minrun` is extended to `minrun` length by binary [[Insertion Sort]]: following elements are pulled in and placed with a binary search for the insertion point. `minrun` comes from the high-order bits of `n` (plus 1 if any lower bit is set), sizing runs near a power-of-two fraction of `n` so the run count stays close to a power of two and the final merges stay balanced. The exact constant is implementation-specific: CPython caps `minrun` at 64 (`MAX_MINRUN`), giving `minrun ∈ [32, 64]` from the high-order 6 bits (and `minrun = n` for `n < 64`); Java's `TimSort` uses `MIN_MERGE = 32`, giving `minrun ∈ [16, 32]` from the high-order 5 bits (and `minrun = n` for `n < 32`). Either way, a small array collapses to one binary-insertion-sorted run.

**The run stack and its invariants.** Each run is pushed onto a stack. For the top three lengths `X` (top), `Y`, `Z` (deepest), Tim sort maintains `Z > Y + X` and `Y > X`; when either breaks it merges `Y` with the smaller of `X` and `Z`. These invariants bound the size ratio between adjacent runs, so every merge joins two runs of roughly comparable length. Balanced merges are exactly what caps total merge work at `Θ(n log n)`; unbalanced runs would let the merge cost drift toward quadratic.

**Merging and galloping.** A merge uses [[Merge Sort]]'s two-way merge into a temporary copy of the _smaller_ run (hence `≤ n/2` extra space), resolving ties toward the earlier run to stay stable. When one run wins `MIN_GALLOP = 7` comparisons in a row, the merge switches to **galloping**: instead of comparing element by element it binary-searches how many of the winning run's elements can be block-copied at once, turning an `O(k)` linear advance into `O(log k)`. If galloping stops paying off it adaptively backs out to one-at-a-time merging.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n)` | `O(1)` | Input is a single run (already ascending, or descending and reversed in place); run detection short-circuits and no merge occurs. |
| Average | `Θ(n log n)` | `O(n)` | Runs of `≥ minrun` merge across `~log n` balanced levels; the merge buffer holds the smaller run, `≤ n/2`. |
| Worst | `Θ(n log n)` | `O(n)` | No exploitable order (random keys): `~n / minrun` `minrun`-length runs still merge in balanced pairs; buffer `≤ n/2`. |

Tim sort is **stable** (every merge and the strict-descent reversal preserve equal-key order) and **adaptive** (existing order shortens run detection and cuts merge count). The best-case `Θ(n)` is the run-detection short-circuit, not a lucky pivot: a sorted _or_ reverse-sorted array is one run. Implementations may pre-size a small merge buffer, but no per-element temporary storage is used when the input forms a single run.

# When the merge policy breaks

The run stack's merge policy is where Tim sort's sharp edges live.

**The merge-collapse invariant defect (2015).** de Gouw et al. tried to _verify_ the Java/Python merge routine with the KeY prover and instead found a genuine bug: `merge_collapse` restored the invariant only among the top runs, so a crafted sequence of run lengths could leave the invariant violated deeper in the stack. Because the run-length stack was pre-sized assuming the invariant always held, that deeper violation could overflow it and throw `ArrayIndexOutOfBoundsException`. Java's first patch simply enlarged the stack (a size bump, not a proof); the invariant check was later corrected to also test the run below the top three. The lesson is specific to the run-stack policy: a subtle loop invariant, deployed to hundreds of millions of users for years, still hid an adversarially reachable crash that testing and ubiquity never surfaced.

**Galloping can be net-negative on random data.** Galloping only pays when one run consistently wins. On interleaved random runs where neither side reaches `MIN_GALLOP` consecutive wins, the mode still costs the occasional wasted binary-search probe and the bookkeeping to enter and exit it. The adaptive back-off keeps the loss bounded, but the constant factor is real work spent detecting that galloping does not help here.

**`O(n)` memory, not in place.** The merge buffer of up to `n/2` is pure overhead when stability is unobservable — for example sorting a huge primitive array whose elements have no identity beyond their value. That cost is precisely why Java sorts _primitives_ with a dual-pivot [[Quick Sort]] and .NET sorts with [[Introsort]] rather than Tim sort.

# Reference drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Scan for next natural run] --> B{Run descending}
>   B -->|Yes| C[Reverse run in place]
>   B -->|No| D[Keep ascending run]
>   C --> E{Run shorter than minrun}
>   D --> E
>   E -->|Yes| F[Extend with binary insertion sort]
>   E -->|No| G[Push run onto stack]
>   F --> G
>   G --> H{Stack size invariants hold}
>   H -->|No| I[Merge adjacent runs, possibly galloping]
>   I --> H
>   H -->|Yes| J{More input}
>   J -->|Yes| A
>   J -->|No| K[Force-merge remaining runs]
>   K --> Z[Sorted and stable]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Stable natural-merge sort. Galloping is omitted for readability;
> // the merge below is a plain stable two-way merge on the smaller run.
> public static class TimSort
> {
>     public static void Sort(int[] a)
>     {
>         int n = a.Length;
>         if (n < 2) return;
>
>         int minRun = MinRunLength(n);
>         var runs = new List<(int start, int length)>();
>
>         int i = 0;
>         while (i < n)
>         {
>             int runLength = FindRunAndMakeAscending(a, i, n);
>             if (runLength < minRun)
>             {
>                 int force = Math.Min(minRun, n - i);
>                 BinaryInsertionSort(a, i, i + force, i + runLength);
>                 runLength = force;
>             }
>
>             runs.Add((i, runLength));
>             MergeCollapse(a, runs);
>             i += runLength;
>         }
>
>         MergeForceCollapse(a, runs);
>     }
>
>     private static int MinRunLength(int n)
>     {
>         int r = 0;                       // set to 1 if any dropped low bit is 1
>         while (n >= 64) { r |= n & 1; n >>= 1; }
>         return n + r;                    // CPython MAX_MINRUN = 64 -> 32..64 (Java MIN_MERGE = 32 -> 16..32)
>     }
>
>     // Returns run length; a strictly-descending run is reversed in place.
>     private static int FindRunAndMakeAscending(int[] a, int lo, int hi)
>     {
>         int runHi = lo + 1;
>         if (runHi == hi) return 1;
>
>         if (a[runHi++] < a[lo])          // strict descent -> reverse
>         {
>             while (runHi < hi && a[runHi] < a[runHi - 1]) runHi++;
>             Array.Reverse(a, lo, runHi - lo);
>         }
>         else                             // ascending (>=) keeps equal keys stable
>         {
>             while (runHi < hi && a[runHi] >= a[runHi - 1]) runHi++;
>         }
>         return runHi - lo;
>     }
>
>     // [lo, sortedEnd) is already sorted; extend the sort to [lo, hi).
>     private static void BinaryInsertionSort(int[] a, int lo, int hi, int sortedEnd)
>     {
>         if (sortedEnd == lo) sortedEnd++;
>         for (int start = sortedEnd; start < hi; start++)
>         {
>             int pivot = a[start];
>             int left = lo, right = start;
>             while (left < right)         // first index strictly greater than pivot -> stable
>             {
>                 int mid = (left + right) >> 1;
>                 if (pivot < a[mid]) right = mid; else left = mid + 1;
>             }
>             Array.Copy(a, left, a, left + 1, start - left);
>             a[left] = pivot;
>         }
>     }
>
>     // The invariant restored here is the one the 2015 fix widened:
>     // it also tests runs[n-2], not just the top three.
>     private static void MergeCollapse(int[] a, List<(int start, int length)> runs)
>     {
>         while (runs.Count > 1)
>         {
>             int n = runs.Count - 2;
>             if ((n > 0 && runs[n - 1].length <= runs[n].length + runs[n + 1].length) ||
>                 (n > 1 && runs[n - 2].length <= runs[n - 1].length + runs[n].length))
>             {
>                 if (runs[n - 1].length < runs[n + 1].length) n--;
>                 MergeAt(a, runs, n);
>             }
>             else if (runs[n].length <= runs[n + 1].length)
>             {
>                 MergeAt(a, runs, n);
>             }
>             else break;
>         }
>     }
>
>     private static void MergeForceCollapse(int[] a, List<(int start, int length)> runs)
>     {
>         while (runs.Count > 1)
>         {
>             int n = runs.Count - 2;
>             if (n > 0 && runs[n - 1].length < runs[n + 1].length) n--;
>             MergeAt(a, runs, n);
>         }
>     }
>
>     private static void MergeAt(int[] a, List<(int start, int length)> runs, int i)
>     {
>         var (start1, len1) = runs[i];
>         var (_, len2) = runs[i + 1];
>         runs[i] = (start1, len1 + len2);
>         runs.RemoveAt(i + 1);
>         MergeStable(a, start1, len1, len2);
>     }
>
>     private static void MergeStable(int[] a, int start, int len1, int len2)
>     {
>         var left = new int[len1];        // buffer the smaller-or-equal left run
>         Array.Copy(a, start, left, 0, len1);
>
>         int i = 0, j = start + len1, k = start, end2 = start + len1 + len2;
>         while (i < len1 && j < end2)
>             a[k++] = a[j] < left[i] ? a[j++] : left[i++];   // "<" keeps ties on the left -> stable
>         while (i < len1) a[k++] = left[i++];                 // trailing right run is already in place
>     }
> }
> ```
>
> `MergeCollapse` carries the correctness contract: the second clause testing `runs[n - 2]` is the check the 2015 verification found missing. `MergeStable` buffers the left run and resolves ties toward it, which is what makes the whole sort stable.

# Questions

> [!QUESTION]- Why does Tim sort reach `Θ(n)` on some inputs while its worst case is still `Θ(n log n)`?
> Run detection scans for maximal ascending or strictly-descending stretches and merges only across their boundaries. An already-ordered array (ascending, or descending and reversed in place) is a single run, so the scan finishes in one `Θ(n)` pass with no merges. Unstructured input yields `~n / minrun` short runs that still merge across `~log n` balanced levels, giving `Θ(n log n)`.

> [!QUESTION]- What do the run-stack size invariants guarantee, and what breaks without them?
> For the top three run lengths `X, Y, Z` (Z deepest), Tim sort keeps `Z > Y + X` and `Y > X`, merging when either fails. This bounds the size ratio of adjacent runs so every merge joins near-equal lengths, which is what caps total merge work at `Θ(n log n)`. Without the bound, a merge could repeatedly join a tiny run into a huge one and drift toward quadratic cost.

> [!QUESTION]- What did the 2015 formal-verification effort reveal, and how did it tie back to the run stack?
> de Gouw et al. proved the merge-collapse routine only restored the invariant among the top runs, leaving deeper violations reachable by a crafted run-length sequence. Because the run-length stack was pre-sized assuming the invariant held, the violation could overflow it into an `ArrayIndexOutOfBoundsException`. The stopgap enlarged the stack; the real fix widened the invariant check to also test the run below the top three.

> [!QUESTION]- Why must descending-run detection use strict `>` rather than `>=`?
> A descending run is reversed in place. If detection used `>=`, it would reverse stretches of equal keys and silently swap their relative order, breaking stability. Strict descent guarantees equal keys never sit inside a run that gets reversed, so the reversal preserves input order.

# References

- [CPython `listsort.txt` (Tim Peters)](https://github.com/python/cpython/blob/main/Objects/listsort.txt) — the original design note deriving run detection, `minrun`, galloping, and the merge-pattern rationale.
- [OpenJDK `TimSort.java`](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/TimSort.java) — production source for `mergeCollapse`, the run-length stack, and the `MIN_GALLOP` threshold, including the post-2015 invariant fix.
- [OpenJDK's `java.utils.Collection.sort()` is broken: The Good, the Bad and the Worst Case (de Gouw, Rot, de Boer, Bubel, Hähnle, CAV 2015)](https://doi.org/10.1007/978-3-319-21690-4_16) — the KeY-prover paper on the merge-stack invariant defect, the reachable crash, and both fixes.
- [Timsort (Wikipedia)](https://en.wikipedia.org/wiki/Timsort) — overview of runs, `minrun`, galloping, the merge invariants, and the verification bug.
