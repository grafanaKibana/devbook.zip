---
publish: true
created: 2026-08-10T06:36:38.077Z
modified: 2026-08-10T06:36:38.077Z
published: 2026-08-10T06:36:38.077Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Builds a minimum spanning tree by accepting the lightest edges that join separate components.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A connected, undirected, weighted graph can contain many spanning trees. [[Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Minimum spanning tree]] asks for the one with minimum total edge weight. Kruskal's algorithm treats the graph as an edge list: sort every edge from lightest to heaviest, then accept an edge only when it joins two components that are still separate.

The cycle test is the whole mechanism. A [[Computer Science/Data Structures/Graph Structures/Disjoint Set|disjoint set]] stores the current forest components. If `find(u) == find(v)`, edge `(u, v)` would close a cycle and is rejected; otherwise `union(u, v)` merges the components and the edge enters the result. The cut property makes that greedy choice safe: the lightest edge crossing a cut belongs to some MST.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"kruskal"}
```


For edges `AB=1`, `BC=2`, `AC=3`, `CD=4`, the initial components are `{A}`, `{B}`, `{C}`, `{D}`.

| Edge | Component test | Decision | Components after |
| --- | --- | --- | --- |
| `AB=1` | `A` and `B` differ | accept | `{A,B}`, `{C}`, `{D}` |
| `BC=2` | `B` and `C` differ | accept | `{A,B,C}`, `{D}` |
| `AC=3` | `A` and `C` match | reject cycle | unchanged |
| `CD=4` | `C` and `D` differ | accept | `{A,B,C,D}` |

The accepted edges have total weight `7` and stop at `V - 1 = 3` edges. At every acceptance, the endpoints lie on opposite sides of a current component cut, and no lighter unprocessed edge crosses that cut.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Kruskal's Algorithm complexity",
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
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "Θ(m log m)",
          "curveId": "n-log-n"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "Θ(m log m)",
          "curveId": "n-log-n"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "Θ(m log m)",
          "curveId": "n-log-n"
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Kruskal",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "O(n + log m) with in-place introsort"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Boundary Cases

A disconnected graph never reaches `V - 1` accepted edges. The scan returns a minimum spanning forest rather than an MST, so the edge count must be checked.

Equal weights can produce several valid MSTs. Sort stability or an explicit endpoint tie-break changes which equal-weight edge enters, but not the minimum total weight. Negative weights require no special handling: ascending order and the cut property remain valid.

# Questions

> [!QUESTION]- How does Kruskal's algorithm reveal that the input graph is disconnected?
> A connected graph reaches exactly `V - 1` accepted edges after its components merge into one. If the sorted-edge scan ends earlier, no remaining edge can connect the residual components, so the result is a minimum spanning forest rather than an MST.

# References

- [On the Shortest Spanning Subtree of a Graph and the Traveling Salesman Problem](https://www.ams.org/journals/proc/1956-007-01/S0002-9939-1956-0078686-7/) — Kruskal's original 1956 paper.
- [Minimum spanning tree — Kruskal with disjoint set union](https://cp-algorithms.com/graph/mst_kruskal_with_dsu.html) — implementation details and union-find complexity.
