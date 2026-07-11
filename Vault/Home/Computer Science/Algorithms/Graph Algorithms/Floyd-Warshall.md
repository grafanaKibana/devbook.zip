---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A weighted directed graph of `V` vertices, and the question is not one shortest path but the distance between every ordered pair — a full `V×V` table. Running a single-source algorithm from each vertex answers it, yet on a dense graph that repeats most of the work, and a negative edge weight rules out the fastest single-source choice outright.

Floyd-Warshall fills the whole table with one triple loop by recasting the problem as [[Dynamic Programming]] over a growing set of permitted waypoints. The sub-problem is "the shortest path from `i` to `j` that may route only through intermediate vertices drawn from `{0..k}`." Beginning with direct edges alone and admitting one more permitted intermediate per stage, the last stage leaves every entry at its unrestricted shortest distance. Each stage `k` poses a single question at every pair: keep `dist[i][j]`, or improve it by going `i → k → j`. The distances stay meaningful only while no negative cycle exists — a negative cycle has no finite shortest path, and the algorithm reports it instead of returning a number.

**Core shape:** weighted graph → `dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])` with `k` admitted one vertex at a time → all-pairs distances in `Θ(V³)` time and `Θ(V²)` space.

The decisive step is a single relaxation sweeping the whole distance matrix for one admitted intermediate vertex.

> [!NOTE] Visualization pending
> Planned StepTrace: a matrix card showing a `V×V` distance table updated across each intermediate vertex `k`, with `dist[i][j]` relaxed by `dist[i][k] + dist[k][j]`. No matching renderer exists in `engine.js` yet.

## Why one intermediate at a time works

The state is a single `V×V` matrix `dist`, initialized so `dist[i][j]` is the direct edge weight, `dist[i][i]` is `0`, and every other entry is `∞`. Stage `k` runs one relaxation over the whole matrix:

`dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j])`

The invariant the stages maintain: once stage `k` finishes, `dist[i][j]` is the shortest `i`→`j` distance using intermediate vertices drawn only from `{0..k}`. Each pair has exactly two ways to satisfy the next stage. Either the best path through `{0..k}` avoids `k`, and the old value already holds it; or it passes through `k` exactly once, splitting into an `i`→`k` leg and a `k`→`j` leg that each use only earlier intermediates — precisely `dist[i][k] + dist[k][j]` carried over from the previous stage. Taking the smaller of the two extends the invariant to `{0..k}`.

That decomposition is why `k` is the outermost loop. It reads `dist[i][k]` and `dist[k][j]` as the previous stage left them, so the entire matrix has to finish updating for one `k` before the next begins. Running `i` or `j` outside `k` mixes cells from two different stages into one relaxation, and the recurrence consumes half-finished data.

The same decomposition makes the in-place update safe on one matrix rather than a fresh copy per stage. During stage `k` neither `dist[i][k]` nor `dist[k][j]` can improve — a shortest path through `k` never uses `k` as an intermediate of its own legs — so reading and writing the same array yields the values a separate previous copy would have held. That is what collapses the natural `Θ(V³)` space of the layered DP down to `Θ(V²)`.

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

## Reference drawer

> [!ABSTRACT]- Staged relaxation
> ```mermaid
> flowchart TD
>   A[Init dist with edge weights and zero on the diagonal] --> B[Pick next intermediate k, k outermost]
>   B --> C[Sweep every pair i and j]
>   C --> D{dist i k plus dist k j less than dist i j}
>   D -->|Yes| E[Set dist i j to the sum and next i j to next i k]
>   D -->|No| F[Keep dist i j]
>   E --> C
>   F --> C
>   C --> G{More intermediates remain}
>   G -->|Yes| B
>   G -->|No| H{Any dist i i below zero}
>   H -->|Yes| I[Negative cycle through vertex i]
>   H -->|No| J[Matrix holds all pairs distances]
> ```

