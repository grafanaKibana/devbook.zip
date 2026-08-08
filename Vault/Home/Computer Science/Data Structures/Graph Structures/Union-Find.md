---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "Answers incremental connectivity queries through find, union by rank, and path compression."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

A program receives a stream of merge and connectivity requests: `union(a, b)` joins two groups, `find(x)` reports which group `x` belongs to, and two elements are connected when their finds agree. The cost that dominates is the walk `find` performs up a parent chain toward its set's root.

Two heuristics keep the forest shallow so the walk stays short. Union by rank controls how two trees combine; path compression rewrites the chain each `find` traverses. The [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] note covers the parent-array forest these operations run over; this page is about the heuristics and their analysis.

**Core condition:** merges only accumulate → each `find` walks toward a root

~~~~~tabsdown
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
~~~~~

# Where the Bound and the Interface Stop

Standard rollback DSU keeps union by rank or size but omits path compression, so each successful union logs at most one parent change and one rank or size change. For offline dynamic connectivity, map each edge to the time interval in which it is active, add that interval to a segment tree over time, then traverse the tree: apply the node's edges on entry and roll them back on exit. Reverse-time processing alone is sufficient only for deletion-only workloads ([rollback DSU](https://cp-algorithms.com/data_structures/deleting_in_log_n.html)).

The interface only grows sets. There is no split, and no removal of an element from a set — the parent forest records membership, not the edges that produced it, so a merged component cannot be separated back into its pre-merge pieces. That limit belongs to the [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] page as its own boundary; the algorithmic consequence here is that any workload with removals needs either a rollback variant run offline or a fully dynamic connectivity structure.

# Reference Drawer

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
> `DisjointSet` is the rank + path-compression forest defined on the [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] page; only its `Union` return value drives the cycle test.

# Comparison

| Strategy | Structural property |
| ---------------------------------- | ----------------------------------------------------- |
| Quick-find (label array) | flat labels; a union rewrites every member of one set |
| Quick-union (forest, no heuristic) | a chain can grow to length `n` |
| Union by rank alone | bounded height; rollback-friendly with a change log |
| Rank + path compression | flattened forest; rollback logs many parent rewrites |

Rank plus path compression is the standard structure for incremental connectivity. Rollback DSU instead keeps rank or size but drops compression so each union records only its local parent and size changes; compression can be logged too, but its many parent rewrites make undo more expensive. Quick-find stays attractive only when unions are rare relative to queries, since each merge rewrites every member of one component.

The same forest answers several graph questions: the [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Minimum Spanning Tree]] cycle test in Kruskal's algorithm, incremental connected-component queries, and cycle detection while streaming edges — in each, `union` merges endpoints and `find` reports whether an edge would close a loop.

# Questions

> [!QUESTION]- Why does standard rollback DSU omit path compression?
> Compression can be reversed only if every rewritten parent is logged. That turns one find into many logged mutations, so the standard rollback variant omits compression and logs the constant number of parent and rank changes made by a union.

# References

- [Efficiency of a Good But Not Linear Set Union Algorithm](https://dl.acm.org/doi/10.1145/321879.321884) — source for the structure and its analysis.
- [Union-Find](https://algs4.cs.princeton.edu/15uf/) — Princeton Algorithms, tracing the progression from quick-find and quick-union to weighted union and path compression with cost measurements for each.
- [Disjoint Set Union](https://cp-algorithms.com/data_structures/disjoint_set_union.html) — the two heuristics, their combined complexity, and graph applications including Kruskal's MST.
- [Rollback disjoint sets](https://cp-algorithms.com/data_structures/deleting_in_log_n.html) — rollback DSU with segment-tree-over-time intervals for offline deletions.
