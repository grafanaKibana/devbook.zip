---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Precomputes cumulative sums so each later range sum becomes one subtraction."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

Repeated range-sum queries should not rescan the same values. A prefix array stores `prefix[i]`, the sum of the first `i` elements, with `prefix[0] = 0` for the empty prefix. An inclusive range `[l, r]` then costs one subtraction: `prefix[r + 1] - prefix[l]`. The shared prefix before `l` cancels, leaving exactly the requested range.



~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"prefix-sum","array":[4,7,2,9,5,3,8],"range":[2,5]}
```



The trace uses seven days of sales, `[4, 7, 2, 9, 5, 3, 8]`. It writes every running total into the prefix array, then answers `[2, 5]`: `prefix[6] - prefix[2] = 30 - 11 = 19`.



`prefix[k]` accumulates every element strictly before index `k`, so `prefix[r + 1]` covers `a[0..r]` and `prefix[l]` covers `a[0..l-1]`. Subtracting them removes the common head `a[0..l-1]` exactly, leaving `a[l] + ... + a[r]`. The `prefix[0] = 0` sentinel and the length-`(n + 1)` array are what let `l = 0` use the same formula as any other left bound: `prefix[0]` supplies the empty sum with no special case.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Prefix Sum complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the source array"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (re-sum per query)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Prefix sum",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (re-sum per query)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Prefix sum",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```

Both curves are per-query. The prefix array costs `O(n)` to build once, so the pattern only pays off when the number of queries outgrows that single pass.
~~~~~

# When the Precompute Stops Holding

The source array must remain static during the query phase. One element update invalidates every later prefix. Workloads that mix writes with reads need a [[Home/Computer Science/Data Structures/Trees/Fenwick Tree|Fenwick tree]] for point updates and sums, or a [[Home/Computer Science/Data Structures/Trees/Segment Tree|segment tree]] for broader associative range aggregation. Lazy range updates require an update operation that composes correctly with the stored aggregate.

The `+1` convention prevents a special case at the left edge. `prefix[k]` covers elements before `k`, so an inclusive query `[l, r]` uses `prefix[r + 1] - prefix[l]`. Mixing that half-open prefix definition with closed endpoints shifts the result by one element. Single-element and full-array queries expose the mismatch quickly.

The running total may overflow even when every input fits its type. A million large `int` values exceed 32-bit range long before the array ends, so the prefix storage and subtraction should use a wider type such as `long`.

# Diagram and C# Implementation

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
> `RangeSum` assumes `0 <= l <= r < n`. The leading `0` and the extra prefix slot remove the `l == 0` and `r == n - 1` boundary cases.

# Comparison

| Approach | Stronger case | Semantic limit |
| --- | --- | --- |
| Naive re-sum | A handful of queries, or an array that changes constantly | Re-reads the whole range every time |
| Prefix sum | Many range sums over a static array | Any element write invalidates the stored suffix of totals |
| [[Home/Computer Science/Data Structures/Trees/Fenwick Tree|Fenwick tree]] | Point updates interleaved with prefix or range sums | Prefix-style associative queries only |
| [[Home/Computer Science/Data Structures/Trees/Segment Tree|Segment tree]] | Point updates and general associative range aggregation | Lazy updates must compose with the aggregate. Higher implementation and memory cost |
| [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding window]] | One contiguous window advancing over the array | No random-access range. Endpoints only move forward |

# References

- [Guy E. Blelloch, "Prefix Sums and Their Applications", CMU-CS-90-190 (November 1990)](https://www.cs.cmu.edu/afs/cs.cmu.edu/project/scandal/public/papers/CMU-CS-90-190.html)
- [Subarray Sum Equals K (LeetCode #560)](https://leetcode.com/problems/subarray-sum-equals-k/)
