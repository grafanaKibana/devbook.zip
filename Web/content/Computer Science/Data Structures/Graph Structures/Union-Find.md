---
publish: true
created: 2026-07-18T14:02:44.037Z
modified: 2026-07-18T14:02:44.037Z
published: 2026-07-18T14:02:44.037Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: Answers connectivity queries over a disjoint set via find and union, in near-constant O(α(n)) amortized time.
level:
  - "3"
priority: Medium
status: Ready to Repeat
---

A program receives a stream of merge and connectivity requests: `union(a, b)` joins two groups, `find(x)` reports which group `x` belongs to, and two elements are connected when their finds agree. The cost that dominates is the walk `find` performs up a parent chain toward its set's root. Left unmanaged, that chain grows to length `n` and every query degrades to `O(n)`.

Two heuristics keep the forest shallow so the walk stays short. Union by rank controls how two trees combine; path compression rewrites the chain each `find` traverses. Together they drop the amortized cost of a query to `O(α(n))`, where α is the inverse Ackermann function and stays below 5 for any `n` that fits in memory. The [[Disjoint Set]] note covers the parent-array forest these operations run over; this page is about the heuristics and their analysis.

**Core condition:** merges only accumulate → each `find` walks toward a root → the two heuristics keep that walk near-constant amortized → `O(α(n))` per operation with `O(n)` storage.

# The two operations

A trace over seven singleton nodes exercises both operations and the flattening they depend on.

```steptrace
{"algorithm":"union-find","n":7}
```

A `union` resolves both arguments to their roots and links one root beneath the other; an interior node is never linked directly, since that would strand the rest of its set. A `find` walks parent pointers until it reaches a self-parented root, then path-compresses the walked nodes so each points straight at that root. The first deep `find` on a chain is what pays for every shallow `find` after it.

# Why the walk stays short

Each heuristic attacks tree height from a different direction.

**Union by rank (or size)** attaches the shorter tree under the taller one. Rank is an upper bound on height, and a root's rank rises only when two trees of _equal_ rank merge, so a tree of rank `r` contains at least `2^r` nodes. With `n` nodes no rank exceeds `log₂ n`, which caps every parent walk at `O(log n)` even before any compression. Union by size argues the same bound from node counts and additionally exposes `O(1)` component sizes.

**Path compression** repoints every node a `find` visits directly at the root. A chain that cost one deep walk collapses to depth 1, so those nodes never pay for that depth again. Starting from arbitrary unions, compression alone also reaches `O(log n)` amortized per operation.

Neither heuristic alone reaches near-constant time: rank bounds how tall a tree can grow, while compression guarantees each tall path is walked only a few times before it flattens. Combined, the total over `m` operations is `O(m α(n))`. The bound is amortized — a single `find` can still traverse `O(log n)` parents, and it is the compression it performs that makes later finds cheap.

# Complexity

| Operation | Best time | Amortized time | Worst single operation | Space |
| --- | --- | --- | --- | --- |
| Construct `n` singletons | `Θ(n)` | `Θ(n)` | `Θ(n)` | `Θ(n)` structure |
| `find(x)` | `O(1)` | `O(α(n))` | `O(log n)` | `O(1)`, `O(log n)` recursive stack |
| `union(a, b)` | `O(1)` | `O(α(n))` | `O(log n)` | `O(1)` |
| `connected(a, b)` | `O(1)` | `O(α(n))` | `O(log n)` | `O(1)` |

The amortized column assumes both heuristics. Union by rank _alone_ keeps tree height at `O(log n)`, so every operation is `O(log n)` in both the amortized and single-operation sense. With _neither_ heuristic a chain can grow to length `n`, turning `find`, `union`, and `connected` into `O(n)` operations. `α(n)` is a guarantee over a sequence, not a promise about any one call: the single-operation worst case stays `O(log n)` because a cold `find` may still walk a full bounded-height path before compressing it.

# Where the bound and the interface stop

