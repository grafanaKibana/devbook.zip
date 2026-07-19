---
publish: true
created: 2026-07-18T14:02:43.976Z
modified: 2026-07-18T14:02:43.977Z
published: 2026-07-18T14:02:43.977Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Two indices over a sequence solve in O(n) what nested loops solve in O(n²).
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

Finding two values in an array that sum to a target, checked with a nested loop, compares every pair — `n(n-1)/2` comparisons, `O(n²)`. Sorting the array collapses that quadratic scan into a single pass. Two indices start at opposite ends, `left` on the smallest value and `right` on the largest, and each step compares `a[left] + a[right]` against the target. The comparison decides which index moves inward, and every move permanently removes a block of pairs that can no longer reach the target.

The collapse depends on order. On sorted input, raising `left` can only increase the sum and lowering `right` can only decrease it, so one comparison settles the fate of an entire set of pairs. Without that monotonic relationship, a pointer move is a guess that can step over the answer.

**Core condition:** sorted or otherwise monotonic input → one comparison discards a whole column of pairs → an `O(n)` pass with `O(1)` auxiliary space.

# The converging pass

The trace runs the converging pair-sum over the sorted array `[1, 3, 4, 6, 8, 10, 13]`, searching for two elements that add to `18`.

```steptrace
{"algorithm":"two-pointers","array":[1,3,4,6,8,10,13],"target":18}
```

The first comparison adds the extremes, `1 + 13 = 14`, which falls short of `18`. With the array sorted, `13` is already the largest available partner for `1`; every other pair anchored at index `0` uses a smaller right value and sums to less than `14`. That whole block of pairs is therefore too small, and `left++` discards it in one step. Later, when `6 + 13 = 19` overshoots, the mirror argument applies: every pair anchored at `13` uses a left value of at least `6`, so all of them exceed `18`, and `right--` drops that block. The pointers converge on `8 + 10 = 18` after visiting each index at most once.

# Why moving one pointer discards a whole set

Sorted order is the invariant that turns each move into a proof instead of a guess. Consider the full grid of candidate pairs `(i, j)` with `i < j`: a brute-force loop inspects all `O(n²)` cells. The converging pointers instead sit at one cell `(left, right)` and let a single comparison eliminate an entire line of that grid.

- `a[left] + a[right] < target`: every pair `(left, j)` with `j ≤ right` uses a partner no larger than `a[right]`, so all of them are even smaller. The column at `left` holds no solution; `left++`.
- `a[left] + a[right] > target`: every pair `(i, right)` with `i ≥ left` uses a value no smaller than `a[left]`, so all of them are even larger. The row at `right` holds no solution; `right--`.

Each move retires one index permanently, so `left` and `right` together advance at most `n` times before they meet. Every element is visited at most once, which is why the sorted-order pass is `O(n)` where the nested loop is `O(n²)`.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | The initial end pair already sums to the target. |
| Average | `O(n)` | `O(1)` | The pointers converge, each index visited once. |
| Worst | `O(n)` | `O(1)` | The pointers meet or cross after `n` moves, matching on the last step or exhausting the array. |

These bounds cover only the converging pass and assume the input is already sorted. A nested-loop scan of the same problem is `O(n²)` time with `O(1)` space. When the input arrives unsorted, sorting it to enable the pass adds `O(n log n)` time — which dominates the linear pass — plus `O(log n)` to `O(n)` sort space; that preprocessing pays back only when the sorted order is reused across later queries.

# When order is the whole precondition

The discard argument is valid only while the sequence is monotonic. On the unsorted array `[13, 1, 10, 4, 8, 3, 6]`, a search for `18` starts at `13 + 6 = 19`, retreats `right` once, and from then on advances `left` on every too-small sum. It reports no pair even though `10 + 8 = 18` sits in the array. Nothing crashes; unsorted input yields a plausible false negative. Sorting first restores correctness at `O(n log n)`, worthwhile only when several queries share that order.

Duplicates change what counts as an answer. Enumerating every distinct pair that sums to the target — rather than just the first — needs a skip step: after recording a match, advance `left` past its run of equal values and pull `right` back past its run. On `[2, 2, 3, 3]` with target `5`, plain `left++; right--` reports the pair `(2, 3)` twice; skipping equal runs reports it once.

The pattern here moves its pointers toward each other from opposite ends. That is distinct from [[Fast and Slow Pointers]], where both pointers travel the same direction at different speeds to detect a cycle or find a midpoint; those never rely on sorted order, and their invariant is relative position rather than a converging sum.

# Reference drawer

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
>         var sum = values[left] + values[right];
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
>
> The guard `left < right` keeps the two indices on distinct elements; a match returns immediately, and crossing pointers report absence. This variant scans for the opposite-direction pattern only; a same-direction fast/slow walk belongs with [[Fast and Slow Pointers]].

# Comparison

| Strategy | Time | Space | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Converging two pointers | `O(n)` | `O(1)` | Sorted / monotonic input | Order already exists and space is tight | Unsorted or non-monotonic data |
| Brute-force nested loops | `O(n²)` | `O(1)` | Nothing | Tiny arrays where setup cost dominates | Any large input |
| Hash lookup | `O(n)` average | `O(n)` | Nothing | Unsorted input; repeated complement lookups | Memory pressure; ordered or range access |
| [[Binary Search]] per element | `O(n log n)` | `O(1)` | Sorted input | Complements drawn from a separate sorted set | Plain two-sum, where the linear pass already applies |
| [[Sliding Window]] | `O(n)` | `O(1)` | Contiguous-subarray aggregate | Running sum or count over a window | Comparing or rearranging arbitrary element pairs |

Two pointers is the `O(1)`-space linear method once the array is sorted: it reuses the existing order instead of allocating an index. A hash set drops the sorting requirement and stays linear, paying `O(n)` memory and giving up ordered access. Binary-searching each element's complement matches the sorted-input precondition but adds a log factor the converging pass avoids, so it earns its place only when the two operands come from different sequences. [[Sliding Window]] shares the forward-moving-index shape yet answers a different question — an aggregate over a contiguous range rather than a relationship between two ends.

# Questions

> [!QUESTION]- Why does the converging two-sum require sorted input?
> The move "advance left or retreat right" is justified only because raising `left` can only increase the sum and lowering `right` can only decrease it. Sorted order guarantees that monotonicity. On unsorted data the relationship is gone, so a pointer move can step over the pair that answers the query.

> [!QUESTION]- When `a[left] + a[right]` is too small, which pairs become impossible and why is `left++` safe?
> Every pair that keeps the current `left` and uses any partner at or below `right` is even smaller than the current sum, so no pair anchored at `left` can reach the target. That entire column is eliminated, and `left++` discards it without losing a possible answer.

> [!QUESTION]- What does a hash set buy over two pointers for two-sum?
> A hash set removes the sorted-input precondition and finds a complement in `O(n)` time on unsorted data. The cost is `O(n)` extra memory and the loss of ordered traversal, which two pointers keep for free when the array is already sorted.

# References

- [Two Sum II (LeetCode #167)](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) — the canonical converging-pointer problem on a sorted array.
- [Two Pointers (USACO Guide)](https://usaco.guide/silver/two-pointers) — categorised converging and same-direction two-pointer problems with worked solutions.
- [Floyd's cycle detection (cp-algorithms)](https://cp-algorithms.com/others/tortoise_and_hare.html) — the same-direction fast/slow variant distinguished from the converging pattern on this page.
