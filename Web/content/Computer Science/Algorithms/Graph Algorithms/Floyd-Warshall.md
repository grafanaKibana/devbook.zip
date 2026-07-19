---
publish: true
created: 2026-07-18T14:02:43.945Z
modified: 2026-07-19T05:31:13.886Z
published: 2026-07-19T05:31:13.886Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Dynamic-programming all-pairs shortest paths in a single O(V³) sweep that handles negative edges and detects negative cycles.
level:
  - "4"
priority: Medium
status: Creation
---

A weighted directed graph of `V` vertices, and the question is not one shortest path but the distance between every ordered pair — a full `V×V` table. Running a single-source algorithm from each vertex answers it, yet on a dense graph that repeats most of the work, and a negative edge weight rules out the fastest single-source choice outright.

Floyd-Warshall fills the whole table with one triple loop by recasting the problem as [[Computer Science/Algorithms/Paradigms/Dynamic Programming|dynamic programming]] over a growing set of permitted waypoints. The sub-problem is "the shortest path from `i` to `j` that may route only through intermediate vertices drawn from `{0..k}`." Beginning with direct edges alone and admitting one more permitted intermediate per stage, the last stage leaves every entry at its unrestricted shortest distance when no negative cycle is reachable on the route. Each stage `k` poses a single question at every pair: keep `dist[i][j]`, or improve it by going `i → k → j`. A negative cycle makes every pair that can reach it and then leave it have no finite shortest distance; the diagonal detects the condition, but the raw finite values left in the matrix are not valid answers for those pairs.

**Core shape:** weighted graph → `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])` with `k` admitted one vertex at a time → all-pairs distances in `Θ(V³)` time and `Θ(V²)` space.

The decisive step is a single relaxation sweeping the whole distance matrix for one admitted intermediate vertex.

# Trace

The table starts with direct edges and `∞` for missing routes. At each stage `k`, the highlighted cell compares its current `dist[i][j]` with the route through `k`; green writes improve the matrix and gray cells keep the existing distance.

```steptrace
{
  "algorithm": "floyd-warshall",
  "nodes": [0, 1, 2, 3],
  "edges": [[0, 1, 3], [0, 3, 7], [1, 0, 8], [1, 2, 2], [2, 0, 5], [2, 3, 1], [3, 0, 2]]
}
```

# Why one intermediate at a time works

Let `D^(k)[i][j]` mean the best `i`→`j` distance whose intermediate vertices are drawn from `{0..k}`; `D^(-1)` contains direct edges, zero-length self paths, and `∞` elsewhere. Each stage moves from `D^(k-1)` to `D^(k)` with:

`D^(k)[i][j] = min(D^(k-1)[i][j], D^(k-1)[i][k] + D^(k-1)[k][j])`

The invariant: once stage `k` finishes, `D^(k)[i][j]` is the shortest finite `i`→`j` path using intermediate vertices only from `{0..k}`. Each pair has exactly two ways to satisfy stage `k`. Either the best path avoids `k`, and `D^(k-1)[i][j]` already holds it; or it passes through `k` exactly once, splitting into an `i`→`k` leg and a `k`→`j` leg that each use only earlier intermediates. Taking the smaller value extends the invariant while no negative cycle makes the optimum unbounded below.

That decomposition is why `k` is the outermost loop. It reads `dist[i][k]` and `dist[k][j]` as the previous stage left them, so the entire matrix has to finish updating for one `k` before the next begins. Running `i` or `j` outside `k` mixes cells from two different stages into one relaxation, and the recurrence consumes half-finished data.

The same decomposition makes the in-place update safe on one matrix rather than a fresh copy per stage for finite shortest paths with no negative cycles. During stage `k` neither `dist[i][k]` nor `dist[k][j]` can improve — a shortest path through `k` never uses `k` as an intermediate of its own legs — so reading and writing the same array yields the values a separate previous copy would have held. That is what collapses the natural `Θ(V³)` space of the layered DP down to `Θ(V²)`.

A four-vertex run shows the layering. `∞` is shown as `.`:

