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

A dependency system stores entities and the connections between them. It asks whether a direct link exists from `u` to `v`, then asks for every neighbor of `u`. Those connections have no inherent order or single root. The stored incidence structure must preserve endpoints, direction, and weight. Its physical layout decides which query is cheap and which needs a scan.

A graph has no single canonical layout. The same vertices and edges can live in per-vertex neighbor lists, a `V × V` matrix of presence or weight, or a flat edge list of `(u, v[, w])` tuples. Each form retains the topology and can encode direction or weight. Their operation costs differ because they index different parts of that information.

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
      "symbol": "m",
      "description": "number of edges"
    },
    "outDegree": {
      "symbol": "outdeg(u)",
      "description": "outgoing degree of vertex u"
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
              "formula": "O(m)",
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
              "formula": "O(n)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Edge list",
              "formula": "O(m)",
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
              "formula": "O(n²) rebuild",
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
              "kind": "curve",
              "role": "Space",
              "formula": "O(n + m)",
              "curveId": "linear"
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
              "formula": "O(n²)",
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
              "formula": "O(m)",
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

Density is the first dividing line. With 10 000 vertices and 50 000 directed edges, an adjacency list holds roughly 60 000 structural entries. An `int[V, V]` matrix allocates 100 million cells, about 400 MB, and most contain the sentinel.

An **edge list** fits algorithms whose natural unit of work is an edge. [[Home/Computer Science/Algorithms/Graph Algorithms/Bellman-Ford|Bellman-Ford]] scans every edge for up to `V − 1` relaxation rounds, then scans once more for a reachable negative cycle. Kruskal sorts the edges before building a [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Minimum Spanning Tree]]. Traversal is the wrong workload because every neighbor lookup becomes a full-list scan.

Dynamic vertex insertion splits the same way. A graph whose vertex set grows during its lifetime is a poor match for the matrix regardless of density.

These are cost mismatches rather than correctness failures. A sparse matrix still works, but it pays for mostly empty cells. An edge list still finds the right neighbors after inspecting many unrelated edges.

# Diagram and C# Implementation

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

The adjacency list is the practical default for sparse graphs. Its space follows the edge count, and a traversal can enumerate a vertex's neighbors in output-sized time. The edge list exposes less local structure but matches algorithms that repeatedly scan or sort the complete edge set.

# References

- [NIST Dictionary of Algorithms and Data Structures: graph](https://xlinux.nist.gov/dads/HTML/graph.html)
