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

A minimum spanning tree (MST) of a connected, undirected, weighted graph is a subset of edges that connects **all** vertices with **no cycles** and the **minimum possible total weight**. Intuitively: the cheapest way to wire up every node. With V vertices an MST has exactly V−1 edges. It answers real network-design questions — lay cable/road/pipe to connect all sites at least cost — and appears in clustering, approximation algorithms (e.g. TSP bounds), and image segmentation. Two classic greedy algorithms build it: **Kruskal's** and **Prim's**.

## How It Works

Both are [[Greedy Algorithms|greedy]] and both are provably optimal via the **cut property** (the lightest edge crossing any partition of the vertices is safe to include in some MST).

- **Kruskal's** — sort all edges by weight; add each edge if it connects two **different** components (i.e. doesn't form a cycle), using a [[Union-Find]] to test connectivity in near-O(1). Builds the tree as a "forest" that merges. **O(E log E)**, dominated by the sort. Great for **sparse** graphs.
- **Prim's** — grow a single tree from an arbitrary start vertex; repeatedly add the cheapest edge crossing from the tree to a vertex outside it, using a [[Heap|priority queue]]. **O(E log V)**. Better for **dense** graphs.


## Visualization

The card runs Prim's from A: the green tree grows one cheapest crossing edge at a time until all six vertices are connected. Watch for the explicit "skip — would make a cycle" step whenever the cheapest candidate edge would join two vertices already inside the tree — that rejection is the cut property's cycle-free invariant in action.

```steptrace
{"algorithm":"prim","start":"A","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"}],"edges":[{"from":"A","to":"B","weight":4},{"from":"A","to":"C","weight":2},{"from":"B","to":"C","weight":1},{"from":"B","to":"D","weight":5},{"from":"C","to":"D","weight":8},{"from":"C","to":"E","weight":10},{"from":"D","to":"E","weight":2},{"from":"D","to":"F","weight":6},{"from":"E","to":"F","weight":3}]}
```

## Example

Kruskal's (edges sorted, Union-Find for cycle detection):

```csharp
public static List<(int u, int v, int w)> Kruskal(int n, List<(int u, int v, int w)> edges)
{
    edges.Sort((a, b) => a.w.CompareTo(b.w));
    var dsu = new DisjointSet(n);                 // see Union-Find note
    var mst = new List<(int, int, int)>();
    foreach (var (u, v, w) in edges)
    {
        if (dsu.Union(u, v))                       // false if u,v already connected (would cycle)
            mst.Add((u, v, w));
        if (mst.Count == n - 1) break;             // tree complete
    }
    return mst;
}
```

Prim's (grow from node 0 with a min-priority queue):

```csharp
public static int PrimWeight(int n, List<(int to, int w)>[] adj)
{
    var inTree = new bool[n];
    var pq = new PriorityQueue<int, int>();        // node, key=cheapest edge into tree
    pq.Enqueue(0, 0);
    int total = 0;
    while (pq.TryDequeue(out int u, out int w))
    {
        if (inTree[u]) continue;                    // stale entry — skip
        inTree[u] = true; total += w;
        foreach (var (v, weight) in adj[u])
            if (!inTree[v]) pq.Enqueue(v, weight);
    }
    return total;
}
```

## Pitfalls

- **Graph must be connected** — an MST spans *all* vertices, so a disconnected graph has none. Kruskal's on a disconnected graph yields a minimum spanning *forest* (one tree per component) and will add fewer than V−1 edges; check for that rather than assuming success.
- **Directed graphs don't have MSTs** — MST is defined for undirected graphs. The directed analogue (minimum arborescence) needs a different algorithm (Chu–Liu/Edmonds).
- **Stale priority-queue entries in Prim's** — .NET's `PriorityQueue` has no decrease-key, so you push duplicates and **skip already-in-tree nodes on dequeue** (the `if (inTree[u]) continue;` line). Forgetting that check double-counts edges. (Same lazy-deletion pattern as [[Dijkstra]].)
- **MST is not unique with equal weights** — multiple MSTs can exist when edge weights tie; both algorithms return *a* minimum-weight tree, not a canonical one. (The total weight is unique, though.)

## Tradeoffs

| Algorithm | Complexity | Best for | Key structure |
|---|---|---|---|
| **Kruskal's** | O(E log E) | Sparse graphs; edge list given | [[Union-Find]] |
| **Prim's** | O(E log V) with a binary heap | Dense graphs; adjacency given | [[Heap\|Priority queue]] |

**Decision rule**: if the graph is given as an edge list and is sparse, **Kruskal's** is simplest and fast. If it's dense or given as an adjacency structure, **Prim's** with a heap edges ahead. Both produce the same total weight; the choice is about graph shape and which structure you already have.

## Questions

> [!QUESTION]- Why are Kruskal's and Prim's both guaranteed to find an optimal MST?
> Both rely on the **cut property**: for any partition (cut) of the vertices, the minimum-weight edge crossing the cut belongs to some MST. Kruskal's adds the globally lightest edge that joins two components (a valid cut); Prim's adds the lightest edge leaving the current tree (the cut between tree and non-tree). Each step is provably "safe," so the greedy result is optimal.

> [!QUESTION]- When would you choose Kruskal's over Prim's?
> Kruskal's shines on **sparse** graphs and when the input is already an edge list — its cost is the edge sort plus near-constant Union-Find operations. Prim's, using a priority queue over adjacency lists, is better on **dense** graphs where E approaches V². Both are O(E log V)-ish, so the deciding factor is graph density and representation.

> [!QUESTION]- What does Kruskal's produce on a disconnected graph?
> A minimum spanning **forest** — one MST per connected component — because no edges bridge the components. It will add fewer than V−1 edges total; detecting that shortfall is how you discover the graph isn't connected.

## References

- [Minimum spanning tree (Wikipedia)](https://en.wikipedia.org/wiki/Minimum_spanning_tree) — cut property, uniqueness, and applications.
- [Kruskal's & Prim's (cp-algorithms)](https://cp-algorithms.com/graph/mst_kruskal.html) — both algorithms with proofs and complexity.
- [Minimum spanning trees (Princeton Algorithms)](https://algs4.cs.princeton.edu/43mst/) — Sedgewick's thorough treatment with visualisations.
