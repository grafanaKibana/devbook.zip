---
publish: true
created: 2026-07-18T14:02:44.017Z
modified: 2026-07-23T11:37:58.767Z
published: 2026-07-23T11:37:58.767Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Scatters elements into range buckets, sorts each, then concatenates; near-linear when keys are uniformly distributed.
level:
  - "4"
priority: Medium
status: Creation
---

Sorting `n` numeric keys with a comparison sort costs `Ω(n log n)` comparisons in the worst case over arbitrary distinct-key permutations. When the keys are numbers drawn from a known, bounded range, their magnitude says more than a comparison does: it says directly which slice of the range a key belongs to. Bucket Sort uses that by partitioning the range into `m` equal-width buckets, mapping each key to its bucket with a single arithmetic computation, sorting the buckets, and concatenating them in order.

The mapping is what stands in for comparison, and it is cheap only because the range is known: `bucketIndex = floor(m · (key − min) / (upperExclusive − min))` places a key in `O(1)` without inspecting any other element. The near-linear average that follows holds only while the buckets stay small and balanced, which in turn requires the keys to be spread roughly uniformly over the range. A distribution that piles keys into a few buckets removes the payoff entirely and leaves the per-bucket sort to do all the work.

**Core condition:** numeric keys over a known, roughly uniform range with `m = Θ(n)` → each key maps to a bucket in `O(1)` → `Θ(n + m) = Θ(n)` expected time with `Θ(n + m)` auxiliary space.

# Scatter and gather

The trace sorts six keys drawn from `[0, 1)` through five equal-width buckets. It establishes the bucket ranges, scatters each key by `floor(5 · key)`, sorts the occupied buckets, then gathers them from the lowest range to the highest.

```steptrace
{ "algorithm": "bucket-sort", "array": [0.78, 0.17, 0.39, 0.26, 0.72, 0.94], "bucketCount": 5 }
```

The middle range `[0.4, 0.6)` stays empty, while `[0.6, 0.8)` receives `0.78` and `0.72` and sorts them as `0.72, 0.78`. Empty and occupied buckets gather the same way: range order already determines their order relative to every other bucket.

# Why the average stays linear

Three properties make the four-step pass valid.

Scatter reads magnitude, not order. `bucketIndex = floor(m · (key − min) / (upperExclusive − min))` maps the half-open range `[min, upperExclusive)` onto bucket indices `0 … m − 1`. The computation touches one key and performs no comparisons, so the scatter phase is `Θ(n)` on any input, uniform or not.

Concatenation needs no cross-bucket comparison. Bucket `i` covers a strictly lower slice of the range than bucket `i + 1`, so every key in bucket `i` is smaller than every key in bucket `i + 1` by construction. Once each bucket is internally sorted, reading the buckets in index order emits a globally sorted sequence. This separation of ranges across buckets is the invariant that carries the whole algorithm: a per-bucket sort never has to look outside its own bucket.

