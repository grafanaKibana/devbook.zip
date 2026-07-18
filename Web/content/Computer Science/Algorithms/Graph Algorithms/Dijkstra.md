---
publish: true
created: 2026-07-12T14:27:20.402Z
modified: 2026-07-18T11:30:03.542Z
published: 2026-07-18T11:30:03.542Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Single-source shortest paths on non-negative-weighted graphs, greedily finalizing the closest tentative node and relaxing its outgoing edges.
level:
  - "4"
priority: Medium
status: Done
---

A weighted graph assigns each edge a non-negative cost — travel time, latency, price — and the question is the cheapest total cost from one source node to every other node. Enumerating routes is exponential, and re-deriving a node's best cost every time a shorter approach appears repeats work already done. Dijkstra's algorithm keeps a single tentative distance per node, improves it only through edge relaxation, and commits nodes to a final distance in increasing order of that distance.

The commit order is what makes it cheap. Each step removes the unsettled node with the smallest tentative distance from a min-priority-queue and marks it settled; its distance can no longer change. Relaxing its outgoing edges can only lower still-unsettled neighbours, never a node already behind the frontier. Non-negative weights are the precondition: they guarantee that leaving a settled node and returning through a longer detour cannot arrive cheaper.

**Core condition:** non-negative edge weights → settle nodes in nondecreasing distance order → `O((V + E) log V)` with a binary heap and `O(V)` auxiliary space.

# One run from a source

The trace runs a single source from `A` over an undirected weighted graph, settling one node per step until `F` is reached.

```steptrace
{"algorithm":"dijkstra","start":"A","target":"F","directed":false,"nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"}],"edges":[{"from":"A","to":"B","weight":2},{"from":"A","to":"C","weight":5},{"from":"B","to":"C","weight":1},{"from":"B","to":"D","weight":6},{"from":"C","to":"D","weight":3},{"from":"D","to":"E","weight":1},{"from":"D","to":"F","weight":4},{"from":"E","to":"F","weight":2}]}
```

The first extraction settles `A` at distance 0 and relaxes its edges, giving `B` a tentative 2 and `C` a tentative 5. The decisive move is the next extraction: it takes the smallest tentative value, `B` at 2 — not `C` at 5 — settles it, and relaxing `B→C` lowers `C` from 5 to 3. `C` is now final at 3. Every remaining route to `C` must leave through a node whose tentative distance is already at least 2, and every edge adds a non-negative amount, so no later step can undercut the value `C` settles at. Nodes turn final in the order they leave the queue; the frontier holds only the tentative distances still open to a cheaper approach.

# Why settled distances stay final

The loop maintains one invariant: when a node leaves the priority queue, its tentative distance already equals its true shortest-path distance.

Suppose node `u` is popped with tentative distance `d[u]`, and assume for contradiction a strictly shorter path `P` to `u` exists. `P` starts at the source, which is settled, and at some edge `(x, y)` it first crosses from the settled set into the unsettled set — `y` is the first unsettled node on `P`. Settling `x` already relaxed `(x, y)`, so `d[y]` is at most the length of `P` up to `y`. Since the remainder of `P` from `y` to `u` has non-negative length, that prefix is itself at most the length of all of `P`, giving `d[y] ≤ length(P) < d[u]`. But `u` was chosen as the smallest tentative distance among unsettled nodes, so `d[u] ≤ d[y]` — a contradiction.

The single step that makes the argument valid is that the tail from `y` to `u` cannot be negative. With a negative edge that tail could subtract from the cost, `d[y]` would no longer bound the full path, and a node could settle at a distance a later path beats.

# Complexity

Every variant visits each vertex once and inspects each edge once; what differs is the cost of `extract-min` and of lowering a neighbour's key, which is set by the priority queue.

| Priority queue | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Binary heap + adjacency list | `O((V + E) log V)` | `O(V)` decrease-key; `O(E)` lazy-deletion | `V` extractions and up to `E` key-lowering pushes each cost `O(log V)`. A true decrease-key heap holds one entry per vertex; the lazy-deletion code shown here pushes a fresh pair per relaxation, so the heap can carry up to `O(E)` stale entries. |
| Fibonacci heap | `O(E + V log V)` | `O(V)` | `decrease-key` is `O(1)` amortized, so only the `V` `extract-min` operations pay `log V`; `E` relaxations are effectively free. |
| Array / linear scan | `O(V²)` | `O(V)` | Selecting the minimum by scanning all vertices is `O(V)` per step; on a dense graph where `E ≈ V²` this matches the relaxation work and drops the heap's `log V` overhead. |

Auxiliary space is `O(V)` for the `dist` and `settled` arrays plus `O(V)` for the queue in a decrease-key model. With the lazy-deletion approach below, the binary heap can transiently hold up to `O(E)` stale entries, since each relaxation pushes rather than updates.

# Where the invariant breaks

