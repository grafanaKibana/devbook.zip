---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Maximal mutually-reachable vertex sets of a digraph, identified by Kosaraju's or Tarjan's algorithm."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A package manager cannot order two packages that depend on each other through a cycle. For dependency analysis, the whole cycle behaves as one unit.

A **strongly connected component** (SCC) is a maximal set of vertices in which every vertex reaches every other. For any `u, v` in the set, paths exist both from `u` to `v` and from `v` to `u`. A [[Home/Computer Science/Algorithms/Graph Algorithms/DFS BFS|depth-first traversal]] exposes the finish-time or low-link structure needed to recover this partition.

Collapsing each SCC into one node produces the **condensation**, which is always a DAG. If two component nodes formed a cycle, their original vertices would be mutually reachable and the components would have merged. SCC decomposition therefore turns a cyclic dependency graph into units that can receive a [[Home/Computer Science/Algorithms/Graph Algorithms/Topological Sort|topological order]]. The same reduction appears in 2-SAT and deadlock analysis.

Direction defines the problem. In an undirected graph, mutual reachability is ordinary reachability, so the task reduces to connected components found by [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] or a flood fill.

~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"strongly-connected-components"}
```

The trace uses Tarjan's single-pass algorithm as the concrete way to expose this partition; the overview below also compares Kosaraju and Gabow.


On `A→B, B→C, C→A, C→D, D→E, E→D`, the visualization emits `{D, E}` and `{A, B, C}`. Inside each set every vertex reaches every other. Across the sets `{A, B, C}` reaches `{D, E}`, but not vice versa, so they cannot merge.

Contracting the two sets gives one edge, `A-B-C → D-E`. More generally, the condensation cannot contain a cycle: a cycle between two component nodes would make their original vertices mutually reachable, contradicting maximality. The result is therefore a DAG that can feed [[Home/Computer Science/Algorithms/Graph Algorithms/Topological Sort|topological sorting]] and DAG dynamic programming.


[[Home/Computer Science/Algorithms/Graph Algorithms/Tarjan's SCC Algorithm|Tarjan's algorithm]] runs one DFS with discovery indices, low links, and an active-vertex stack. When `low[v] == disc[v]`, it pops one complete SCC. The stack is essential: an edge into an already-emitted component must not lower the active low link.

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
      "symbol": "m",
      "description": "number of edges"
    },
    "vertexCount": {
      "symbol": "n",
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
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Kosaraju",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Gabow",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
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
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Kosaraju",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n + m)",
              "curveId": "linear"
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

# Components and the Condensation Graph

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
> Collapsing each subgraph to a single node gives the condensation `A-B-C → D-E`, a two-node DAG.

# References

- [Finding strongly connected components](https://cp-algorithms.com/graph/strongly-connected-components.html)
- [Path-Based Depth-First Search for Strong and Biconnected Components](https://doi.org/10.1016/S0020-0190%2800%2900051-X)
