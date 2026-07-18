---
publish: true
created: 2026-07-18T14:02:43.936Z
modified: 2026-07-18T14:02:43.940Z
published: 2026-07-18T14:02:43.940Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: A single DFS finds all cut vertices and cut edges, the points whose removal disconnects an undirected graph, in O(V+E).
level:
  - "4"
priority: Medium
status: Creation
---

An undirected network needs to know which routers or cables are single points of failure: remove that one vertex or edge and some pair of nodes can no longer reach each other. Checking candidates one at a time — delete it, re-run a connectivity scan, see whether the component count grew — costs `O(V·(V+E))`, a full traversal per vertex or edge.

A single depth-first traversal finds all of them at once. As DFS explores an undirected graph it builds a tree whose only non-tree edges are back edges to ancestors — undirectedness forbids cross edges — and each back edge is an alternate route that survives removing the tree edge or vertex above it. Recording, per vertex, how far back its subtree can escape turns "does removing this disconnect anything?" into a local numeric comparison at every edge.

An **articulation point** (cut vertex) is a vertex whose deletion raises the number of connected components; a **bridge** (cut edge) is the edge analogue. The same DFS reports both.

**Core condition:** undirected graph → one DFS records `disc[v]` and `low[v]` → a child that cannot reach above its parent exposes a cut vertex or bridge → `O(V + E)` time, `O(V)` space.

The decisive transition is a DFS tree annotated with `disc`/`low`, where each child's `low` is compared against its parent's `disc`.

> [!NOTE] Visualization pending
> Planned StepTrace: a DFS-tree card showing discovery and low-link values propagating up from the leaves, marking a vertex as a cut vertex when a child's subtree cannot reach above it and an edge as a bridge when a child's low-link strictly exceeds the parent's discovery time. No matching renderer exists in `engine.js` yet.

# What `disc` and `low` measure

DFS runs from any unvisited vertex and repeats until every component is covered. Two integers are stored per vertex:

- `disc[v]` — discovery time, a counter incremented the first time DFS reaches `v`. It orders vertices by when the tree first touched them, so an ancestor always has a smaller `disc` than its descendants.
- `low[v]` — the smallest `disc` reachable from `v`'s subtree using any number of tree edges plus at most one back edge. It starts at `disc[v]`, then absorbs `low[c]` for each tree child `c` and `disc[w]` for each back edge `v → w` to an ancestor `w`.

`low[v]` answers a single question: how far back up the tree can `v`'s subtree escape without passing through the edge that entered it? Comparing that escape height against a parent's `disc` is the whole algorithm.

- **Non-root cut vertex.** A non-root `u` with a tree child `v` where `low[v] >= disc[u]` is an articulation point. The inequality says nothing in `v`'s subtree reaches strictly above `u`, so every route out of that subtree passes through `u`; deleting `u` strands it.
- **Root cut vertex.** The DFS root has no ancestor, so `low[v] >= disc[root]` holds trivially for its first child. The root is an articulation point only when it has two or more tree children — the only path between two of its subtrees runs through it.
- **Bridge.** A tree edge `(u, v)` is a bridge when `low[v] > disc[u]` — strict. Equality (`low[v] == disc[u]`) means a back edge from `v`'s subtree lands exactly on `u`: that route bypasses the edge `(u, v)`, so the edge is not a bridge, but it still forces traffic through the vertex `u`, so `u` stays a cut vertex. The single `>` versus `>=` is the entire distinction between cut edges and cut vertices.

Worked example: a triangle `0-1-2` with a tail `2-3-4`. DFS from `0` discovers `0, 1, 2` around the cycle; the edge `2-0` is a back edge, so `low` across the triangle collapses to `0` and none of `0, 1, 2` is cut inside it. The tail carries no back edge, so `low[3] = 3 > disc[2] = 2` and `low[4] = 4 > disc[3] = 3`: edges `2-3` and `3-4` are bridges, and vertices `2` and `3` are cut vertices — each is the sole link to what hangs below it. Removing any of them raises the connected-component count, which is the property each rule certifies locally.

# Complexity

| Measure | Bound | Cause |
| --- | --- | --- |
| Time | `O(V + E)` | One DFS: each vertex is discovered once, each edge examined a constant number of times. There is no early exit — the same traversal runs on every input. |
| Auxiliary space | `O(V)` | `disc`, `low`, visited state, and the result collections are each `O(V)`; the recursion stack reaches depth `V` on a path graph. |

There is one honest bound, not a best/average/worst spread: the traversal always visits the whole graph regardless of where the cuts fall, so all three cases coincide at `O(V + E)`.

# Boundaries

**Directed graphs.** The rules assume the DFS tree holds only tree and back edges. Undirectedness guarantees that — every non-tree edge points to an ancestor, and a back edge is a genuine two-way alternate route. On a directed graph DFS also produces cross and forward edges, and a back edge no longer implies a return path, so `low[v]` stops measuring a real escape route and both tests silently report wrong cuts. Directed connectivity is a different decomposition, [[Strongly Connected Components]].

