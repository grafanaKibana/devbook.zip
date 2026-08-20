---
publish: true
created: 2026-08-20T20:41:15.511Z
modified: 2026-08-20T20:41:15.512Z
published: 2026-08-20T20:41:15.512Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: A single DFS finds all cut vertices and cut edges, the points whose removal disconnects an undirected graph.
level:
  - "4"
priority: Medium
status: Creation
---

In an undirected network, a router or cable is a single point of failure when removing it leaves some pair of nodes unable to reach each other.

A single depth-first traversal finds all of them at once. As DFS explores an undirected graph, it builds a tree whose only non-tree edges are back edges to ancestors. Undirectedness forbids cross edges. Each back edge is an alternate route that survives removing the tree edge or vertex above it. Recording how far back each subtree can escape turns "does removing this disconnect anything?" into a local numeric comparison at every edge.

An **articulation point** (cut vertex) is a vertex whose deletion raises the number of connected components. A **bridge** (cut edge) is the edge analogue. The same DFS reports both.

The decisive transition is a DFS tree annotated with `disc`/`low`, where each child's `low` is compared against its parent's `disc`.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"articulation-points-and-bridges"}
```


DFS runs from any unvisited vertex and repeats until every component is covered. Two integers are stored per vertex:

- `disc[v]` — discovery time, a counter incremented the first time DFS reaches `v`. It orders vertices by when the tree first touched them, so an ancestor always has a smaller `disc` than its descendants.
- `low[v]` — the smallest `disc` reachable from `v`'s subtree using any number of tree edges plus at most one back edge. It starts at `disc[v]`, then absorbs `low[c]` for each tree child `c` and `disc[w]` for each back edge `v → w` to an ancestor `w`.

`low[v]` answers a single question: how far back up the tree can `v`'s subtree escape without passing through the edge that entered it? Comparing that escape height against a parent's `disc` is the whole algorithm.

- **Non-root cut vertex.** A non-root `u` with a tree child `v` where `low[v] >= disc[u]` is an articulation point. The inequality says nothing in `v`'s subtree reaches strictly above `u`, so every route out of that subtree passes through `u`; deleting `u` strands it.
- **Root cut vertex.** The DFS root has no ancestor, so `low[v] >= disc[root]` holds trivially for its first child. The root is an articulation point only when it has two or more tree children — the only path between two of its subtrees runs through it.
- **Bridge.** A tree edge `(u, v)` is a bridge when `low[v] > disc[u]` — strict. Equality (`low[v] == disc[u]`) means a back edge from `v`'s subtree lands exactly on `u`: that route bypasses the edge `(u, v)`, so the edge is not a bridge, but it still forces traffic through the vertex `u`, so `u` stays a cut vertex. The single `>` versus `>=` is the entire distinction between cut edges and cut vertices.

Worked example: a triangle `0-1-2` with a tail `2-3-4`. DFS from `0` discovers `0, 1, 2` around the cycle; the edge `2-0` is a back edge, so `low` across the triangle collapses to `0` and none of `0, 1, 2` is cut inside it. The tail carries no back edge, so `low[3] = 3 > disc[2] = 2` and `low[4] = 4 > disc[3] = 3`: edges `2-3` and `3-4` are bridges, and vertices `2` and `3` are cut vertices — each is the sole link to what hangs below it. Removing any of them raises the connected-component count, which is the property each rule certifies locally.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Articulation Points and Bridges complexity",
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
          "operation": "Time",
          "bounds": [
            {
              "kind": "curve",
              "role": "Bound",
              "formula": "O(n + m)",
              "curveId": "linear"
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
          "operation": "Auxiliary space",
          "bounds": [
            {
              "kind": "curve",
              "role": "Bound",
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

# Boundaries

**Directed graphs.** The rules assume the DFS tree holds only tree and back edges. Undirectedness guarantees that every non-tree edge points to an ancestor, and a back edge is a genuine two-way alternate route. On a directed graph DFS also produces cross and forward edges, and a back edge no longer implies a return path, so `low[v]` stops measuring a real escape route and both tests silently report wrong cuts. Directed connectivity is a different decomposition, [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]].

**The root special case.** Applying the non-root rule `low[v] >= disc[u]` to the DFS root marks it as a cut vertex the moment it has any child, because `low[v] >= disc[root]` is vacuously true. Nothing sits above the root. Rooting a path `0-1-2` at `0` flags `0` even though deleting it leaves `1-2` connected. The root must instead be tested by child count (two or more). The bridge rule needs no exception: `low[v] > disc[root]` handles the root correctly, since a first child with no back edge genuinely sits below a bridge.

**`>=` versus `>`.** Reusing one threshold for both objects mislabels edges. In two triangles sharing a single vertex `2` (`0-1-2-0` and `2-3-4-2`), the child edge entering the second triangle produces `low[child] == disc[2]`. The non-strict test `>=` correctly flags `2` as a cut vertex because deleting it separates the triangles. The strict test `>` leaves every edge un-bridged, since each edge lies on a cycle. Swapping the operators would either miss the cut vertex or invent a bridge that does not exist.

**Parallel edges (multigraphs).** The usual guard skips the parent by vertex: `if (v == parent) continue;`. With two edges between `u` and `v` it discards both, so `v`'s subtree appears to have no route up and `(u, v)` is reported as a bridge. But the duplicate edge is itself the route keeping them connected. The escape exists in the graph but not in `low[v]`, because the second edge was never examined. Skipping only the specific parent edge by its id leaves the duplicate as a back edge that lowers `low[v]` and cancels the false bridge.

# Diagram and C# Implementation

> [!ABSTRACT]- DFS tree of the triangle-with-tail example
>
> ```mermaid
> flowchart TD
>   N0["0 (disc 0, low 0)"] --> N1["1 (disc 1, low 0)"]
>   N1 --> N2["2 (disc 2, low 0)"]
>   N2 --> N3["3 (disc 3, low 3)"]
>   N3 --> N4["4 (disc 4, low 4)"]
>   N2 -. back .-> N0
> ```
>
> Tree edges point downward. The dashed back edge `2→0` pulls `low` to `0` across the triangle, so `0-1-2` has no internal cut. The tail carries no back edge, so `low[3] > disc[2]` and `low[4] > disc[3]` make `2-3` and `3-4` bridges and `2`, `3` cut vertices.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class CutFinder
> {
>     private readonly List<(int to, int id)>[] _adj;
>     private readonly int[] _disc, _low;
>     private int _timer;
>
>     public HashSet<int> ArticulationPoints { get; } = new();
>     public List<(int u, int v)> Bridges { get; } = new();
>
>     public CutFinder(List<(int to, int id)>[] adj)
>     {
>         _adj = adj;
>         _disc = new int[adj.Length];
>         _low = new int[adj.Length];
>         Array.Fill(_disc, -1);              // -1 marks unvisited
>     }
>
>     public void Run()
>     {
>         for (int s = 0; s < _adj.Length; s++)
>             if (_disc[s] == -1)
>                 Dfs(s, parentEdge: -1, isRoot: true);
>     }
>
>     private void Dfs(int u, int parentEdge, bool isRoot)
>     {
>         _disc[u] = _low[u] = _timer++;
>         int children = 0;
>
>         foreach (var (v, id) in _adj[u])
>         {
>             if (id == parentEdge) continue;          // skip the edge we arrived on, once
>             if (_disc[v] == -1)                       // tree edge
>             {
>                 children++;
>                 Dfs(v, id, isRoot: false);
>                 _low[u] = Math.Min(_low[u], _low[v]);
>                 if (!isRoot && _low[v] >= _disc[u])   // articulation rule (non-root)
>                     ArticulationPoints.Add(u);
>                 if (_low[v] > _disc[u])               // bridge rule (strict)
>                     Bridges.Add((u, v));
>             }
>             else                                      // back edge
>             {
>                 _low[u] = Math.Min(_low[u], _disc[v]);
>             }
>         }
>
>         if (isRoot && children >= 2)                  // articulation rule (root)
>             ArticulationPoints.Add(u);
>     }
> }
> ```
>
> Adjacency stores an edge id per neighbor so the parent _edge_, rather than the parent vertex, is skipped. This keeps parallel edges correct.

