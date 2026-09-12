---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Visits every graph vertex exactly once and returns to the start. Deciding existence is NP-complete."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A Hamiltonian cycle visits every **vertex** exactly once and returns to its start. An Eulerian cycle asks a different question: it uses every edge exactly once and has a direct degree-based characterization. No polynomial-time test is known for Hamiltonian-cycle existence in general graphs. The decision problem is NP-complete.

For a graph with `n` vertices, a candidate cycle is a permutation whose consecutive vertices are adjacent, including the last and first. Backtracking explores these permutations and abandons a partial path as soon as an edge is missing or a vertex repeats.

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
          "operation": "Estimate",
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
          "operation": "All executions",
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

Every vertex in a Hamiltonian graph has degree at least two. Such a graph also has no articulation point because removing one vertex from the cycle leaves a path through every remaining vertex. These checks reject some impossible inputs quickly. Passing them does not prove that a Hamiltonian cycle exists.

Connectivity is too weak as well. It promises a path between each pair of vertices, not one cycle through every vertex. A graph may even have an Eulerian cycle and no Hamiltonian cycle because covering edges says nothing decisive about covering vertices once.

# Comparison


Hamiltonian cycle asks whether any cycle visits every vertex once. Traveling Salesman adds weights and asks which such cycle is cheapest. Eulerian cycle remains a separate, tractable edge-coverage problem.

# References

- [Reducibility Among Combinatorial Problems](https://doi.org/10.1007/978-1-4684-2001-2_9)
- [Hamiltonian Graphs](https://mathworld.wolfram.com/HamiltonianGraph.html)
