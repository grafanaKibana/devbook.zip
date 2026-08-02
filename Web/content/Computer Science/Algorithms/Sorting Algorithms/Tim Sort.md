---
publish: true
created: 2026-07-18T14:02:44.032Z
modified: 2026-08-01T18:31:33.353Z
published: 2026-08-01T18:31:33.353Z
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

CPython's `list.sort`/`sorted` and Java's `Arrays.sort` for object arrays lean on one fact about production data: it is rarely random. Log lines arrive mostly time-ordered, an appended list is sorted except at its tail, exported records come pre-grouped. A plain [[Computer Science/Algorithms/Sorting Algorithms/Merge Sort|merge sort]] ignores that structure and pays `Θ(n log n)` comparisons on every input, re-discovering order that was already present.

Tim sort is the _natural_ merge-sort family behind both runtimes. It reads the existing order first: it splits the array into maximal already-sorted stretches — **runs** — spends work only where order is missing, and merges the runs back together. On an input that is already a single ascending (or single descending) run it finishes in one `Θ(n)` pass; on unstructured input it degrades to the same `Θ(n log n)` as merge sort, staying stable throughout. Exploitable order is not a precondition for correctness; it is the condition under which adaptivity pays. Uniformly random keys rarely contain long runs, so the extra machinery usually earns little over a plain merge.

The visualization and invariant discussion below describe classic TimSort as retained by OpenJDK: strictly descending runs, one fixed `minrun`, and a merge stack governed by run-size invariants. Current CPython retains the adaptive, stable natural-merge mechanics, but now detects non-increasing runs with equal-block reversal, chooses merges with Powersort, and, since 2025, varies `minrun` sizing from run to run.

**Classic/OpenJDK shape:** partially ordered input → detect natural runs → pad short runs to `minrun` with binary insertion sort → merge under stack size invariants → `Θ(n)` on ordered input, `Θ(n log n)` worst, stable, `O(n)` merge buffer.

````tabsdown
tab: Visualization



```steptrace
{ "algorithm": "tim-sort", "array": [5, 6, 7, 8, 9, 4, 3, 1, 2, 8], "minrun": 4 }
```

## Decisive Move

Classic/OpenJDK TimSort's turning point is the moment the run stack collapses two adjacent runs because their sizes have just violated the merge invariant. The animation shows that over a small partially-ordered array.

Consider `[5, 6, 7, 8, 9, 4, 3, 1, 2, 8]` with an illustrative `minrun = 4`. The left-to-right scan produces `[5,6,7,8,9]`, then `[4,3,1]` (strictly descending, reversed to `[1,3,4]`, extended by binary-inserting `2` into `[1,2,3,4]`), then a trailing `[8]`. The run stack now holds lengths `[5, 4, 1]`, so the third push exposes the three-run invariant.

```text
runs (lengths)                 contents
[5]              run 1 ->      [5,6,7,8,9]
[5, 4]           run 2 ->      [1,2,3,4]
[5, 4, 1]        run 3 ->      [8]        X=1, Y=4, Z=5  ->  Z > Y+X?  5 > 5  false
                 merge the adjacent Y and X runs:
[5, 5]                         [1,2,3,4] + [8] = [1,2,3,4,8]
                 the equal top pair also violates Y > X:
[10]                            [5,6,7,8,9] + [1,2,3,4,8] = [1,2,3,4,5,6,7,8,8,9]
```

The three-run condition `Z > Y + X` fails when `[8]` lands (`5 > 4 + 1` is false), so `Y` merges with the smaller neighbour `X`. The resulting equal-length pair still violates `Y > X`, so the same collapse loop merges it immediately. On inputs where the final pair satisfies `Y > X`, the later forced-collapse phase performs that final adjacent merge. Both checks select only adjacent runs. The state that changed is the stack shape, not correctness: the partition of the array stays contiguous and the eventual merges stay near-balanced.

## Runs, Minrun, and the Merge Stack

Four mechanisms carry the algorithm.

**Classic/OpenJDK run detection.** From the current position the scan extends a run as long as elements stay ascending (`a[i] <= a[i+1]`) or *strictly* descending (`a[i] > a[i+1]`). A descending run is reversed in place. The asymmetry is load-bearing: because descent is strict, a stretch of equal keys can never form a descending run, so the in-place reversal never disturbs equal keys. Current CPython instead accepts non-increasing runs: it reverses each equal-key block while scanning, then reverses the whole run, so the double reversal restores equal keys to their original order.

