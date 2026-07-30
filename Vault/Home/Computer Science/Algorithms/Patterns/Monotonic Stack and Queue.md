---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "A stack or deque kept sorted by popping dominated elements, answering next-greater and window-extremum queries in linear time."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

An array of daily temperatures needs, for every day, the number of days until a warmer one. Comparing each day against all later days is `O(n^2)`: most of that work re-scans stretches already known to be colder. The redundancy has structure. Once a warmer day arrives, every earlier colder day pending an answer is resolved at once and never consulted again.

A monotonic stack captures exactly that. It holds indices whose values stay sorted — increasing or decreasing — by popping any element that can no longer be an answer before the next element is pushed. Scanning left to right for the next *greater* value, the stack keeps values non-increasing from bottom to top; the arriving element pops every smaller index below it, and it *is* their next greater element. Each index is pushed once and removed at most once, so the nested-looking "pop while" is linear across the scan.

A monotonic deque generalises this to a moving window. It usually stores indices, keeping candidates sorted at the back and evicting from the front when an index expires. Values plus duplicate counts can also work when the departing value is available, but indices make expiry and identity explicit. This recovers `O(n)` sliding-window maximum: a scalar maximum cannot be updated in `O(1)` when it expires unless other candidates were retained, while rescanning costs `O(k)` per window.

**Core shape:** ordered scan → pop violators before each push → each index is pushed once and removed at most once → `O(n)` nearest-greater/smaller spans and window extrema.

```steptrace
{"algorithm":"monotonic-stack-and-queue","array":[73,74,75,71,69,72,76,73]}
```

The trace uses daily temperatures `[73, 74, 75, 71, 69, 72, 76, 73]`. At `72`, the stack pops `69` and `71`, then becomes `[75, 72]` from bottom to top. At `76`, it pops `72` and `75`; `74` was already popped when `75` arrived. The six popped temperatures are `73`, `74`, `69`, `71`, `72`, and `75`, each in its own frame. Converting each resolved next index to `nextIndex - currentIndex` gives the Daily Temperatures waits `[1, 1, 4, 2, 1, 1, 0, 0]`. The charge counter shows the global bound: eight pushes and six pops over the whole scan.

# Why the Pops Are Free

The stack holds unanswered indices whose values are non-increasing from bottom to top. When `a[i]` pops index `j`, no position between `j` and `i` held a greater value — such a value would already have popped `j`. Therefore `i` is the nearest qualifying index to the right. Entries left after the scan have no greater value to their right.

The deque keeps the same monotone contents but adds a second exit. Values decrease from front to back; the front is always the current window maximum. Each new index `i` drops the front if it has slid out of the window, then pops from the back while `a[back] <= a[i]`: the incoming value is at least as large, and an equal newer index dominates because it expires later. Indices are the standard representation because the expiry check is direct; a value-only variant needs the departing value and duplicate counts to preserve the same information.

Each index is pushed once and removed at most once. Charge a removal to that index's earlier push and no index can be charged twice: all inner-loop iterations sum to `O(n)`, making the scan `O(n)` total and `O(1)` amortized per input index.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Any input, monotonic stack | `O(n)` total; `O(1)` amortized per index | `O(n)` | Each index is pushed once and removed at most once. |
| Any input, monotonic deque | `O(n)` total; `O(1)` amortized per index | `O(k)` | Front eviction keeps at most `k` live candidates; when `k = n`, this is `O(n)`. |
| Brute-force next-greater | `O(n^2)` | `O(1)` | For each index, a fresh forward scan re-reads stretches already known to be smaller; no state carries between indices. |

A decreasing input such as `[5, 4, 3, 2, 1]` removes nothing, so the stack reaches its `O(n)` space bound. One arrival may trigger many removals, but the charged total remains linear.

# When the Invariant is Set Wrong

The monotone direction must match the query. A non-increasing stack with a `<` pop condition yields next greater; reversing the invariant computes the opposite relation and can leave different entries unresolved. Shape- or sentinel-only assertions can miss the mistake; use exact expected outputs for increasing, decreasing, mixed, and duplicate inputs.

