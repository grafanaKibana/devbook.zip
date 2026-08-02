---
publish: true
created: 2026-07-18T14:02:43.972Z
modified: 2026-08-01T18:31:33.347Z
published: 2026-08-01T18:31:33.347Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Precomputes cumulative sums so any range sum becomes one O(1) subtraction after an O(n) build.
level:
  - "4"
priority: Medium
status: Creation
---

A dataset holds daily sales for a year, and a report asks for the total of dozens of arbitrary date ranges. Direct summation takes time proportional to each queried range, so `q` questions cost `Θ(Σ range lengths)`, up to `O(nq)`, and most of that work re-adds the same interior values over and over. A prefix sum precomputes every running total once: `prefix[i]` is the sum of the first `i` elements, with `prefix[0] = 0` standing for the empty prefix. The sum of an inclusive range `[l, r]` is then `prefix[r + 1] - prefix[l]` — a single subtraction, because the shared left portion `prefix[l]` cancels out and only the elements between the two totals survive.

The trade is one `O(n)` pass and `O(n)` extra memory for `O(1)` answers thereafter, and it holds only while the array never changes.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"prefix-sum","array":[4,7,2,9,5,3,8],"range":[2,5]}
```

# Trace

The trace uses seven days of sales, `[4, 7, 2, 9, 5, 3, 8]`. It writes every running total into the prefix array, then answers `[2, 5]`: `prefix[6] - prefix[2] = 30 - 11 = 19`.

# Why the Difference is the Range Sum

`prefix[k]` accumulates every element strictly before index `k`, so `prefix[r + 1]` covers `a[0..r]` and `prefix[l]` covers `a[0..l-1]`. Subtracting them removes the common head `a[0..l-1]` exactly, leaving `a[l] + ... + a[r]`. The `prefix[0] = 0` sentinel and the length-`(n + 1)` array are what let `l = 0` use the same formula as any other left bound: `prefix[0]` supplies the empty sum with no special case.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Prefix Sum complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Build prefix",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range-sum query",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Naive re-sum (no prefix)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n) per query",
              "curveId": "linear"
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
          "operation": "Build prefix",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Range-sum query",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Naive re-sum (no prefix)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Complexity

| Operation | Time | Space | Cause |
| --- | --- | --- | --- |
| Build `prefix` | `O(n)` | `O(n)` | One pass writes `n + 1` running totals; the array is the stored state. |
| Range-sum query | `O(1)` | `O(1)` | A single subtraction of two precomputed totals; nothing is re-scanned. |
| Naive re-sum (no prefix) | `O(n)` per query | `O(1)` | Each query re-adds every element of the range from scratch. |

Across `q` queries, prefix sums cost `Θ(n + q)`, while direct summation costs `Θ(Σ range lengths)`. The precompute wins when the work avoided by not rescanning query interiors exceeds its `Θ(n)` build cost; two short queries may not recover that cost at all.

# When the Precompute Stops Holding

The array must be **static** for the whole query phase. Writing `a[j] = x` changes every running total at index `j + 1` and beyond, so a single element update invalidates the entire tail of `prefix` and forces an `O(n)` rebuild. Interleaving `q` updates with queries degrades the whole approach to `O(nq)` — the exact cost the precompute was meant to remove. A workload that mutates the array between reads wants a [[Computer Science/Data Structures/Trees/Fenwick Tree|Fenwick tree]] for point updates plus prefix sums, or a [[Computer Science/Data Structures/Trees/Segment Tree|segment tree]] for point updates plus general associative range aggregation. Both make those operations `O(log n)`. Lazy range updates are not automatic: they require an update operation whose state composes correctly with the stored aggregate.

The `+1` convention is the classic off-by-one. Because the formula is `prefix[r + 1] - prefix[l]` for the inclusive range `[l, r]`, mixing inclusive and exclusive endpoints, or dropping the leading `prefix[0] = 0`, shifts the answer by exactly one element — a full-array or single-element query surfaces it immediately. The half-open shape (`prefix` covers elements _before_ the index) is a fixed contract; querying it with a closed-interval mental model silently reads one slot too few or too many.

Accumulated totals also grow far faster than any individual element. A million `int` values near `2^31` overflow a 32-bit prefix long before any single value does, wrapping to a wrong — often negative — total while every input looked in range. Accumulating in a 64-bit type keeps the running sum valid; the same risk carries into the difference between two large prefixes.

# Reference Drawer

> [!ABSTRACT]- Range sum as a difference of prefixes
>
> ```mermaid
> flowchart LR
>   A["prefix[l]<br/>sum of a[0..l-1]"] --> C["prefix[r+1] - prefix[l]"]
>   B["prefix[r+1]<br/>sum of a[0..r]"] --> C
>   C --> D["sum of a[l..r]"]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Build once, then answer any range sum in O(1).
> public static long[] BuildPrefix(int[] a)
> {
>     var prefix = new long[a.Length + 1];           // prefix[0] = 0, length n + 1
>     for (int i = 0; i < a.Length; i++)
>         prefix[i + 1] = prefix[i] + a[i];          // long guards against overflow
>     return prefix;
> }
>
> // Sum of a[l..r] inclusive.
> public static long RangeSum(long[] prefix, int l, int r) => prefix[r + 1] - prefix[l];
> ```
>
> `RangeSum` assumes `0 <= l <= r < n`; the leading `0` and the extra prefix slot remove the `l == 0` and `r == n - 1` boundary cases.

# Comparison

| Approach | Range query | Update | Preprocessing | Stronger case | Semantic limit |
| --- | --- | --- | --- | --- | --- |
| Naive re-sum | `O(n)` | `O(1)` (data is just the array) | None | A handful of queries, or the array changes constantly | Re-reads the whole range every time |
| Prefix sum | `O(1)` | `O(n)` rebuild | `O(n)` build, `O(n)` space | Many range sums over a static array | Any element write invalidates the table |
| [[Computer Science/Data Structures/Trees/Fenwick Tree\|Fenwick tree]] | `O(log n)` prefix query | `O(log n)` point update | `O(n)` build | Point updates interleaved with prefix/range sums | Prefix-style associative queries only |
| [[Computer Science/Data Structures/Trees/Segment Tree\|Segment tree]] | `O(log n)` | `O(log n)` point update; selected range updates with compatible lazy state | `O(n)` build, `~2–4n` space | Point updates and general associative range aggregation | Lazy updates must compose with the aggregate; higher constants and memory |
| [[Computer Science/Algorithms/Patterns/Sliding Window\|Sliding window]] | `O(1)` amortized over a moving window | window slides in `O(1)` | None | One contiguous window advancing over the array | No random-access range; endpoints only move forward |

# Questions

> [!QUESTION]- Why does `prefix[r + 1] - prefix[l]` yield the sum of `a[l..r]`?
> `prefix[r + 1]` is the sum of every element before index `r + 1`, i.e. `a[0..r]`, and `prefix[l]` is the sum of `a[0..l-1]`. Their difference cancels the shared head `a[0..l-1]` exactly, leaving `a[l] + ... + a[r]`. The `prefix[0] = 0` sentinel lets `l = 0` use the same formula with no special case.

> [!QUESTION]- What makes prefix sums unsuitable once the array is updated between queries?
> Writing one element changes every running total from that index onward, so the whole tail of `prefix` is invalid and must be rebuilt in `O(n)`. With `q` interleaved updates this degrades to `O(nq)`. A [[Computer Science/Data Structures/Trees/Fenwick Tree|Fenwick tree]] keeps point updates and prefix queries at `O(log n)`; a [[Computer Science/Data Structures/Trees/Segment Tree|segment tree]] supports point updates and associative range aggregation in `O(log n)`.

# References

- [Guy E. Blelloch, "Prefix Sums and Their Applications", CMU-CS-90-190 (November 1990)](https://www.cs.cmu.edu/afs/cs.cmu.edu/project/scandal/public/papers/CMU-CS-90-190.html) — defines all-prefix-sums (scan) and gives sequential and PRAM algorithms.
- [Prefix sum (Wikipedia)](https://en.wikipedia.org/wiki/Prefix_sum) — definition and scan terminology.
- [Fenwick (Binary Indexed) Tree](https://cp-algorithms.com/data_structures/fenwick.html) — the `O(log n)` structure to switch to once the underlying array is mutated between queries.
- [Subarray Sum Equals K (LeetCode #560)](https://leetcode.com/problems/subarray-sum-equals-k/) — canonical use of running prefixes to answer a range-count question in one pass.
