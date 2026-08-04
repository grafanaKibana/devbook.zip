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

A dataset holds daily sales for a year, and a report asks for the total of dozens of arbitrary date ranges. A prefix sum precomputes every running total once: `prefix[i]` is the sum of the first `i` elements, with `prefix[0] = 0` standing for the empty prefix. The sum of an inclusive range `[l, r]` is then `prefix[r + 1] - prefix[l]` — a single subtraction, because the shared left portion `prefix[l]` cancels out and only the elements between the two totals survive.



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
      "description": "number of input elements or states"
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

The array must be **static** for the whole query phase. A workload that mutates the array between reads wants a [[Home/Computer Science/Data Structures/Trees/Fenwick Tree|Fenwick tree]] for point updates plus prefix sums, or a [[Home/Computer Science/Data Structures/Trees/Segment Tree|segment tree]] for point updates plus general associative range aggregation. Lazy range updates are not automatic: they require an update operation whose state composes correctly with the stored aggregate.

The `+1` convention is the classic off-by-one. Because the formula is `prefix[r + 1] - prefix[l]` for the inclusive range `[l, r]`, mixing inclusive and exclusive endpoints, or dropping the leading `prefix[0] = 0`, shifts the answer by exactly one element — a full-array or single-element query surfaces it immediately. The half-open shape (`prefix` covers elements *before* the index) is a fixed contract; querying it with a closed-interval mental model silently reads one slot too few or too many.

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
> `RangeSum` assumes `0 <= l <= r < n`; the leading `0` and the extra prefix slot remove the `l == 0` and `r == n - 1` boundary cases.

# Comparison

| Approach | Stronger case | Semantic limit |
| --- | --- | --- |
| Naive re-sum | A handful of queries, or an array that changes constantly | Re-reads the whole range every time |
| Prefix sum | Many range sums over a static array | Any element write invalidates the stored suffix of totals |
| [[Home/Computer Science/Data Structures/Trees/Fenwick Tree|Fenwick tree]] | Point updates interleaved with prefix or range sums | Prefix-style associative queries only |
| [[Home/Computer Science/Data Structures/Trees/Segment Tree|Segment tree]] | Point updates and general associative range aggregation | Lazy updates must compose with the aggregate; higher implementation and memory cost |
| [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding window]] | One contiguous window advancing over the array | No random-access range; endpoints only move forward |

# Questions

> [!QUESTION]- Why does `prefix[r + 1] - prefix[l]` yield the sum of `a[l..r]`?
> `prefix[r + 1]` is the sum of every element before index `r + 1`, i.e. `a[0..r]`, and `prefix[l]` is the sum of `a[0..l-1]`. Their difference cancels the shared head `a[0..l-1]` exactly, leaving `a[l] + ... + a[r]`. The `prefix[0] = 0` sentinel lets `l = 0` use the same formula with no special case.

> [!QUESTION]- What makes prefix sums unsuitable once the array is updated between queries?
> Writing one element changes every stored total from that index onward. If updates and queries are interleaved, a Fenwick tree or segment tree updates only the summaries that cover the changed position instead of rebuilding the entire suffix.


# References

- [Guy E. Blelloch, "Prefix Sums and Their Applications", CMU-CS-90-190 (November 1990)](https://www.cs.cmu.edu/afs/cs.cmu.edu/project/scandal/public/papers/CMU-CS-90-190.html) — defines all-prefix-sums (scan) and gives sequential and PRAM algorithms.
- [Prefix sum (Wikipedia)](https://en.wikipedia.org/wiki/Prefix_sum) — definition and scan terminology.
- [Fenwick (Binary Indexed) Tree](https://cp-algorithms.com/data_structures/fenwick.html)
- [Subarray Sum Equals K (LeetCode #560)](https://leetcode.com/problems/subarray-sum-equals-k/) — canonical use of running prefixes to answer a range-count question in one pass.
