---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Scatters elements into range buckets, sorts each, then concatenates; works best when keys are uniformly distributed."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

When keys are numbers drawn from a known, bounded range, their magnitude says more than a comparison does: it says directly which slice of the range a key belongs to. Bucket Sort uses that by partitioning the range into `m` equal-width buckets, mapping each key to its bucket with a single arithmetic computation, sorting the buckets, and concatenating them in order.

The mapping stands in for comparison only because the range is known: `bucketIndex = floor(m · (key − min) / (upperExclusive − min))` locates a bucket without inspecting any other element. The payoff depends on buckets staying small and balanced, which requires keys to be spread roughly uniformly over the range. A distribution that piles keys into a few buckets leaves the per-bucket sort to do most of the work.

**Core condition:** numeric keys over a known, roughly uniform range → direct bucket mapping → sort within each range slice → concatenate slices in order.

~~~~~tabsdown
tab: Visualization



```steptrace
{ "algorithm": "bucket-sort", "array": [0.78, 0.17, 0.39, 0.26, 0.72, 0.94], "bucketCount": 5 }
```

The middle range `[0.4, 0.6)` stays empty, while `[0.6, 0.8)` receives `0.78` and `0.72` and sorts them as `0.72, 0.78`. Empty and occupied buckets gather the same way: range order already determines their order relative to every other bucket.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Bucket Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "secondary input, pattern, bucket, or sequence size"
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
              "kind": "text",
              "role": "Time",
              "formula": "Θ(n + m)"
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
              "formula": "Θ(n + m) ≈ Θ(n) when m ≈ n"
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
              "formula": "Θ(n² + m)"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)"
            }
          ]
        }
      ]
    }
  }
}
```

The average curve assumes a known, roughly uniform distribution and about as many buckets as elements. Skew can collapse distinct reverse-ordered values into one bucket and expose the inner sort's quadratic behavior; duplicate-heavy occupancy alone does not, because equal keys trigger no shifts. The chart's space curves include both bucket headers and stored elements, separate from the input array.

Replacing the stable insertion sort inside each bucket with a comparison sort improves the skewed tail but may change stability. Bucket Sort still returns the right order under skew because range partitioning remains valid; only the work inside an overloaded bucket changes.
~~~~~

The value-to-index mapping restricts the input. Bucket Sort needs `bucketIndex = floor(m · (key − min) / (upperExclusive − min))` to be meaningful, so keys must live on a numeric or otherwise orderable half-open range with known bounds. Opaque identifiers with no magnitude — arbitrary strings, GUIDs, keys ordered only by an external comparator — have no such mapping and cannot be bucketed by range at all; they fall back to a comparison sort or a digit-wise scheme like [[Home/Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]].

Stability is inherited, not intrinsic. Scatter appends keys in read order, so order within a bucket is preserved, and gather concatenates buckets in range order. Global stability therefore holds exactly when the per-bucket sort is stable. [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] is; substituting `List<T>.Sort` (an [[Home/Computer Science/Algorithms/Sorting Algorithms/Introsort|Introsort]]) is not, and that swap silently reorders equal keys the moment they carry satellite data.

# Reference Drawer

> [!ABSTRACT]- Scatter–sort–gather flow
>
> ```mermaid
> flowchart TD
>   A[n keys over a known range] --> B[Partition range into m equal-width buckets]
>   B --> C[Scatter each key to its bucket by index]
>   C --> D[Sort each bucket, usually insertion sort]
>   D --> E{Keys roughly uniform?}
>   E -->|Yes| F[Concatenate buckets in range order]
>   E -->|No| G[One bucket dominates → inner sort determines the tail]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Sorts values in [0, 1) with m = n buckets.
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
>     foreach (double x in a)                       // direct index, no comparison
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
> Reject keys outside `[0, 1)`. For another half-open range `[min, upperExclusive)`, normalize with `(key − min) / (upperExclusive − min)` before indexing. The clamp only guards against floating-point rounding that produces `n`; it does not admit the exclusive upper bound.

# Questions

> [!QUESTION]- Why can the sorted buckets be concatenated with no comparison between buckets?
> Bucket `i` covers a strictly lower slice of the range than bucket `i + 1`, so every key in one bucket is smaller than every key in the next by construction. Reading internally sorted buckets in index order therefore emits a globally sorted sequence, and no per-bucket sort ever inspects a key outside its own bucket.

# References

- [Bucket sort (Wikipedia)](https://en.wikipedia.org/wiki/Bucket_sort) — the equal-width partition, the average-case analysis under the uniform-distribution assumption, and the relationship to counting and radix sorting.
- [String Sorts, exercise 2 (Princeton Algorithms)](https://algs4.cs.princeton.edu/51radix/) — Sedgewick and Wayne analyze uniform values placed into equal-width buckets and insertion-sorted within each bucket.
- [Upper Tail Analysis of Bucket Sort and Random Tries](https://arxiv.org/abs/2002.10499) — primary probabilistic analysis of the uniform-input assumption and the overload tail when each bucket uses a quadratic inner sort.
