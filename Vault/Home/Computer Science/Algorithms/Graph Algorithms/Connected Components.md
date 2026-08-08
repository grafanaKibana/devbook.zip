---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Partitions an undirected graph into maximal reachable vertex sets using DFS, BFS, or union-find."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A social graph has 10M users and an edge for every friendship. "Which users belong to the same cluster as Ann?" and "how many disconnected clusters are there?" are the same question: find the **connected components**. A component is a maximal set of vertices in which every pair is joined by *some* path — in an undirected graph, reachability is symmetric, so "u reaches v" and "u and v are in the same component" mean the same thing. That symmetry is what separates this from the directed case: [[Home/Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]] needs paths *both ways* and a two-pass or low-link algorithm; here one ordinary traversal suffices.

The two mechanisms fit different workloads. For a static graph, [[Home/Computer Science/Algorithms/Graph Algorithms/DFS BFS|DFS or BFS]] floods each reachable region and assigns its component id. For incremental edges, **[[Home/Computer Science/Data Structures/Graph Structures/Union-Find|union-find]]** merges each edge's endpoints and answers interleaved `connected(a, b)` queries without rebuilding the partition.

The decisive detail is the outer loop: a single DFS from one source finds only *that* vertex's component. Covering a disconnected graph means restarting the traversal from each vertex the previous floods never reached.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"connected-components"}
```


Keep a `component[]` array initialised to "unlabelled". Scan vertices in any order; when one is still unlabelled, it must start a new component, so flood the entire set reachable from it — via a stack (DFS) or queue (BFS) — stamping each vertex with the current id, then increment the id. Marking a vertex when it is discovered prevents a second stamp.

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

DFS and BFS produce identical labels — the partition does not depend on visit order, only on which vertices are mutually reachable.


When edges arrive over time, [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] maintains the partition incrementally: initialize `V` singleton roots, then union each edge's endpoints. This is the same [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|disjoint-set]] forest used by [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Kruskal's MST]]; its canonical page carries the tree and compression mechanics.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Connected Components complexity",
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
          "operation": "DFS / BFS labelling",
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
          "operation": "Union-find (rank + compression)",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(n + m · α(n))"
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
              "formula": "O(n) — visited/label array plus frontier",
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
              "formula": "O(n) — parent and rank arrays",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

With adjacency lists, traversal visits each vertex once and scans each stored adjacency entry once. An undirected edge appears in two adjacency lists, which changes the constant count of scans but not the charted bound.
~~~~~

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
> The outer loop is the part that turns a single traversal into a component decomposition: each unlabelled vertex it lands on is provably in a component nothing before it reached, so it earns a fresh id.

# Comparison


On a static, in-memory undirected graph, DFS or BFS labelling is the direct answer — one sweep, per-vertex ids, and component membership fall out together; pick the iterative form when recursive depth could overflow the call stack. Reserve [[Home/Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]] for directed graphs: on an undirected graph its extra machinery collapses to exactly these connected components, so it is wasted effort here.

# Questions

> [!QUESTION]- Why does finding all components need an outer loop over every vertex?
> A single DFS or BFS from one source only reaches that source's component. In a disconnected graph, vertices in other components are never touched by that flood. Scanning every vertex and starting a new flood from each still-unlabelled one is what guarantees full coverage; each such vertex is provably in a component no earlier flood reached, so it starts a new component id.

> [!QUESTION]- Why do DFS and BFS produce the same components but different from strongly connected components?
> Connected components depend only on which vertices are mutually reachable, which is order-independent, so DFS and BFS partition identically. Strongly connected components are defined on *directed* graphs and require a path each way between every pair; a single undirected-style traversal cannot detect that, which is why the directed case needs Tarjan's or Kosaraju's two-way-reachability algorithm.

# References

- [Connected component (graph theory) (Wikipedia)](https://en.wikipedia.org/wiki/Component_(graph_theory)) — definition of a component as a maximal connected subgraph and the labelling procedure.
- [Undirected graphs (Sedgewick & Wayne, Algorithms 4th ed.)](https://algs4.cs.princeton.edu/41graph/) — the `CC` class computing component ids with DFS, plus the connectivity query it enables.
- [Search for connected components in a graph (cp-algorithms)](https://cp-algorithms.com/graph/search-for-connected-components.html) — DFS-based component enumeration with a reference implementation.
- [Disjoint Set Union (cp-algorithms)](https://cp-algorithms.com/data_structures/disjoint_set_union.html) — the union-find approach to incremental connectivity and component counting.
- [Efficiency of a Good But Not Linear Set Union Algorithm](https://doi.org/10.1145/321879.321884) — Tarjan's primary analysis of union by rank with path compression.
