---
publish: true
created: 2026-07-12T06:32:49.060Z
modified: 2026-07-12T06:37:01.483Z
published: 2026-07-12T06:37:01.483Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Vertices and edges modelling relationships that allow cycles, multiple paths, and no single root.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

A dependency system holds a set of entities and a set of connections between them, and it repeatedly asks two different questions: does a direct link exist between `u` and `v`, and what are all the neighbors of `u`. The connections carry no inherent order and no single root, so there is nothing to sort or index the way an array allows. What must persist is the _incidence_ structure — which vertex connects to which, in which direction, at what weight — and the storage choice decides which of those two questions is cheap and which is linear.

A graph has no single canonical layout. The same set of vertices and edges can be stored as an **adjacency list** (per-vertex neighbor lists), an **adjacency matrix** (a `V × V` table of presence or weight), or an **edge list** (a flat sequence of `(u, v[, w])` tuples). All three retain the full topology, and all three can encode direction and weight; they differ in what they make constant-time versus what they force a scan. The list answers "who are `u`'s neighbors" directly but tests a specific edge in `O(deg u)`; the matrix answers "is `u–v` present" in `O(1)` but spends `O(V²)` even when almost no edges exist; the edge list stores nothing but the edges and is fast only when every edge is streamed at once.

**Core shape:** vertices + edges → one of {neighbor lists, `V × V` table, flat edge tuples} → each keeps topology, direction, and weight but trades space against edge-test and neighbor-scan cost.

> [!NOTE] Visualization pending
> Planned StepTrace: a graph-representation card showing one small graph rendered three ways — adjacency list, adjacency matrix, and edge list — with a single edge added to each so the differing storage cost of the same mutation is visible side by side. No matching renderer exists in `engine.js` yet.

## Representation and invariants

Each representation stores the same edge set in a different physical shape.

**Adjacency list** — an array or dictionary indexed by vertex, where entry `u` holds a collection of `u`'s out-neighbors (`List<int>`, or `List<(int to, int weight)>` when weighted). Total storage is one slot per vertex plus one entry per stored edge. A directed edge `u → v` appears once, in `u`'s list. An undirected edge is stored as two mirrored entries: `v` in `u`'s list and `u` in `v`'s list, so removing it means editing both. A self-loop is `u` appearing inside its own list; parallel edges are simply repeated entries, which the list represents with no extra machinery.

**Adjacency matrix** — a `V × V` grid where cell `[u, v]` holds `1`/`0` for presence, or the weight (with a sentinel such as `0` or `int.MaxValue` for "no edge"). A directed graph writes only `[u, v]`; an undirected graph keeps the matrix symmetric, writing both `[u, v]` and `[v, u]`, so exactly half the grid is redundant. The diagonal `[v, v]` is the self-loop slot. A plain `0/1` or weight matrix cannot express parallel edges — a cell holds one value — so multigraphs need a count or a list per cell, which forfeits the matrix's compactness.

**Edge list** — a flat sequence of tuples `(u, v)` or `(u, v, w)`, with no per-vertex indexing at all. Direction is whatever order the tuple stores; an undirected edge is one tuple read both ways. Self-loops and parallel edges are just more tuples. There is no structure to answer "neighbors of `u`" except a full pass.

Three invariants hold across all three:

1. Every endpoint is a valid vertex identifier — an index inside `[0, V)` for the array and matrix forms, or a mapped key for a dictionary form.
2. Undirected symmetry is a stored property, not a derived one: the mirrored list entries or the symmetric matrix cells must be maintained together, or the graph silently becomes directed.
3. The vertex identifier is an internal index. The array and matrix forms assume dense integer IDs `0 … V − 1`; strings, GUIDs, or sparse numeric IDs need a `Dictionary<T, int>` mapping first, which adds memory and makes ID management part of the API boundary — the same constraint the [[Disjoint Set]] array representation carries.

## Complexity

The bounds are per operation and per representation; `deg u` is the number of edges incident to `u`.