**`minrun`.** A natural run shorter than its target is extended by binary [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|insertion sort]]: following elements are pulled in and placed with a binary search for the insertion point. OpenJDK computes one fixed `minrun` for the array from the high-order bits of `n`; `MIN_MERGE = 32` gives `minrun ∈ [16, 32]` (`minrun = n` for `n < 32`). Current CPython uses `MAX_MINRUN = 64`, but since 2025 it carries the fractional remainder of `n / 2^e` forward, so successive targets can differ by one: for `n = 315`, they are a mix of 39 and 40 instead of one fixed 40. The variable targets keep each level of the merge tree as balanced as possible.

**The classic/OpenJDK run stack.** Each run is pushed onto a stack. For the top three lengths `X` (top), `Y`, `Z` (deepest), OpenJDK TimSort maintains `Z > Y + X` and `Y > X`; when either breaks it merges `Y` with the smaller of `X` and `Z`. These invariants bound the size ratio between adjacent runs, so merges stay balanced enough to cap total work at `Θ(n log n)`.

**Current CPython's run stack.** Powersort assigns a power — the depth of the runs' connecting node in an ideal merge tree — to each adjacent-run boundary. Pending powers stay strictly decreasing from the top of the stack; a newly computed power triggers adjacent merges while older powers are greater. This replaces the visualized run-size invariant policy.

**Merging and galloping.** A production merge uses [[Computer Science/Algorithms/Sorting Algorithms/Merge Sort|merge sort]]'s two-way merge into a temporary copy of the *smaller* run (hence `≤ n/2` extra space), resolving ties toward the earlier run to stay stable. When one run wins `MIN_GALLOP = 7` comparisons in a row, the merge switches to **galloping**: it finds the block boundary with exponential search followed by binary search, reducing the boundary-search comparisons to `O(log k)` while the `k` copied elements still take linear time. If galloping stops paying off it adaptively backs out to one-at-a-time merging.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Tim Sort complexity",
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
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```
````

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n)` | `O(1)` | Input is a single run (already ascending, or descending and reversed in place); run detection short-circuits and no merge occurs. |
| Average | `Θ(n log n)` | `O(n)` | Runs of `≥ minrun` merge across `~log n` balanced levels; the merge buffer holds the smaller run, `≤ n/2`. |
| Worst | `Θ(n log n)` | `O(n)` | Adversarial run structure and key order force logarithmically many merge levels; buffer `≤ n/2`. |

Tim sort is **stable**: merges preserve equal-key order; classic/OpenJDK strict descent makes reversal safe, while current CPython restores equal blocks before reversing the whole non-increasing run. It is **adaptive** because existing order lengthens natural runs and cuts merge work. The best-case `Θ(n)` is the run-detection short-circuit, not a lucky pivot: a sorted or strictly reverse-sorted array is one run. Implementations may pre-size a small merge buffer, but no per-element temporary storage is used when the input forms a single run.

# When the Merge Policy Breaks

The run stack's merge policy is where Tim sort's sharp edges live.

**The merge-collapse invariant defect (2015).** de Gouw et al. used KeY to verify OpenJDK's Java implementation and instead found a genuine bug: `mergeCollapse` restored the invariant only among the top runs, so a crafted sequence of run lengths could leave it violated deeper in the stack. The defect also existed in CPython's analogous policy. Java's fixed-size run stack could then overflow into a reachable `ArrayIndexOutOfBoundsException`; CPython's larger fixed stack made the analogous overflow theoretical at feasible list sizes. Java's first patch enlarged the stack, while the later correction widened the invariant check to the run below the top three. Current CPython's Powersort policy no longer uses this merge-collapse invariant.

**Galloping can be net-negative.** A short winning streak can reach `MIN_GALLOP` and enter galloping, only for the exponential/binary search to find a block too short to amortize the probe before the merge falls back to one-at-a-time comparisons. The adaptive penalty raises the entry threshold after that failed attempt, but the probe and mode switch are still wasted work.