# Relations

Cut vertices and bridges are the boundary markers of two connectivity decompositions, and both reuse the same low-link DFS.

| Decomposition | Maximal blocks | Boundary object | DFS relation |
| --- | --- | --- | --- |
| Biconnected components | maximal blocks with no internal articulation point. Blocks with at least three vertices are 2-vertex-connected; a bridge may appear as a two-vertex block in the full block-cut decomposition | articulation points. A cut vertex belongs to several blocks at once | yes, with an auxiliary edge stack |
| 2-edge-connected components | subgraphs with no bridge | bridges join adjacent components | yes |
| [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components\|Strongly connected components]] | mutually reachable sets in a **directed** graph | — | related low-link DFS, with an active-vertex stack and different update rule |

The directed reachability question is a separate decomposition, [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|strongly connected components]], built on a related low-link idea. Tarjan's SCC traversal must track which vertices remain on an active stack and must ignore edges into already-finished components when lowering `low`. The cut-vertex implementation cannot be reused by merely directing its edges. For undirected reliability analysis, this one DFS identifies every node or link that is a single point of failure.

# References

- [Algorithm 447: Efficient Algorithms for Graph Manipulation](https://doi.org/10.1145/362248.362272)
- [Finding bridges (cp-algorithms)](https://cp-algorithms.com/graph/bridge-searching.html)
