---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "The broad strategies for constructing a solution, the lens you choose before writing code."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Creation
---

An algorithmic paradigm supplies the broad shape of a solution before implementation details take over. Merge sort divides and combines. Dijkstra commits greedily. Fibonacci with memoization stores repeated states. Recognizing that shape narrows both the implementation and the proof: a greedy choice needs an exchange argument, while an optimization DP needs optimal substructure.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Algorithm Selection

| Paradigm | Strategy | Diagnostic / proof obligation | Classic examples |
|---|---|---|---|
| [[Divide and Conquer]] | Split into disjoint subproblems, recurse, combine | Separable recursive subproblems and a combine operation. Combine cost affects performance | [[Merge Sort]], [[Binary Search]], Karatsuba, FFT |
| [[Dynamic Programming]] | Reuse answers to overlapping subproblems | Enumerable state dependencies. Overlap makes reuse valuable. Optimization also needs optimal substructure | Knapsack, edit distance, longest common subsequence |
| [[Greedy Algorithms\|Greedy]] | Take the locally optimal choice, never revisit | Greedy-choice property with a problem-specific proof such as exchange, stays-ahead, or cut reasoning | [[Dijkstra]], Huffman coding, interval scheduling |
| [[Backtracking]] | DFS over choices, prune dead branches | Partial solutions can be rejected early | N-Queens, Sudoku, permutations/subsets |
| [[Branch and Bound]] | DFS or best-first over choices, prune by optimistic bound | An admissible bound on the best achievable in a subtree | 0/1 knapsack, TSP, integer linear programming |

> [!TIP]
> If backtracking reaches the *same* subproblem repeatedly, adding [[Memoization|memoisation]] turns the search into dynamic programming. If a local choice can be proved safe, a greedy algorithm may replace the DP with a cheaper scan.

The most useful distinctions are about repeated work and safe pruning. **Divide-and-conquer and dynamic programming** differ in whether their subproblems overlap. Memoization helps only when the same state returns. **Backtracking and branch-and-bound** justify pruning differently. Backtracking rejects an infeasible partial candidate, while branch-and-bound rejects a subtree whose optimistic bound cannot beat the current best solution. That optimism is the same admissibility condition that [[A-Star Search|A* Search]] requires from its heuristic. Dynamic programming becomes the better fit when repeated subproblems let the search collapse into a manageable table.

They all contrast with [[Home/Computer Science/Algorithms/Patterns/Patterns|patterns]] (two pointers, sliding window), which are concrete coding idioms rather than design philosophies.

# References

- [Algorithm design paradigms (Wikipedia)](https://en.wikipedia.org/wiki/Algorithmic_paradigm)
