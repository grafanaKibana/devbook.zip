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

A report needs the largest total among all 30-day spans in a series of 100,000 readings. A sliding window keeps a running total between two boundaries. Moving right adds one reading. Moving left subtracts one. Each new span costs two arithmetic operations instead of another 30-value scan.

Sorting would destroy the ranges being measured. Sliding windows preserve the input order because every candidate must remain contiguous.



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

# Where the Pattern Breaks

A fixed-size window contracts on a schedule. Every addition at the right removes one value at the left, so the width stays `k`. A variable-size window contracts only when its constraint says to. One right step may trigger several left steps or none. Using the fixed rule on a variable problem prevents the width from adapting. Using the variable rule without a stopping condition shrinks past the useful range.

Removal must update the aggregate from the old state and the leaving value. A running sum or per-key frequency count can do that directly. A scalar maximum cannot. When its current maximum leaves, finding the next one requires information about the rest of the window.

Negative values break the usual contraction proof. Extending a window can lower its sum, so a range that currently fails may become valid after another value arrives. The sum remains cheap to update, but it no longer tells the left boundary when an entire family of ranges can be discarded. Exact-target problems with negatives can use [[Home/Computer Science/Algorithms/Patterns/Prefix Sum|prefix sums]] plus a hash map instead. That combination finds a target range without assuming that sum grows with length.

# Diagram and C# Implementation

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

The diagram shows a minimum-satisfying window: record a candidate when the constraint holds, then keep shrinking while it remains valid. A maximum-valid window reverses that control order. It shrinks while invalid, then records the candidate after validity has been restored.

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
> `MaxSumWindow` assumes `1 <= k <= a.Length` and sums that fit `int`; a public API should validate the window size and use `long` when the input range can overflow an `int` sum.

# Comparison

| Technique | Required input | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Sliding window | Contiguous range. Aggregate reversible on removal | Contiguous sub-array or substring with an incrementally maintained aggregate | Non-reversible extreme, or a constraint non-monotone in length |
| Brute-force recompute | None | Tiny inputs or a one-off computation | Repeats work across overlapping windows |
| [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]] | Often sorted. Two ends converging inward | Finding a pair/partition by moving opposite ends toward each other | A single window with a running aggregate over its interior |
| [[Home/Computer Science/Algorithms/Patterns/Prefix Sum|Prefix Sum]] | Precomputed cumulative array | Many static range-sum queries. Sums involving negatives | One constraint-driven window that must also report its members |
| [[Home/Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|Monotonic Stack and Queue]] | Deque of candidate indices | Maximum/minimum of every window | Plain reversible aggregates where a scalar already suffices |

If the two ends converge rather than trail in the same direction, the shape is [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]]. For a maximum or minimum that a scalar cannot reverse on removal, a [[Home/Computer Science/Algorithms/Patterns/Monotonic Stack and Queue|monotonic deque]] keeps only the candidates that may become the next extreme.

# References

- [Mayur Datar et al., "Maintaining Stream Statistics over Sliding Windows" (2002)](https://doi.org/10.1137/S0097539701398363)
- [Longest Substring Without Repeating Characters (LeetCode #3)](https://leetcode.com/problems/longest-substring-without-repeating-characters/)
