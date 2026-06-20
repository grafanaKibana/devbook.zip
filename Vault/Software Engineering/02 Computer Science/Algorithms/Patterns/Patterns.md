---
topic:
  - Computer Science
subtopic:
  - Algorithms
tags:
  - FolderNote
dg-publish: true
priority: Medium
level:
  - "4"
status: Ready to Repeat
---

# Intro

Patterns are reusable problem-solving idioms — not full named algorithms like Dijkstra, but recurring *techniques* you apply to turn a brute-force solution into an efficient one. Recognising the pattern is usually the hard part of a coding problem; once you see "this is a sliding window," the implementation follows. They differ from [[Software Engineering/02 Computer Science/Algorithms/Paradigms/Paradigms|paradigms]] (DP, greedy, backtracking), which are broader *design philosophies* — patterns are the concrete moves.

This folder covers three of the most widely applicable:

- **Two Pointers** — coordinate two indices over a sequence to drop a dimension (typically O(n²) → O(n)).
- **Sliding Window** — maintain a moving contiguous range with incremental updates instead of recomputing from scratch.
- **Bit Manipulation** — use the binary representation of integers for compact sets, fast arithmetic, and O(1) tricks.

| Pattern | The move | Tells you to reach for it | Typical win |
|---|---|---|---|
| [[Software Engineering/02 Computer Science/Algorithms/Patterns/Two Pointers\|Two Pointers]] | Two coordinated indices (ends-in, or fast/slow) | Sorted array, pair/triplet sums, in-place partition, cycle detection | O(n²) → O(n) |
| [[Software Engineering/02 Computer Science/Algorithms/Patterns/Sliding Window\|Sliding Window]] | A moving contiguous range updated incrementally | "Longest/shortest/contiguous subarray or substring with a constraint" | O(n·k) → O(n) |
| [[Software Engineering/02 Computer Science/Algorithms/Patterns/Bit Manipulation\|Bit Manipulation]] | Operate on the binary representation directly | Small fixed sets, parity/toggles, subset enumeration, no-extra-space tricks | O(n) → O(1) space/time tricks |

> [!TIP]
> The interview skill is *recognition*: most problems announce their pattern through a keyword — "contiguous … with sum/length" → sliding window; "sorted … pair that sums to" → two pointers; "appears once / toggled / subsets of a small set" → bit manipulation.

## References

- [14 patterns to ace coding interviews (educative)](https://www.educative.io/blog/coding-interview-patterns) — the broader catalogue these belong to.
- [Competitive Programmer's Handbook (Laaksonen)](https://cses.fi/book/book.pdf) — free book covering these techniques with proofs and exercises.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms|Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Patterns/Bit Manipulation|Bit Manipulation]]
> - [[Software Engineering/02 Computer Science/Algorithms/Patterns/Sliding Window|Sliding Window]]
> - [[Software Engineering/02 Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]]
<!-- whats-next:end -->
