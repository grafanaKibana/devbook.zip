---
publish: true
created: 2026-08-20T20:41:15.540Z
modified: 2026-08-20T20:41:15.540Z
published: 2026-08-20T20:41:15.540Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Scatters elements into range buckets, sorts each, then concatenates. Works best when keys are uniformly distributed.
level:
  - "4"
priority: Medium
status: Creation
---

For numeric keys in a known, bounded range, magnitude can identify a range slice directly. Bucket Sort divides that range into `m` equal-width buckets, maps each key with one arithmetic calculation, sorts within each bucket, then concatenates the buckets in range order.

The mapping works because the bounds are known. `bucketIndex = floor(m · (key − min) / (upperExclusive − min))` locates a bucket without inspecting another element. Performance depends on the buckets remaining small, which usually means the keys are spread roughly uniformly. When most keys land in a few buckets, the inner sort does nearly all the work.

````tabsdown
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
      "description": "number of values distributed into buckets"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "number of buckets"
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
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m) ≈ Θ(n) when m ≈ n",
              "curveId": "linear"
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
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

The average curve assumes a known, roughly uniform distribution and about as many buckets as elements. Skew can collapse distinct reverse-ordered values into one bucket and expose the inner sort's quadratic behavior; duplicate-heavy occupancy alone does not, because equal keys trigger no shifts. The chart's space curves include both bucket headers and stored elements, separate from the input array.

Replacing the stable insertion sort inside each bucket with an `O(s log s)` inner sort such as introsort, where `s` is the bucket size, improves the skewed tail but may change stability. Bucket Sort still returns the right order under skew because range partitioning remains valid; only the work inside an overloaded bucket changes.
````

The value-to-index mapping restricts the input. Keys need a numeric or otherwise orderable half-open range with known bounds. Opaque identifiers and values ordered only by an external comparator have no meaningful bucket index. They need a comparison sort or a digit-wise scheme such as [[Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]].

Stability comes from the inner sort. Scatter preserves read order within each bucket, and gather does not mix buckets. Using [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] therefore keeps the whole algorithm stable. Replacing it with `List<T>.Sort`, an [[Computer Science/Algorithms/Sorting Algorithms/Introsort|Introsort]], can reorder equal keys when they carry associated data.

# Diagram and C# Implementation

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
>
> Keys outside `[0, 1)` are rejected. For another half-open range `[min, upperExclusive)`, normalize with `(key − min) / (upperExclusive − min)` before indexing. The clamp handles floating-point rounding to `n`. The exclusive upper bound remains invalid.

# References

- [Upper Tail Analysis of Bucket Sort and Random Tries](https://arxiv.org/abs/2002.10499)
