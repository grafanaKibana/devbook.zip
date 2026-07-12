---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

A social graph has 10M users and an edge for every friendship. "Which users belong to the same cluster as Ann?" and "how many disconnected clusters are there?" are the same question: find the **connected components**. A component is a maximal set of vertices in which every pair is joined by *some* path — in an undirected graph, reachability is symmetric, so "u reaches v" and "u and v are in the same component" mean the same thing. That symmetry is what separates this from the directed case: [[Strongly Connected Components]] needs paths *both ways* and a two-pass or low-link algorithm; here one ordinary traversal suffices.

Two mechanisms solve it, and they fit different shapes of the problem. A **traversal** ([[DFS BFS|DFS or BFS]]) floods outward from an unvisited vertex, stamping every vertex it reaches with a component id, then restarts from the next still-unvisited vertex — one linear `O(V + E)` sweep labels the whole graph. **[[Union-Find|Union-find]]** instead merges the endpoints of each edge into the same set; the number of distinct sets is the component count. The traversal wants the graph already built and in memory; union-find answers connectivity *as edges arrive* and interleaves `connected(a, b)` queries with additions, which is why streaming and incremental workloads reach for it.

**Core condition:** undirected graph → maximal mutually reachable vertex sets → one `O(V + E)` traversal that restarts from every unvisited vertex, or a [[Union-Find|union-find]] pass at `O(E · α(V))` when edges stream in.

The decisive detail is the outer loop: a single DFS from one source finds only *that* vertex's component. Covering a disconnected graph means restarting the traversal from each vertex the previous floods never reached.

> [!NOTE] Visualization pending
> Planned StepTrace: a graph card that floods one component at a time — each unvisited vertex starts a new colour, the flood stamps every reachable vertex that colour, and the colour count is the component total. No matching renderer exists in `engine.js` yet.

## Labelling by traversal

Keep a `component[]` array initialised to "unlabelled". Scan vertices in any order; when one is still unlabelled, it must start a new component, so flood the entire set reachable from it — via a stack (DFS) or queue (BFS) — stamping each vertex with the current id, then increment the id. The traversal marks a vertex the instant it is discovered, so no vertex is stamped twice and the total work is one visit per vertex plus one inspection per edge.

A trace on seven vertices with edges `0-1, 1-2, 2-0, 3-4` (and `5`, `6` isolated):

```text
component = [-, -, -, -, -, -, -]   id = 0

v=0 unlabelled -> flood id 0: reach 0,1,2   component = [0,0,0,-,-,-,-]  id -> 1
v=1 labelled, skip
v=2 labelled, skip
v=3 unlabelled -> flood id 1: reach 3,4     component = [0,0,0,1,1,-,-]  id -> 2
v=4 labelled, skip
v=5 unlabelled -> flood id 2: reach 5       component = [0,0,0,1,1,2,-]  id -> 3
v=6 unlabelled -> flood id 3: reach 6       component = [0,0,0,1,1,2,3]  id -> 4

4 components: {0,1,2}, {3,4}, {5}, {6}
```

The final `id` is the component count, and `component[u] == component[v]` answers "same component?" in `O(1)` after the sweep. DFS and BFS produce identical labels — the partition does not depend on visit order, only on which vertices are mutually reachable — so the choice between them is the usual [[DFS BFS|memory trade-off]]: DFS uses `O(h)` stack depth, BFS an `O(V)` frontier.

## Merging by union-find

When edges arrive over time, or connectivity queries interleave with edge additions, rebuilding a traversal after every change is wasteful. [[Union-Find|Union-find]] maintains the partition incrementally: start with every vertex its own singleton, and for each edge `union` its endpoints. Two vertices are in the same component exactly when they share a root, so `connected(a, b)` is a pair of `find`s. The component count starts at `V` and drops by one on every `union` that actually merges two distinct sets.

This is the same [[Disjoint Set]] forest that drives Kruskal's [[Minimum Spanning Tree|MST]] cycle test — an edge whose endpoints already share a root would close a cycle, which for component-counting just means the edge is redundant. With union by rank and path compression each operation is `O(α(V))`, effectively constant, so the whole pass is `O(V + E · α(V))`. What union-find gives up is the explicit component *contents*: it answers "same component?" and "how many?" in near-constant time, but enumerating a component's members needs a final grouping pass over the roots.

## Complexity

| Approach | Time | Auxiliary space | Best fit |
| --- | --- | --- | --- |
| DFS / BFS labelling | `Θ(V + E)` | `O(V)` — visited/label array plus frontier | Static graph in memory; want per-vertex labels and component members |
| Union-find (rank + compression) | `O(V + E · α(V))` | `O(V)` — parent and rank arrays | Streaming edges, interleaved connectivity queries, incremental merging |