```text
Vertices 0..3, directed edges (weight):
  0→1 (3)  0→3 (7)  1→0 (8)  1→2 (2)  2→0 (5)  2→3 (1)  3→0 (2)

dist after init:            final all-pairs distances:
      0   1   2   3               0   1   2   3
  0 [ 0   3   .   7 ]         0 [ 0   3   5   6 ]
  1 [ 8   0   2   . ]         1 [ 5   0   2   3 ]
  2 [ 5   .   0   1 ]         2 [ 3   6   0   1 ]
  3 [ 2   .   .   0 ]         3 [ 2   5   7   0 ]
```

`dist[0][3]` holds the direct edge `7` until vertex `2` becomes admissible at stage `k = 2`, where `0→2→3` costs `5 + 1 = 6` and wins. `dist[1][3]` first drops to `15` through vertex `0` at `k = 0`, then to `3` at `k = 2` via `1→2→3`. No diagonal entry ends negative, so the graph carries no negative cycle.

# Reference drawer

> [!ABSTRACT]- Staged relaxation
>
> ```mermaid
> flowchart TD
>   A[Init direct weights and infinity elsewhere; dist i i equals min of zero and direct self-loop weight] --> B[Pick next intermediate k, k outermost]
>   B --> C[Sweep every pair i and j]
>   C --> D{dist i k plus dist k j less than dist i j}
>   D -->|Yes| E[Set dist i j to the sum and next i j to next i k]
>   D -->|No| F[Keep dist i j]
>   E --> C
>   F --> C
>   C --> G{More intermediates remain}
>   G -->|Yes| B
>   G -->|No| H{Any dist i i below zero}
>   H -->|Yes| I[Negative-cycle witness: mark reachable pairs minus infinity]
>   H -->|No| J[Matrix holds all pairs distances]
> ```

> [!EXAMPLE]- C# implementation with path reconstruction
>
> ```csharp
> public static (long[,] Dist, int[,] Next) FloydWarshall(long[,] weight, int n)
> {
>     const long INF = long.MaxValue / 4;      // survives one addition without wrapping
>     var dist = new long[n, n];
>     var next = new int[n, n];
>
>     for (var i = 0; i < n; i++)
>     for (var j = 0; j < n; j++)
>     {
>         var direct = weight[i, j];
>         dist[i, j] = i == j ? Math.Min(direct, 0) : direct;
>         next[i, j] = dist[i, j] < INF ? j : -1;
>     }
>
>     for (var k = 0; k < n; k++)              // stage: k is outermost
>     for (var i = 0; i < n; i++)
>     for (var j = 0; j < n; j++)
>     {
>         if (dist[i, k] == INF || dist[k, j] == INF)
>         {
>             continue;                        // never add through the sentinel
>         }
>
>         var through = dist[i, k] + dist[k, j];
>         if (through < dist[i, j])
>         {
>             dist[i, j] = through;
>             next[i, j] = next[i, k];
>         }
>     }
>
>     return (dist, next);                     // inspect the diagonal before using any result
> }
>
> public static List<int> Path(long[,] dist, int[,] next, int i, int j)
> {
>     const long INF = long.MaxValue / 4;
>     for (var k = 0; k < dist.GetLength(0); k++)
>     {
>         if (dist[k, k] < 0 && dist[i, k] < INF && dist[k, j] < INF)
>         {
>             throw new InvalidOperationException("Path is unbounded through a negative cycle.");
>         }
>     }
>
>     if (next[i, j] == -1)
>     {
>         return new List<int>();              // j unreachable from i
>     }
>
>     var path = new List<int> { i };
>     while (i != j)
>     {
>         i = next[i, j];
>         path.Add(i);
>     }
>
>     return path;
> }
> ```
>
> `next[i, j]` stores the first hop of the current best `i`→`j` route and is rewritten to `next[i, k]` on each improving relaxation. `Path` rejects any pair that can reach and leave a negative-cycle witness; a raw `dist`/`next` pair cannot extract the concrete cycle, so that feature needs predecessor tracking during relaxation.

# Complexity

| Case | Time | Space | Cause |
| --- | --- | --- | --- |
| Every input | `Θ(V³)` | `Θ(V²)` | Three fixed-length loops run `V³` relaxations with no early exit; cost depends on `V` alone, never on edge count or weights. The matrix is `Θ(V²)` and doubles as the output, so the in-place update adds only `O(1)` auxiliary. |

