---
publish: true
created: 2026-07-08T16:14:17.337+03:00
modified: 2026-07-08T16:28:37.375+03:00
published: 2026-07-08T16:28:37.375+03:00
tags:
  - FolderNote
topic:
  - Computer Science
subtopic:
  - Algorithms
priority: Medium
level:
  - "4"
status:
  - Ready to Repeat
---

# Intro

Patterns are reusable problem-solving idioms — not full named algorithms like Dijkstra, but recurring _techniques_ you apply to turn a brute-force solution into an efficient one. Recognising the pattern is usually the hard part of a coding problem; once you see "this is a sliding window," the implementation follows. They differ from [[Computer Science/Algorithms/Paradigms/Paradigms|paradigms]] (DP, greedy, backtracking), which are broader _design philosophies_ — patterns are the concrete moves.

This folder covers three of the most widely applicable:

- **Two Pointers** — coordinate two indices over a sequence to drop a dimension (typically O(n²) → O(n)).
- **Sliding Window** — maintain a moving contiguous range with incremental updates instead of recomputing from scratch.
- **Bit Manipulation** — use the binary representation of integers for compact sets, fast arithmetic, and O(1) tricks.

| Pattern | The move | Tells you to reach for it | Typical win |
|---|---|---|---|
| [[Two Pointers]] | Two coordinated indices (ends-in, or fast/slow) | Sorted array, pair/triplet sums, in-place partition, cycle detection | O(n²) → O(n) |
| [[Sliding Window]] | A moving contiguous range updated incrementally | "Longest/shortest/contiguous subarray or substring with a constraint" | O(n·k) → O(n) |
| [[Bit Manipulation]] | Operate on the binary representation directly | Small fixed sets, parity/toggles, subset enumeration, no-extra-space tricks | O(n) → O(1) space/time tricks |

> [!TIP]
> The interview skill is _recognition_: most problems announce their pattern through a keyword — "contiguous … with sum/length" → sliding window; "sorted … pair that sums to" → two pointers; "appears once / toggled / subsets of a small set" → bit manipulation.

## References

- [14 patterns to ace coding interviews (educative)](https://www.educative.io/blog/coding-interview-patterns) — the broader catalogue these belong to.
- [Competitive Programmer's Handbook (Laaksonen)](https://cses.fi/book/book.pdf) — free book covering these techniques with proofs and exercises.
