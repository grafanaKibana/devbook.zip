---
publish: true
created: 2026-08-20T20:41:15.518Z
modified: 2026-08-20T20:41:15.518Z
published: 2026-08-20T20:41:15.518Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Finds the greatest s-to-t throughput in a capacitated network by repeatedly augmenting paths in a residual graph.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A directed network carries a divisible resource such as water or bandwidth from a source `s` to a sink `t`. Every edge `u → v` has a **capacity** that bounds what it can carry. A valid flow stays within those capacities, and every vertex other than `s` and `t` sends out exactly what it receives. The **maximum-flow** problem asks for the greatest total rate leaving `s` and reaching `t`.

Pushing flow along any `s → t` path with spare capacity looks reasonable, but a pure [[Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] choice can stop below the optimum. An early path may saturate an edge that the best solution routes around, leaving no forward path that can correct the choice.

The **residual graph** makes that choice reversible. An edge carrying flow `f` out of capacity `c` contributes a forward arc with residual `c − f`, the room left, and a backward arc with residual `f`, the amount that can be retracted. Traversing a backward arc cancels earlier flow and routes it elsewhere. The algorithm repeatedly finds an augmenting `s → t` path in the residual graph and pushes its bottleneck capacity. When no such path remains, the flow value equals the capacity of the minimum `s`-`t` cut.

The transition worth animating is a backward arc in the residual graph retracting an earlier, suboptimal augmenting path.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"maximum-flow"}
```


Take the unit-capacity network `s→a, s→b, a→b, a→t, b→t`; its maximum flow is 2, since only `s→a` and `s→b` leave the source. A greedy first augmentation along `s → a → b → t` saturates all three of its edges and reports flow 1. Every remaining forward path is now blocked — `s→a` and `b→t` are full — so a forward-only algorithm stops one unit short.

The residual graph reopens the choice. Sending one unit `a → b` created a backward arc `b → a` with residual 1. The path `s → b → a → t` uses that backward arc: `b → a` retracts the earlier `a → b` unit and reroutes it, so `a → b` returns to zero while `s→a→t` and `s→b→t` each carry one unit. Flow reaches 2. The backward arc is the entire reason a locally-committed, wrong routing decision can be undone; forward-only residuals leave no legal move to reach that state, which is exactly why greedy-without-residuals returns a value below the maximum.


An `s`-`t` **cut** splits the vertices into `S` (containing `s`) and `T` (containing `t`); its capacity is the total capacity of the original edges crossing `S → T`. Any flow value is bounded by any cut capacity, because everything reaching `t` must cross the partition. The **max-flow min-cut theorem** sharpens that to equality: the maximum flow equals the minimum cut capacity.

The theorem also names the cut. When no augmenting path remains, let `S` be the vertices still reachable from `s` in the final residual graph; `t ∉ S`, or a path would exist. Every original edge from `S` to `T` is saturated — an unsaturated one would keep a forward residual arc and extend reachability — and no flow crosses back from `T` to `S`, so the cut capacity equals the flow value. Reachability in the residual graph is therefore a checkable optimality certificate: it both proves the flow is maximal and reads off the bottleneck edges. The cut side `S` comes from the *residual* reachable set, but the reported edges are the *original* forward edges out of `S`.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Maximum Flow complexity",
  "variables": {
    "edgeCount": {
      "symbol": "m",
      "description": "number of edges"
    },
    "flowValue": {
      "symbol": "f",
      "description": "integral maximum-flow value"
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
          "operation": "Ford–Fulkerson (any augmenting path)",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(m·f) for integral capacities"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Edmonds–Karp (BFS shortest path)",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(n·m²)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Dinic (level graph + blocking flow)",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(n²·m)"
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
          "operation": "Ford–Fulkerson (any augmenting path)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Edmonds–Karp (BFS shortest path)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Dinic (level graph + blocking flow)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n + m)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

The chart describes adjacency-list implementations. The drawer's capacity-matrix Edmonds–Karp scans `V²` cells per BFS and stores a `V × V` residual matrix, changing its bounds to `O(V³E)` time and `O(V²)` auxiliary space. It returns the maximum-flow value only; opposite-direction capacity and reverse cancellation share residual cells, so it does not reconstruct flow per original antiparallel edge.
````

# Where the Guarantees Break

The residual mechanism exposes two sharp boundaries.

**Irrational capacities with adversarial path choice.** Plain Ford–Fulkerson may choose augmenting paths with ever-smaller bottlenecks whose sum converges below the true maximum. The loop never terminates. This comes from the interaction between path selection and irrational capacities.

**Omitting the backward arcs.** A forward-only residual graph cannot undo earlier flow. On the `s→a→b→t` network above, dropping the paired reverse arcs leaves the algorithm stalled at flow 1 because `s → b → a → t` never appears. The result looks valid and is silently suboptimal. A common implementation guard stores paired edges consecutively, making the reverse of edge `i` available as `i XOR 1`. Adding flow to one arc then subtracts it from its partner.

# Diagram and C# Implementation

> [!ABSTRACT]- Augmenting-path loop
>
> ```mermaid
> flowchart TD
>   A[Zero flow; residual = capacities] --> B{Augmenting path s→t in residual?}
>   B -->|No| C[Return flow; min cut = edges out of s-reachable set]
>   B -->|Yes| D[Bottleneck = min residual on the path]
>   D --> E[Add bottleneck to forward arcs, subtract on reverse arcs]
>   E --> B
> ```

> [!EXAMPLE]- Capacity-matrix Edmonds–Karp in C#
>
> ```csharp
> public static long MaxFlow(long[,] capacity, int source, int sink)
> {
>     if (source == sink)
>     {
>         throw new ArgumentException("Source and sink must differ.");
>     }
>
>     int n = capacity.GetLength(0);
>     var residual = (long[,])capacity.Clone();
>     long maxFlow = 0;
>
>     while (true)
>     {
>         // BFS for a shortest augmenting path; parent[v] is v's predecessor.
>         var parent = new int[n];
>         Array.Fill(parent, -1);
>         parent[source] = source;
>         var queue = new Queue<int>();
>         queue.Enqueue(source);
>
>         while (queue.Count > 0 && parent[sink] == -1)
>         {
>             int u = queue.Dequeue();
>             for (int v = 0; v < n; v++)
>             {
>                 if (parent[v] == -1 && residual[u, v] > 0)
>                 {
>                     parent[v] = u;
>                     queue.Enqueue(v);
>                 }
>             }
>         }
>
>         if (parent[sink] == -1)
>         {
>             break; // No augmenting path: the flow is maximal.
>         }
>
>         long bottleneck = long.MaxValue;
>         for (int v = sink; v != source; v = parent[v])
>         {
>             bottleneck = Math.Min(bottleneck, residual[parent[v], v]);
>         }
>
>         for (int v = sink; v != source; v = parent[v])
>         {
>             int u = parent[v];
>             residual[u, v] -= bottleneck; // forward arc down
>             residual[v, u] = checked(residual[v, u] + bottleneck); // reverse arc up
>         }
>
>         maxFlow = checked(maxFlow + bottleneck);
>     }
>
>     return maxFlow;
> }
> ```
>
> This compact matrix variant accepts `capacity[u, v]` and returns only the maximum-flow value. One opposite-direction residual entry combines cancellation capacity with any original antiparallel capacity. Reconstructing flow for each original edge therefore requires paired edge objects.

# Comparison

Edmonds–Karp is the simplest fixed path-selection baseline. It chooses augmenting paths with [[Computer Science/Algorithms/Graph Algorithms/DFS BFS|BFS]], while plain Ford–Fulkerson may use [[Computer Science/Algorithms/Graph Algorithms/DFS BFS|DFS]] or another rule. Dinic keeps the residual-path model and batches augmentations. Its extra machinery pays off on larger networks and matching workloads. Ford–Fulkerson is the model to reason from, not the default implementation, because arbitrary path selection can fail to terminate on irrational capacities.

# References

- [Maximal Flow Through a Network](https://doi.org/10.4153/CJM-1956-045-5)
- [Maximum flow: Ford–Fulkerson and Edmonds–Karp (cp-algorithms)](https://cp-algorithms.com/graph/edmonds_karp.html)