> [!EXAMPLE]- C# implementation with path reconstruction
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
>         dist[i, j] = weight[i, j];
>         next[i, j] = dist[i, j] < INF ? j : -1;
>     }
>     for (var i = 0; i < n; i++)
>     {
>         dist[i, i] = 0;
>         next[i, i] = i;
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
>     return (dist, next);                     // dist[i, i] < 0 marks a negative cycle through i
> }
>
> public static List<int> Path(int[,] next, int i, int j)
> {
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
> `next[i, j]` stores the first hop of the current best `i`→`j` route and is rewritten to `next[i, k]` on each improving relaxation, so `Path` walks the successors without re-reading the distance matrix.

## Complexity

| Case | Time | Space | Cause |
| --- | --- | --- | --- |
| Every input | `Θ(V³)` | `Θ(V²)` | Three fixed-length loops run `V³` relaxations with no early exit; cost depends on `V` alone, never on edge count or weights. The matrix is `Θ(V²)` and doubles as the output, so the in-place update adds only `O(1)` auxiliary. |

Best, average, and worst coincide because nothing in the data shortens the sweep — a complete graph and an edgeless one both take the same `V³` steps. The single honest bound is `Θ(V³)`. Path reconstruction adds a second `Θ(V²)` `next` matrix; the true auxiliary cost beyond the output matrix stays `O(1)` without it. The naive layered DP that keeps one matrix per stage would need `Θ(V³)` space, which the in-place argument above removes.

## When the reported distances are wrong

A negative edge is fine on its own — a stage relaxes through it and the invariant still holds. A negative cycle is not: looping it lowers the total without bound, so the true shortest distance is `−∞`, while the sweep stops at whatever finite value its relaxations happened to reach. The signal lives on the diagonal. Any `dist[i][i] < 0` means vertex `i` sits on a negative cycle, since the only way back to `i` with negative weight is around one. Every off-diagonal `dist[u][v]` whose route can pass through such an `i` — both `dist[u][i]` and `dist[i][v]` finite — is equally invalid and belongs marked `−∞` rather than read as a number.

Reordering the loops so `i` or `j` is outermost still compiles, runs, and terminates, but it relaxes pairs against cells from a stage that has not finished. The matrix comes back full of finite numbers that are simply wrong wherever a shortest path needed an intermediate whose row or column was consulted before that stage completed. Because nothing crashes, the defect hides until a specific graph exposes it.

Overflow is the other silent corruptor. With `int.MaxValue` as `∞`, the unconditional `dist[i][k] + dist[k][j]` wraps to a large negative number whenever both operands are the sentinel, and that phantom shortcut then propagates through the rest of the sweep. Skipping the relaxation when either operand is `∞`, or using a sentinel such as `long.MaxValue / 4` that tolerates one addition, closes it.

## Comparison

| Approach | Time | Space | Negatives | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Floyd-Warshall | `Θ(V³)` | `Θ(V²)` | Edges yes, cycles detected | Small or dense graphs; whole matrix wanted; negative edges present | Large sparse graphs where `V³` dwarfs the real path count |
| Binary-heap [[Dijkstra]] from every vertex | `O(V·(E + V) log V)` | `O(V + E)` per run | No | Sparse non-negative graphs still needing all pairs | Any negative edge; dense graphs where it nears `V³ log V` |
| [[Bellman-Ford]] | `O(V·E)` single source | `O(V)` | Edges yes, cycles detected | Distances from one source with negative edges | Paying `V×` to cover every source |
| Johnson's with Fibonacci heaps | `O(V² log V + V·E)` | `O(V²)` | Edges yes (reweighted), cycles detected | Large sparse graphs with negative edges | Dense graphs where reweighting buys nothing over `V³` |

Floyd-Warshall is the compact all-pairs choice when `V` is small or the graph is dense and when negative edges are in play — three loops and a `min`, no heap and no reweighting, plus a negative-cycle verdict for every vertex as a by-product. It pays `Θ(V³)` whether the graph is dense or not, so on a large sparse graph repeated Dijkstra scales with `E` on non-negative weights, and Johnson's reweights once with Bellman-Ford before running Dijkstra per source when negatives force it. For a single source, Bellman-Ford avoids materializing the whole matrix at all.

## Questions

> [!QUESTION]- Why is the `k`-loop the outermost of the three?
> After stage `k`, `dist[i][j]` is defined as the shortest `i`→`j` path using intermediates only from `{0..k}`, so `k` names a stage that must complete over the entire matrix before the next begins. The relaxation reads `dist[i][k]` and `dist[k][j]` expecting the previous stage's values; with `i` or `j` outermost those cells belong to an unfinished stage, and the recurrence consumes half-updated data. The output is still finite and still returned, so the error is silent.

> [!QUESTION]- Why is the in-place update on a single matrix correct, and what does that save?
> Within stage `k` neither `dist[i][k]` nor `dist[k][j]` can improve, because a shortest path routed through `k` never uses `k` as an intermediate of its own two legs. Reading and writing the one matrix therefore returns the same values a separate previous copy would have held. Keeping a distinct matrix per stage would cost `Θ(V³)` space; the observation drops it to `Θ(V²)`.

> [!QUESTION]- How does Floyd-Warshall surface a negative cycle, and how does that differ from Bellman-Ford?
> After the sweep, any `dist[i][i] < 0` means a negative-weight path leaves `i` and returns to it — a negative cycle through `i` — reported for all vertices at once with no extra pass. Bellman-Ford instead runs one additional relaxation from a chosen source and can walk predecessors to extract the concrete cycle, which is what arbitrage-style problems need.

> [!QUESTION]- When does repeated Dijkstra or Johnson's beat Floyd-Warshall?
> On a large sparse graph, `Θ(V³)` is dominated by the `V²` empty pairs. With non-negative weights, Dijkstra from every vertex costs `O(V·(E + V) log V)` and scales with `E`. With negative edges, Johnson's reweights once via Bellman-Ford, then runs Dijkstra per source for `O(V² log V + V·E)`. Floyd-Warshall wins back only when `V` is small or the graph is dense enough that `E ≈ V²`.

## References

- [Floyd-Warshall algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm) — DP formulation, path reconstruction via the successor matrix, and negative-cycle handling.
- [All-pairs shortest paths, Floyd-Warshall (cp-algorithms)](https://cp-algorithms.com/graph/all-pair-shortest-path-floyd-warshall.html) — implementation, the in-place correctness argument, and route reconstruction.
- [Johnson's algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Johnson%27s_algorithm) — the sparse-graph-with-negative-edges alternative built on reweighting plus per-source Dijkstra.
- [Shortest paths (Princeton Algorithms)](https://algs4.cs.princeton.edu/44sp/) — Sedgewick's treatment of shortest-path algorithms and their tradeoffs.