The inner sort is usually [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]]. When `m ≈ n` and the keys are uniform, the expected load per bucket is `O(1)`, so its quadratic cost on a bucket of `t` elements stays small and the sum `Σ tᵢ²` has expected value `Θ(n)`. It also preserves stability. That expectation is the entire source of the linear average. Skew the distribution and the same sum grows toward `n²`.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n + m)` | `Θ(n + m)` | Keys land one per bucket; every per-bucket sort touches a constant number of elements. |
| Average | `Θ(n + m) ≈ Θ(n)` when `m ≈ n` | `Θ(n + m)` | Keys drawn from a roughly uniform distribution over the known range, so each of `m ≈ n` buckets holds `O(1)` elements in expectation and the per-bucket insertion sorts sum to `Θ(n)`. The linear average is conditional on this assumption. |
| Worst | `Θ(n² + m)` | `Θ(n + m)` | A skewed distribution drops nearly all elements into one bucket; the per-bucket [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort\|Insertion Sort]] then dominates at `Θ(n²)`, while the bucket scan still costs `Θ(m)`. |

Auxiliary space is `Θ(n + m)`: the `m` bucket headers plus the `n` elements they hold, separate from the input array. Swapping the inner [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] for a comparison sort bounds the worst case at `Θ(n log n + m)`: when the skewed input collapses all `n` keys into one bucket, that overloaded bucket sorts in `n log n` while scanning the other `m − 1` buckets still costs `Θ(m)`. Under the same uniform model, constant expected bucket sizes keep the total expected work linear; the swap changes constants and may change stability while improving the skewed tail.

# When the distribution stops cooperating

Skew is the defining failure. Zipfian, exponential, or duplicate-heavy keys land most elements in a handful of buckets. A single bucket holding `Θ(n)` keys is sorted by an inner sort that gains nothing from the partition: with [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] that bucket alone costs `Θ(n²)`, and Bucket Sort has done extra scatter-and-gather bookkeeping only to collapse to the inner sort's own complexity. Nothing detects this — the output is correct, just quadratic.

An unknown distribution defeats bucket sizing before the sort runs. Choosing `m` and the slice widths so each bucket receives `O(1)` elements requires knowing how the keys spread. Without that knowledge the load cannot be kept balanced, and the `Θ(n)` average is no longer a guarantee.

The value-to-index mapping restricts the input. Bucket Sort needs `bucketIndex = floor(m · (key − min) / (upperExclusive − min))` to be meaningful, so keys must live on a numeric or otherwise orderable half-open range with known bounds. Opaque identifiers with no magnitude — arbitrary strings, GUIDs, keys ordered only by an external comparator — have no such mapping and cannot be bucketed by range at all; they fall back to a comparison sort or a digit-wise scheme like [[Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]].

Stability is inherited, not intrinsic. Scatter appends keys in read order, so order within a bucket is preserved, and gather concatenates buckets in range order. Global stability therefore holds exactly when the per-bucket sort is stable. [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] is; substituting `List<T>.Sort` (an [[Computer Science/Algorithms/Sorting Algorithms/Introsort|Introsort]]) is not, and that swap silently reorders equal keys the moment they carry satellite data.

# Reference drawer

> [!ABSTRACT]- Scatter–sort–gather flow
>
> ```mermaid
> flowchart TD
>   A[n keys over a known range] --> B[Partition range into m equal-width buckets]
>   B --> C[Scatter each key to its bucket by index]
>   C --> D[Sort each bucket, usually insertion sort]
>   D --> E{Keys roughly uniform?}
>   E -->|Yes| F[Concatenate buckets in order → Θ n]
>   E -->|No| G[One bucket dominates → cost approaches n²]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Sorts values in [0, 1) with m = n buckets. Uniform input gives Θ(n) expected time.
> public static void BucketSort(double[] a)
> {
>     int n = a.Length;
>     foreach (double x in a)
>         if (!double.IsFinite(x) || x < 0 || x >= 1)
>             throw new ArgumentOutOfRangeException(nameof(a), "Every value must be in [0, 1).");
>
>     if (n <= 1) return;
>
>     var buckets = new List<double>[n];
>     for (int i = 0; i < n; i++)
>         buckets[i] = new List<double>();
>
>     foreach (double x in a)                       // scatter: O(1) index, no comparison
>     {
>         int idx = Math.Min((int)(n * x), n - 1);  // guard against floating-point rounding to n
>         buckets[idx].Add(x);
>     }
>
>     int pos = 0;
>     foreach (var bucket in buckets)
>     {
>         InsertionSort(bucket);                    // stable inner sort; small when uniform
>         foreach (double x in bucket)
>             a[pos++] = x;                         // gather in bucket order
>     }
> }
>
> private static void InsertionSort(List<double> b)
> {
>     for (int i = 1; i < b.Count; i++)
>     {
>         double key = b[i];
>         int j = i - 1;
>         while (j >= 0 && b[j] > key)              // strict >, so equal keys never swap: stable
>         {
>             b[j + 1] = b[j];
>             j--;
>         }
>         b[j + 1] = key;
>     }
> }
> ```
>
> Reject keys outside `[0, 1)`. For another half-open range `[min, upperExclusive)`, normalize with `(key − min) / (upperExclusive − min)` before indexing. The clamp only guards against floating-point rounding that produces `n`; it does not admit the exclusive upper bound.

# Questions

> [!QUESTION]- Where does the `Θ(n)` average bound actually come from?
> From the assumption that keys are roughly uniform over a known range with `m ≈ n` buckets. Under it, each bucket holds `O(1)` elements in expectation, so the sum of per-bucket sort costs `Σ tᵢ²` is `Θ(n)`. The bound is conditional: it is a property of the input distribution, not of the algorithm alone.

> [!QUESTION]- Why can the sorted buckets be concatenated with no comparison between buckets?
> Bucket `i` covers a strictly lower slice of the range than bucket `i + 1`, so every key in one bucket is smaller than every key in the next by construction. Reading internally sorted buckets in index order therefore emits a globally sorted sequence, and no per-bucket sort ever inspects a key outside its own bucket.

> [!QUESTION]- What input drives Bucket Sort to `Θ(n²)`, and why is the result still correct?
> A skewed distribution — Zipfian, exponential, or duplicate-heavy — that drops most keys into one bucket. That bucket's inner [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] gains nothing from the partition and costs `Θ(n²)`. The partition still separates ranges correctly, so the output stays sorted; only the running time collapses.

# References

- [Bucket sort (Wikipedia)](https://en.wikipedia.org/wiki/Bucket_sort) — the equal-width partition, the average-case analysis under the uniform-distribution assumption, and the relationship to counting and radix sorting.
- [String Sorts, exercise 2 (Princeton Algorithms)](https://algs4.cs.princeton.edu/51radix/) — Sedgewick and Wayne derive expected `O(n)` time for `n` uniform values placed into `n` equal-width buckets and insertion-sorted within each bucket.
