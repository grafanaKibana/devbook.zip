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

Sorting the array replaces nested pair enumeration with a converging scan. Two indices start at opposite ends, `left` on the smallest value and `right` on the largest, and each step compares `a[left] + a[right]` against the target. The comparison decides which index moves inward, and every move permanently removes a block of pairs that can no longer reach the target.

The collapse depends on order. On sorted input, raising `left` can only increase the sum and lowering `right` can only decrease it, so one comparison settles the fate of an entire set of pairs. Without that monotonic relationship, a pointer move is a guess that can step over the answer.



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

# When Order is the Whole Precondition

The discard argument is valid only while the sequence is monotonic. On the unsorted array `[13, 1, 10, 4, 8, 3, 6]`, a search for `18` starts at `13 + 6 = 19`, retreats `right` once, and from then on advances `left` on every too-small sum. It reports no pair even though `10 + 8 = 18` sits in the array. Nothing crashes; unsorted input yields a plausible false negative.

Duplicates change what counts as an answer. Enumerating every distinct pair that sums to the target — rather than just the first — needs a skip step: after recording a match, advance `left` past its run of equal values and pull `right` back past its run. On `[2, 2, 3, 3]` with target `5`, plain `left++; right--` reports the pair `(2, 3)` twice; skipping equal runs reports it once.

The pattern here moves its pointers toward each other from opposite ends. That is distinct from [[Home/Computer Science/Algorithms/Patterns/Fast and Slow Pointers|Fast and Slow Pointers]], where both pointers travel the same direction at different speeds to detect a cycle or find a midpoint; those never rely on sorted order, and their invariant is relative position rather than a converging sum.

# Reference Drawer

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
> The guard `left < right` keeps the two indices on distinct elements; a match returns immediately, and crossing pointers report absence. This variant scans for the opposite-direction pattern only; a same-direction fast/slow walk belongs with [[Home/Computer Science/Algorithms/Patterns/Fast and Slow Pointers|Fast and Slow Pointers]].

# Comparison

| Strategy | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Converging two pointers | Sorted / monotonic input | Order already exists and space is tight | Unsorted or non-monotonic data |
| Brute-force nested loops | Nothing | Tiny arrays where setup cost dominates | Any large input |
| Hash lookup | Nothing | Unsorted input; repeated complement lookups | Memory pressure; ordered or range access |
| [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] per element | Sorted input | Complements drawn from a separate sorted set | Plain two-sum, where the converging pass already applies |
| [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]] | Contiguous-subarray aggregate | Running sum or count over a window | Comparing or rearranging arbitrary element pairs |

Binary-searching each element's complement repeats a separate search for every element, so it earns its place only when the two operands come from different sequences. [[Home/Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]] shares the forward-moving-index shape yet answers a different question — an aggregate over a contiguous range rather than a relationship between two ends.

# Questions

> [!QUESTION]- Why does the converging two-sum require sorted input?
> The move "advance left or retreat right" is justified only because raising `left` can only increase the sum and lowering `right` can only decrease it. Sorted order guarantees that monotonicity. On unsorted data the relationship is gone, so a pointer move can step over the pair that answers the query.

> [!QUESTION]- When `a[left] + a[right]` is too small, which pairs become impossible and why is `left++` safe?
> Every pair that keeps the current `left` and uses any partner at or below `right` is even smaller than the current sum, so no pair anchored at `left` can reach the target. That entire column is eliminated, and `left++` discards it without losing a possible answer.

> [!QUESTION]- What does a hash set buy over two pointers for two-sum?
> A hash set removes the sorted-input requirement by remembering previously seen complements, but it stores values as the scan proceeds. Use it for unsorted input; prefer converging pointers when ordering already exists and preserving a small state footprint matters.


# References

- [C. A. R. Hoare, "Quicksort" (1962)](https://doi.org/10.1093/comjnl/5.1.10) — the primary paper for a canonical bidirectional-pointer scan: inward indices partition an ordered range without additional state.
- [Two Sum II (LeetCode #167)](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) — the canonical converging-pointer problem on a sorted array.
- [Two Pointers (USACO Guide)](https://usaco.guide/silver/two-pointers) — categorised converging and same-direction two-pointer problems with worked solutions.
- [Floyd's cycle detection (cp-algorithms)](https://cp-algorithms.com/others/tortoise_and_hare.html) — the same-direction fast/slow variant distinguished from the converging pattern on this page.
