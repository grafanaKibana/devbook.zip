---
publish: true
created: 2026-07-18T14:02:43.949Z
modified: 2026-08-08T07:30:30.284Z
published: 2026-08-08T07:30:30.284Z
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

Connecting a set of sites — data-center switches, well heads, pads on a circuit board — with the least total cable means choosing links that reach every site while paying for no redundant loop. Any edge subset that touches all `V` vertices with no cycle is a spanning tree, and it always uses exactly `V − 1` edges; the _minimum_ spanning tree (MST) is the spanning tree whose edge weights sum to the smallest possible total.

Prim's and Kruskal's are [[Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] constructions: each accepts a locally safe edge and never revisits that choice.

That works because of one structural fact about weighted graphs, the cut property, which certifies each greedy pick as belonging to some MST. Both need the graph to be connected and undirected; on those inputs a sequence of locally cheapest, cycle-free choices lands on a globally minimum tree.

**Core condition:** connected, undirected, weighted graph → repeatedly accept a cut-certified safe edge without closing a cycle → `V − 1` edges of minimum total weight. Prim chooses the lightest edge crossing out of its growing tree; Kruskal chooses the lightest edge joining two current components.

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

The construction assumes a single connected component. On a disconnected graph an MST does not exist: Prim's, started from one vertex, reaches only that vertex's component and halts with fewer than `V − 1` edges; Kruskal's exhausts every edge and returns a spanning _forest_, one minimum tree per component. Either way the tell is the edge count — a result with fewer than `V − 1` edges means the graph was not connected, which is worth checking rather than assuming success.

Equal edge weights remove the distinct-weights guarantee of a unique MST and can make the MST non-unique. When several edges tie, the sort order (Kruskal) or the priority-queue tie-break (Prim) decides which one enters, and different tie-breaks may yield different valid minimum edge sets with the same total weight.

An MST minimizes total weight, not the distance between any particular pair of vertices, and the two goals diverge. Take a triangle with `A–B = 3`, `B–C = 3`, `A–C = 4`. The MST keeps `A–B` and `B–C` (total 6) and drops `A–C = 4`, so the only `A`-to-`C` route inside the tree costs `3 + 3 = 6` — longer than the direct edge it discarded. Reading pairwise shortest paths off an MST is the classic mistake; those are [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]]'s output, computed from a source over the full graph.

# Reference Drawer

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

All three return a tree of the same minimum total weight — the choice is representation and execution model, not the result. Prim fits a graph already held as an adjacency structure and dense, since its frontier reuses that adjacency and it never sorts. [[Computer Science/Algorithms/Graph Algorithms/Kruskal's Algorithm|Kruskal]] fits sparse edge lists, where sorting `E` edges and union-find are both cheap and its dominant step — the sort — is trivial to parallelize. [[Computer Science/Algorithms/Graph Algorithms/Borůvka's Algorithm|Borůvka]] adds the cheapest edge out of every component at once, which maps naturally onto parallel and distributed hardware; on one core its per-round contraction rarely beats the other two.

# Questions

> [!QUESTION]- Why are Prim's and Kruskal's optimal even though they never reconsider an edge?
> The cut property: for any partition of the vertices, the minimum-weight edge crossing it lies in some MST. Prim's applies it to the (in-tree, out-of-tree) cut; Kruskal's to the cut between the two components an edge would join. Each added edge is therefore provably safe, so a chain of greedy choices reaches a global optimum without backtracking.

> [!QUESTION]- What guarantees the edge Kruskal's adds is the safe one?
> Edges are processed in ascending weight, so when an edge joining two different components is reached, every lighter edge has already been consumed or rejected. Nothing lighter connects those two components, which makes this edge the minimum one crossing the cut between them — exactly the edge the cut property certifies.

> [!QUESTION]- Why can the tree path between two vertices be longer than their shortest path?
> An MST minimizes the total weight of all its edges, not the distance between any given pair. In the triangle `A–B = 3`, `B–C = 3`, `A–C = 4`, the MST drops `A–C` and routes `A`→`C` through `B` at cost 6, versus the direct edge's 4. Pairwise shortest paths come from Dijkstra over the full graph, not from an MST.

> [!QUESTION]- What do the algorithms produce on a disconnected graph?
> No MST exists. Kruskal's returns a spanning forest — one minimum tree per component — and Prim's from a single start reaches only that vertex's component. Both finish with fewer than `V − 1` edges, and that shortfall is how the disconnection is detected.

# References

- [Joseph B. Kruskal, _On the Shortest Spanning Subtree of a Graph and the Traveling Salesman Problem_ (1956)](https://doi.org/10.1090/S0002-9939-1956-0078686-7) — the original paper introducing Kruskal's greedy minimum-spanning-tree algorithm.
- [Minimum spanning tree](https://en.wikipedia.org/wiki/Minimum_spanning_tree) — the cut property, uniqueness under distinct weights, and the spanning-forest result for disconnected graphs.
- [Minimum spanning tree — Kruskal's algorithm](https://cp-algorithms.com/graph/mst_kruskal.html) — the union-find implementation and the cut-property proof of correctness.
- [Minimum spanning tree — Prim's algorithm](https://cp-algorithms.com/graph/mst_prim.html) — the dense array version alongside the heap version.
- [Minimum Spanning Trees](https://algs4.cs.princeton.edu/43mst/) — Sedgewick's lazy and eager Prim implementations and Kruskal, with the cut-property treatment.
- [Borůvka's algorithm](https://en.wikipedia.org/wiki/Bor%C5%AFvka%27s_algorithm) — the per-component contraction round and why it parallelizes.
