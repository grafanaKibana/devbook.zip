---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "Answers connectivity queries over a disjoint set via find and union, in near-constant O(α(n)) amortized time."
level:
  - "3"
priority: Medium
status: Ready to Repeat
publish: true
---

A program receives a stream of merge and connectivity requests: `union(a, b)` joins two groups, `find(x)` reports which group `x` belongs to, and two elements are connected when their finds agree. The cost that dominates is the walk `find` performs up a parent chain toward its set's root. Left unmanaged, that chain grows to length `n` and every query degrades to `O(n)`.

Two heuristics keep the forest shallow so the walk stays short. Union by rank controls how two trees combine; path compression rewrites the chain each `find` traverses. Together they drop the amortized cost of a query to `O(α(n))`, where α is the inverse Ackermann function and stays below 5 for any `n` that fits in memory. The [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] note covers the parent-array forest these operations run over; this page is about the heuristics and their analysis.

**Core condition:** merges only accumulate → each `find` walks toward a root → the two heuristics keep that walk near-constant amortized → `O(α(n))` per operation with `O(n)` storage.

# Interactive Forest

The view starts with seven singleton nodes. For a visible compression, run `Union(0, 1)`, `Union(2, 3)`, and `Union(0, 2)`, select `A = 3`, then run `Find A`; `parent[3]` changes from `2` to `0`. The forest shows the parent pointers that `find` walks; the indexed row below shows the same state as the `parent[]` array used by the implementation.

```steptrace
{"algorithm":"union-find","n":7}
```

A `union` resolves both arguments to their roots and links one root beneath the other; an interior node is never linked directly, since that would strand the rest of its set. A `find` walks parent pointers until it reaches a self-parented root, then path-compresses the walked nodes so each points straight at that root. The first deep `find` on a chain is what pays for every shallow `find` after it.

# Why the Walk Stays Short

Each heuristic attacks tree height from a different direction.

**Union by rank (or size)** attaches the shorter tree under the taller one. Rank is an upper bound on height, and a root's rank rises only when two trees of _equal_ rank merge, so a tree of rank `r` contains at least `2^r` nodes. With `n` nodes no rank exceeds `log₂ n`, which caps every parent walk at `O(log n)` even before any compression. Union by size argues the same bound from node counts and additionally exposes `O(1)` component sizes.

**Path compression** repoints every node a `find` visits directly at the root. A chain that cost one deep walk collapses to depth 1, so those nodes never pay for that depth again. Starting from arbitrary unions, compression alone also reaches `O(log n)` amortized per operation.

Neither heuristic alone reaches near-constant time: rank bounds how tall a tree can grow, while compression guarantees each tall path is walked only a few times before it flattens. Combined, the total over `m` operations is `O(m α(n))`. The bound is amortized — a single `find` can still traverse `O(log n)` parents, and it is the compression it performs that makes later finds cheap.

# Complexity

| Operation                | Best time | Amortized time | Worst single operation | Space                              |
| ------------------------ | --------- | -------------- | ---------------------- | ---------------------------------- |
| Construct `n` singletons | `Θ(n)`    | `Θ(n)`         | `Θ(n)`                 | `Θ(n)` structure                   |
| `find(x)`                | `O(1)`    | `O(α(n))`      | `O(log n)`             | `O(1)` iterative, `O(log n)` recursive stack |
| `union(a, b)`            | `O(1)`    | `O(α(n))`      | `O(log n)`             | `O(1)` iterative, `O(log n)` recursive stack |
| `connected(a, b)`        | `O(1)`    | `O(α(n))`      | `O(log n)`             | `O(1)` iterative, `O(log n)` recursive stack |

The amortized column assumes both heuristics. Union by rank _alone_ keeps tree height at `O(log n)`, so every operation is `O(log n)` in both the amortized and single-operation sense. With _neither_ heuristic a chain can grow to length `n`, turning `find`, `union`, and `connected` into `O(n)` operations. `α(n)` is a guarantee over a sequence, not a promise about any one call: the single-operation worst case stays `O(log n)` because a cold `find` may still walk a full bounded-height path before compressing it.

# Where the Bound and the Interface Stop

Standard rollback DSU keeps union by rank or size but omits path compression, so each successful union logs at most one parent change and one rank or size change. For offline dynamic connectivity, map each edge to the time interval in which it is active, add that interval to a segment tree over time, then traverse the tree: apply the node's edges on entry and roll them back on exit. Reverse-time processing alone is sufficient only for deletion-only workloads ([rollback DSU](https://cp-algorithms.com/data_structures/deleting_in_log_n.html)).

The interface only grows sets. There is no split, and no removal of an element from a set — the parent forest records membership, not the edges that produced it, so a merged component cannot be separated back into its pre-merge pieces. That limit belongs to the [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] page as its own boundary; the algorithmic consequence here is that any workload with removals needs either a rollback variant run offline or a fully dynamic connectivity structure.

# Reference Drawer

