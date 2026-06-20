---
topic:
  - Computer Science
subtopic:
  - Algorithms
tags:
  - FolderNote
dg-publish: true
priority: High
level:
  - "4"
status: Ready to Repeat
---

# Intro

Algorithm-design paradigms are the broad *strategies* for constructing a solution — the lens you choose before writing any code. Most named algorithms are instances of one: merge sort is divide-and-conquer, Dijkstra is greedy, Fibonacci-with-memoisation is dynamic programming. Knowing the paradigm tells you the shape of the answer and the proof obligations (e.g. greedy needs an exchange argument; DP needs optimal substructure).

This folder covers the three most important:

- **Dynamic Programming** — solve overlapping subproblems once and reuse the results (memoisation / tabulation).
- **Greedy** — make the locally optimal choice at each step and prove it yields a global optimum.
- **Backtracking** — explore choices depth-first, abandoning (pruning) branches that can't lead to a valid/better solution.

They contrast with [[Software Engineering/02 Computer Science/Algorithms/Patterns/Patterns|patterns]] (two pointers, sliding window), which are concrete coding idioms rather than design philosophies.

## Links

- [Algorithm design paradigms (Wikipedia)](https://en.wikipedia.org/wiki/Algorithmic_paradigm) — taxonomy of greedy, divide-and-conquer, DP, backtracking, and more.
- [Competitive Programmer's Handbook (Laaksonen)](https://cses.fi/book/book.pdf) — free book with chapters on each paradigm.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms|Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Paradigms/Backtracking|Backtracking]]
> - [[Software Engineering/02 Computer Science/Algorithms/Paradigms/Dynamic Programming|Dynamic Programming]]
> - [[Software Engineering/02 Computer Science/Algorithms/Paradigms/Greedy Algorithms|Greedy Algorithms]]
<!-- whats-next:end -->
