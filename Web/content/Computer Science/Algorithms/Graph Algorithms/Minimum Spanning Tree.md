---
publish: true
created: 2026-08-20T20:41:15.518Z
modified: 2026-08-20T20:41:15.519Z
published: 2026-08-20T20:41:15.519Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: The cheapest cycle-free edge set connecting every vertex of a weighted undirected graph, built greedily by Kruskal's or Prim's.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

Connecting a set of sites with the least total cable means reaching every site without paying for a redundant loop. A spanning tree does exactly that: it touches all `V` vertices, contains no cycle, and has `V − 1` edges. A _minimum_ spanning tree (MST) is the spanning tree with the smallest total edge weight.

Prim's and Kruskal's are [[Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] constructions. Each accepts an edge that is safe at that moment and never revisits the choice.

The cut property is what makes those local choices trustworthy: it certifies that each chosen edge belongs to some MST. Both algorithms require a connected, undirected graph. Under that condition, repeatedly taking the cheapest safe edge produces a globally minimum tree.

**Core condition:** connected, undirected, weighted graph → repeatedly accept a cut-certified safe edge without closing a cycle → `V − 1` edges of minimum total weight. Prim chooses the lightest edge crossing out of its growing tree. Kruskal chooses the lightest edge joining two current components.

````tabsdown
tab: Visualization


```steptrace
{"algorithm":"prim","start":"A","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"}],"edges":[{"from":"A","to":"B","weight":4},{"from":"A","to":"C","weight":2},{"from":"B","to":"C","weight":1},{"from":"B","to":"D","weight":5},{"from":"C","to":"D","weight":8},{"from":"C","to":"E","weight":10},{"from":"D","to":"E","weight":2},{"from":"D","to":"F","weight":6},{"from":"E","to":"F","weight":3}]}
```


Every step splits the vertices into two groups — those already in the green tree and those still outside — and adds the single minimum-weight edge crossing that boundary. From `{A}` the crossing edges are `A–C` (2) and `A–B` (4), so `C` joins first. From `{A, C}` the frontier now includes `B–C` (1), lighter than the still-available `A–B` (4); the algorithm takes `B–C` and pulls in `B`. That is the whole idea: the cheapest edge leaving the current tree, wherever it sits, is the one added, and the cut property proves it belongs to some MST, so the pick never has to be undone. Once `A`, `B`, and `C` are all inside, the edge `A–B` (4) lies entirely within the tree, crosses no boundary, and is skipped — adding it would close a cycle. The run ends with five edges totaling 13.


A *cut* partitions the vertices into two non-empty groups; an edge *crosses* the cut when its endpoints fall on opposite sides. The cut property states: for any cut, the minimum-weight edge crossing it belongs to some MST. The reason is an exchange argument — suppose a minimum tree `T` omits the lightest crossing edge `e`. Adding `e` to `T` closes exactly one cycle, and that cycle must leave and re-enter the cut, so it contains another crossing edge `f` with `weight(f) ≥ weight(e)`. Replacing `f` with `e` yields a spanning tree no heavier than `T`, so a minimum one can always include `e`.

Both algorithms are this property applied to a different cut each step:

- **Prim's** keeps one growing tree and uses the cut between in-tree and out-of-tree vertices. A [[Computer Science/Data Structures/Trees/Heap-like/Heap|min-priority queue]] returns the next crossing edge.
- **Kruskal's** scans edges by weight and uses a [[Computer Science/Data Structures/Graph Structures/Disjoint Set|disjoint set]]—the [[Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] structure—to reject edges that would close a cycle.


tab: Complexity

```complexity
{
  "version": 2,
  "label": "Minimum Spanning Tree complexity",
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
          "operation": "Prim, binary heap",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(m log n)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prim, Fibonacci heap",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(m + n log n)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prim, array (dense)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n²)",
              "curveId": "quadratic"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Kruskal",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(m log m)",
              "curveId": "n-log-n"
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
          "operation": "Prim, binary heap",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "O(n) eager / O(m) lazy"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prim, Fibonacci heap",
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
          "operation": "Prim, array (dense)",
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
          "operation": "Kruskal",
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

# When the Definition Bends

The construction assumes one connected component. A disconnected graph has no MST. Prim's reaches only the start vertex's component, while Kruskal's exhausts the edge list and returns a minimum spanning _forest_. In both cases, fewer than `V − 1` selected edges exposes the disconnected input.

Equal weights can produce more than one MST. Kruskal's sort order or Prim's priority-queue tie-break decides which tied edge enters, so two runs may return different edge sets with the same minimum total weight.

An MST minimizes the tree's total weight, not the distance between a particular pair of vertices. In a triangle with `A–B = 3`, `B–C = 3`, and `A–C = 4`, the MST keeps the first two edges for a total of 6. The resulting `A`-to-`C` tree path also costs 6, even though the discarded direct edge costs 4. Pairwise shortest paths are [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]]'s output over the full graph, not a property of the MST.

# Diagram and C# Implementation

> [!ABSTRACT]- Shared greedy decision
>
> ```mermaid
> flowchart TD
>   A["Next cheapest edge crossing the cut"] --> B{"Endpoints in different sets?"}
>   B -->|Yes| C["Add edge, merge the sets"]
>   B -->|No| D["Skip: would close a cycle"]
>   C --> E{"V-1 edges chosen?"}
>   D --> E
>   E -->|No| A
>   E -->|Yes| F["MST complete"]
> ```

> [!EXAMPLE]- C# implementations
>
> ```csharp
> // Kruskal: sort edges, keep each that joins two components.
> public static List<(int u, int v, int w)> Kruskal(int n, List<(int u, int v, int w)> edges)
> {
>     edges.Sort((a, b) => a.w.CompareTo(b.w));
>     var dsu = new DisjointSet(n);            // union-find over vertex ids
>     var mst = new List<(int, int, int)>();
>     foreach (var (u, v, w) in edges)
>     {
>         if (dsu.Union(u, v))                 // false when u, v already share a root
>             mst.Add((u, v, w));
>         if (mst.Count == n - 1) break;       // spanning tree complete
>     }
>     return mst;                              // fewer than n-1 edges ⇒ graph was disconnected
> }
>
> // Prim: grow from vertex 0 with a lazy min-priority queue.
> public static long PrimWeight(int n, List<(int to, long w)>[] adj)
> {
>     if (n == 0 || adj.Length != n)
>     {
>         throw new ArgumentException("The graph must contain exactly n vertices.", nameof(adj));
>     }
>
>     var inTree = new bool[n];
>     var pq = new PriorityQueue<int, long>(); // vertex, key = cheapest known edge into the tree
>     pq.Enqueue(0, 0);
>     var total = 0L;
>     var visited = 0;
>     while (pq.TryDequeue(out var u, out var w))
>     {
>         if (inTree[u]) continue;             // stale entry from a lazy push
>         inTree[u] = true;
>         visited++;
>         total = checked(total + w);
>         foreach (var (v, weight) in adj[u])
>             if (!inTree[v]) pq.Enqueue(v, weight);
>     }
>
>     if (visited != n)
>     {
>         throw new InvalidOperationException("A disconnected graph has no minimum spanning tree.");
>     }
>
>     return total;
> }
> ```
>
> `.NET`'s `PriorityQueue` has no decrease-key, so Prim pushes duplicate entries and discards already-in-tree vertices on dequeue — the same lazy-deletion pattern as [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]]. `DisjointSet` is the [[Computer Science/Data Structures/Graph Structures/Union-Find|union-find]] forest with path compression and union by rank.

# Comparison

All three produce a minimum-weight tree. The useful distinction is how the graph is represented and where the work runs. Prim fits an adjacency structure, especially for a dense graph, because it grows a frontier without sorting every edge. [[Computer Science/Algorithms/Graph Algorithms/Kruskal's Algorithm|Kruskal]] fits a sparse edge list: sort the edges once, then use union-find for cycle checks. [[Computer Science/Algorithms/Graph Algorithms/Borůvka's Algorithm|Borůvka]] selects the cheapest outgoing edge from every component in the same round, which suits parallel or distributed execution. On one core, that contraction machinery rarely beats Prim or Kruskal.

# References

- [Minimum Spanning Trees](https://algs4.cs.princeton.edu/43mst/)
