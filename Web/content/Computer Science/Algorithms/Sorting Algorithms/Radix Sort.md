---
publish: true
created: 2026-07-12T14:27:20.415Z
modified: 2026-07-12T14:27:20.416Z
published: 2026-07-12T14:27:20.416Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Sorts fixed-width integer keys one digit at a time with a stable pass, beating the comparison bound.
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

Sorting ten million 32-bit integers with [[Quick Sort]] or [[Merge Sort]] spends its whole runtime comparing pairs of keys, and any sort whose only primitive is _compare two elements_ needs `Ω(n log n)` of them. Radix Sort never compares two keys. It reads each key as a sequence of digits in some radix `b` and distributes keys into buckets by one digit at a time, so its work scales with the _width_ of the keys, not with the number of pairwise comparisons.

That move is only available when a key decomposes into a bounded number of digits `d`: a 32-bit integer is four base-256 digits, a fixed five-character string is five base-256 digits. Given that decomposition, the whole sort costs `Θ(d · (n + b))` — `d` passes, each touching every key once and every bucket once.

**Core condition:** keys decomposable into `d` fixed-width digits over radix `b` → one stable pass per digit distributes then gathers → `Θ(d · (n + b))` time, linear whenever `d` is constant.

The trace below would run LSD radix sort on `[170, 45, 75, 90, 802, 24, 2, 66]`, three base-10 passes from the ones digit upward.

> [!NOTE] Visualization pending
> Planned StepTrace: a bucket-pass card showing keys distributed by one digit into base-b buckets, gathered
> in order, repeated per digit from least significant to most. No matching renderer exists in `engine.js` yet.

## Why the passes compose

LSD (least-significant-digit) radix sort runs one pass per digit position, from the rightmost digit up to the leftmost. Each pass is a single **stable** [[Counting Sort]] keyed on that one digit — no other part of the key is examined. After the pass over the most significant digit, the array is fully ordered, and it inherits counting sort's non-comparison nature: no two keys are ever ranked against each other.

Stability is the correctness argument, not a performance tweak. When a pass sorts on digit position `p`, keys that share the same digit at `p` must retain the relative order that the earlier passes over positions `p-1 … 0` already established. A stable counting sort preserves that order exactly; an unstable one would reorder those ties and silently discard the work of every prior pass. The output would look sorted on the last digit and be wrong everywhere else.

The three base-10 passes over the sample input show the composition:

```text
Input:       170  45  75  90  802  24   2  66
ones  →      170  90  802   2   24  45  75  66     sorted by last digit: 0,0,2,2,4,5,5,6
tens  →      802   2   24  45  66  170  75  90     ties on the tens digit keep the ones order
hundreds →     2  24  45  66  75   90  170  802    fully ordered
```

