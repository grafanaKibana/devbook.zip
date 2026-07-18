---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Computes an aggregate over every contiguous subarray in O(n) by updating a moving range."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A report needs the largest total of any 30 consecutive daily readings across a series of 100,000. Summing each of the ~100,000 windows independently rescans 30 values every time — `O(n·k)` work that mostly re-adds numbers the previous sum already held. The sliding window keeps one running total and a pair of boundaries: advancing the right boundary adds the entering value, advancing the left boundary subtracts the leaving value, so each successive window costs one addition and one subtraction instead of a full rescan.

The technique applies whenever the answer concerns a contiguous sub-array or substring and the quantity tracked over that range — a sum, a count, a distinct-symbol frequency map — can be updated in `O(1)` as one element enters and one leaves. The order of the elements does not matter; contiguity and an incrementally maintainable aggregate do.

**Core condition:** contiguous range + an aggregate that updates in `O(1)` on element entry and exit → one linear pass replaces per-window recomputation → `O(n)` time.

# Shrinking to the shortest window

The trace searches `[2, 3, 1, 2, 4, 3]` for the shortest contiguous sub-array whose sum reaches `7`.

```steptrace
{"algorithm":"sliding-window","array":[2,3,1,2,4,3],"target":7}
```

The right boundary advances first, adding each entering element to a running sum in `O(1)`, until the sum reaches `7` and a valid window exists. The left boundary then advances, subtracting the leaving element in `O(1)`; each contraction that keeps the sum at or above `7` produces a shorter candidate. Because non-negative values only raise the sum on entry and lower it on exit, once no shorter valid window is reachable from the current left the left boundary never moves back. Two consecutive windows differ only in their boundary elements, so the running sum is adjusted by those two elements rather than rebuilt from the window's contents.

# Why the window never recomputes

Every index is added to the aggregate exactly once, when the right boundary passes it, and removed at most once, when the left boundary passes it. The right boundary advances `n` times over the whole run; the left boundary advances at most `n` times and never overtakes the right. Total boundary movement is bounded by `2n`, and each movement does `O(1)` aggregate maintenance — hence `O(n)`, independent of window width.

The bound holds only while the aggregate is incrementally maintainable: adding the entering element and removing the leaving element must each be `O(1)` and must, together, fully determine the new window's value. A running sum qualifies (`sum += entering; sum -= leaving`); a count of elements qualifies; a frequency map keyed by symbol qualifies, because a single key's count is incremented on entry and decremented on exit. An aggregate that cannot be reconstructed from a single leaving element — a window maximum, for instance — does not qualify, and forces a different structure.

# Complexity

| Approach | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Sliding window, numeric aggregate | `O(n)` | `O(1)` | Each index enters via the right boundary once and leaves via the left once; the running sum or count updates in `O(1)` per move. |
| Sliding window, frequency map over `k` symbols | `O(n)` | `O(k)` | The map holds at most `k` distinct keys; each update is `O(1)`, but the table itself scales with the alphabet. |
| Brute-force recompute per window | `O(n·k)` fixed width, `O(n²)` variable | `O(1)` | Every window rescans its members from scratch instead of adjusting the previous window's aggregate by two boundary elements. |

The two sliding-window rows share the `O(n)` time bound; the space difference is entirely the aggregate's representation. The brute-force row is the same problem without incremental maintenance — `k` is the window width for a fixed window and grows toward `n` for a variable one, which is where the `O(n²)` comes from.

# Where the incremental aggregate fails

A fixed-size window contracts on a schedule: every element the right boundary adds, the left boundary removes exactly one, holding the width at `k`. A variable-size window contracts conditionally — the left boundary advances only while the window violates (or, for a minimizing problem, still satisfies) the constraint, so a single right step can trigger several left steps or none. Applying the fixed rule to a variable problem pins the width and never explores shorter or longer ranges; applying the variable rule without a stopping condition shrinks past validity.

The removal step must rebuild the new aggregate from the leaving element alone. A running sum or a per-key frequency count does; a window maximum does not — dropping the element that happened to be the maximum leaves no cheap way to find the next-largest element still inside the window. Sliding-window maximum and minimum therefore replace the scalar aggregate with a [[Monotonic Stack and Queue|monotonic deque]] of candidate indices, which supports `O(1)` amortized removal of the current extreme while preserving the once-in-once-out accounting.

Negative numbers break the contraction rule even though the sum still updates in `O(1)`. "Shrink while the sum exceeds the target" assumes the window sum rises on every entry and falls on every removal, which makes the smallest valid length monotone as the right boundary moves. With negatives present a longer window can carry a smaller sum, so a window that fails the constraint can become valid again by extending — incremental maintainability of the sum is intact, but the decision of *when* to contract no longer has a valid basis. Sum-with-negatives problems (a sub-array summing to exactly `k`, say) drop the moving window for [[Prefix Sum|prefix sums]] plus a hash map, which locates any range with a target sum without assuming monotone length.

# Reference drawer