Traversal is a tight `Θ(V + E)`: every vertex and edge is touched a fixed number of times regardless of graph shape. Union-find's `α(V)` is the inverse-Ackermann factor — below 5 for any `V` that fits in memory — so it is constant in practice but is an *amortised* guarantee over a sequence, not a per-operation bound. Neither has a best/average/worst split in time; the real difference is *when* the edges are available. If the graph is fixed, traversal's single sweep and its ready-made labels win; if edges stream, union-find avoids re-traversing after each change.

## Reference drawer

> [!ABSTRACT]- Four components in an undirected graph
> ```mermaid
> flowchart LR
>   subgraph c0["component 0"]
>     N0((0)) --- N1((1))
>     N1 --- N2((2))
>     N2 --- N0
>   end
>   subgraph c1["component 1"]
>     N3((3)) --- N4((4))
>   end
>   subgraph c2["component 2"]
>     N5((5))
>   end
>   subgraph c3["component 3"]
>     N6((6))
>   end
> ```
> No edge crosses a subgraph boundary — that is exactly what makes each one a maximal component. An isolated vertex is its own component.

> [!EXAMPLE]- DFS labelling in C#
> ```csharp
> // Returns a component id per vertex; the number of components is max(result) + 1.
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

## Comparison

| Method | Time | Gives labels | Gives members | Incremental | Distinguishing property |
| --- | --- | --- | --- | --- | --- |
| DFS labelling | `Θ(V + E)` | yes | yes (by id) | no | `O(h)` stack; deep graphs need the iterative form |
| BFS labelling | `Θ(V + E)` | yes | yes (by id) | no | `O(V)` frontier; same partition as DFS |
| Union-find | `O(E · α(V))` | roots only | needs a grouping pass | yes | answers `connected(a,b)` mid-stream, merges without re-traversal |
| [[Strongly Connected Components]] | `Θ(V + E)` | yes | yes | no | for **directed** graphs; needs two-way reachability, not one path |

On a static, in-memory undirected graph, DFS or BFS labelling is the direct answer — one sweep, per-vertex ids, and component membership fall out together; pick BFS when depth could overflow a recursive stack and its `O(V)` frontier is affordable. Union-find is the choice when edges arrive incrementally or connectivity queries are interleaved with additions, since it merges in near-constant amortised time without ever re-scanning the graph, at the cost of not directly listing a component's members. Reserve [[Strongly Connected Components]] for directed graphs: on an undirected graph its extra machinery collapses to exactly these connected components, so it is wasted effort here.

## Questions

> [!QUESTION]- Why does finding all components need an outer loop over every vertex?
> A single DFS or BFS from one source only reaches that source's component. In a disconnected graph, vertices in other components are never touched by that flood. Scanning every vertex and starting a new flood from each still-unlabelled one is what guarantees full coverage; each such vertex is provably in a component no earlier flood reached, so it starts a new component id.

> [!QUESTION]- When is union-find preferable to a traversal for components?
> When edges are not all available up front, or when `connected(a, b)` queries interleave with edge additions. Union-find merges endpoints in `O(α(V))` amortised and answers connectivity immediately, with no re-traversal after each new edge. A traversal would have to re-run from scratch after every change. The trade-off is that union-find reports set membership and counts, but listing a component's members needs a final grouping pass over the roots.

> [!QUESTION]- Why do DFS and BFS produce the same components but different from strongly connected components?
> Connected components depend only on which vertices are mutually reachable, which is order-independent, so DFS and BFS partition identically. Strongly connected components are defined on *directed* graphs and require a path each way between every pair; a single undirected-style traversal cannot detect that, which is why the directed case needs Tarjan's or Kosaraju's two-way-reachability algorithm.

## References

- [Connected component (graph theory) (Wikipedia)](https://en.wikipedia.org/wiki/Component_(graph_theory)) — definition of a component as a maximal connected subgraph and the linear-time labelling procedure.
- [Undirected graphs (Sedgewick & Wayne, Algorithms 4th ed.)](https://algs4.cs.princeton.edu/41graph/) — the `CC` class computing component ids with DFS, plus the connectivity query it enables.
- [Search for connected components in a graph (cp-algorithms)](https://cp-algorithms.com/graph/search-for-connected-components.html) — DFS-based component enumeration with a reference implementation.
- [Disjoint Set Union (cp-algorithms)](https://cp-algorithms.com/data_structures/disjoint_set_union.html) — the union-find approach to incremental connectivity and component counting.
