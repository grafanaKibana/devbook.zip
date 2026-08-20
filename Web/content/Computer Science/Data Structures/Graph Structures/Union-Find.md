---
publish: true
created: 2026-08-20T20:41:15.594Z
modified: 2026-08-20T20:41:15.594Z
published: 2026-08-20T20:41:15.594Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Answers incremental connectivity queries through find, union by rank, and path compression.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

A stream of updates asks for two operations. `union(a, b)` joins groups, while `find(x)` returns the representative of `x`'s group. Two elements are connected when their representatives match. The main cost is the walk `find` makes up a parent chain to the root.

Union by rank controls how trees combine. Path compression rewrites the chain traversed by `find`. Together they keep the forest shallow. [[Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] establishes the parent-array state and its invariants. This note concentrates on the two heuristics and their cost.

**Core condition:** merges only accumulate → each `find` walks toward a root

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"union-find","n":7}
```

The view starts with seven singleton nodes. For a visible compression, run `Union(0, 1)`, `Union(2, 3)`, and `Union(0, 2)`, select `A = 3`, then run `Find A`; `parent[3]` changes from `2` to `0`. The forest shows the parent pointers that `find` walks; the indexed row below shows the same state as the `parent[]` array used by the implementation.

A `union` resolves both arguments to their roots and links one root beneath the other; an interior node is never linked directly, since that would strand the rest of its set. A `find` walks parent pointers until it reaches a self-parented root, then path-compresses the walked nodes so each points straight at that root. The first deep `find` on a chain is what pays for every shallow `find` after it.

#### Why the Walk Stays Short

Each heuristic attacks tree height from a different direction.

**Union by rank (or size)** attaches the shorter tree under the taller one. Rank is an upper bound on height, and a root's rank rises only when two trees of _equal_ rank merge, so a tree of rank `r` contains at least `2^r` nodes.

**Path compression** repoints every node a `find` visits directly at the root. A chain that cost one deep walk collapses to depth 1, so those nodes never pay for that depth again.

Neither heuristic alone reaches near-constant time: rank bounds how tall a tree can grow, while compression guarantees each tall path is walked only a few times before it flattens.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Union-Find complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements managed by the union-find forest"
    },
    "inverseAckermann": {
      "symbol": "α(·)",
      "description": "inverse Ackermann factor applied to its displayed argument"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Construct n singletons",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best/Amortized",
              "formula": "Θ(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "Θ(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "find(x)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized",
              "formula": "O(α(n))"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "union(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized",
              "formula": "O(α(n))"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "connected(a, b)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "text",
              "role": "Amortized",
              "formula": "O(α(n))"
            },
            {
              "kind": "curve",
              "role": "Worst single operation",
              "formula": "O(log n)",
              "curveId": "log-n"
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
          "operation": "Construct n singletons",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "Θ(n) structure",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "find(x)",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(1) iterative, O(log n) recursive stack"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "union(a, b)",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(1) iterative, O(log n) recursive stack"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "connected(a, b)",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(1) iterative, O(log n) recursive stack"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Where the Bound and the Interface Stop

Standard rollback DSU keeps rank or size and omits path compression. A successful union then logs at most one parent change plus one rank or size change. Offline dynamic connectivity maps each edge to its active time interval and places that interval in a segment tree over time. Traversal applies a node's edges on entry and rolls them back on exit. Reverse-time processing by itself covers only deletion-only workloads; mixed updates need the rollback DSU case described in the annotated reference below.

The interface only grows sets. It has no split and cannot remove one element from a set. The forest records membership rather than the edges that created it, so a merged component cannot reconstruct its earlier pieces. The [[Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] page treats that as an information boundary. Operationally, removals require an offline rollback variant or a fully dynamic connectivity structure.

# Diagram and C# Implementation

> [!ABSTRACT]- Operation flow
>
> ```mermaid
> flowchart TD
>   subgraph find[find x]
>     A[x] --> B{parent is self}
>     B -->|Yes| C[return root]
>     B -->|No| D[recurse to root] --> E[repoint x at root] --> C
>   end
>   subgraph union[union a b]
>     F[ra = find a] --> G[rb = find b] --> H{ra == rb}
>     H -->|Yes| I[already merged]
>     H -->|No| J[attach lower-rank root under higher] --> K[bump rank on tie]
>   end
> ```

> [!EXAMPLE]- Kruskal's cycle test
>
> ```csharp
> // Builds a Minimum Spanning Tree by adding the cheapest edge that
> // does not close a cycle; Union returns false when both ends already share a root.
> public static List<(int u, int v, int w)> KruskalMst(
>     int n, List<(int u, int v, int w)> edges)
> {
>     edges.Sort((a, b) => a.w.CompareTo(b.w));
>     var dsu = new DisjointSet(n);
>     var mst = new List<(int, int, int)>();
>
>     foreach (var (u, v, w) in edges)
>     {
>         if (dsu.Union(u, v))       // merge succeeds only across components
>             mst.Add((u, v, w));
>         if (mst.Count == n - 1)    // a spanning tree has n - 1 edges
>             break;
>     }
>
>     if (mst.Count != n - 1)
>         throw new InvalidOperationException("Graph is disconnected.");
>
>     return mst;
> }
> ```
>
> `DisjointSet` is the rank + path-compression forest defined on the [[Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] page. Only its `Union` return value drives the cycle test.

# Comparison

| Strategy | Structural property |
| ---------------------------------- | ----------------------------------------------------- |
| Quick-find (label array) | flat labels. A union rewrites every member of one set |
| Quick-union (forest, no heuristic) | a chain can grow to length `n` |
| Union by rank alone | bounded height. Rollback-friendly with a change log |
| Rank + path compression | flattened forest. Rollback logs many parent rewrites |

Rank plus path compression is the usual choice for incremental connectivity. Rollback DSU drops compression so a union records only local parent and size changes. Compression can also be logged, but its many rewrites make undo more expensive. Quick-find remains reasonable only when unions are rare, because every merge rewrites an entire component.

The same forest supports Kruskal's [[Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Minimum Spanning Tree]] cycle test and incremental component queries. It also detects cycles in an edge stream. In each case, `union` merges endpoints and `find` reports whether an edge would close a loop.

# References

- [Union-Find](https://algs4.cs.princeton.edu/15uf/)
- [Rollback disjoint sets with segment-tree-over-time intervals](https://cp-algorithms.com/data_structures/deleting_in_log_n.html)