> [!ABSTRACT]- Variable-window control flow
> ```mermaid
> flowchart TD
>   A[left = 0, aggregate empty] --> B{right < n}
>   B -->|No| Z[return best window]
>   B -->|Yes| C[add element at right to aggregate]
>   C --> D{constraint satisfied}
>   D -->|No| G[advance right]
>   D -->|Yes| E[record candidate window]
>   E --> F[remove element at left, advance left]
>   F --> D
>   G --> B
> ```

> [!EXAMPLE]- C# implementations
> ```csharp
> // Fixed window: maximum sum of any k consecutive elements.
> public static int MaxSumWindow(int[] a, int k)
> {
>     int sum = 0;
>     for (int i = 0; i < k; i++) sum += a[i];   // first window
>     int best = sum;
>     for (int i = k; i < a.Length; i++)
>     {
>         sum += a[i] - a[i - k];                // enter a[i], leave a[i - k]
>         best = Math.Max(best, sum);
>     }
>     return best;
> }
>
> // Variable window: length of the longest substring with no repeated character.
> public static int LongestUnique(string s)
> {
>     var lastSeen = new Dictionary<char, int>();
>     int left = 0, best = 0;
>     for (int right = 0; right < s.Length; right++)
>     {
>         if (lastSeen.TryGetValue(s[right], out var prev) && prev >= left)
>             left = prev + 1;                   // jump left past the duplicate
>         lastSeen[s[right]] = right;
>         best = Math.Max(best, right - left + 1);
>     }
>     return best;
> }
> ```
> The fixed form maintains a scalar sum; the variable form maintains a frequency map (`lastSeen`) whose per-key update is what keeps the pass `O(n)`.

# Comparison

| Technique | Time | Space | Required input | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Sliding window | `O(n)` | `O(1)` scalar, `O(k)` map | Contiguous range; aggregate reversible on removal | Contiguous sub-array/substring with an `O(1)`-updatable aggregate | Non-reversible extreme, or a constraint non-monotone in length |
| Brute-force recompute | `O(n·k)` / `O(n²)` | `O(1)` | None | Tiny `n` or a one-off computation | Cost grows with window width |
| [[Two Pointers]] | `O(n)` | `O(1)` | Often sorted; two ends converging inward | Finding a pair/partition by moving opposite ends toward each other | A single window with a running aggregate over its interior |
| [[Prefix Sum]] | `O(n)` build, `O(1)` per query | `O(n)` | Precomputed cumulative array | Many static range-sum queries; sums involving negatives | One constraint-driven window that must also report its members |
| [[Monotonic Stack and Queue]] | `O(n)` | `O(k)` window | Deque of candidate indices | Maximum/minimum of every window | Plain reversible aggregates where a scalar already suffices |

Sliding window is the `O(n)` default for a contiguous-range answer whose aggregate updates incrementally as one element enters and one leaves — it pays for that speed with the requirement that removal be reversible and the constraint be monotone in window length. When two ends converge instead of trailing in the same direction, the shape is [[Two Pointers]]. When the queries are static ranges, or negatives break monotonicity, prefix sums answer any range in `O(1)` after an `O(n)` build. When the aggregate is a non-reversible max or min, a [[Monotonic Stack and Queue|monotonic deque]] restores the once-in-once-out accounting a scalar cannot.

# Questions

> [!QUESTION]- Why is a sliding window `O(n)` and not `O(n·k)`?
> Each index is added to the aggregate once, when the right boundary passes it, and removed at most once, when the left boundary passes it. Total boundary movement is bounded by `2n` and each move is `O(1)`, so window width never enters the cost — the aggregate is adjusted by its two boundary elements rather than rescanned.

> [!QUESTION]- What property must the aggregate have, and which aggregate violates it?
> The new window's value must be reconstructable in `O(1)` from a single entering or leaving element. A running sum and a per-key frequency count are; a window maximum is not, because removing the element that held the maximum leaves no cheap way to recover the next-largest element still inside the window. That case uses a monotonic deque of candidate indices instead of a scalar.

> [!QUESTION]- Why do negative numbers break sum-based sliding windows?
> The contraction rule "shrink while the sum exceeds the target" relies on the sum rising on every entry and falling on every removal, which makes the smallest valid window length monotone as the right boundary advances. Negatives remove that monotonicity — a longer window can carry a smaller sum — so a failed window can become valid by extending. Those problems use prefix sums plus a hash map rather than a moving window.

# References

- [Window Sliding Technique](https://www.geeksforgeeks.org/window-sliding-technique/) — GeeksforGeeks walkthrough of fixed and variable windows with the incremental-update derivation.
- [Longest Substring Without Repeating Characters (LeetCode #3)](https://leetcode.com/problems/longest-substring-without-repeating-characters/) — canonical variable-window problem backed by a frequency map.
- [Sliding Window Maximum (LeetCode #239)](https://leetcode.com/problems/sliding-window-maximum/) — the non-reversible-aggregate case that requires a monotonic deque.
