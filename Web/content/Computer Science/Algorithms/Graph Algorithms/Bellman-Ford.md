---
publish: true
created: 2026-07-18T14:02:43.941Z
modified: 2026-08-08T07:30:29.576Z
published: 2026-08-08T07:30:29.576Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Single-source shortest paths with negative edges, relaxing every edge V-1 times and detecting negative cycles.
level:
  - "4"
priority: Medium
status: Creation
---

A weighted digraph carries a single source and edge weights that may be negative — a currency graph, a distance-vector routing table, a cost network where some transitions refund more than they charge. [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] settles one vertex at a time and never revisits it, so a negative edge discovered later, one that could still lower an already-final distance, breaks its greedy invariant. Bellman-Ford drops the settle-once rule: it relaxes every edge once per round and repeats the sweep, letting any distance keep falling for as many rounds as it takes.

Correctness rests on a fact about shortest paths: with no negative cycle present a shortest path is simple, so it spans at most `V−1` edges, `V−1` rounds suffice, and a relaxation still possible in a `V`-th round can only be a negative cycle.

The trace uses the adverse scan order `2→3, 1→2, 0→2, 0→1`, so each round exposes one more edge of the shortest path.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"bellman-ford"}
```


A round relaxes every edge once: for edge `(u, v, w)`, if `dist[u] + w < dist[v]`, then `dist[v]` drops to `dist[u] + w` and `pred[v]` becomes `u`. The order of edges within a round changes the intermediate values but never the round's guarantee.

That guarantee is layered by edge count. Before any round only the source is correct (a zero-edge path). After round 1 every vertex whose shortest path uses one edge is final; after round `k` every shortest path of at most `k` edges is final, because round `k` relaxes the last edge of such a path once the earlier `k−1` edges were settled by previous rounds. A simple shortest path spans at most `V−1` edges, so `V−1` rounds finalize all of them. [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] reaches the same distances faster on non-negative weights but cannot recover once a negative edge lowers a vertex it already closed; the blind re-sweep is exactly what tolerates that.

Detection falls out of the same bound. Run one extra round. If any edge still relaxes, a path is shortening beyond `V−1` edges, which is impossible for a simple path — so a negative cycle is reachable from the source, and the region it feeds has no finite shortest distance. To recover the cycle itself, take a vertex that relaxed on the `V`-th round and walk `pred` back `V` times; the walk cannot leave a cycle once inside it, so it lands on a cycle vertex, and following `pred` from there until it repeats reads off the loop.

A full round that relaxes nothing means every distance is already final, so the sweep can stop early. On graphs that converge before the frontier reaches its diameter this turns the fixed `V−1` rounds into far fewer.

A four-vertex run makes the layering concrete. The source is `0`, one edge is negative, and each round relaxes the edges in the fixed order `2→3, 1→2, 0→2, 0→1` — an adverse order that advances the settled frontier by one edge per round.

```text
V = 4, source 0.  Edges: 0->1 (4), 0->2 (5), 1->2 (-2), 2->3 (3).

Init      dist = [0, inf, inf, inf]
Round 1   0->2 sets dist[2]=5, 0->1 sets dist[1]=4          -> [0, 4, 5, inf]
Round 2   2->3 sets dist[3]=8, then 1->2 lowers dist[2] 5->2 -> [0, 4, 2,  8]
Round 3   2->3 lowers dist[3] 8->5 from the improved dist[2] -> [0, 4, 2,  5]
Round 4   (V-th) no edge relaxes -> no negative cycle; distances final
```

Round 2 is the decisive transition: the negative edge `1→2` pulls `dist[2]` below the direct `0→2` estimate of `5`, and round 3 propagates that gain to `dist[3]`. A shortest-path-ordered sweep would have converged in a single round; the adverse order is what exposes the per-round frontier and the `V−1` bound. The `V`-th round changes nothing, which is exactly the negative-cycle check coming up empty.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Bellman-Ford complexity",
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
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "distribution-dependent; O(n·m) upper bound"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(n·m)"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```
````

# When Distances Stop Being Defined

A reachable negative cycle has no shortest path: each lap around it lowers the total, so the infimum is `−∞`. The `V−1`-round distances into that region are a snapshot taken mid-descent, not an answer. Code that prints them reports finite numbers that mean nothing, and the failure is silent because the arrays are fully populated and no exception fires. A correct report distinguishes three states: a finite distance, `+∞` for a vertex with no path at all, and `−∞` for a vertex reachable through a negative cycle — the last set found by marking every vertex that relaxed on the `V`-th round and everything reachable from it.