| Operation | Adjacency list | Adjacency matrix | Edge list | Cause |
| --- | --- | --- | --- | --- |
| Space | `O(V + E)` | `O(V²)` | `O(E)` | List stores one entry per edge; matrix stores every possible cell; edge list stores only edges |
| `has-edge(u, v)` | `O(deg u)` | `O(1)` | `O(E)` | List scans `u`'s neighbors; matrix indexes one cell; edge list has no index |
| `iterate-neighbors(u)` | `O(deg u)` | `O(V)` | `O(E)` | List holds exactly the neighbors; matrix scans a full row of `V` cells; edge list scans all tuples |
| `add-edge(u, v)` | `O(1)` | `O(1)` | `O(1)` | Append to a list / set one cell / append one tuple |
| `add-vertex` | `O(1)` amortized | `O(V²)` rebuild | `O(1)` | List/edge list grow by one slot; the matrix must reallocate to `(V+1)²` and copy |

The matrix's `O(1)` edge test and the list's `O(deg u)` neighbor scan are the two bounds that drive the choice. `add-edge` is constant everywhere, so mutation cost separates the representations only at the vertex level, where the matrix's fixed `V × V` footprint forces an `O(V²)` copy. The `O(1)` amortized bound on list `add-vertex` assumes a growable backing array (`List<T>` doubling); a preallocated fixed-size list is `O(1)` worst case but caps `V`.

## When one representation stops fitting

Density is the dividing line. A **dense** graph where `E ≈ V²` loses nothing to the matrix — the `O(V²)` space is already the edge count, and every algorithm gets `O(1)` edge tests and a compact per-row bitset. A **sparse** graph is where the matrix fails: 10 000 vertices with 50 000 edges costs the list roughly 60 000 entries but costs an `int[V, V]` matrix 100 million cells (~400 MB), almost all of them the sentinel. The matrix charges `O(V²)` whether or not the edges exist.

The **edge list** is not a general-purpose store. `has-edge` and `iterate-neighbors` are both `O(E)`, so it is only competitive for algorithms that consume every edge in one sweep and never query a single edge — relaxing all edges in [[Bellman-Ford]], or sorting edges by weight in Kruskal's [[Minimum Spanning Tree]]. Used for traversal, it turns each neighbor lookup into a full-list scan.

Dynamic vertex insertion splits the same way. Adding a vertex to an adjacency list appends one slot in amortized `O(1)`; adding one to a matrix reallocates the entire `(V+1) × (V+1)` grid and copies the old cells, an `O(V²)` rebuild. A graph whose vertex set grows during its lifetime is a poor match for the matrix regardless of density.

None of these are crashes. A matrix on a sparse graph runs correctly; it simply pays memory the workload never uses, and an edge list backing a traversal returns correct neighbors after scanning far more than it needed.

## Reference drawer

> [!ABSTRACT]- Same graph, three stored forms
>
> ```mermaid
> flowchart LR
>   A((0)) --> B((1))
>   A --> C((2))
>   B --> D((3))
>   C --> D
> ```
>
> List: `0→[1,2]`, `1→[3]`, `2→[3]`, `3→[]`. Matrix rows `0…3`: `0110 / 0001 / 0001 / 0000`. Edge list: `(0,1) (0,2) (1,3) (2,3)`.

> [!EXAMPLE]- C# adjacency-list graph
>
> ```csharp
> public sealed class Graph
> {
>     private readonly List<List<int>> _adjacency = new();
>
>     public int AddVertex()
>     {
>         _adjacency.Add(new List<int>());
>         return _adjacency.Count - 1;
>     }
>
>     public void AddEdge(int from, int to, bool undirected = false)
>     {
>         _adjacency[from].Add(to);
>         if (undirected)
>         {
>             _adjacency[to].Add(from);
>         }
>     }
>
>     public bool HasEdge(int from, int to) =>
>         _adjacency[from].Contains(to);
>
>     public IReadOnlyList<int> Neighbors(int vertex) =>
>         _adjacency[vertex];
> }
> ```
>
> `HasEdge` is `O(deg from)` because the neighbor list is unordered; swapping the inner `List<int>` for a `HashSet<int>` makes it `O(1)` at the cost of ordered iteration and higher per-edge memory. An undirected edge is two stored entries, so removal must touch both lists.

