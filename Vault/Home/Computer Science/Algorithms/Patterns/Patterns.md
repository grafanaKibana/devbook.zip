---
title: Algorithm Patterns
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Reusable coding idioms that turn brute-force approaches into efficient solutions. Recognising the pattern is the hard part."
tags: [FolderNote]
publish: true
priority: Medium
level:
  - "4"
status: Creation
---

Algorithm patterns are recurring implementation moves that replace repeated work with a maintained invariant. A sliding window carries a range aggregate, prefix sums reuse cumulative work, and a monotonic stack discards candidates that cannot win. They are narrower than [[Home/Computer Science/Algorithms/Paradigms/Paradigms|paradigms]] such as dynamic programming or greedy design: a paradigm shapes the solution, while a pattern describes the mechanism used inside it.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Algorithm Selection

| Pattern | The move | Strong signal | Typical win |
|---|---|---|---|
| [[Two Pointers]] | Two coordinated indices, ends-in | Sorted array, pair/triplet sums, in-place partition | O(n²) → O(n) |
| [[Fast and Slow Pointers]] | Two indices at different speeds | "Cycle in a linked list", "find the middle in one pass", duplicate in `1..n` | O(n) space → O(1) |
| [[Sliding Window]] | A moving contiguous range updated incrementally | "Longest/shortest contiguous subarray or substring with a constraint" | O(n·k) → O(n) |
| [[Prefix Sum]] | Precompute cumulative sums. A range is one subtraction | "Many range-sum queries over static data", "count subarrays summing to k" | O(n) per query → O(1) |
| [[Monotonic Stack and Queue]] | A stack or deque kept sorted, popping what can never win | "Next/previous greater element", "sliding-window maximum" | O(n²) → O(n) |
| [[Merge Intervals]] | Sort by start, then sweep and coalesce | "Overlapping intervals", "meeting rooms", calendar booking | O(n²) → O(n log n) |
| [[Cyclic Sort]] | Swap each value to the index it belongs at | "n numbers in the range 1..n" + find the missing/duplicate, in place | O(n) space → O(1) |
| [[Top-K Elements]] | A size-k heap over a stream | "Top / largest / smallest / most frequent K" | O(n log n) → O(n log k) |
| [[Home/Computer Science/Algorithms/Patterns/Two Heaps|Two Heaps]] | Max-heap below, min-heap above a moving partition | "Running median", "median from a stream", balanced lower/upper halves | O(n log n) total updates + O(1) median reads |
| [[Binary Search on Answer]] | Binary-search the answer space, not the array | "Minimise the maximum", "maximise the minimum", "smallest x such that…" | O(range) → O(log range) |
| [[Bit Manipulation]] | Operate on the binary representation directly | Small fixed sets, parity/toggles, subset enumeration | O(n) → O(1) space/time tricks |

> [!TIP]
> Keywords are clues, not proof. The deciding evidence is the invariant: contiguous ranges that update at their boundaries suggest a sliding window, sorted pair elimination suggests two pointers, and a monotone feasibility predicate suggests binary search on the answer.

Several patterns share the same surface shape but depend on different proofs. A variable-size sum window needs a monotone rule for moving its boundaries, which negative values break. [[Prefix Sum]] plus a hashmap still handles exact subarray sums. [[Fast and Slow Pointers]] uses a speed difference along one successor chain, while [[Two Pointers]] usually eliminates candidates using order. [[Binary Search on Answer]] searches a monotone feasibility predicate rather than stored data, though it reuses the halving mechanic from [[Binary Search]].

# References

- [Competitive Programmer's Handbook (Laaksonen)](https://cses.fi/book/book.pdf)
