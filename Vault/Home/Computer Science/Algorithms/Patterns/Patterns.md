---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Reusable coding idioms that turn brute-force solutions efficient; recognising the pattern is the hard part."
tags: [FolderNote]
publish: true
priority: Medium
level:
  - "4"
status: Creation
---

Patterns are reusable problem-solving idioms — not full named algorithms like Dijkstra, but recurring *techniques* you apply to turn a brute-force solution into an efficient one. Recognising the pattern is usually the hard part of a coding problem; once you see "this is a sliding window," the implementation follows. They differ from [[Home/Computer Science/Algorithms/Paradigms/Paradigms|paradigms]] (DP, greedy, backtracking), which are broader *design philosophies* — patterns are the concrete moves.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Algorithm Selection

| Pattern | The move | Tells you to reach for it | Typical win |
|---|---|---|---|
| [[Two Pointers]] | Two coordinated indices, ends-in | Sorted array, pair/triplet sums, in-place partition | O(n²) → O(n) |
| [[Fast and Slow Pointers]] | Two indices at different speeds | "Cycle in a linked list", "find the middle in one pass", duplicate in `1..n` | O(n) space → O(1) |
| [[Sliding Window]] | A moving contiguous range updated incrementally | "Longest/shortest contiguous subarray or substring with a constraint" | O(n·k) → O(n) |
| [[Prefix Sum]] | Precompute cumulative sums; a range is one subtraction | "Many range-sum queries over static data", "count subarrays summing to k" | O(n) per query → O(1) |
| [[Monotonic Stack and Queue]] | A stack or deque kept sorted, popping what can never win | "Next/previous greater element", "sliding-window maximum" | O(n²) → O(n) |
| [[Merge Intervals]] | Sort by start, then sweep and coalesce | "Overlapping intervals", "meeting rooms", calendar booking | O(n²) → O(n log n) |
| [[Cyclic Sort]] | Swap each value to the index it belongs at | "n numbers in the range 1..n" + find the missing/duplicate, in place | O(n) space → O(1) |
| [[Top-K Elements]] | A size-k heap over a stream | "Top / largest / smallest / most frequent K" | O(n log n) → O(n log k) |
| [[Home/Computer Science/Algorithms/Patterns/Two Heaps|Two Heaps]] | Max-heap below, min-heap above a moving partition | "Running median", "median from a stream", balanced lower/upper halves | O(n log n) total updates + O(1) median reads |
| [[Binary Search on Answer]] | Binary-search the answer space, not the array | "Minimise the maximum", "maximise the minimum", "smallest x such that…" | O(range) → O(log range) |
| [[Bit Manipulation]] | Operate on the binary representation directly | Small fixed sets, parity/toggles, subset enumeration | O(n) → O(1) space/time tricks |

> [!TIP]
> The interview skill is *recognition*: most problems announce their pattern through a keyword — "contiguous … with sum/length" → sliding window; "sorted … pair that sums to" → two pointers; "next greater" → monotonic stack; "minimise the maximum" → binary search on answer; "appears once / subsets of a small set" → bit manipulation.

A few of these are close relatives, and the distinction is worth holding onto. Variable-size sum windows whose shrink/expand decision relies on monotonic sums require non-negative values; [[Prefix Sum]] plus a hashmap handles the same "subarray summing to k" question when negatives are allowed. [[Fast and Slow Pointers]] is the speed-differential member of the [[Two Pointers]] family rather than a separate idea. And [[Binary Search on Answer]] is not really a search over data at all — it borrows only the halving mechanic from [[Binary Search]].

# Questions

> [!QUESTION]- A problem asks for a contiguous subarray summing to `k`, but values may be negative. Which pattern is safer than a variable-size sliding window, and why?
> Use prefix sums with a hashmap because equal prefix-difference relationships remain valid with negative values. A sum-based sliding window cannot decide reliably which boundary to move when adding or removing a value may increase or decrease the sum.

# References

- [14 patterns to ace coding interviews (educative)](https://www.educative.io/blog/coding-interview-patterns) — the broader catalogue these belong to.
- [Competitive Programmer's Handbook (Laaksonen)](https://cses.fi/book/book.pdf) — free book covering these techniques with proofs and exercises.
