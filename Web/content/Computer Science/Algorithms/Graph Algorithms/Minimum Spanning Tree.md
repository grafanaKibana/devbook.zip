---
publish: true
created: 2026-07-18T14:02:43.949Z
modified: 2026-07-18T14:02:43.949Z
published: 2026-07-18T14:02:43.949Z
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

The space of spanning trees is exponential, yet two [[Greedy Algorithms|greedy]] constructions — Prim's and Kruskal's — reach the optimum by only ever adding edges and never revisiting a choice. That works because of one structural fact about weighted graphs, the cut property, which certifies each greedy pick as belonging to some MST. Both need the graph to be connected and undirected; on those inputs a sequence of locally cheapest, cycle-free choices lands on a globally minimum tree.

**Core condition:** connected, undirected, weighted graph → repeatedly add the cheapest edge that crosses from chosen to unchosen vertices without closing a cycle → `V − 1` edges of minimum total weight.

# Growing one tree

The trace runs Prim's algorithm from vertex `A` on a six-vertex weighted graph.

```steptrace
{"algorithm":"prim","start":"A","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"}],"edges":[{"from":"A","to":"B","weight":4},{"from":"A","to":"C","weight":2},{"from":"B","to":"C","weight":1},{"from":"B","to":"D","weight":5},{"from":"C","to":"D","weight":8},{"from":"C","to":"E","weight":10},{"from":"D","to":"E","weight":2},{"from":"D","to":"F","weight":6},{"from":"E","to":"F","weight":3}]}
```

Every step splits the vertices into two groups — those already in the green tree and those still outside — and adds the single minimum-weight edge crossing that boundary. From `{A}` the crossing edges are `A–C` (2) and `A–B` (4), so `C` joins first. From `{A, C}` the frontier now includes `B–C` (1), lighter than the still-available `A–B` (4); the algorithm takes `B–C` and pulls in `B`. That is the whole idea: the cheapest edge leaving the current tree, wherever it sits, is the one added, and the cut property proves it belongs to some MST, so the pick never has to be undone. Once `A`, `B`, and `C` are all inside, the edge `A–B` (4) lies entirely within the tree, crosses no boundary, and is skipped — adding it would close a cycle. The run ends with five edges totaling 13.

# The cut property

A _cut_ partitions the vertices into two non-empty groups; an edge _crosses_ the cut when its endpoints fall on opposite sides. The cut property states: for any cut, the minimum-weight edge crossing it belongs to some MST. The reason is an exchange argument — suppose a minimum tree `T` omits the lightest crossing edge `e`. Adding `e` to `T` closes exactly one cycle, and that cycle must leave and re-enter the cut, so it contains another crossing edge `f` with `weight(f) ≥ weight(e)`. Replacing `f` with `e` yields a spanning tree no heavier than `T`, so a minimum one can always include `e`.

Both algorithms are this property applied to a different cut each step:

- **Prim's** keeps one growing tree and uses the cut between in-tree and out-of-tree vertices. A [[Heap|min-priority queue]] keyed on the lightest known edge into the tree returns that minimum crossing edge in `O(log V)`, and each newly added vertex relaxes the keys of its neighbors.
- **Kruskal's** sorts every edge by ascending weight and scans them in order, adding an edge only when its endpoints lie in different components. Because all lighter edges were already processed, that edge is the minimum one crossing the cut separating those two components. A [[Disjoint Set]] (union-find) tests same-component membership and merges the two in near-constant time; an edge whose endpoints already share a component is rejected — it would close a cycle.

# Complexity

| Algorithm | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Prim, binary heap | `O(E log V)` | `O(V)` eager / `O(E)` lazy | Each of the `E` edges can push or relax a heap entry at `O(log V)`; an indexed decrease-key holds one entry per vertex, the lazy reference code below one per crossing edge. |
| Prim, Fibonacci heap | `O(E + V log V)` | `O(V)` | Decrease-key is `O(1)` amortized; only the `V` extract-mins pay `O(log V)`. |
| Prim, array (dense) | `O(V²)` | `O(V)` | A linear scan finds the minimum key in each of `V` rounds; competitive when `E ≈ V²`. |
| Kruskal | `O(E log E)` | `O(V)` | Sorting all edges dominates; the [[Union-Find\|union-find]] passes add only `O(E α(V))`. |

