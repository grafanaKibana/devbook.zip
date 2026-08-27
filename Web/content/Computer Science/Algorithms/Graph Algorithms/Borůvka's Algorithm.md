---
publish: true
created: 2026-08-20T20:41:15.513Z
modified: 2026-08-27T16:38:55.064Z
published: 2026-08-27T16:38:55.064Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Builds a minimum spanning tree in parallel rounds by adding each component's cheapest outgoing edge.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A [[Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|minimum spanning tree]] can grow from many fragments at once. Borůvka's algorithm starts with one component per vertex. During each round, every component selects its cheapest outgoing edge. A [[Computer Science/Data Structures/Graph Structures/Disjoint Set|disjoint set]] accepts a selected edge only while its endpoints remain in different components. The merged components then become the input to the next round.

The cut property certifies each selection. A component defines a cut between its vertices and the rest of the graph, so its cheapest outgoing edge belongs to some MST. Two components may select the same edge, while several equal-weight selections may form a cycle. Deduplication and the union-find check keep a compatible forest.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"boruvka"}
```


For vertices `A, B, C, D` with edges `AB=1`, `AC=4`, `BC=2`, `BD=5`, `CD=3`, the first round selects `AB` for `A`, `AB` for `B`, `BC` for `C`, and `CD` for `D`. After duplicate removal, all three edges are safe and the graph becomes one component in a single round.

Within each original connected component, every current piece that is not yet complete chooses an edge to another piece. Once distinct choices are unioned, the number of active pieces there falls by at least half because each merged piece contains at least two previous ones. Isolated or already-complete components remain unchanged. Applying the contraction independently inside each connected component still gives at most `⌈log₂ V⌉` merging rounds.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Borůvka's Algorithm complexity",
  "variables": {
    "edgeCount": {
      "symbol": "m",
      "description": "number of edges"
    },
    "inverseAckermann": {
      "symbol": "α(·)",
      "description": "inverse Ackermann factor applied to its displayed argument"
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
          "operation": "Best",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(m · α(n))"
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
              "formula": "distribution-dependent"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(m · α(n) · log n)"
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
````

# Boundary Cases

Parallel edges cause no special problem because only the lightest outgoing candidate for a component survives the round. Equal weights can produce different valid MSTs. A deterministic implementation therefore needs a stable tie-break such as normalized endpoint order.

An isolated component has no outgoing edge. If more than one component remains after a round and none can select an outgoing edge, the input is disconnected and the result is a minimum spanning forest.

Selected edges still need a union-find check. Two components can nominate the same edge, and an earlier union may turn a later candidate into an internal edge. Appending every nomination would allow duplicates or cycles into the result.

# References

- [Otakar Borůvka on minimum spanning tree problem](https://doi.org/10.1016/S0012-365X\(00\)00224-7)
