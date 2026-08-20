---
publish: true
created: 2026-08-20T20:41:15.530Z
modified: 2026-08-20T20:41:15.531Z
published: 2026-08-20T20:41:15.531Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: A stack or deque kept monotone by popping dominated elements, answering next-greater and window-extremum queries in one traversal.
level:
  - "4"
priority: Medium
status: Creation
---

For each daily temperature, the next warmer day may be far ahead. Rescanning the suffix repeats the same comparisons. A monotonic stack keeps only unresolved days, and one warmer value can settle several of them at once.

A monotonic stack stores indices while their values remain ordered. For a next-greater query, values are non-increasing from bottom to top. An arriving value pops every smaller value above it and becomes the next greater value for each popped index. Every index is pushed once and removed at most once.

A monotonic deque adds window expiry. New candidates enter at the back, dominated candidates leave from the back, and expired indices leave from the front. Storing indices makes both expiry and duplicate identity explicit.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"monotonic-stack-and-queue","array":[73,74,75,71,69,72,76,73]}
```

The trace uses daily temperatures `[73, 74, 75, 71, 69, 72, 76, 73]`. At `72`, the stack pops `69` and `71`, then becomes `[75, 72]` from bottom to top. At `76`, it pops `72` and `75`; `74` was already popped when `75` arrived. The six popped temperatures are `73`, `74`, `69`, `71`, `72`, and `75`, each in its own frame. Converting each resolved next index to `nextIndex - currentIndex` gives the Daily Temperatures waits `[1, 1, 4, 2, 1, 1, 0, 0]`. The charge counter shows the global bound: eight pushes and six pops over the whole scan.



The stack holds unanswered indices whose values are non-increasing from bottom to top. When `a[i]` pops index `j`, no position between `j` and `i` held a greater value — such a value would already have popped `j`. Therefore `i` is the nearest qualifying index to the right. Entries left after the scan have no greater value to their right.

The deque keeps the same monotone contents but adds a second exit. Values decrease from front to back; the front is always the current window maximum. Each new index `i` drops the front if it has slid out of the window, then pops from the back while `a[back] <= a[i]`: the incoming value is at least as large, and an equal newer index dominates because it expires later. Indices are the standard representation because the expiry check is direct; a value-only variant needs the departing value and may preserve equal entries separately or compress them into counts.

Each index is pushed once and removed at most once. Charge a removal to that index's earlier push and no index can be charged twice, even though one arriving value may trigger several pops.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Monotonic Stack and Queue complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the scanned sequence"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (scan back per index)",
          "formula": "O(n^2)",
          "curveId": "quadratic"
        },
        {
          "kind": "approach",
          "label": "Monotonic stack",
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
          "label": "Naive (scan back per index)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Monotonic stack",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```

````

# When the Invariant is Set Wrong

The monotone direction must match the query. A non-increasing stack with a `<` pop condition finds the next greater value. Reverse the invariant and it answers the opposite relation, leaving a different set of entries unresolved. Exact expected outputs over ordered, mixed, and duplicate inputs catch this mistake better than shape-only assertions.

Strictness decides what equal values mean. With `[2, 1, 2]`, `<` keeps the older equal candidate while `<=` lets the newer one replace it. The choice affects both the reported relation and how long a deque candidate survives.

Window expiry is positional, so indices are the simplest deque representation. A value-only version needs the departing value and must either preserve equal entries or compress them into counts. Either representation loses element identity.

# Diagram and C# Implementation

> [!ABSTRACT]- Next-greater control flow
>
> ```mermaid
> flowchart TD
>   A[Scan next index i] --> B{Stack non empty and top value less than a at i}
>   B -->|Yes| C[Pop the top and record a at i as its next greater]
>   C --> B
>   B -->|No| D[Push i onto the stack]
>   D --> E{More indices remain}
>   E -->|Yes| A
>   E -->|No| F[Indices left on the stack have no greater element]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Next greater element to the right; result[i] = index of the next greater value, or -1.
> public static int[] NextGreater(int[] a)
> {
>     int n = a.Length;
>     var res = new int[n];
>     Array.Fill(res, -1);
>     var stack = new Stack<int>();                  // indices, values non-increasing bottom to top
>     for (int i = 0; i < n; i++)
>     {
>         while (stack.Count > 0 && a[stack.Peek()] < a[i])
>             res[stack.Pop()] = i;                  // a[i] is the answer for each popped index
>         stack.Push(i);
>     }
>     return res;                                    // indices never popped keep -1
> }
> ```

> public static int\[] MaxSlidingWindow(int\[] a, int k)
> {
> var dq = new LinkedList<int>();                // indices, values decreasing front to back
> var res = new int\[a.Length - k + 1];
> for (int i = 0; i < a.Length; i++)
> {
> if (dq.Count > 0 && dq.First.Value <= i - k)
> dq.RemoveFirst();                      // front slid out of the window
> while (dq.Count > 0 && a\[dq.Last.Value] <= a\[i])
> dq.RemoveLast();                       // newer value is >= and expires later on ties
> dq.AddLast(i);
> if (i >= k - 1) res\[i - k + 1] = a\[dq.First.Value]; // front is the window max
> }
> return res;
> }
>
> ```
> The pop comparison (`<` vs `<=`) sets tie handling. Both examples store indices so distances and window eviction stay recoverable.
> ```

# Comparison

| Approach | Use it for |
| --- | --- |
| Monotonic stack / deque | Nearest greater/smaller or moving-window extrema |
| Indexed heap or periodically rebuilt heap | Window extrema when heap operations are already needed |
| Lazy-deletion heap without rebuilding | Avoid when a long stream can accumulate expired entries |
| Two heaps / order-statistic tree | Window median / general `k`-th value |

# References

- [Largest Rectangle in Histogram (LeetCode #84)](https://leetcode.com/problems/largest-rectangle-in-histogram/)
- [Minimum stack / minimum queue](https://cp-algorithms.com/data_structures/stack_queue_modification.html)
