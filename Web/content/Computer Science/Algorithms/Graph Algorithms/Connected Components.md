---
publish: true
created: 2026-07-18T14:02:43.942Z
modified: 2026-08-01T18:31:33.340Z
published: 2026-08-01T18:31:33.340Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A social graph has 10M users and an edge for every friendship. "Which users belong to the same cluster as Ann?" and "how many disconnected clusters are there?" are the same question: find the **connected components**. A component is a maximal set of vertices in which every pair is joined by _some_ path — in an undirected graph, reachability is symmetric, so "u reaches v" and "u and v are in the same component" mean the same thing. That symmetry is what separates this from the directed case: [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]] needs paths _both ways_ and a two-pass or low-link algorithm; here one ordinary traversal suffices.

Two mechanisms solve it, and they fit different shapes of the problem. A **traversal** ([[Computer Science/Algorithms/Graph Algorithms/DFS BFS|DFS or BFS]]) floods outward from an unvisited vertex, stamping every vertex it reaches with a component id, then restarts from the next still-unvisited vertex — one linear `O(V + E)` sweep labels the whole graph. **[[Computer Science/Data Structures/Graph Structures/Union-Find|Union-find]]** instead merges the endpoints of each edge into the same set; the number of distinct sets is the component count. The traversal wants the graph already built and in memory; union-find answers connectivity _as edges arrive_ and interleaves `connected(a, b)` queries with additions, which is why streaming and incremental workloads reach for it.

The decisive detail is the outer loop: a single DFS from one source finds only _that_ vertex's component. Covering a disconnected graph means restarting the traversal from each vertex the previous floods never reached.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"connected-components"}
```

# Labelling by Traversal

Keep a `component[]` array initialised to "unlabelled". Scan vertices in any order; when one is still unlabelled, it must start a new component, so flood the entire set reachable from it — via a stack (DFS) or queue (BFS) — stamping each vertex with the current id, then increment the id. The traversal marks a vertex the instant it is discovered, so no vertex is stamped twice and the total work is one visit per vertex plus one inspection per edge.

A trace on six vertices with edges `A-B, B-C, C-A, D-E` and isolated vertex `F`:

```text
component = [-, -, -, -, -, -]   id = 0

A unlabelled -> flood id 0: reach A,B,C   component = [0,0,0,-,-,-]  id -> 1
B labelled, skip
C labelled, skip
D unlabelled -> flood id 1: reach D,E     component = [0,0,0,1,1,-]  id -> 2
E labelled, skip
F unlabelled -> flood id 2: reach F       component = [0,0,0,1,1,2]  id -> 3