Best, average, and worst coincide because nothing in the data shortens the sweep — a complete graph and an edgeless one both take the same `V³` steps. The single honest bound is `Θ(V³)`. Path reconstruction adds a second `Θ(V²)` `next` matrix; the true auxiliary cost beyond the output matrix stays `O(1)` without it. The naive layered DP that keeps one matrix per stage would need `Θ(V³)` space, which the in-place argument above removes.

# When the reported distances are wrong

A negative edge is fine on its own — a stage relaxes through it and the invariant still holds. A negative cycle is not: looping it lowers the total without bound, so every pair that can reach the cycle and then leave it has shortest distance `−∞`. The signal lives on the diagonal. When `dist[w][w] < 0`, there is a negative closed walk reachable from `w` and back to `w`; it is a witness, not proof that `w` itself lies on a simple negative cycle. Every `dist[u][v]` with finite `dist[u][w]` and `dist[w][v]` is affected and must be marked `−∞` or excluded from results. The plain distance matrix detects this condition but does not extract the concrete cycle; record predecessors during relaxation when the cycle itself matters.

Reordering the loops so `i` or `j` is outermost still compiles, runs, and terminates, but it relaxes pairs against cells from a stage that has not finished. The matrix comes back full of finite numbers that are simply wrong wherever a shortest path needed an intermediate whose row or column was consulted before that stage completed. Because nothing crashes, the defect hides until a specific graph exposes it.

Overflow is the other silent corruptor. With `int.MaxValue` as `∞`, the unconditional `dist[i][k] + dist[k][j]` wraps to a large negative number whenever both operands are the sentinel, and that phantom shortcut then propagates through the rest of the sweep. Skipping the relaxation when either operand is `∞`, or using a sentinel such as `long.MaxValue / 4` that tolerates one addition, closes it.

# Questions

> [!QUESTION]- Why is the `k`-loop the outermost of the three?
> After stage `k`, `dist[i][j]` is defined as the shortest `i`→`j` path using intermediates only from `{0..k}`, so `k` names a stage that must complete over the entire matrix before the next begins. The relaxation reads `dist[i][k]` and `dist[k][j]` expecting the previous stage's values; with `i` or `j` outermost those cells belong to an unfinished stage, and the recurrence consumes half-updated data. The output is still finite and still returned, so the error is silent.

> [!QUESTION]- Why is the in-place update on a single matrix correct, and what does that save?
> For finite shortest paths with no negative cycles, neither `dist[i][k]` nor `dist[k][j]` can improve during stage `k`, because a shortest path routed through `k` never uses `k` as an intermediate of its own two legs. Reading and writing the one matrix therefore returns the same values a separate previous copy would have held. Keeping a distinct matrix per stage would cost `Θ(V³)` space; the observation drops it to `Θ(V²)`.

> [!QUESTION]- How does Floyd-Warshall surface a negative cycle, and how does that differ from Bellman-Ford?
> After the sweep, `dist[w][w] < 0` is a negative-cycle witness: a negative closed walk leaves `w` and returns to `w`, even if the simple cycle lies elsewhere on that walk. Any pair that can reach and leave `w` has no finite shortest distance and must be marked `−∞` or rejected. Bellman-Ford instead runs one additional relaxation from a chosen source and, with predecessors, can extract a concrete cycle, which is what arbitrage-style problems need.

# References

- [Robert W. Floyd, _Algorithm 97: Shortest Path_](https://doi.org/10.1145/367766.368168) — the 1962 primary source for the matrix recurrence.
- [Floyd-Warshall algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm) — DP formulation, path reconstruction via the successor matrix, and negative-cycle handling.
- [All-pairs shortest paths, Floyd-Warshall (cp-algorithms)](https://cp-algorithms.com/graph/all-pair-shortest-path-floyd-warshall.html) — implementation, the in-place correctness argument, and route reconstruction.
- [Johnson's algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Johnson%27s_algorithm) — the sparse-graph-with-negative-edges alternative built on reweighting plus per-source Dijkstra.
- [Shortest paths (Princeton Algorithms)](https://algs4.cs.princeton.edu/44sp/) — Sedgewick's treatment of shortest-path algorithms and their tradeoffs.
