---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Single-source shortest paths on non-negative-weighted graphs, greedily finalizing the closest tentative node and relaxing its outgoing edges."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

A weighted graph assigns each edge a non-negative cost — travel time, latency, price — and the question is the cheapest total cost from one source node to every other node. Dijkstra's algorithm keeps a single tentative distance per node, improves it only through edge relaxation, and commits nodes to a final distance in increasing order of that distance.

The commit order is what makes it cheap. Each vertex becomes settled once, when its smallest queued entry is removed; a lazy-deletion heap may later pop older entries for that same vertex and skip them. A settled distance can no longer change. Relaxing outgoing edges can only lower still-unsettled neighbours, never a node already behind the frontier. Non-negative weights are the precondition: they guarantee that leaving a settled node and returning through a longer detour cannot arrive cheaper.


~~~~~tabsdown
tab: Visualization

~~~~tabsdown
tab: Midtown map

```steptrace
{"algorithm":"dijkstra","variant":"midtown-map"}
```

tab: Cities

```steptrace
{"algorithm":"dijkstra","variant":"ukraine-cities","start":"Lviv","target":"Kharkiv"}
```

~~~~


Midtown makes direction and cost visible: Dijkstra expands from Seventh Avenue and West 47th Street in increasing accumulated street cost, respects one-way roads and the West 44th Street closure, and finishes by highlighting the cheapest route to Sixth Avenue and West 42nd Street. The Cities view runs the same distance-first search over a larger weighted network. In both views, Watch retains the complete distance array while the map shows the current node, active edge, settled region, and final path. No heuristic steers either search.


The loop maintains one invariant: when an unsettled node leaves the priority queue, its tentative distance already equals its true shortest-path distance. Later stale entries for that settled node do not make it settle again.

Suppose node `u` is popped with tentative distance `d[u]`, and assume for contradiction a strictly shorter path `P` to `u` exists. `P` starts at the source, which is settled, and at some edge `(x, y)` it first crosses from the settled set into the unsettled set — `y` is the first unsettled node on `P`. Settling `x` already relaxed `(x, y)`, so `d[y]` is at most the length of `P` up to `y`. Since the remainder of `P` from `y` to `u` has non-negative length, that prefix is itself at most the length of all of `P`, giving `d[y] ≤ length(P) < d[u]`. But `u` was chosen as the smallest tentative distance among unsettled nodes, so `d[u] ≤ d[y]` — a contradiction.

The single step that makes the argument valid is that the tail from `y` to `u` cannot be negative. With a negative edge that tail could subtract from the cost, `d[y]` would no longer bound the full path, and a node could settle at a distance a later path beats.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Dijkstra complexity",
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
          "operation": "Binary heap + adjacency list",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O((n + m) log n)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Fibonacci heap",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(m + n log n)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Array / linear scan",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n²)",
              "curveId": "quadratic"
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
          "operation": "Binary heap + adjacency list",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "O(n) decrease-key; O(m) lazy-deletion"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Fibonacci heap",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Array / linear scan",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n)",
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

# Where the Invariant Breaks

A single negative edge violates settle-once. Take edges `A→B = 2`, `A→C = 3`, and `C→B = −2`. Dijkstra relaxes `A` to reach `B` at 2 and `C` at 3, extracts and settles `B` at 2, then extracts `C` at 3 and relaxes `C→B` to `3 + (−2) = 1`. `B` is already settled, so that improvement is discarded and `B` is reported at 2, while the true shortest distance `A→C→B` is 1. Nothing throws — the output is simply not a shortest-path tree. Weights that can be negative need [[Home/Computer Science/Algorithms/Graph Algorithms/Bellman-Ford|Bellman-Ford]], which relaxes all edges `V − 1` times and drops the finalization assumption.

A negative *cycle* has no shortest path at all: a route can loop it repeatedly to drive its cost below any bound, so no single-source algorithm returns a finite answer. The condition has to be detected rather than solved, which Bellman-Ford also does.

The second boundary is internal to the implementation. Standard binary heaps (including .NET's `PriorityQueue<TElement, TPriority>`) offer no `decrease-key`, so a relaxation pushes a fresh `(distance, node)` pair and leaves the older, larger one in the heap. A vertex still settles only once, but the queue can pop it repeatedly. The `if settled[node] continue` guard skips those stale entries before they rescan outgoing edges. Omitting the guard does not corrupt distances under the non-negative-weight precondition—the stale distance is larger than the one already processed—but every stale pop scans that vertex's outgoing adjacency again and repeats relaxations that already ran.

# Reference Drawer

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
> public static long[] Dijkstra(List<(int To, long Weight)>[] graph, int source)
> {
>     var dist = new long[graph.Length];
>     Array.Fill(dist, long.MaxValue);
>     dist[source] = 0;
>
>     var settled = new bool[graph.Length];
>     var queue = new PriorityQueue<int, long>();
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
>             if (weight < 0)
>             {
>                 throw new ArgumentOutOfRangeException(nameof(graph), "Dijkstra requires non-negative weights.");
>             }
>
>             if (settled[to]) continue;
>             var candidate = checked(d + weight);
>             if (candidate >= dist[to]) continue;
>
>             dist[to] = candidate;
>             queue.Enqueue(to, candidate);
>         }
>     }
>
>     return dist;
> }
> ```
>
> The lazy-deletion pattern replaces `decrease-key`: relaxation always pushes a new pair, while `settled` makes the first valid pop final and lets the guard discard later stale entries. A parallel `parent[]` array, written whenever `dist[to]` is lowered, reconstructs a path by walking backward from the target.

# Questions

> [!QUESTION]- Why does the settle-once rule require non-negative edge weights?
> When a node is popped it is treated as final. The proof that this is safe relies on the tail of any alternative path — from the first unsettled node it reaches onward — having non-negative length, so that first node's tentative distance already bounds the whole path. A negative edge lets that tail subtract cost, so a later path can beat a node's settled distance and the reported distance is wrong.

> [!QUESTION]- What does the `if settled[node] continue` guard fix?
> A binary heap has no `decrease-key`, so relaxing a node pushes a new pair and leaves the old larger one behind. The guard skips every later pop after the cheapest pair has settled that vertex. Without it, each stale pop scans the same outgoing adjacency and repeats its relaxation loop, although non-negative weights keep the settled distances correct.

# References

- [A Note on Two Problems in Connexion with Graphs](https://doi.org/10.1007/BF01386390) — Dijkstra's 1959 paper introducing the algorithm and its greedy minimum-distance selection.
- [Dijkstra — finding shortest paths from given vertex](https://cp-algorithms.com/graph/dijkstra.html) — adjacency-list implementation with a binary heap and the lazy-deletion (skip-stale) pattern for sparse graphs.
- [Dijkstra on dense graphs](https://cp-algorithms.com/graph/dijkstra_dense.html) — the array-scan variant and when it outperforms the heap version.
- [`PriorityQueue<TElement, TPriority>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — .NET's min-priority-queue, which exposes `Enqueue`/`TryDequeue` but no `decrease-key`, forcing the lazy-deletion approach used above.
