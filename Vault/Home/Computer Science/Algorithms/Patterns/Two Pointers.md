---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Uses two coordinated indices to replace nested scans over a sequence."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

On a sorted array, two indices replace nested pair enumeration with a converging scan. `left` starts at the smallest value and `right` at the largest. Each sum comparison decides which index moves inward and rules out every pair anchored at the discarded index.

Order is the proof. Raising `left` can only increase the sum. Lowering `right` can only decrease it. One comparison can therefore settle a whole set of pairs. Without that monotonic relationship, moving either pointer is only a guess.



~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"two-pointers","array":[1,4,5,7,9,12,15],"target":14}
```



The trace runs the converging pair-sum over the sorted array `[1, 4, 5, 7, 9, 12, 15]`, searching for two elements that add to `14`.

The first comparison is `arr[0] + arr[6] = 1 + 15 = 16 > 14`, so `right` moves left. The next comparison is `arr[0] + arr[5] = 1 + 12 = 13 < 14`, so `left` moves right. Each decision retains the compared indices before the chosen pointer moves, and the scan finishes at `arr[2] + arr[4] = 5 + 9 = 14 ✓`.



Sorted order is the invariant that turns each move into a proof instead of a guess. Consider the full grid of candidate pairs `(i, j)` with `i < j`: a brute-force loop inspects each cell. The converging pointers instead sit at one cell `(left, right)` and let a single comparison eliminate an entire line of that grid.

- `a[left] + a[right] < target`: every pair `(left, j)` with `j ≤ right` uses a partner no larger than `a[right]`, so all of them are even smaller. The column at `left` holds no solution; `left++`.
- `a[left] + a[right] > target`: every pair `(i, right)` with `i ≥ left` uses a value no smaller than `a[left]`, so all of them are even larger. The row at `right` holds no solution; `right--`.

Each move retires one index permanently. Neither pointer reverses direction or revisits a discarded pair.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Two Pointers complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the sorted input sequence"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (nested loops)",
          "formula": "O(n^2)",
          "curveId": "quadratic"
        },
        {
          "kind": "approach",
          "label": "Two pointers",
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
          "label": "Naive (nested loops)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Two pointers",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```

The chart describes the converging pass over already-sorted input. If sorting is required first, account for that preprocessing separately.
~~~~~

# When the Proof Stops Working

The discard argument requires monotonic order. On the unsorted array `[13, 1, 10, 4, 8, 3, 6]`, a search for `18` starts at `13 + 6 = 19` and retreats `right`. Every later sum is too small, so `left` keeps advancing. The scan reports no match even though `10 + 8 = 18` is present. Unsorted input fails quietly with a plausible false negative.

Duplicates change the output contract. Returning the first match needs no special handling. Enumerating distinct value pairs does: after a match, move `left` past equal values and move `right` past its equal run. On `[2, 2, 3, 3]` with target `5`, plain `left++; right--` reports `(2, 3)` twice. Skipping equal runs reports it once.

This pattern moves pointers toward each other from opposite ends. [[Home/Computer Science/Algorithms/Patterns/Fast and Slow Pointers|Fast and Slow Pointers]] sends both in the same direction at different speeds to detect a cycle or find a midpoint. That method does not depend on sorted order. Its invariant is relative position rather than a converging sum.

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Sorted input; left at start, right at end] --> B{left less than right}
>   B -->|No| Z[No pair sums to the target]
>   B -->|Yes| C[Compare the end sum with the target]
>   C -->|Equal| F[Return the pair]
>   C -->|Too small| G[Advance left; discard the column]
>   C -->|Too large| H[Retreat right; discard the row]
>   G --> B
>   H --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static (int Left, int Right)? TwoSumSorted(int[] values, int target)
> {
>     var left = 0;
>     var right = values.Length - 1;
>
>     while (left < right)
>     {
>         long sum = (long)values[left] + values[right];
>         if (sum == target)
>         {
>             return (left, right);
>         }
>
>         if (sum < target)
>         {
>             left++;   // the column anchored at left is too small
>         }
>         else
>         {
>             right--;  // the row anchored at right is too large
>         }
>     }
>
>     return null;
> }
> ```
> The guard `left < right` keeps the two indices on distinct elements. A match returns immediately, and crossing pointers report absence. This variant scans for the opposite-direction pattern only. A same-direction fast/slow walk belongs with [[Home/Computer Science/Algorithms/Patterns/Fast and Slow Pointers|Fast and Slow Pointers]].

# Comparison

| Strategy | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Converging two pointers | Sorted / monotonic input | Order already exists and space is tight | Unsorted or non-monotonic data |
| Brute-force nested loops | Nothing | Tiny arrays where setup cost dominates | Any large input |
| Hash lookup | Nothing | Unsorted input. Repeated complement lookups | Memory pressure. Ordered or range access |
| [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] per element | Sorted input | Complements drawn from a separate sorted set | Plain two-sum, where the converging pass already applies |
| [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]] | Contiguous-subarray aggregate | Running sum or count over a window | Comparing or rearranging arbitrary element pairs |

Binary-searching each element's complement repeats a separate search for every element. It makes sense when the operands come from different sorted sequences, not for plain two-sum. [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]] also moves indices forward, but it maintains an aggregate over a contiguous range rather than comparing two ends.

# References

- [Two Pointers (USACO Guide)](https://usaco.guide/silver/two-pointers)
