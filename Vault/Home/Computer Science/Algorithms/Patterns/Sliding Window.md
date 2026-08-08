---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Computes aggregates over contiguous subarrays by updating a moving range instead of rescanning it."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A report needs the largest total of any 30 consecutive daily readings across a series of 100,000. The sliding window keeps one running total and a pair of boundaries: advancing the right boundary adds the entering value, advancing the left boundary subtracts the leaving value, so each successive window costs one addition and one subtraction instead of a full rescan.

The elements need not be sorted; their existing order matters because the candidate ranges must remain contiguous.



~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"sliding-window","text":"abcabcbb"}
```



The trace finds the longest substring without repeating characters in `abcabcbb`. The right boundary admits `a`, `b`, and `c`, so the current window and best substring both become `abc`. When the next `a` enters at index `3`, the trace names the duplicate and marks it red before the left boundary advances past the previous `a`; the accepted window becomes `bca`, while the best remains `abc` with length `3`.



Every index enters the window once and leaves at most once. A last-seen index identifies whether the entering character already exists inside the current window and moves the left boundary to one position past that duplicate; neither boundary moves backward.

This accounting holds when entry and exit update validity incrementally. A running sum, element count, or frequency map qualifies because one value changes at a boundary. A window maximum needs an additional structure because removing the maximum does not reveal the next-largest retained value.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Sliding Window complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the input sequence"
    },
    "keyRange": {
      "symbol": "k",
      "description": "window width"
    },
    "alphabetSize": {
      "symbol": "σ",
      "description": "number of distinct symbols the input alphabet can contain"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (rescan every window)",
          "formula": "O(n·k)",
          "curveFrom": "linear",
          "curveTo": "quadratic"
        },
        {
          "kind": "approach",
          "label": "Sliding window",
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
          "label": "Naive (rescan every window)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Sliding window",
          "formula": "O(min(n, σ))",
          "curveId": "linear"
        }
      ]
    }
  }
}
```

~~~~~

# Where the Incremental Aggregate Fails

A fixed-size window contracts on a schedule: every element the right boundary adds, the left boundary removes exactly one, holding the width at `k`. A variable-size window contracts conditionally — the left boundary advances only while the window violates (or, for a minimizing problem, still satisfies) the constraint, so a single right step can trigger several left steps or none. Applying the fixed rule to a variable problem pins the width and never explores shorter or longer ranges; applying the variable rule without a stopping condition shrinks past validity.

The removal step must rebuild the new aggregate from the leaving element alone. A running sum or a per-key frequency count does; a window maximum does not — dropping the element that happened to be the maximum leaves no cheap way to find the next-largest element still inside the window.

With negatives present a longer window can carry a smaller sum, so a window that fails the constraint can become valid again by extending — incremental maintainability of the sum is intact, but the decision of *when* to contract no longer has a valid basis. Sum-with-negatives problems (a sub-array summing to exactly `k`, say) drop the moving window for [[Home/Computer Science/Algorithms/Patterns/Prefix Sum|prefix sums]] plus a hash map, which locates any range with a target sum without assuming monotone length.

# Reference Drawer

> [!ABSTRACT]- Variable-window control flow
>
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
>
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


# Comparison

| Technique | Required input | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Sliding window | Contiguous range; aggregate reversible on removal | Contiguous sub-array or substring with an incrementally maintained aggregate | Non-reversible extreme, or a constraint non-monotone in length |
| Brute-force recompute | None | Tiny inputs or a one-off computation | Repeats work across overlapping windows |
| [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]] | Often sorted; two ends converging inward | Finding a pair/partition by moving opposite ends toward each other | A single window with a running aggregate over its interior |
| [[Home/Computer Science/Algorithms/Patterns/Prefix Sum|Prefix Sum]] | Precomputed cumulative array | Many static range-sum queries; sums involving negatives | One constraint-driven window that must also report its members |
| [[Home/Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|Monotonic Stack and Queue]] | Deque of candidate indices | Maximum/minimum of every window | Plain reversible aggregates where a scalar already suffices |

When two ends converge instead of trailing in the same direction, the shape is [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]]. When the aggregate is a non-reversible max or min, a [[Home/Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|monotonic deque]] restores the once-in-once-out accounting a scalar cannot.

# Questions

> [!QUESTION]- Why does the window avoid rescanning its interior?
> Each index is added to the aggregate once, when the right boundary passes it, and removed at most once, when the left boundary passes it.

> [!QUESTION]- What property must the aggregate have, and which aggregate violates it?
> Entering or leaving one element must update the aggregate directly. A running sum and a per-key frequency count satisfy that requirement; a window maximum does not, because removing the maximum leaves no direct way to recover the next-largest element still inside the window. That case uses a monotonic deque of candidate indices instead of a scalar.

> [!QUESTION]- Why do negative numbers break sum-based sliding windows?
> The contraction rule "shrink while the sum exceeds the target" relies on the sum rising on every entry and falling on every removal, which makes the smallest valid window length monotone as the right boundary advances. Negatives remove that monotonicity — a longer window can carry a smaller sum — so a failed window can become valid by extending. The replacement depends on the objective: exact-target sums can use prefix sums plus a hash map, while shortest-sum-at-least-`K` uses prefix sums plus a monotonic deque.

# References

- [Mayur Datar et al., "Maintaining Stream Statistics over Sliding Windows" (2002)](https://doi.org/10.1137/S0097539701398363) — a primary treatment of maintaining aggregates over the last `N` stream elements, the same enter-once/expire-once model used here.
- [Window Sliding Technique](https://www.geeksforgeeks.org/window-sliding-technique/) — GeeksforGeeks walkthrough of fixed and variable windows with the incremental-update derivation.
- [Longest Substring Without Repeating Characters (LeetCode #3)](https://leetcode.com/problems/longest-substring-without-repeating-characters/) — canonical variable-window problem backed by a frequency map.
- [Sliding Window Maximum (LeetCode #239)](https://leetcode.com/problems/sliding-window-maximum/) — the non-reversible-aggregate case that requires a monotonic deque.
