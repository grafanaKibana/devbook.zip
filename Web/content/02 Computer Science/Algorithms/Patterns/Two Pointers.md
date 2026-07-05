---
publish: true
created: 2026-07-05T10:53:25.656+03:00
modified: 2026-07-05T15:49:36.819+03:00
---

# Intro

The two-pointer technique uses two indices moving over a sequence to solve in **O(n)** what a naive nested loop solves in O(n²). It works whenever the problem has **monotonic structure** you can exploit — a sorted array, or a condition that only ever tightens or loosens as you move. Typical wins: find a pair summing to a target in a sorted array, reverse/partition in place, remove duplicates, detect a cycle in a linked list, or merge two sorted sequences.

## How It Works

Three common configurations:

- **Opposite ends (converging)** — `left = 0`, `right = n-1`, move them toward each other based on a comparison. Classic for "pair with target sum" in a sorted array: if the sum is too small advance `left`, too big retreat `right`.
- **Same direction (fast/slow)** — both start at the front; one advances conditionally. Used for in-place dedup, partitioning, and (with different speeds) **Floyd's cycle detection** in a linked list.
- **Two sequences** — one pointer per array, advancing whichever is behind. The merge step of [[merge sort]] is exactly this.

The reason it's O(n): each pointer only ever moves forward (or they only converge), so the total number of moves is bounded by n — you never re-examine the same pair twice.

## Example

Two-sum on a **sorted** array, converging pointers:

```csharp
public static (int, int)? TwoSumSorted(int[] a, int target)
{
    int left = 0, right = a.Length - 1;
    while (left < right)
    {
        int sum = a[left] + a[right];
        if (sum == target) return (left, right);
        if (sum < target)  left++;   // need a bigger sum
        else               right--;  // need a smaller sum
    }
    return null;
}
```

In-place dedup of a sorted array, fast/slow pointers:

```csharp
public static int RemoveDuplicates(int[] a)
{
    if (a.Length == 0) return 0;
    int slow = 0;                       // last unique position
    for (int fast = 1; fast < a.Length; fast++)
        if (a[fast] != a[slow])
            a[++slow] = a[fast];
    return slow + 1;                    // new length
}
```

## Pitfalls

- **Requires the right precondition** — converging two-sum only works because the array is **sorted**. On unsorted input you either sort first (O(n log n)) or use a hash set (O(n) time, O(n) space). Applying it to unsorted data gives wrong answers, not just slow ones.
- **Off-by-one and termination** — `while (left < right)` vs `<=` changes whether the middle element is considered and whether equal-index pairs are allowed. Pick deliberately and test the 0/1/2-element cases.
- **Infinite loops** — every iteration must move at least one pointer toward termination. A branch that advances neither pointer hangs.
- **Confusing with sliding window** — both use two indices moving forward, but a [[Sliding Window]] maintains a _contiguous range and its aggregate_; two pointers usually compare or partition _elements_. If you're tracking a running sum/count over a sub-array, it's a window.

## Tradeoffs

| Approach | Time | Space | Needs |
|---|---|---|---|
| **Two pointers** (sorted) | O(n) | O(1) | Sorted / monotonic input |
| Sort then two pointers | O(n log n) | O(1)–O(n) | Nothing (you sort) |
| Hash set | O(n) | O(n) | Nothing, but uses memory |
| Brute force nested loop | O(n²) | O(1) | Nothing |

**Decision rule**: if the data is already sorted (or you need O(1) space), two pointers is the cleanest O(n). If it's unsorted and memory is cheap, a hash set avoids the sort. Reach for two pointers reflexively on sorted-array, in-place-partition, and linked-list problems.

## Questions

> [!QUESTION]- Why does the converging two-pointer two-sum require a sorted array?
> The decision "move left vs move right" relies on knowing that increasing `left` only increases the sum and decreasing `right` only decreases it — i.e. monotonicity, which sortedness guarantees. On unsorted data that invariant is gone, so the pointer moves can skip the actual answer.

> [!QUESTION]- How do fast and slow pointers detect a cycle in a linked list?
> Advance `slow` by one node and `fast` by two each step (Floyd's tortoise-and-hare). If there's a cycle, `fast` eventually laps and meets `slow`; if `fast` reaches the end (`null`), the list is acyclic. It's O(n) time and O(1) space — no visited set needed.

> [!QUESTION]- How is two pointers different from a sliding window?
> Both move indices forward in O(n), but a sliding window maintains a _contiguous sub-range and an aggregate over it_ (sum, distinct count), expanding/shrinking to satisfy a constraint. Two pointers typically compares or rearranges individual elements (pair sum, partition, merge). Tracking a running window metric ⇒ sliding window; comparing/partitioning ends ⇒ two pointers.

## References

- [Two pointers technique (cp-algorithms)](https://cp-algorithms.com/others/tortoise_and_hare.html) — Floyd's cycle detection and related two-pointer methods.
- [Two Sum II (LeetCode #167)](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/) — the canonical converging-pointer exercise.
- [Two pointers (USACO Guide)](https://usaco.guide/silver/two-pointers) — categorised problems and patterns.