Path compression trades reversibility for speed. Once a `find` rewrites the parents it walked, the pre-compression shape is gone, so a merge cannot be undone. Rollback DSU keeps union by rank and _drops_ compression precisely to preserve that history: each `union` records the single parent-and-rank change it made and can pop it. That is how an offline problem with edge deletions is solved — process the sequence in reverse so every deletion becomes an addition, undoing merges as it unwinds ([rollback DSU](https://cp-algorithms.com/data_structures/deleting_in_log_n.html)).

The interface only grows sets. There is no split, and no removal of an element from a set — the parent forest records membership, not the edges that produced it, so a merged component cannot be separated back into its pre-merge pieces. That limit belongs to the [[Disjoint Set]] page as its own boundary; the algorithmic consequence here is that any workload with removals needs either a rollback variant run offline or a fully dynamic connectivity structure.

# Reference drawer

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
>     return mst;
> }
> ```
>
> `DisjointSet` is the rank + path-compression forest defined on the [[Disjoint Set]] page; only its `Union` return value drives the cycle test.

# Comparison

| Strategy | `find` | `union` | Worst per op | Structural property |
| --- | --- | --- | --- | --- |
| Quick-find (label array) | `O(1)` | `O(n)` | `O(n)` | flat labels; a union rewrites every member of one set |
| Quick-union (forest, no heuristic) | `O(n)` | `O(n)` | `O(n)` | a chain can grow to length `n` |
| Union by rank alone | `O(log n)` | `O(log n)` | `O(log n)` | bounded height, fully reversible |
| Rank + path compression | `O(α(n))` amortized | `O(α(n))` amortized | `O(log n)` | flattened forest, no longer reversible |

Rank plus path compression is the standard near-constant-time structure for incremental connectivity, and it pays for that speed by discarding tree shape, which rules out undo. Quick-find stays attractive only when unions are rare relative to queries, since each merge is linear. Dropping compression while keeping rank is the one variant that stays reversible at `O(log n)` per operation — the specific trade that makes rollback DSU viable for offline deletion.

The same forest answers several graph questions: the [[Minimum Spanning Tree]] cycle test in Kruskal's algorithm, incremental connected-component queries, and cycle detection while streaming edges — in each, `union` merges endpoints and `find` reports whether an edge would close a loop.

# Questions

> [!QUESTION]- Why does union by rank alone bound tree height at `O(log n)`?
> A root's rank increases only when two trees of equal rank merge, so a tree of rank `r` holds at least `2^r` nodes. With `n` nodes, no rank — and therefore no height — can exceed `log₂ n`. Attaching the lower-rank root under the higher one never lengthens the taller tree's longest path.

> [!QUESTION]- Why is the `O(α(n))` cost amortized rather than a single-operation guarantee?
> A single `find` can still traverse an `O(log n)` parent chain. What path compression buys is that the writes it performs during that walk flatten the path, so later finds on those nodes are cheap. The near-constant figure is the total work over a sequence of `m` operations divided across them, not a bound on any one call.

> [!QUESTION]- Why does path compression make a structure unsuitable for rollback?
> Compression rewrites the parent of every node on a walked path, erasing the forest's earlier shape. There is no record of what a node pointed to before, so a merge cannot be reversed. Rollback DSU keeps union by rank but omits compression so each `union` mutates exactly one parent-and-rank pair, which it can then undo.

> [!QUESTION]- How does the variant chosen change the cost of `union` and `find`?
> Quick-find gives `O(1)` finds but `O(n)` unions; plain quick-union is `O(n)` for both in the worst case; union by rank alone makes both `O(log n)`; rank plus path compression drops both to `O(α(n))` amortized while leaving the single-operation worst case at `O(log n)`.

# References

- [Efficiency of a Good But Not Linear Set Union Algorithm](https://dl.acm.org/doi/10.1145/321879.321884) — Tarjan's original amortized analysis proving the inverse-Ackermann bound for path compression with weighted union.
- [Union-Find](https://algs4.cs.princeton.edu/15uf/) — Princeton Algorithms, tracing the progression from quick-find and quick-union to weighted union and path compression with cost measurements for each.
- [Disjoint Set Union](https://cp-algorithms.com/data_structures/disjoint_set_union.html) — the two heuristics, their combined complexity, and graph applications including Kruskal's MST.
- [Deleting from a data structure in `O(T(n) log n)`](https://cp-algorithms.com/data_structures/deleting_in_log_n.html) — rollback DSU and the offline reverse-time technique for handling deletions.