Overflow is the second silent failure. Because a round relaxes every edge, including edges leaving vertices not yet reached, computing `dist[u] + w` while `dist[u]` is still the infinity sentinel can wrap a fixed-width integer into a small or negative value and invent a shortest path. Skipping any edge whose source is still at the sentinel (`if (dist[u] == INF) continue;`) removes it; [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] never hits this because it only expands vertices it has already settled.

When every source needs an answer, [[Computer Science/Algorithms/Graph Algorithms/Floyd-Warshall|Floyd-Warshall]] solves the all-pairs problem directly instead of repeating this single-source procedure.

# Reference Drawer

> [!ABSTRACT]- Round and detection flow
>
> ```mermaid
> flowchart TD
>   A[Init dist of source to 0, others to infinity] --> B[Repeat up to V minus 1 rounds]
>   B --> C[Relax every edge once]
>   C --> D{Any edge relaxed}
>   D -->|No| E[Distances final: early exit]
>   D -->|Yes| B
>   B -->|Rounds exhausted| F[Run one detection round]
>   F --> G{Any edge still relaxes}
>   G -->|No| H[Output dist and pred]
>   G -->|Yes| I[Negative cycle: walk pred V times to extract]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public readonly record struct Edge(int From, int To, int Weight);
>
> public static class BellmanFord
> {
>     // Returns null when a negative cycle is reachable from source.
>     public static long[]? ShortestPaths(int vertexCount, IReadOnlyList<Edge> edges, int source)
>     {
>         var dist = new long[vertexCount];
>         Array.Fill(dist, long.MaxValue);
>         dist[source] = 0;
>
>         // V - 1 rounds; stop early when a full round relaxes nothing.
>         for (var round = 0; round < vertexCount - 1; round++)
>         {
>             var changed = false;
>             foreach (var (from, to, weight) in edges)
>             {
>                 if (dist[from] == long.MaxValue) continue;   // unreached source: skip to avoid overflow
>                 if (dist[from] + weight < dist[to])
>                 {
>                     dist[to] = dist[from] + weight;
>                     changed = true;
>                 }
>             }
>
>             if (!changed) return dist;                       // converged before round V - 1
>         }
>
>         // V-th round: any further relaxation proves a reachable negative cycle.
>         foreach (var (from, to, weight) in edges)
>         {
>             if (dist[from] != long.MaxValue && dist[from] + weight < dist[to])
>             {
>                 return null;
>             }
>         }
>
>         return dist;
>     }
> }
> ```
>
> `long.MaxValue` marks an unreached vertex and is skipped as a relaxation source, so no `int`-width sentinel wraps. Recording `pred[to] = from` alongside each update is what later makes the negative cycle walkable.

# Questions

> [!QUESTION]- Why exactly `V−1` rounds, and what does a relaxation on the `V`-th round prove?
> Without a negative cycle, every shortest path is simple and spans at most `V−1` edges. Round `k` finalizes every shortest path of at most `k` edges, so `V−1` rounds finalize all of them. A relaxation still possible on the `V`-th round means a path is shortening past that `V−1`-edge limit, which only a negative cycle permits, so the extra round is the negative-cycle detector rather than wasted work.

> [!QUESTION]- How is the actual negative cycle recovered after detection?
> Take a vertex that relaxed on the `V`-th round; it lies on a negative cycle or is reachable from one. Walking `pred` back `V` times cannot exit a cycle once inside it, so the walk ends on a cycle vertex. Following `pred` from there until it returns to that vertex lists the cycle.

> [!QUESTION]- After a reachable negative cycle is detected, what are the correct distances?
> Vertices reachable through the cycle have distance `−∞`, because each lap lowers the total without bound; vertices with no path have `+∞`; the rest are finite. The `V−1`-round numbers for the `−∞` region are a mid-descent snapshot, so reporting them as finite distances is the common bug.

# References

- [On a Routing Problem](https://www.ams.org/qam/1958-16-01/S0033-569X-1958-0102435-2/S0033-569X-1958-0102435-2.pdf) — Bellman's 1958 dynamic-programming formulation of the shortest-path recurrence.
- [Bellman–Ford algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Bellman%E2%80%93Ford_algorithm) — correctness, the `V−1`-round bound, and negative-cycle detection.
- [Bellman-Ford (cp-algorithms)](https://cp-algorithms.com/graph/bellman_ford.html) — implementation with the early-exit optimization and cycle retrieval.
- [Finding a negative cycle in the graph (cp-algorithms)](https://cp-algorithms.com/graph/finding-negative-cycle-in-graph.html) — the `pred`-walk extraction technique used above.
- [Shortest paths (Princeton Algorithms)](https://algs4.cs.princeton.edu/44sp/) — Sedgewick on Bellman-Ford, negative cycles, and the arbitrage reduction via `-log(rate)` weights.
