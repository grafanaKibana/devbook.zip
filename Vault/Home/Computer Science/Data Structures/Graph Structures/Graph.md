---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "Vertices and edges modelling relationships that allow cycles, multiple paths, and no single root."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A dependency system holds a set of entities and a set of connections between them, and it repeatedly asks two different questions: does a direct link exist between `u` and `v`, and what are all the neighbors of `u`. The connections carry no inherent order and no single root, so there is nothing to sort or index the way an array allows. What must persist is the *incidence* structure — which vertex connects to which, in which direction, at what weight — and the storage choice decides which of those two questions is cheap and which is linear.

A graph has no single canonical layout. The same set of vertices and edges can be stored as an **adjacency list** (per-vertex neighbor lists), an **adjacency matrix** (a `V × V` table of presence or weight), or an **edge list** (a flat sequence of `(u, v[, w])` tuples). All three retain the full topology, and all three can encode direction and weight; they differ in which questions their layout answers directly and which require a scan.

**Core shape:** vertices + edges → one of {neighbor lists, `V × V` table, flat edge tuples} → each keeps topology, direction, and weight but trades space against edge-test and neighbor-scan cost.

~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"graph"}
```

The inspector below keeps one directed, unweighted edge set and derives all three storage forms from it. Add `3 → 0` first: the topology gains a cycle, while the same mutation appends `0` to row `3`, flips matrix cell `[3,0]` to `1`, and appends `(3,0)` to the edge list.

#### Representation and Invariants

Each representation stores the same edge set in a different physical shape.

**Adjacency list** — an array or dictionary indexed by vertex, where entry `u` holds a collection of `u`'s out-neighbors (`List<int>`, or `List<(int to, int weight)>` when weighted). Total storage is one slot per vertex plus one entry per stored edge. A directed edge `u → v` appears once, in `u`'s list. An undirected edge is stored as two mirrored entries: `v` in `u`'s list and `u` in `v`'s list, so removing it means editing both. A self-loop is `u` appearing inside its own list; parallel edges are simply repeated entries, which the list represents with no extra machinery.

**Adjacency matrix** — a `V × V` grid where cell `[u, v]` holds `1`/`0` for presence, or the weight (with a sentinel such as `int.MaxValue` for "no edge"; zero-weight edges need a separate presence bit or nullable weight). A directed graph writes only `[u, v]`; an undirected graph keeps the matrix symmetric, writing both `[u, v]` and `[v, u]`, so half the off-diagonal cells are redundant. The diagonal `[v, v]` is the self-loop slot. A plain `0/1` or weight matrix cannot express parallel edges — a cell holds one value — so multigraphs need a count or a list per cell, which forfeits the matrix's compactness.

**Edge list** — a flat sequence of tuples `(u, v)` or `(u, v, w)`, with no per-vertex indexing at all. Direction is whatever order the tuple stores; an undirected edge is one tuple read both ways. Self-loops and parallel edges are just more tuples. There is no structure to answer "neighbors of `u`" except a full pass.

These representation invariants define valid stored graphs:

1. Every endpoint is a valid vertex identifier — an index inside `[0, V)` for the array and matrix forms, or a mapped key for a dictionary form.
2. In adjacency lists and matrices, undirected symmetry is a stored property: the mirrored list entries or symmetric matrix cells must be maintained together, or the graph silently becomes directed. An edge list instead treats one `(u, v)` tuple as an unordered endpoint pair and needs no mirrored tuple.
3. The vertex identifier is an internal index. The array and matrix forms assume dense integer IDs `0 … V − 1`; strings, GUIDs, or sparse numeric IDs need a `Dictionary<T, int>` mapping first, which adds memory and makes ID management part of the API boundary — the same constraint the [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] array representation carries.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Graph complexity",
  "variables": {
    "edgeCount": {
      "symbol": "E",
      "description": "number of edges"
    },
    "outDegree": {
      "symbol": "outdeg(u)",
      "description": "outgoing degree of vertex u"
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
          "operation": "has-edge(u, v)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Adjacency list",
              "formula": "O(outdeg(u))",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Adjacency matrix",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Edge list",
              "formula": "O(E)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "iterate-neighbors(u)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Adjacency list",
              "formula": "O(outdeg(u))",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Adjacency matrix",
              "formula": "O(V)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Edge list",
              "formula": "O(E)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "add-edge(u, v)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Adjacency list",
              "formula": "O(1) amortized",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Adjacency matrix",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Edge list",
              "formula": "O(1) amortized",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "add-vertex",
          "bounds": [
            {
              "kind": "curve",
              "role": "Adjacency list",
              "formula": "O(1) amortized",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Adjacency matrix",
              "formula": "O(V²) rebuild",
              "curveId": "quadratic"
            },
            {
              "kind": "curve",
              "role": "Edge list",
              "formula": "O(1)",
              "curveId": "constant"
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
          "operation": "Adjacency list",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(V + E)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Adjacency matrix",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(V²)",
              "curveId": "quadratic"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Edge list",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(E)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When One Representation Stops Fitting

Density is the dividing line. A **sparse** graph is where the matrix fails: 10 000 vertices with 50 000 edges costs the list roughly 60 000 entries but costs an `int[V, V]` matrix 100 million cells (~400 MB), almost all of them the sentinel.

The **edge list** is not a general-purpose store. [[Home/Computer Science/Algorithms/Graph Algorithms/Bellman-Ford|Bellman-Ford]] scans every edge for up to `V − 1` relaxation rounds, then performs an additional full scan to detect a reachable negative cycle; Kruskal sorts edges by weight, then scans them to build a [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Minimum Spanning Tree]]. Used for traversal, an edge list turns each neighbor lookup into a full-list scan.

Dynamic vertex insertion splits the same way. A graph whose vertex set grows during its lifetime is a poor match for the matrix regardless of density.

None of these are crashes. A matrix on a sparse graph runs correctly; it simply pays memory the workload never uses, and an edge list backing a traversal returns correct neighbors after scanning far more than it needed.

# Reference Drawer

> [!ABSTRACT]- Same graph, three stored forms
>
> ```mermaid
> flowchart LR
>   A((0)) --> B((1))
>   A --> C((2))
>   B --> D((3))
>   C --> D
> ```
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
> An undirected edge is two stored entries, so removal must touch both lists.

# Comparison

| Representation | Stronger workload |
| --- | --- |
| Adjacency list | Sparse graphs and traversal |
| Adjacency matrix | Dense graphs and frequent single-edge tests |
| Edge list | Algorithms that scan or sort the full edge set |

The adjacency list is the general default: real graphs are usually sparse, its space tracks the actual edge count, and it enumerates neighbors — the operation traversal repeats — in output-sized time. The edge list retains the least accessible structure and fits exactly the algorithms that process the full edge set by repeated scans or sorting.

# Questions

> [!QUESTION]- How is an undirected edge encoded in each representation, and why does that matter for mutation?
> The adjacency list stores it twice, as mirrored entries in both endpoints' lists; the matrix stores it as two symmetric cells `[u, v]` and `[v, u]`; the edge list stores one tuple read in both directions. For the list and matrix, symmetry is a maintained invariant — removing or updating the edge must touch both stored copies, or the graph silently becomes directed.

# References

- [NIST Dictionary of Algorithms and Data Structures: graph](https://xlinux.nist.gov/dads/HTML/graph.html) — authoritative definition of graph vertices, edges, adjacency, and the adjacency-list and adjacency-matrix implementations.
- [Graph (abstract data type)](https://en.wikipedia.org/wiki/Graph_(abstract_data_type)) — adjacency-list and adjacency-matrix representations with their operation costs side by side.
- [Introduction to Algorithms, 4th ed., Ch. 20 §20.1 — Representations of graphs](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) — source for the structure and its analysis.