`170` and `75` both carry `7` in the tens place. The tens pass reads only that digit, so it leaves them in the order the ones pass produced — `170` before `75` — and the hundreds pass, comparing `170`'s `1` against `75`'s `0`, moves `75` ahead of `170` without re-examining the lower digits. Every tie survives to the next pass because every pass is stable.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(d · (n + b))` | `Θ(n + b)` | Already-sorted input still runs all `d` passes; nothing lets the algorithm stop early. |
| Average | `Θ(d · (n + b))` | `Θ(n + b)` | Each pass scatters `n` keys through `b` buckets exactly once, independent of their arrangement. |
| Worst | `Θ(d · (n + b))` | `Θ(n + b)` | Reverse or adversarial order costs the same — there is no comparison to short-circuit and no pivot to unbalance. |

`d` is the width of the widest key in digits and `b` is the radix. The three cases are identical because the algorithm is oblivious to how the input is arranged: it always touches every digit of every key. For fixed-width keys — a 32-bit integer read as four base-256 digits — `d` is a constant, so the time collapses to `Θ(n)`, genuinely linear.

The `Θ(n + b)` auxiliary space is the counting sort's output buffer (`n`) plus the per-digit count array (`b`). Radix Sort is therefore **stable but not in-place**; it cannot sort within the input array alone. For variable-length or string keys, the MSD (most-significant-digit) variant recurses per bucket from the leftmost digit and can stop once a prefix is unique — it handles ragged key lengths that LSD cannot.

## Where the linear bound stops applying

**Variable-length keys.** LSD processes a fixed digit position across every key, counted from the right. Keys of unequal width have no shared notion of "position 3," so a three-digit key and a six-digit key line up at misaligned digits and order incorrectly. The fixes are to pad every key to a common width with a sentinel below any real digit, or to switch to MSD radix, which recurses left-to-right and absorbs ragged lengths naturally.

**The `d` factor.** `Θ(d · (n + b))` hides a real `d`. Eight-byte keys at `b = 256` mean eight full passes, each a cache-unfriendly scatter over the whole array. Radix beats an `O(n log n)` comparison sort only while `d` stays small relative to `log₂ n`; once keys get wide — long strings, big integers, wide composite keys — the constant erodes and a tuned [[Quick Sort]] or Introsort wins in wall-clock time despite the worse asymptotics.

**Choosing `b`.** The radix sets both the pass count `d = ⌊log_b(maxKey)⌋ + 1` and the per-pass count-array size `Θ(b)`. A large `b` cuts passes but grows a count array that can fall out of cache; a small `b` keeps the array tiny but multiplies passes over the data. `b = 256` (one byte per pass, four passes for 32-bit keys) is the usual balance for integer keys; `b = 2^16` sorts 32-bit keys in two passes but needs a 65,536-entry count array each pass.

**No digit decomposition.** Radix needs the key to break into digits over a fixed radix — an integer, a fixed-layout string, a tuple of those. Objects ordered only by a comparator, with no positional digit structure, expose nothing to bucket on; radix simply does not apply, and a comparison sort does.

**Unsigned reads.** Each pass treats its digit as an unsigned quantity, so raw two's-complement negatives sort after positives, and raw IEEE-754 bit patterns scatter negatives in reverse. A monotonic transform beforehand — flip the sign bit of integers; for floats flip all bits of negatives and only the sign bit of positives — restores true numeric order, reversed after sorting.

## Reference drawer

> [!ABSTRACT]- Per-digit pass loop
>
> ```mermaid
> flowchart TD
>   A[Keys with at most d digits in base b] --> B[Start at the least significant digit]
>   B --> C[Stable counting sort on the current digit]
>   C --> D{All d digits processed}
>   D -->|No| E[Advance to the next more significant digit]
>   E --> C
>   D -->|Yes| F[Array fully sorted]
> ```

> [!EXAMPLE]- C# implementation (LSD, non-negative integer keys)
>
> ```csharp
> public static void RadixSortLsd(int[] keys, int radix = 256)
> {
>     if (keys.Length == 0)
>     {
>         return;
>     }
>
>     var max = keys.Max();
>     var output = new int[keys.Length];
>
>     for (long place = 1; max / place > 0; place *= radix)
>     {
>         var count = new int[radix];
>
>         // Tally how many keys fall in each bucket for this digit.
>         foreach (var key in keys)
>         {
>             count[(key / place) % radix]++;
>         }
>
>         // Prefix sums turn counts into end-exclusive bucket boundaries.
>         for (var d = 1; d < radix; d++)
>         {
>             count[d] += count[d - 1];
>         }
>
>         // Iterating backward keeps equal digits in their prior order — this is the stability the passes rely on.
>         for (var i = keys.Length - 1; i >= 0; i--)
>         {
>             var digit = (int)((keys[i] / place) % radix);
>             output[--count[digit]] = keys[i];
>         }
>
>         Array.Copy(output, keys, keys.Length);
>     }
> }
> ```
>
> The backward final loop is load-bearing: reversing it turns the inner sort unstable and corrupts every prior pass. Signed or floating-point keys must first go through the unsigned transform from the boundaries above.

## Questions

> [!QUESTION]- Why must each per-digit pass be stable?
> Each pass sorts on one digit and trusts that ties on that digit are already ordered by the less-significant digits sorted in earlier passes. A stable counting sort preserves that established order; an unstable one reorders the ties and destroys the work of every prior pass, producing output that is sorted only on the final digit. Stability is a correctness requirement here, not an optimization.

> [!QUESTION]- When does a comparison sort beat Radix Sort?
> When keys are wide, variable-length without a bound, or not decomposable into digits. The `d` passes carry a real cost, so once `d` grows relative to `log₂ n` — long strings, big integers — a tuned [[Quick Sort]] wins on wall-clock time. Keys exposed only through a comparator have no digit to bucket on, so radix does not apply at all.

## References

- [Radix sort (Wikipedia)](https://en.wikipedia.org/wiki/Radix_sort) — LSD and MSD variants, the `Θ(d·(n+b))` derivation, and history.
- [Radix sorts (Princeton Algorithms)](https://algs4.cs.princeton.edu/51radix/) — Sedgewick and Wayne on key-indexed counting and LSD/MSD string sorts, with the stability argument stated directly.
- [Radix Tricks (Michael Herf)](http://stereopsis.com/radix.html) — the canonical write-up of the sign-bit and flip-all-bits transform for radix-sorting IEEE-754 floats.