> [!ABSTRACT]- Operation flow
>
> ```mermaid
> flowchart TD
>   subgraph find[find x]
>     A[x] --> B{parent is self}
>     B -->|Yes| C[return root]
>     B -->|No| D[recurse to root] --> E[repoint x at root] --> C
>   end
>   subgraph union[union a b]
>     F[ra = find a] --> G[rb = find b] --> H{ra == rb}
>     H -->|Yes| I[already merged]
>     H -->|No| J[attach lower-rank root under higher] --> K[bump rank on tie]
>   end
> ```

> [!EXAMPLE]- Kruskal's cycle test
>
> ```csharp
> // Builds a Minimum Spanning Tree by adding the cheapest edge that
> // does not close a cycle; Union returns false when both ends already share a root.
> public static List<(int u, int v, int w)> KruskalMst(
>     int n, List<(int u, int v, int w)> edges)
> {
>     edges.Sort((a, b) => a.w.CompareTo(b.w));
>     var dsu = new DisjointSet(n);
>     var mst = new List<(int, int, int)>();
>
>     foreach (var (u, v, w) in edges)
>     {
>         if (dsu.Union(u, v))       // merge succeeds only across components
>             mst.Add((u, v, w));
>         if (mst.Count == n - 1)    // a spanning tree has n - 1 edges
>             break;
>     }
>
>     if (mst.Count != n - 1)
>         throw new InvalidOperationException("Graph is disconnected.");
>
>     return mst;
> }
> ```
>
> `DisjointSet` is the rank + path-compression forest defined on the [[Home/Computer Science/Data Structures/Graph Structures/Disjoint Set|Disjoint Set]] page; only its `Union` return value drives the cycle test.

# Comparison

| Strategy                           | `find`              | `union`             | Worst per op | Structural property                                   |
| ---------------------------------- | ------------------- | ------------------- | ------------ | ----------------------------------------------------- |
| Quick-find (label array)           | `O(1)`              | `O(n)`              | `O(n)`       | flat labels; a union rewrites every member of one set |
| Quick-union (forest, no heuristic) | `O(n)`              | `O(n)`              | `O(n)`       | a chain can grow to length `n`                        |
| Union by rank alone                | `O(log n)`          | `O(log n)`          | `O(log n)`   | bounded height; rollback-friendly with a change log   |
| Rank + path compression            | `O(α(n))` amortized | `O(α(n))` amortized | `O(log n)`   | flattened forest; rollback logs many parent rewrites  |

Rank plus path compression is the standard near-constant-time structure for incremental connectivity. Standard rollback DSU instead keeps rank or size but drops compression so each union writes only a constant amount of state to its log; compression can be logged too, but its many parent rewrites lose the usual rollback cost. Quick-find stays attractive only when unions are rare relative to queries, since each merge is linear.

The same forest answers several graph questions: the [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Minimum Spanning Tree]] cycle test in Kruskal's algorithm, incremental connected-component queries, and cycle detection while streaming edges — in each, `union` merges endpoints and `find` reports whether an edge would close a loop.

# Questions

> [!QUESTION]- Why does union by rank alone bound tree height at `O(log n)`?
> A root's rank increases only when two trees of equal rank merge, so a tree of rank `r` holds at least `2^r` nodes. With `n` nodes, no rank — and therefore no height — can exceed `log₂ n`. Attaching the lower-rank root under the higher one never lengthens the taller tree's longest path.

> [!QUESTION]- Why is the `O(α(n))` cost amortized rather than a single-operation guarantee?
> A single `find` can still traverse an `O(log n)` parent chain. What path compression buys is that the writes it performs during that walk flatten the path, so later finds on those nodes are cheap. The near-constant figure is the total work over a sequence of `m` operations divided across them, not a bound on any one call.

> [!QUESTION]- Why does standard rollback DSU omit path compression?
> Compression can be reversed only if every rewritten parent is logged. That turns one find into many logged mutations, so the standard rollback variant omits compression and logs the constant number of parent and rank changes made by a union.

> [!QUESTION]- How does the variant chosen change the cost of `union` and `find`?
> Quick-find gives `O(1)` finds but `O(n)` unions; plain quick-union is `O(n)` for both in the worst case; union by rank alone makes both `O(log n)`; rank plus path compression drops both to `O(α(n))` amortized while leaving the single-operation worst case at `O(log n)`.

# References

- [Efficiency of a Good But Not Linear Set Union Algorithm](https://dl.acm.org/doi/10.1145/321879.321884) — Tarjan's original amortized analysis proving the inverse-Ackermann bound for path compression with weighted union.
- [Union-Find](https://algs4.cs.princeton.edu/15uf/) — Princeton Algorithms, tracing the progression from quick-find and quick-union to weighted union and path compression with cost measurements for each.
- [Disjoint Set Union](https://cp-algorithms.com/data_structures/disjoint_set_union.html) — the two heuristics, their combined complexity, and graph applications including Kruskal's MST.
- [Deleting from a data structure in `O(T(n) log n)`](https://cp-algorithms.com/data_structures/deleting_in_log_n.html) — rollback DSU with segment-tree-over-time intervals for offline deletions.