Strict versus non-strict comparison decides ties in both stacks and deques. `<` and `<=` diverge whenever equal values meet, including non-adjacent duplicates such as `[2, 1, 2]`: one keeps the older equal candidate, while the other lets the newer one supersede it.

Prefer indices for a window deque because expiry is positional. Values can work when the departing value is supplied and duplicate counts are tracked, but that adds bookkeeping and loses element identity.

# Reference Drawer

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
>
> // Maximum of every window of size k, O(n) via a monotonic deque of indices.
> public static int[] MaxSlidingWindow(int[] a, int k)
> {
>     var dq = new LinkedList<int>();                // indices, values decreasing front to back
>     var res = new int[a.Length - k + 1];
>     for (int i = 0; i < a.Length; i++)
>     {
>         if (dq.Count > 0 && dq.First.Value <= i - k)
>             dq.RemoveFirst();                      // front slid out of the window
>         while (dq.Count > 0 && a[dq.Last.Value] <= a[i])
>             dq.RemoveLast();                       // newer value is >= and expires later on ties
>         dq.AddLast(i);
>         if (i >= k - 1) res[i - k + 1] = a[dq.First.Value]; // front is the window max
>     }
>     return res;
> }
> ```
> The pop comparison (`<` vs `<=`) sets tie handling; both examples store indices so distances and window eviction stay recoverable.

# Comparison

| Approach | Cost | Use it for |
| --- | --- | --- |
| Monotonic stack / deque | `O(n)` total, `O(n)` / `O(k)` space | Nearest greater/smaller or moving-window extrema |
| Indexed heap or periodically rebuilt heap | `O(n log k)`, `O(k)` space | Window extrema when heap operations are already needed |
| Lazy-deletion heap without rebuilding | Up to `O(n log n)`, `O(n)` stale space | Avoid when a long stream can accumulate expired entries |
| Two heaps / order-statistic tree | `O(n log k)`, `O(k)` space with bounded deletion | Window median / general `k`-th value |
| Sparse table / [[Computer Science/Data Structures/Trees/Segment Tree|segment tree]] | `O(n log n)` build + `O(1)` static query / `O(n)` build + `O(log n)` query-update | Arbitrary ranges rather than one moving window |

# Questions

> [!QUESTION]- Why is a monotonic stack `O(n)` when the code reads as a nested loop?
> Every index is pushed once and removed at most once. Charging each removal to that index's earlier push bounds all inner-loop iterations by `n`, so the scan is `O(n)` total and `O(1)` amortized per input index.

> [!QUESTION]- Why does a monotonic deque usually store indices rather than values?
> A window maximum expires by position, so indices make the front eviction a direct comparison with the window bound and preserve identity across duplicates. Values can work when the departing value is supplied and duplicate counts are tracked, but that needs more bookkeeping.

> [!QUESTION]- How does the monotone direction relate to which query is answered?
> The invariant and pop comparison fix the relation. A non-increasing stack that pops smaller values yields next greater; reversing it yields next smaller and may leave a different set of indices unresolved.

# References

- [Mayur Datar et al., "Maintaining Stream Statistics over Sliding Windows" (2002)](https://doi.org/10.1137/S0097539701398363) — a primary treatment of maintaining aggregates over the most recent fixed-size stream window, the setting where deque expiry matters.
- [Sliding Window Maximum (LeetCode #239)](https://leetcode.com/problems/sliding-window-maximum/) — the canonical monotonic-deque problem; indices are the standard way to express expiry, while value-count variants require the departing value.
- [Largest Rectangle in Histogram (LeetCode #84)](https://leetcode.com/problems/largest-rectangle-in-histogram/) — the previous-smaller / next-smaller boundary application of a monotonic stack.
- [Amortized analysis](https://en.wikipedia.org/wiki/Amortized_analysis) — the charging/aggregate argument behind the push-once, pop-once `O(n)` bound.
- [Minimum stack / minimum queue](https://cp-algorithms.com/data_structures/stack_queue_modification.html) — index- and value-based queue variants, including how duplicate handling changes a value-only representation.
