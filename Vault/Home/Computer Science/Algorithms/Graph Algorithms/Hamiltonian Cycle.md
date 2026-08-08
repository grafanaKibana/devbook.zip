---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Visits every graph vertex exactly once and returns to the start; deciding existence is NP-complete."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A graph route may need to visit every **vertex** exactly once and return to its start. That is a Hamiltonian cycle. Unlike an Eulerian cycle, which must use every edge exactly once and has a direct degree-based characterization, Hamiltonian existence has no known polynomial-time test for general graphs. The decision problem is NP-complete.

For a graph with `n` vertices, a cycle is a permutation of the vertices whose consecutive pairs — including the last and first — are edges. Backtracking searches these permutations while pruning a partial path as soon as its next edge is missing or a vertex repeats.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"hamiltonian-cycle"}
```


For the graph with cycle edges `A-B-C-D-A` plus diagonal `A-C`, start with `A` and mark it used. Choosing `C` first leaves candidates `B` and `D`; the branch `A-C-B` cannot continue to `D` because `B-D` is absent, so it backtracks to `C` and tries `D`. The branch `A-C-D` then cannot reach unused `B`. Returning to the root and choosing `B` produces `A-B-C-D`, and `D-A` closes the cycle.

The maintained invariant is compact: the path contains distinct vertices, and every consecutive pair is an edge. A solution is accepted only at length `n` and only if the final vertex is adjacent to the start.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Hamiltonian Cycle complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of vertices in the input graph"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Typical",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "distribution-dependent; exponential in general"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n!)",
              "curveId": "factorial"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Typical",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Necessary Checks and False Shortcuts

Every vertex in a Hamiltonian graph has degree at least two, and a Hamiltonian graph cannot contain an articulation point: removing one vertex from the cycle leaves a path that still connects all remaining vertices. These are fast rejection tests, not sufficient conditions. A graph can satisfy both and still have no Hamiltonian cycle.

A connected graph is also insufficient. Connectivity only promises some path between vertex pairs; it does not promise a single cycle that visits each vertex once. Likewise, a graph may have an Eulerian cycle but no Hamiltonian cycle because edge coverage and vertex coverage impose different constraints.

# Comparison


Hamiltonian cycle is the feasibility version of visiting every vertex once. Traveling Salesman adds weights and asks for the cheapest such cycle; Eulerian cycle solves a different, tractable edge-coverage problem.

# Questions

> [!QUESTION]- Why do degree-at-least-two and no-articulation-point checks fail to prove that a Hamiltonian cycle exists?
> Both properties are necessary because every vertex on the cycle has two incident cycle edges and removing one cycle vertex leaves the others connected by a path. They are not sufficient: a graph can satisfy both local checks while no single cycle visits every vertex, so backtracking or a stronger problem-specific argument is still required.

# References

- [Reducibility Among Combinatorial Problems](https://doi.org/10.1007/978-1-4684-2001-2_9) — Karp's 1972 reductions, including directed Hamiltonian circuit among the original NP-complete problems.
- [Hamiltonian Graphs](https://mathworld.wolfram.com/HamiltonianGraph.html) — definitions and classical sufficient and necessary conditions for Hamiltonian paths and cycles.