**The root special case.** Applying the non-root rule `low[v] >= disc[u]` to the DFS root marks it as a cut vertex the moment it has any child, because `low[v] >= disc[root]` is vacuously true — nothing sits above the root. Rooting a path `0-1-2` at `0` flags `0` even though deleting it leaves `1-2` connected. The root must instead be tested by child count (two or more). The bridge rule needs no exception: `low[v] > disc[root]` handles the root correctly, since a first child with no back edge genuinely sits below a bridge.

**`>=` versus `>`.** Reusing one threshold for both objects mislabels edges. In two triangles sharing a single vertex `2` (`0-1-2-0` and `2-3-4-2`), the child edge entering the second triangle produces `low[child] == disc[2]`. The non-strict test `>=` correctly flags `2` as a cut vertex — deleting it separates the triangles — while the strict test `>` correctly leaves every edge un-bridged, since each edge lies on a cycle. Swapping the operators would either miss the cut vertex or invent a bridge that does not exist.

**Parallel edges (multigraphs).** The usual guard skips the parent by vertex: `if (v == parent) continue;`. With two edges between `u` and `v` it discards both, so `v`'s subtree appears to have no route up and `(u, v)` is reported as a bridge — although the duplicate edge is itself the route keeping them connected. The escape exists in the graph but not in `low[v]`, because the second edge was never examined. Skipping only the specific parent edge by its id leaves the duplicate as a back edge that lowers `low[v]` and cancels the false bridge.

# Reference drawer

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
> Tree edges point downward; the dashed back edge `2→0` pulls `low` to `0` across the triangle, so `0-1-2` has no internal cut. The tail carries no back edge, so `low[3] > disc[2]` and `low[4] > disc[3]` make `2-3` and `3-4` bridges and `2`, `3` cut vertices.

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
> Adjacency stores an edge id per neighbor so the parent _edge_ — not the parent vertex — is skipped, which is what keeps parallel edges correct.

# Relations

Cut vertices and bridges are the boundary markers of two connectivity decompositions, and both reuse the same low-link DFS.

| Decomposition | Maximal blocks | Boundary object | Same `disc`/`low` DFS |
| --- | --- | --- | --- |
| Biconnected components | subgraphs with no cut vertex (2-vertex-connected) | articulation points — a cut vertex belongs to several blocks at once | yes, with an auxiliary edge stack |
| 2-edge-connected components | subgraphs with no bridge | bridges join adjacent components | yes |
| [[Strongly Connected Components]] | mutually reachable sets in a **directed** graph | — | yes, low-link over directed edges |

One `disc`/`low` DFS finds every cut vertex and bridge in `O(V + E)`, against `O(V·(V+E))` for remove-and-recheck, and the same pass — with an edge stack — emits the biconnected components those cut vertices separate. The directed reachability question is a separate decomposition, [[Strongly Connected Components]], built on the same low-link idea but where a back edge no longer certifies a two-way route, so the cut-vertex reasoning does not carry over. For undirected reliability analysis — which node or link is the single point of failure — this one DFS is the whole answer.

# Questions

> [!QUESTION]- What is the articulation-point rule for a non-root vertex versus the DFS root, and why do they differ?
> A non-root `u` is a cut vertex when it has a tree child `v` with `low[v] >= disc[u]`: nothing in `v`'s subtree reaches above `u`, so `u` is that subtree's only exit. The root has no ancestor, so the same inequality is vacuously true for its first child and would over-report. The root is a cut vertex only when it has two or more tree children, since those subtrees can reach each other only through the root.

> [!QUESTION]- Why is the bridge test strict (`low[v] > disc[u]`) while the articulation test is not (`low[v] >= disc[u]`)?
> `low[v] == disc[u]` means the deepest a back edge from `v`'s subtree reaches is exactly `u`. That back edge bypasses the edge `(u, v)`, so the edge is not a bridge — hence strict `>`. The same back edge still routes all of the subtree's traffic through the vertex `u`, so `u` remains a cut vertex — hence non-strict `>=`. The one operator carries the entire difference between cut edges and cut vertices.

> [!QUESTION]- How do parallel edges break the usual parent check, and what corrects it?
> The common guard `if (v == parent) continue;` skips every edge back to the parent vertex. With two parallel edges between `u` and `v`, it discards the second edge too, so `v`'s subtree appears to have no route up and `(u, v)` is reported as a bridge — although the duplicate edge is itself the route keeping them connected. Skipping only the specific parent edge by id leaves the duplicate as a back edge that lowers `low[v]` and cancels the false bridge.

# References

- [Biconnected component (Wikipedia)](https://en.wikipedia.org/wiki/Biconnected_component) — articulation points, the low-link DFS, and decomposition into biconnected blocks.
- [Bridge (graph theory) (Wikipedia)](https://en.wikipedia.org/wiki/Bridge_\(graph_theory\)) — cut edges, 2-edge-connectivity, and the bridge-finding condition.
- [Finding bridges (cp-algorithms)](https://cp-algorithms.com/graph/bridge-searching.html) — the `disc`/`low` bridge implementation and the parent-edge subtlety on multigraphs.
- [Finding articulation points (cp-algorithms)](https://cp-algorithms.com/graph/cutpoints.html) — the cut-vertex condition and the root special case in the same DFS.