**`O(n)` memory, not in place.** The merge buffer of up to `n/2` is pure overhead when stability is unobservable — for example sorting a huge primitive array whose elements have no identity beyond their value. That cost is precisely why Java sorts _primitives_ with a dual-pivot [[Computer Science/Algorithms/Sorting Algorithms/Quick Sort|quick sort]] and .NET sorts with [[Computer Science/Algorithms/Sorting Algorithms/Introsort|introsort]] rather than Tim sort.

# Reference Drawer

> [!ABSTRACT]- Classic/OpenJDK control flow
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
>   G --> H{Classic run-size invariants hold}
>   H -->|No| I[Merge adjacent runs, possibly galloping]
>   I --> H
>   H -->|Yes| J{More input}
>   J -->|Yes| A
>   J -->|No| K[Force-merge remaining runs]
>   K --> Z[Sorted and stable]
> ```

> [!EXAMPLE]- Classic/OpenJDK-style C# implementation
>
> ```csharp
> // Stable natural-merge sort. Galloping is omitted for readability;
> // the merge below is a plain stable two-way merge that buffers the left run.
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
>         var left = new int[len1];        // educational version: buffer the left run
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
> `MergeCollapse` carries the correctness contract: the second clause testing `runs[n - 2]` is the check the 2015 verification found missing. This compact implementation always buffers the left run, so unlike production Tim sort it can allocate more than `n/2` elements; it keeps the left-on-tie rule so the merge stays stable.

# Questions

> [!QUESTION]- Why does Tim sort reach `Θ(n)` on some inputs while its worst case is still `Θ(n log n)`?
> In classic/OpenJDK TimSort, run detection scans for maximal ascending or strictly-descending stretches, reverses descending runs, and extends short runs to one fixed `minrun`. A single run finishes in `Θ(n)` with no merges; unstructured input still merges across `Θ(log n)` levels, giving `Θ(n log n)`. Current CPython instead accepts non-increasing runs with equal-block reversal and uses variable per-run targets, without changing those bounds.

> [!QUESTION]- What do classic/OpenJDK TimSort's run-size invariants guarantee?
> For the top three run lengths `X, Y, Z` (Z deepest), OpenJDK TimSort keeps `Z > Y + X` and `Y > X`, merging when either fails. This keeps merge depths bounded and total work at `Θ(n log n)`. Current CPython replaces these size invariants with Powersort's strictly decreasing stack powers.

> [!QUESTION]- What did the 2015 formal-verification effort reveal, and how did it tie back to the run stack?
> de Gouw et al. proved OpenJDK's `mergeCollapse` routine only restored the invariant among the top runs, leaving deeper violations reachable by a crafted run-length sequence. Java's fixed-size run stack could then overflow into a reachable `ArrayIndexOutOfBoundsException`; CPython had the analogous defect, but its larger fixed stack made overflow theoretical at feasible list sizes. Java's stopgap enlarged the stack; the real fix widened the invariant check to also test the run below the top three.

> [!QUESTION]- Why does classic/OpenJDK TimSort detect descending runs with strict `>`?
> A descending run is reversed in place. Strict descent keeps equal keys out of that run, so reversal cannot swap their relative order. Current CPython permits non-increasing runs by reversing equal-key blocks during detection before reversing the whole run, restoring their original order.

# References

- [CPython `listsort.txt` (Tim Peters and contributors)](https://github.com/python/cpython/blob/main/Objects/listsort.txt) — current implementation note covering non-increasing run detection, Powersort, galloping, and the 2025 variable-per-run `minrun` scheme.
- [OpenJDK `TimSort.java`](https://github.com/openjdk/jdk/blob/master/src/java.base/share/classes/java/util/TimSort.java) — production source for `mergeCollapse`, the run-length stack, and the `MIN_GALLOP` threshold, including the post-2015 invariant fix.
- [OpenJDK's `java.utils.Collection.sort()` is broken: The Good, the Bad and the Worst Case (de Gouw, Rot, de Boer, Bubel, Hähnle, CAV 2015)](https://doi.org/10.1007/978-3-319-21690-4_16) — the KeY-prover paper on the merge-stack invariant defect, the reachable crash, and both fixes.
- [Timsort (Wikipedia)](https://en.wikipedia.org/wiki/Timsort) — overview of runs, `minrun`, galloping, the merge invariants, and the verification bug.