Because `E ≤ V²`, `log E ≤ 2 log V`, so Kruskal's `O(E log E)` is the same asymptotic class as Prim's heap variant — the two differ in constant factors and in which structure the input already provides, not in growth rate. The space column counts working structures only: the priority queue or the union-find forest, both `O(V)`, excluding the `O(V)` output tree and the input graph. The lazy priority queue in the reference code below pushes an entry per crossing edge, so it can hold `O(E)` stale entries before they are discarded on dequeue.

# When the definition bends

The construction assumes a single connected component. On a disconnected graph an MST does not exist: Prim's, started from one vertex, reaches only that vertex's component and halts with fewer than `V − 1` edges; Kruskal's exhausts every edge and returns a spanning _forest_, one minimum tree per component. Either way the tell is the edge count — a result with fewer than `V − 1` edges means the graph was not connected, which is worth checking rather than assuming success.

Equal edge weights make the MST non-unique. When several edges tie, the sort order (Kruskal) or the priority-queue tie-break (Prim) decides which one enters, and different tie-breaks yield different edge sets. Every such set is a correct MST — only the _total_ weight is guaranteed unique, not the specific edges.

An MST minimizes total weight, not the distance between any particular pair of vertices, and the two goals diverge. Take a triangle with `A–B = 3`, `B–C = 3`, `A–C = 4`. The MST keeps `A–B` and `B–C` (total 6) and drops `A–C = 4`, so the only `A`-to-`C` route inside the tree costs `3 + 3 = 6` — longer than the direct edge it discarded. Reading pairwise shortest paths off an MST is the classic mistake; those are [[Dijkstra]]'s output, computed from a source over the full graph.

# Reference drawer

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
> public static int PrimWeight(int n, List<(int to, int w)>[] adj)
> {
>     var inTree = new bool[n];
>     var pq = new PriorityQueue<int, int>();  // vertex, key = cheapest known edge into the tree
>     pq.Enqueue(0, 0);
>     var total = 0;
>     while (pq.TryDequeue(out var u, out var w))
>     {
>         if (inTree[u]) continue;             // stale entry from a lazy push
>         inTree[u] = true;
>         total += w;
>         foreach (var (v, weight) in adj[u])
>             if (!inTree[v]) pq.Enqueue(v, weight);
>     }
>     return total;
> }
> ```
>
> `.NET`'s `PriorityQueue` has no decrease-key, so Prim pushes duplicate entries and discards already-in-tree vertices on dequeue — the same lazy-deletion pattern as [[Dijkstra]]. `DisjointSet` is the [[Union-Find|union-find]] forest with path compression and union by rank.

# Comparison

| Algorithm | Time | Structure it needs | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| Prim (binary heap) | `O(E log V)` | adjacency lists + priority queue | dense graphs already held as adjacency; a single running frontier | sparse input given as an edge list, needing conversion first |
| [[Kruskal's Algorithm\|Kruskal]] | `O(E log E)` | edge list + union-find | sparse graphs given as an edge list; the sort parallelizes cleanly | dense graphs where sorting `E ≈ V²` edges dominates |
| [[Borůvka's Algorithm\|Borůvka]] | `O(E log V)` | edge list + per-component cheapest edge | parallel or distributed builds; contracts every component's cheapest edge per round | single-threaded runs, where its extra bookkeeping buys nothing |

All three return a tree of the same minimum total weight — the choice is representation and execution model, not the result. Prim fits a graph already held as an adjacency structure and dense, since its frontier reuses that adjacency and it never sorts. Kruskal fits sparse edge lists, where sorting `E` edges and union-find are both cheap and its dominant step — the sort — is trivial to parallelize. Borůvka's rounds each add the cheapest edge out of every component at once, which maps naturally onto parallel and distributed hardware; on one core its per-round contraction rarely beats the other two.

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

- [Minimum spanning tree](https://en.wikipedia.org/wiki/Minimum_spanning_tree) — the cut property, uniqueness under distinct weights, and the spanning-forest result for disconnected graphs.
- [Minimum spanning tree — Kruskal's algorithm](https://cp-algorithms.com/graph/mst_kruskal.html) — the union-find implementation and the cut-property proof of correctness.
- [Minimum spanning tree — Prim's algorithm](https://cp-algorithms.com/graph/mst_prim.html) — the dense `O(V²)` array version alongside the `O(E log V)` heap version.
- [Minimum Spanning Trees](https://algs4.cs.princeton.edu/43mst/) — Sedgewick's lazy and eager Prim implementations and Kruskal, with the cut-property treatment.
- [Borůvka's algorithm](https://en.wikipedia.org/wiki/Bor%C5%AFvka%27s_algorithm) — the per-component contraction round and why it parallelizes.
