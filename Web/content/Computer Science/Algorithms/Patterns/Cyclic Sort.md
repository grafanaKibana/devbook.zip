---
publish: true
created: 2026-08-20T20:41:15.528Z
modified: 2026-08-20T20:41:15.529Z
published: 2026-08-20T20:41:15.529Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Sorts a permutation of 1..n by swapping each value directly to its home index.
level:
  - "4"
priority: Medium
status: Creation
---

Cyclic Sort exploits a narrow input contract: an array of `n` integers is a permutation of `1..n`, so every value names its final index.

At each position, the algorithm swaps the resident value into that home and repeats until the correct value arrives. Missing-value and duplicate-value problems use a guarded variant. Values still map to `1..n`, but collisions or absent homes are allowed. A final mismatch scan exposes them. This range-mapped interview pattern is distinct from the comparison-based Cycle Sort that minimizes writes on arbitrary comparable values.

````tabsdown
tab: Visualization



```steptrace
{ "algorithm": "cyclic-sort", "array": [3, 1, 5, 4, 2] }
```



The cursor stays put after a swap because the displaced value still needs inspection; it advances only when the resident value is home.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Cyclic Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "length of the 1..n permutation"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (merge sort)",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        },
        {
          "kind": "approach",
          "label": "Cyclic sort",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (merge sort)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Cyclic sort",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```
````

# Why Each Swap Finalises an Element

At index `i`, let `v = a[i]` and `home = v − 1`:

- If `v` is in range and `a[home] != v`, swapping `a[i]` with `a[home]` puts `v` in its final position. The displaced value at `i` still needs inspection, so the index stays put.
- Otherwise `v` is already home, out of range, or `home` already holds an equal value. Nothing more can be done at `i`, so `i` advances.

One index may be processed several times. Still, each swap fills a home that was previously unsatisfied, and a placed value never moves again. At most `n − 1` swaps occur across the whole run.

The guard compares values, not indices. `a[home] != v` stops when a duplicate reaches a slot already holding the same value. That check prevents an infinite swap and leaves the duplicate visible to the final scan.

# Guarded Anomaly Variants

Duplicates and out-of-range values break the pure permutation contract. The guarded variant can still place every value with an unsatisfied in-range home. Values with no valid home, or whose home already contains an equal value, are skipped.

Out-of-range values have no home. On `[3, 4, -1, 1]` (a _First Missing Positive_ input), the value `-1` and any value `> n` cannot be placed. The guard must skip them (`v < 1 || v > n`) and advance. Dropping that check computes `home = -2` and indexes out of bounds.

Duplicates share a home. On `[1, 3, 3, 4]`, both copies of `3` want index 2. Once one arrives, a guard based on `i != home` keeps swapping the equal values forever. The value check `a[home] != v` recognizes that the home is already satisfied and stops.

This is not a general sort. Arbitrary integers, floating-point values, and keys without an index mapping do not identify a swap target.

# Diagram and C# Implementation

> [!ABSTRACT]- Placement decision at index `i`
>
> ```mermaid
> flowchart TD
>   A[Set i to zero] --> B{i less than n}
>   B -->|No| Z[Scan for first index whose value is not i plus one]
>   B -->|Yes| C[Compute home as value minus one]
>   C --> D{value in range and home does not already hold it}
>   D -->|Yes| E[Swap value into its home and keep i fixed]
>   D -->|No| F[Advance i]
>   E --> B
>   F --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> ```

> public static void CyclicSort(int\[] a)
> {
> var i = 0;
> while (i < a.Length)
> {
> var home = a\[i] - 1;                       // value v belongs at index v - 1
> if (a\[i] >= 1 && a\[i] <= a.Length && a\[i] != a\[home])
> {
> (a\[i], a\[home]) = (a\[home], a\[i]);      // swap v home; do NOT advance i
> }
> else
> {
> i++;                                    // already placed or out of range
> }
> }
> }
>
> // Find All Numbers Disappeared in an Array (LeetCode 448).
> public static IList<int> FindDisappeared(int\[] a)
> {
> var i = 0;
> while (i < a.Length)
> {
> var home = a\[i] - 1;
> if (a\[i] != a\[home])                        // duplicates make a\[i] == a\[home], so they are skipped
> {
> (a\[i], a\[home]) = (a\[home], a\[i]);
> }
> else
> {
> i++;
> }
> }
>
> ```
> var missing = new List<int>();
> for (var j = 0; j < a.Length; j++)
> {
>     if (a[j] != j + 1)                          // slot j should hold j + 1
>     {
>         missing.Add(j + 1);
>     }
> }
>
> return missing;
> ```
>
> }
>
> ```
> The guard tests `a[i] != a[home]` on values, not `i != home` on indices — that is what stops a duplicate from swapping forever and what lets the final scan report the anomaly.
> ```

# Comparison

| Strategy | Required input | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Cyclic Sort | Values mapped to a contiguous range. Uniqueness for the pure sort | Place a permutation, or find a missing/duplicate in `1..n`, while mutating the array directly | Wide or non-contiguous ranges. Read-only input |
| [[Computer Science/Algorithms/Sorting Algorithms/Counting Sort\|Counting Sort]] | Small integer range `k` | Small integer ranges that need counts or stable order | Large `k` inflates the count buffer |
| General comparison sort | Comparable keys | Arbitrary keys with no index mapping | Cannot exploit values that already identify their destination |
| Hash set / boolean array | Hashable values | Detecting missing or duplicate values over an arbitrary domain | Allocates a separate lookup structure |

For the read-only contract of `n + 1` values drawn from `1..n`, [[Computer Science/Algorithms/Patterns/Fast and Slow Pointers|Fast and Slow Pointers]] can recover the duplicate by treating the array as a functional graph. That method does not cover arbitrary read-only missing-value inputs.

# References

- [Find All Numbers Disappeared in an Array (LeetCode #448)](https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/)
