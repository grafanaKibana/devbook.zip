---
topic:
  - Computer Science
subtopic:
  - Algorithms
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Creation
---

# Intro

Algorithm-design paradigms are the broad *strategies* for constructing a solution — the lens you choose before writing any code. Most named algorithms are instances of one: merge sort is divide-and-conquer, Dijkstra is greedy, Fibonacci-with-memoisation is dynamic programming. Knowing the paradigm tells you the shape of the answer and the proof obligations (e.g. greedy needs an exchange argument; DP needs optimal substructure).

This folder covers the five most important:

- **Divide and Conquer** — split into *disjoint* subproblems, solve recursively, combine.
- **Dynamic Programming** — solve *overlapping* subproblems once and reuse the results (memoisation / tabulation).
- **Greedy** — make the locally optimal choice at each step and prove it yields a global optimum.
- **Backtracking** — explore choices depth-first, abandoning (pruning) branches that can't lead to a valid solution.
- **Branch and Bound** — backtracking for optimisation, pruning branches that are feasible but provably not optimal.

## Algorithm Selection

| Paradigm | Strategy | Must hold to apply | Classic examples |
|---|---|---|---|
| [[Divide and Conquer]] | Split into disjoint subproblems, recurse, combine | Subproblems are independent; combine step is cheap | [[Merge Sort]], [[Binary Search]], Karatsuba, FFT |
| [[Dynamic Programming]] | Reuse answers to overlapping subproblems | Optimal substructure **and** overlapping subproblems | Knapsack, edit distance, longest common subsequence |
| [[Greedy Algorithms|Greedy]] | Take the locally optimal choice, never revisit | Greedy-choice property (provable by an exchange argument) | [[Dijkstra]], Huffman coding, interval scheduling |
| [[Backtracking]] | DFS over choices, prune dead branches | Partial solutions can be rejected early | N-Queens, Sudoku, permutations/subsets |
| [[Branch and Bound]] | DFS or best-first over choices, prune by optimistic bound | An admissible bound on the best achievable in a subtree | 0/1 knapsack, TSP, integer linear programming |

> [!TIP]
> A common progression: if backtracking explores the *same* subproblem repeatedly, adding memoisation turns it into dynamic programming; if a greedy choice can be proven always-correct, it replaces DP with something far cheaper.

The paradigms pair up along two axes. **Divide-and-conquer vs dynamic programming** differ only in whether the subproblems overlap — that single fact decides whether memoisation buys you anything. **Backtracking vs branch-and-bound** differ only in what justifies a prune: infeasibility for the former, a provably-worse bound for the latter (the same admissibility condition that [[A* Search]] demands of its heuristic).

They all contrast with [[Home/Computer Science/Algorithms/Patterns/Patterns|patterns]] (two pointers, sliding window), which are concrete coding idioms rather than design philosophies.

## References

- [Algorithm design paradigms (Wikipedia)](https://en.wikipedia.org/wiki/Algorithmic_paradigm) — taxonomy of greedy, divide-and-conquer, DP, backtracking, and more.
- [Competitive Programmer's Handbook (Laaksonen)](https://cses.fi/book/book.pdf) — free book with chapters on each paradigm.