3 components: {A,B,C}, {D,E}, {F}
```

The final `id` is the component count, and `component[u] == component[v]` answers "same component?" in `O(1)` after the sweep. DFS and BFS produce identical labels — the partition does not depend on visit order, only on which vertices are mutually reachable. Both iterative forms can hold `O(V)` vertices in their frontier; recursive DFS instead uses `O(h)` call-stack depth, up to `O(V)`.

# Merging by Union-find

When edges arrive over time, [[Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] maintains the partition incrementally: initialize `V` singleton roots, then union each edge's endpoints. The full pass costs `O(V + E · α(V))`; connectivity queries are near-constant amortized, while listing component members still needs a final grouping pass. This is the same [[Computer Science/Data Structures/Graph Structures/Disjoint Set|disjoint-set]] forest used by [[Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Kruskal's MST]]; its canonical page carries the tree and compression mechanics.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Connected Components complexity",
  "variables": {
    "edgeCount": {
      "symbol": "E",
      "description": "number of edges"
    },
    "inverseAckermann": {
      "symbol": "α(·)",
      "description": "inverse Ackermann factor applied to its displayed argument"
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
          "operation": "DFS / BFS labelling",
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
          "operation": "Union-find (rank + compression)",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(V + E · α(V))"
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
          "operation": "DFS / BFS labelling",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(V) — visited/label array plus frontier",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Union-find (rank + compression)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(V) — parent and rank arrays",
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

| Approach | Time | Auxiliary space | Best fit |
| --- | --- | --- | --- |
| DFS / BFS labelling | `Θ(V + E)` | `O(V)` — visited/label array plus frontier | Static graph in memory; want per-vertex labels and component members |
| Union-find (rank + compression) | `O(V + E · α(V))` | `O(V)` — parent and rank arrays | Streaming edges, interleaved connectivity queries, incremental merging |

Traversal is a tight `Θ(V + E)`: every vertex and edge is touched a fixed number of times regardless of graph shape. Union-find's `α(V)` is the inverse-Ackermann factor — below 5 for any `V` that fits in memory — so it is constant in practice but is an _amortised_ guarantee over a sequence, not a per-operation bound. Neither has a best/average/worst split in time; the real difference is _when_ the edges are available. If the graph is fixed, traversal's single sweep and its ready-made labels win; if edges stream, union-find avoids re-traversing after each change.

# Reference Drawer

> [!ABSTRACT]- Three components in an undirected graph
>
> ```mermaid
> flowchart LR
>   subgraph c0["component 0"]
>     A((A)) --- B((B))
>     B --- C((C))
>     C --- A
>   end
>   subgraph c1["component 1"]
>     D((D)) --- E((E))
>   end
>   subgraph c2["component 2"]
>     F((F))
>   end
> ```
>
> No edge crosses a subgraph boundary — that is exactly what makes each one a maximal component. An isolated vertex is its own component.

> [!EXAMPLE]- DFS labelling in C#
>
> ```csharp
> // Returns component ids and the authoritative component count.
> public static (int[] component, int count) ConnectedComponents(List<int>[] adjacency)
> {
>     var n = adjacency.Length;
>     var component = new int[n];
>     Array.Fill(component, -1);            // -1 == unlabelled
>     var id = 0;
>
>     for (var v = 0; v < n; v++)
>     {
>         if (component[v] != -1) continue; // already covered by an earlier flood
>
>         var stack = new Stack<int>();     // iterative DFS avoids deep-graph stack overflow
>         stack.Push(v);
>         component[v] = id;
>
>         while (stack.Count > 0)
>         {
>             var u = stack.Pop();
>             foreach (var w in adjacency[u])
>             {
>                 if (component[w] != -1) continue;
>                 component[w] = id;        // stamp on discovery, so no vertex enters twice
>                 stack.Push(w);
>             }
>         }
>
>         id++;                             // next unvisited vertex opens the next component
>     }
>
>     return (component, id);
> }
> ```
>
> The outer loop is the part that turns a single traversal into a component decomposition: each unlabelled vertex it lands on is provably in a component nothing before it reached, so it earns a fresh id.

# Comparison

| Method | Time | Gives labels | Gives members | Incremental | Distinguishing property |
| --- | --- | --- | --- | --- | --- |
| DFS labelling | `Θ(V + E)` | yes | yes (by id) | no | iterative stack is `O(V)` worst case; recursive depth is `O(h)` |
| BFS labelling | `Θ(V + E)` | yes | yes (by id) | no | `O(V)` frontier; same partition as DFS |
| Union-find | `O(V + E · α(V))` | roots only | needs a grouping pass | yes | answers `connected(a,b)` mid-stream, merges without re-traversal |
| [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components\|Strongly connected components]] | `Θ(V + E)` | yes | yes | no | for **directed** graphs; needs two-way reachability, not one path |

On a static, in-memory undirected graph, DFS or BFS labelling is the direct answer — one sweep, per-vertex ids, and component membership fall out together; pick the iterative form when recursive depth could overflow the call stack. Union-find is the choice when edges arrive incrementally or connectivity queries are interleaved with additions, since it merges in near-constant amortised time without ever re-scanning the graph, at the cost of not directly listing a component's members. Reserve [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]] for directed graphs: on an undirected graph its extra machinery collapses to exactly these connected components, so it is wasted effort here.

# Questions

> [!QUESTION]- Why does finding all components need an outer loop over every vertex?
> A single DFS or BFS from one source only reaches that source's component. In a disconnected graph, vertices in other components are never touched by that flood. Scanning every vertex and starting a new flood from each still-unlabelled one is what guarantees full coverage; each such vertex is provably in a component no earlier flood reached, so it starts a new component id.

> [!QUESTION]- When is union-find preferable to a traversal for components?
> When edges are not all available up front, or when `connected(a, b)` queries interleave with edge additions. Union-find merges endpoints in `O(α(V))` amortised and answers connectivity immediately, with no re-traversal after each new edge. A traversal would have to re-run from scratch after every change. The trade-off is that union-find reports set membership and counts, but listing a component's members needs a final grouping pass over the roots.

> [!QUESTION]- Why do DFS and BFS produce the same components but different from strongly connected components?
> Connected components depend only on which vertices are mutually reachable, which is order-independent, so DFS and BFS partition identically. Strongly connected components are defined on _directed_ graphs and require a path each way between every pair; a single undirected-style traversal cannot detect that, which is why the directed case needs Tarjan's or Kosaraju's two-way-reachability algorithm.

# References

- [Connected component (graph theory) (Wikipedia)](https://en.wikipedia.org/wiki/Component_\(graph_theory\)) — definition of a component as a maximal connected subgraph and the linear-time labelling procedure.
- [Undirected graphs (Sedgewick & Wayne, Algorithms 4th ed.)](https://algs4.cs.princeton.edu/41graph/) — the `CC` class computing component ids with DFS, plus the connectivity query it enables.
- [Search for connected components in a graph (cp-algorithms)](https://cp-algorithms.com/graph/search-for-connected-components.html) — DFS-based component enumeration with a reference implementation.
- [Disjoint Set Union (cp-algorithms)](https://cp-algorithms.com/data_structures/disjoint_set_union.html) — the union-find approach to incremental connectivity and component counting.
- [Efficiency of a Good But Not Linear Set Union Algorithm](https://doi.org/10.1145/321879.321884) — Tarjan's primary analysis of union by rank with path compression.
