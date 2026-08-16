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

In a friendship graph with 10M users, asking which users are connected to Ann and asking which cluster contains Ann are the same problem. A **connected component** is a maximal set of vertices where every pair is joined by some path. Reachability is symmetric in an undirected graph, so one traversal from any vertex covers its whole component. Directed graphs need a different definition: [[Home/Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]] require paths in both directions and a two-pass or low-link algorithm.

The implementation depends on how the graph changes. For a static graph, [[Home/Computer Science/Algorithms/Graph Algorithms/DFS BFS|DFS or BFS]] floods each reachable region and assigns a component id. When edges arrive incrementally, **[[Home/Computer Science/Data Structures/Graph Structures/Union-Find|union-find]]** merges their endpoints and answers `connected(a, b)` queries without rebuilding the partition.

The outer loop does the work that is easy to miss. One DFS finds only its source component. Finding the full partition requires another flood from every vertex left unlabelled by earlier traversals.

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


When edges arrive over time, [[Home/Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] maintains the partition incrementally: initialize `V` singleton roots, then union each edge's endpoints. This is the same [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|disjoint-set]] forest used by [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Kruskal's MST]]; union by rank keeps trees shallow, and path compression flattens the route each `find` traverses.

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

# Diagram and C# Implementation

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


For a static undirected graph, DFS or BFS labelling is the direct answer. One sweep produces both per-vertex ids and the component count. An iterative traversal avoids recursion overflow on deep graphs. [[Home/Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]] belong to directed graphs. Their extra machinery adds nothing on an undirected input.

# References

- [Search for connected components in a graph](https://cp-algorithms.com/graph/search-for-connected-components.html)
