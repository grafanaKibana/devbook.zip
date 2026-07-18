---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A graph route may need to visit every **vertex** exactly once and return to its start. That is a Hamiltonian cycle. Unlike an Eulerian cycle, which must use every edge exactly once and has a direct degree-based characterization, Hamiltonian existence has no known polynomial-time test for general graphs. The decision problem is NP-complete.

For a graph with `n` vertices, a cycle is a permutation of the vertices whose consecutive pairs — including the last and first — are edges. Backtracking searches these permutations while pruning a partial path as soon as its next edge is missing or a vertex repeats.

> [!NOTE] Visualization pending
> Planned StepTrace: extend a partial path through unused vertices, show a dead end and backtrack, then close the path only when the last vertex has an edge to the start.

# Backtracking state

For the graph with cycle edges `A-B-C-D-A` plus diagonal `A-C`, start with `A` and mark it used. Choosing `C` first leaves candidates `B` and `D`; the branch `A-C-B` cannot continue to `D` because `B-D` is absent, so it backtracks to `C` and tries `D`. The branch `A-C-D` then cannot reach unused `B`. Returning to the root and choosing `B` produces `A-B-C-D`, and `D-A` closes the cycle.

The maintained invariant is compact: the path contains distinct vertices, and every consecutive pair is an edge. A solution is accepted only at length `n` and only if the final vertex is adjacent to the start.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n)` | `O(n)` | the first branch forms a cycle and closing edge exists |
| Average | exponential | `O(n)` | depends strongly on graph density and branch order |
| Worst | `O(n!)` | `O(n)` | permutation backtracking may explore almost every vertex order |

The decision problem is in NP because a proposed cycle can be verified in `O(n)` adjacency checks. Dynamic programming over subsets improves exact worst-case time to `O(n² 2^n)` with `O(n 2^n)` space, but remains exponential.

# Necessary checks and false shortcuts

Every vertex in a Hamiltonian graph has degree at least two, and a Hamiltonian graph cannot contain an articulation point: removing one vertex from the cycle leaves a path that still connects all remaining vertices. These are fast rejection tests, not sufficient conditions. A graph can satisfy both and still have no Hamiltonian cycle.

A connected graph is also insufficient. Connectivity only promises some path between vertex pairs; it does not promise a single cycle that visits each vertex once. Likewise, a graph may have an Eulerian cycle but no Hamiltonian cycle because edge coverage and vertex coverage impose different constraints.

# Comparison

| Problem | Must cover | Reuse allowed | General complexity | Structural test |
| --- | --- | --- | --- | --- |
| Hamiltonian cycle | every vertex | no repeated vertex | NP-complete | no complete polynomial characterization known |
| Hamiltonian path | every vertex | no repeated vertex | NP-complete | endpoints need not be adjacent |
| Eulerian cycle | every edge | vertices may repeat | `O(V + E)` | connected non-isolated graph with even degrees |
| Traveling Salesman | every vertex with minimum total cost | no repeated vertex | NP-hard optimization | weighted Hamiltonian cycle plus minimization |

Hamiltonian cycle is the feasibility version of visiting every vertex once. Traveling Salesman adds weights and asks for the cheapest such cycle; Eulerian cycle solves a different, tractable edge-coverage problem.

# References

- [Reducibility Among Combinatorial Problems](https://doi.org/10.1007/978-1-4684-2001-2_9) — Karp's 1972 reductions, including directed Hamiltonian circuit among the original NP-complete problems.
- [Hamiltonian Graphs](https://mathworld.wolfram.com/HamiltonianGraph.html) — definitions and classical sufficient and necessary conditions for Hamiltonian paths and cycles.
