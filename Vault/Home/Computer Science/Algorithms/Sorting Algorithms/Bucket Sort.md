---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Scatters elements into range buckets, sorts each, then concatenates; near-linear when keys are uniformly distributed."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

Sorting `n` numeric keys with a comparison sort costs `Ω(n log n)` because comparing two elements is the only information such a sort extracts. When the keys are numbers drawn from a known, bounded range, their magnitude says more than a comparison does: it says directly which slice of the range a key belongs to. Bucket Sort uses that by partitioning the range into `m` equal-width buckets, mapping each key to its bucket with a single arithmetic computation, sorting the buckets, and concatenating them in order.

The mapping is what stands in for comparison, and it is cheap only because the range is known: `bucketIndex = floor(m · (key − min) / (max − min))` places a key in `O(1)` without inspecting any other element. The near-linear average that follows holds only while the buckets stay small and balanced, which in turn requires the keys to be spread roughly uniformly over the range. A distribution that piles keys into a few buckets removes the payoff entirely and leaves the per-bucket sort to do all the work.

**Core condition:** numeric keys over a known, roughly uniform range → each key maps to a bucket in `O(1)` → `Θ(n)` average time with `Θ(n + m)` auxiliary space.

## Scatter and gather

The operation Bucket Sort would animate is a single scatter-then-gather pass over keys drawn from `[0, 1)`.

> [!NOTE] Visualization pending
> Planned StepTrace: a scatter/gather card showing elements distributed into range buckets, each bucket sorted, then concatenated. No matching renderer exists in `engine.js` yet.

## Why the average stays linear

Three properties make the four-step pass valid.

Scatter reads magnitude, not order. `bucketIndex = floor(m · (key − min) / (max − min))` maps the half-open range `[min, max)` onto bucket indices `0 … m − 1`. The computation touches one key and performs no comparisons, so the scatter phase is `Θ(n)` on any input, uniform or not.

Concatenation needs no cross-bucket comparison. Bucket `i` covers a strictly lower slice of the range than bucket `i + 1`, so every key in bucket `i` is smaller than every key in bucket `i + 1` by construction. Once each bucket is internally sorted, reading the buckets in index order emits a globally sorted sequence. This separation of ranges across buckets is the invariant that carries the whole algorithm: a per-bucket sort never has to look outside its own bucket.

