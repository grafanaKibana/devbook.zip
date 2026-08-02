---
publish: true
created: 2026-07-18T14:02:43.950Z
modified: 2026-08-01T18:31:33.344Z
published: 2026-08-01T18:31:33.344Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Maximal mutually-reachable vertex sets of a digraph, found in O(V+E) by Kosaraju's or Tarjan's.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A package manager resolves a directed dependency graph. When two packages depend on each other, directly or through a longer cycle, no install order separates them — they form one unit that has to be reasoned about together. Discovering every such unit by running a fresh reachability search from each vertex costs `O(V · (V + E))`.

A **strongly connected component** (SCC) is a maximal set of vertices in which every vertex reaches every other: for any `u, v` in the set there is a path `u → v` **and** a path `v → u`. Mutual reachability partitions a digraph into disjoint SCCs, and a single [[Computer Science/Algorithms/Graph Algorithms/DFS BFS|depth-first traversal]] recovers all of them in `O(V + E)` — the cost of one search rather than `V` of them. Collapsing each SCC to a single node yields the **condensation**, which is always a DAG: a cycle between two components would make their vertices mutually reachable, merging them into one. That property makes SCC decomposition the standard preprocessing for cyclic digraphs — 2-SAT, deadlock and dependency analysis, and any dataflow that wants a [[Computer Science/Algorithms/Graph Algorithms/Topological Sort|topological order]] but has cycles in the way.

Edge direction is the whole point. On an undirected graph mutual reachability is just reachability, so "strongly connected components" collapse to ordinary connected components, answered by [[Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] or flood fill.

````tabsdown
tab: Visualization


```steptrace
{"algorithm":"strongly-connected-components"}
```

The trace uses Tarjan's single-pass algorithm as the concrete way to expose this partition; the overview below also compares Kosaraju and Gabow.

# One Partition, Then a DAG

On `A→B, B→C, C→A, C→D, D→E, E→D`, the visualization emits `{D, E}` and `{A, B, C}`. Inside each set every vertex reaches every other. Across the sets `{A, B, C}` reaches `{D, E}`, but not vice versa, so they cannot merge.

Contracting the two sets gives one edge, `A-B-C → D-E`. More generally, the condensation cannot contain a cycle: a cycle between two component nodes would make their original vertices mutually reachable, contradicting maximality. The result is therefore a DAG that can feed [[Computer Science/Algorithms/Graph Algorithms/Topological Sort|topological sorting]] and DAG dynamic programming.

# Two Linear Algorithms

[[Computer Science/Algorithms/Graph Algorithms/Tarjan's SCC Algorithm|Tarjan's algorithm]] runs one DFS with discovery indices, low links, and an active-vertex stack. When `low[v] == disc[v]`, it pops one complete SCC. The stack is essential: an edge into an already-emitted component must not lower the active low link.

Kosaraju uses two ordinary traversals:

1. DFS over `G`, pushing each vertex when it finishes.
2. Reverse every edge to form `Gᵀ`.
3. Pop vertices in decreasing finish time and DFS from each still-unvisited vertex in `Gᵀ`; each tree is one SCC.

Individual vertex finish times are not a topological order inside an SCC. The useful property is at component level: decreasing maximum finish time orders the SCCs of `G`'s condensation DAG from sources onward. The selected source SCC becomes a sink in `Gᵀ`, so the second DFS cannot escape it.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Strongly Connected Components complexity",
  "variables": {
    "edgeCount": {
      "symbol": "E",
      "description": "number of edges"
    },
    "vertexCount": {
      "symbol": "V",
      "description": "number of vertices"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Tarjan",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(V + E)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Kosaraju",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(V + E)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Gabow",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(V + E)"
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
          "operation": "Tarjan",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(V)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Kosaraju",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "O(V + E)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Gabow",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(V)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Complexity

| Algorithm | Time | Auxiliary space | Trade-off |
| --- | --- | --- | --- |
| Tarjan | `Θ(V + E)` | `O(V)` | One pass and no transpose; low-link updates are easier to get wrong |
| Kosaraju | `Θ(V + E)` | `O(V + E)` | Two plain DFS passes; storing the transpose costs another edge set |
| Gabow | `Θ(V + E)` | `O(V)` | One pass with two stacks instead of a low-link array |

Every vertex and edge is processed a fixed number of times, so the linear bound is tight in all graph shapes. Tarjan is the compact default; Kosaraju is often easier to reconstruct correctly. The detailed Tarjan invariant and implementation live on the linked algorithm page.

# Reference Drawer

> [!ABSTRACT]- Structural view
>
> ```mermaid
> flowchart LR
>   subgraph one ["SCC A-B-C"]
>     A --> B
>     B --> C
>     C --> A
>   end
>   subgraph two ["SCC D-E"]
>     D --> E
>     E --> D
>   end
>   C --> D
> ```
>
> Collapsing each subgraph to a single node gives the condensation `A-B-C → D-E`, a two-node DAG.

# Questions

> [!QUESTION]- Why does Kosaraju process decreasing finish time on the transpose?
> Individual vertices inside an SCC have no meaningful topological order. What matters is that decreasing maximum finish time orders SCCs in `G`'s condensation DAG from sources onward. Reversing the edges turns the selected source SCC into a sink in `Gᵀ`, letting the second DFS fill it without escaping.

> [!QUESTION]- Why is the condensation always a DAG?
> A cycle between two distinct components would make every vertex in both mutually reachable, so maximality would already have merged them. Removing those cycles by contraction is what makes topological ordering possible.

# References

- [Depth-First Search and Linear Graph Algorithms](https://epubs.siam.org/doi/10.1137/0201010) — Robert Tarjan's 1972 paper introducing the discovery/low-link DFS and the single-pass SCC procedure.
- [Finding strongly connected components](https://cp-algorithms.com/graph/strongly-connected-components.html) — Kosaraju's two-pass algorithm with the transpose, the condensation, and a correctness argument.
- [Tarjan's strongly connected components algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm) — the low-link invariant, the `onStack` guard, and the reverse-topological output order.
- [Path-Based Depth-First Search for Strong and Biconnected Components](https://doi.org/10.1016/S0020-0190%2800%2900051-X) — Harold Gabow's two-stack variant that computes SCCs in one pass without a low-link array.