## Comparison

| Representation | Space | `has-edge(u,v)` | Iterate neighbors of `u` | Add vertex | Stronger workload |
| --- | --- | --- | --- | --- | --- |
| Adjacency list | `O(V + E)` | `O(deg u)` | `O(deg u)` | `O(1)` amortized | Sparse graphs and traversal ([[DFS BFS]], [[Dijkstra]]) |
| Adjacency matrix | `O(V²)` | `O(1)` | `O(V)` | `O(V²)` rebuild | Dense graphs and frequent single-edge tests |
| Edge list | `O(E)` | `O(E)` | `O(E)` | `O(1)` | Algorithms that stream every edge once ([[Bellman-Ford]], Kruskal's [[Minimum Spanning Tree]]) |

The adjacency list is the general default: real graphs are usually sparse, its space tracks the actual edge count, and it enumerates neighbors — the operation traversal repeats — in output-sized time. The matrix pays `O(V²)` space unconditionally, which is only free on dense graphs, and buys `O(1)` edge tests plus tight per-row bitsets in return; it becomes the stronger choice when the graph is near-complete or the workload is dominated by "is `u–v` connected" rather than "walk `u`'s neighbors". The edge list retains the least accessible structure and fits exactly the algorithms that never ask about one edge in isolation but sweep all of them.

## Questions

> [!QUESTION]- Why does the adjacency list make neighbor iteration cheap but the adjacency matrix make edge existence cheap?
> The list physically stores only `u`'s actual neighbors, so enumerating them is `O(deg u)` with nothing wasted, but confirming a specific edge means scanning that list. The matrix reserves a fixed cell for every ordered pair, so `[u, v]` is a single `O(1)` index, but reading all of `u`'s neighbors means scanning a full row of `V` cells, most of them empty on a sparse graph.

> [!QUESTION]- What makes the adjacency matrix a bad fit for a sparse graph?
> Its space is `O(V²)` regardless of how many edges exist. A graph with 10 000 vertices and 50 000 edges stores ~60 000 list entries but 100 million matrix cells, nearly all sentinel values. The matrix charges for every possible edge, so it only breaks even when `E` approaches `V²`.

> [!QUESTION]- How is an undirected edge encoded in each representation, and why does that matter for mutation?
> The adjacency list stores it twice, as mirrored entries in both endpoints' lists; the matrix stores it as two symmetric cells `[u, v]` and `[v, u]`; the edge list stores one tuple read in both directions. For the list and matrix, symmetry is a maintained invariant — removing or updating the edge must touch both stored copies, or the graph silently becomes directed.

> [!QUESTION]- When is an edge list the right storage despite its `O(E)` edge test?
> When the algorithm consumes every edge in a single pass and never queries an individual edge — relaxing all edges in Bellman-Ford, or sorting edges by weight for Kruskal's MST. Both want a flat, iterable edge set; neither benefits from per-vertex indexing, so the edge list's weakness never triggers.

## References

- [Graph (abstract data type)](https://en.wikipedia.org/wiki/Graph_\(abstract_data_type\)) — the adjacency-list, adjacency-matrix, and edge-list representations with their operation costs side by side.
- [Graph representation](https://cp-algorithms.com/graph/graph-representation.html) — practical comparison of the storage forms and when sparse versus dense density favors each.
- [Introduction to Algorithms, Ch. 22 — Elementary Graph Algorithms](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) — CLRS's formal treatment of adjacency-list versus adjacency-matrix storage and their `O(V + E)` / `O(V²)` bounds.