The inner sort is usually [[Insertion Sort]]. On the small, often near-sorted runs a good partition produces, its cost on a bucket of `t` elements stays low, and it is stable. When `m ≈ n` and the keys are uniform, the expected load per bucket is `O(1)`, and the sum of the per-bucket costs, `Σ tᵢ²`, has expected value `Θ(n)` under that uniformity. That expectation is the entire source of the linear average. Skew the distribution and the same sum grows toward `n²`.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n + m)` | `Θ(n + m)` | Keys land one per bucket; every per-bucket sort touches a constant number of elements. |
| Average | `Θ(n + m) ≈ Θ(n)` when `m ≈ n` | `Θ(n + m)` | Keys drawn from a roughly uniform distribution over the known range, so each of `m ≈ n` buckets holds `O(1)` elements in expectation and the per-bucket insertion sorts sum to `Θ(n)`. The linear average is conditional on this assumption. |
| Worst | `Θ(n²)` | `Θ(n + m)` | A skewed distribution drops nearly all elements into one bucket; the per-bucket [[Insertion Sort]] then dominates at `Θ(n²)`, erasing the partition's benefit. |

Auxiliary space is `Θ(n + m)`: the `m` bucket headers plus the `n` elements they hold, separate from the input array. Swapping the inner [[Insertion Sort]] for a comparison sort bounds the worst case at `Θ(n log n)`: when the skewed input collapses all `n` keys into one bucket, that single overloaded bucket sorts in `n log n` independent of `m` while the other `m − 1` buckets stay empty. This trades the linear average for a safer tail on skewed data.

## When the distribution stops cooperating

Skew is the defining failure. Zipfian, exponential, or duplicate-heavy keys land most elements in a handful of buckets. A single bucket holding `Θ(n)` keys is sorted by an inner sort that gains nothing from the partition: with [[Insertion Sort]] that bucket alone costs `Θ(n²)`, and Bucket Sort has done extra scatter-and-gather bookkeeping only to collapse to the inner sort's own complexity. Nothing detects this — the output is correct, just quadratic.

An unknown distribution defeats bucket sizing before the sort runs. Choosing `m` and the slice widths so each bucket receives `O(1)` elements requires knowing how the keys spread. Without that knowledge the load cannot be kept balanced, and the `Θ(n)` average is no longer a guarantee.

The value-to-index mapping restricts the input. Bucket Sort needs `bucketIndex = floor(m · (key − min) / (max − min))` to be meaningful, so keys must live on a numeric or otherwise orderable range with a known minimum and maximum. Opaque identifiers with no magnitude — arbitrary strings, GUIDs, keys ordered only by an external comparator — have no such mapping and cannot be bucketed by range at all; they fall back to a comparison sort or a digit-wise scheme like [[Radix Sort]].

Stability is inherited, not intrinsic. Scatter appends keys in read order, so order within a bucket is preserved, and gather concatenates buckets in range order. Global stability therefore holds exactly when the per-bucket sort is stable. [[Insertion Sort]] is; substituting `List<T>.Sort` (an [[Introsort]]) is not, and that swap silently reorders equal keys the moment they carry satellite data.

## Reference drawer

> [!ABSTRACT]- Scatter–sort–gather flow
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
> ```csharp
> // Sorts values in [0, 1) with m = n buckets. Uniform input gives Θ(n) expected time.
> public static void BucketSort(double[] a)
> {
>     int n = a.Length;
>     if (n <= 1) return;
>
>     var buckets = new List<double>[n];
>     for (int i = 0; i < n; i++)
>         buckets[i] = new List<double>();
>
>     foreach (double x in a)                       // scatter: O(1) index, no comparison
>     {
>         int idx = (int)(n * x);
>         if (idx == n) idx = n - 1;                // clamp the inclusive max off the [min, max) edge
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
> Keys outside `[0, 1)` are normalized first with `(key − min) / (max − min)`. The index clamp is the only guard against the exact maximum mapping to slot `n`, one past the last bucket.

## Questions

> [!QUESTION]- Where does the `Θ(n)` average bound actually come from?
> From the assumption that keys are roughly uniform over a known range with `m ≈ n` buckets. Under it, each bucket holds `O(1)` elements in expectation, so the sum of per-bucket sort costs `Σ tᵢ²` is `Θ(n)`. The bound is conditional: it is a property of the input distribution, not of the algorithm alone.

> [!QUESTION]- Why can the sorted buckets be concatenated with no comparison between buckets?
> Bucket `i` covers a strictly lower slice of the range than bucket `i + 1`, so every key in one bucket is smaller than every key in the next by construction. Reading internally sorted buckets in index order therefore emits a globally sorted sequence, and no per-bucket sort ever inspects a key outside its own bucket.

> [!QUESTION]- What input drives Bucket Sort to `Θ(n²)`, and why is the result still correct?
> A skewed distribution — Zipfian, exponential, or duplicate-heavy — that drops most keys into one bucket. That bucket's inner [[Insertion Sort]] gains nothing from the partition and costs `Θ(n²)`. The partition still separates ranges correctly, so the output stays sorted; only the running time collapses.

## References

- [Bucket sort (Wikipedia)](https://en.wikipedia.org/wiki/Bucket_sort) — the equal-width partition, the average-case analysis under the uniform-distribution assumption, and the relationship to counting and radix sorting.
- [Introduction to Algorithms, 6.006 (MIT OpenCourseWare)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — course index; see the linear-time sorting lecture for the CLRS-based expected-linear-time proof that hinges on the uniformity assumption.