A single negative edge violates settle-once. Take edges `A→B = 2`, `A→C = 3`, and `C→B = −2`. Dijkstra relaxes `A` to reach `B` at 2 and `C` at 3, extracts and settles `B` at 2, then extracts `C` at 3 and relaxes `C→B` to `3 + (−2) = 1`. `B` is already settled, so that improvement is discarded and `B` is reported at 2, while the true shortest distance `A→C→B` is 1. Nothing throws — the output is simply not a shortest-path tree. Weights that can be negative need [[Bellman-Ford]], which relaxes all edges `V − 1` times and drops the finalization assumption.

A negative _cycle_ has no shortest path at all: a route can loop it repeatedly to drive its cost below any bound, so no single-source algorithm returns a finite answer. The condition has to be detected rather than solved, which Bellman-Ford also does.

The second boundary is internal to the implementation. Standard binary heaps (including .NET's `PriorityQueue<TElement, TPriority>`) offer no `decrease-key`, so a relaxation pushes a fresh `(distance, node)` pair and leaves the older, larger one in the heap. When such a stale pair is later popped for a node that was already settled through a cheaper entry, it must be skipped — the `if settled[node] continue` guard at the top of the loop. Omitting it re-relaxes that node's edges from an out-of-date distance and can corrupt neighbours still on the frontier.

# Reference drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[dist source = 0, all others = infinity] --> B[Push source into min-priority-queue]
>   B --> C{Queue empty}
>   C -->|Yes| Z[dist holds every shortest distance]
>   C -->|No| D[Pop node with smallest tentative distance]
>   D --> E{Already settled}
>   E -->|Yes, stale entry| C
>   E -->|No| F[Mark node settled and relax outgoing edges]
>   F --> G{Edge lowers a neighbour's tentative distance}
>   G -->|Yes| H[Update neighbour and push it]
>   G -->|No| C
>   H --> C
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int[] Dijkstra(List<(int To, int Weight)>[] graph, int source)
> {
>     var dist = new int[graph.Length];
>     Array.Fill(dist, int.MaxValue);
>     dist[source] = 0;
>
>     var settled = new bool[graph.Length];
>     var queue = new PriorityQueue<int, int>();
>     queue.Enqueue(source, 0);
>
>     while (queue.TryDequeue(out var node, out var d))
>     {
>         if (settled[node])
>         {
>             continue; // stale entry: a cheaper pair already settled this node
>         }
>
>         settled[node] = true;
>
>         foreach (var (to, weight) in graph[node])
>         {
>             if (!settled[to] && d + weight < dist[to])
>             {
>                 dist[to] = d + weight;
>                 queue.Enqueue(to, dist[to]);
>             }
>         }
>     }
>
>     return dist;
> }
> ```
>
> The `settled` array replaces `decrease-key`: relaxation always pushes a new pair, and the guard discards the outdated ones on pop. A parallel `parent[]` array, written whenever `dist[to]` is lowered, reconstructs a path by walking backward from the target.

# Questions

> [!QUESTION]- Why does the settle-once rule require non-negative edge weights?
> When a node is popped it is treated as final. The proof that this is safe relies on the tail of any alternative path — from the first unsettled node it reaches onward — having non-negative length, so that first node's tentative distance already bounds the whole path. A negative edge lets that tail subtract cost, so a later path can beat a node's settled distance and the reported distance is wrong.

> [!QUESTION]- What does the `if settled[node] continue` guard fix?
> A binary heap has no `decrease-key`, so relaxing a node pushes a new pair and leaves the old larger one behind. The guard skips a node the second time it is popped, after a cheaper pair already settled it. Without the guard, the stale pair re-relaxes that node's edges from an outdated distance and can lower a frontier neighbour incorrectly.

> [!QUESTION]- Why can an array scan beat a binary heap on a dense graph?
> With a heap, each of the `E` relaxations may cost `O(log V)`, giving `O((V + E) log V)`. On a dense graph `E ≈ V²`, so the heap term dominates at `O(V² log V)`. Scanning all vertices to pick the minimum is `O(V)` per step and `O(V²)` overall, which drops the `log V` factor entirely.

# References

- [A Note on Two Problems in Connexion with Graphs](https://doi.org/10.1007/BF01386390) — Dijkstra's 1959 paper introducing the algorithm and its greedy minimum-distance selection.
- [Dijkstra — finding shortest paths from given vertex](https://cp-algorithms.com/graph/dijkstra.html) — adjacency-list implementation with a binary heap and the lazy-deletion (skip-stale) pattern for sparse graphs.
- [Dijkstra on dense graphs](https://cp-algorithms.com/graph/dijkstra_dense.html) — the `O(V²)` array-scan variant and when it outperforms the heap version.
- [`PriorityQueue<TElement, TPriority>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — .NET's min-priority-queue, which exposes `Enqueue`/`TryDequeue` but no `decrease-key`, forcing the lazy-deletion approach used above.
