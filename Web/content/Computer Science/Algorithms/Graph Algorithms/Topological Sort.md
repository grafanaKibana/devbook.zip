---
publish: true
created: 2026-08-20T20:41:15.520Z
modified: 2026-08-20T20:41:15.520Z
published: 2026-08-20T20:41:15.520Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Linear ordering of a DAG's vertices that places every edge's source before its target, sequencing dependencies first.
level:
  - "4"
priority: High
status: Ready to Repeat
---

A build system needs an order that respects every dependency. Model each prerequisite as an edge `u → v`, meaning `u` must be built before `v`. A topological sort produces a linear vertex order in which every edge points forward, so `u` appears before `v` for each such edge.

The order exists only when the dependency graph is acyclic. A cycle `a → b → … → a` eventually requires `a` to precede itself. Both standard constructions detect that contradiction while attempting to build the order: a directed graph is topologically sortable exactly when it is a DAG.

````tabsdown
tab: Visualization


```steptrace
{"algorithm":"topological-sort","directed":true,"nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"B","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"D"},{"from":"C","to":"E"},{"from":"D","to":"F"},{"from":"E","to":"F"},{"from":"F","to":"G"}]}
```


A vertex with in-degree 0 has no unmet dependency — every edge into it would come from a vertex already emitted, and there are none left — so it is safe to place next. Emitting it removes its outgoing edges, which decrements the in-degree of each successor. A successor whose count reaches 0 has just had its last prerequisite satisfied and becomes eligible in turn. The frontier of ready vertices is therefore not fixed; it refills as earlier vertices leave. Here only `A` starts at in-degree 0; emitting it drops both `B` and `C` to 0, so the frontier now holds two vertices at once. Either may go next, and that fork is exactly where distinct valid orders diverge.


Both standard algorithms enforce the same invariant: no edge ends up pointing backward. One realizes it by placing a vertex only after every predecessor is placed; the other by placing a vertex ahead of every vertex reachable from it, since it finishes only after all of them. Either direction produces the same guarantee, that for each `u → v` the vertex `u` precedes `v`.

**Kahn's algorithm** works from in-degrees. Compute each vertex's in-degree, seed a queue with every in-degree-0 vertex, then repeatedly dequeue one, append it to the order, and decrement each successor's in-degree, enqueuing any that reach 0. A vertex enters the queue exactly when its last incoming edge is removed, so it is emitted strictly after all of its predecessors. The queue is just the current set of ready vertices; nothing about the traversal is recursive.

**DFS-based** works from finish times. Run [[Computer Science/Algorithms/Graph Algorithms/DFS BFS|depth-first search]]; when a vertex's recursion finishes — all of its descendants fully explored and already emitted — prepend it to the order (equivalently, push it on a stack and reverse at the end, which is reverse postorder). A vertex finishes after every vertex reachable from it, so prepending on finish puts it ahead of all those descendants in the final order.

The two are valid because they realize the invariant from opposite ends. Kahn's cannot emit `v` until every `u` with `u → v` has already left the queue, so `u` precedes `v`. DFS finishes `v` before `u` whenever `u → v`, so `u`'s larger finish time places it earlier in reverse-finish order. Neither can produce a backward-pointing edge.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Topological Sort complexity",
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
          "operation": "Kahn's (in-degree queue)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "DFS (reverse postorder)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + m)",
              "curveId": "linear"
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
          "operation": "Kahn's (in-degree queue)",
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
          "operation": "DFS (reverse postorder)",
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
````

# Where the Order Fails or Splits

Both constructions expose a cycle instead of returning a partial order as if it were valid. Kahn's emits fewer than `V` vertices because every vertex trapped in a cycle keeps an incoming edge and never reaches in-degree 0. DFS detects a back edge to a vertex still open on the recursion stack. The emitted count or DFS color state is therefore part of the result, not an optional check.

The order is usually not unique. Whenever several vertices have in-degree 0 at once, as `B` and `C` do above, any of them may be chosen next. A fixed tie-break is needed when downstream work expects a reproducible order.

Direction carries the dependency meaning. An undirected edge says nothing about which endpoint comes first, so topological sort is defined only for directed input. A cycle in that directed graph leaves no valid order, and both constructions detect it.

# Diagram and C# Implementation

> [!ABSTRACT]- Kahn's control flow
>
> ```mermaid
> flowchart TD
>   A[Compute in-degree of every vertex] --> B[Enqueue all in-degree-0 vertices]
>   B --> C{Queue non-empty}
>   C -->|Yes| E[Dequeue u, append to order]
>   E --> F[Decrement in-degree of each successor]
>   F --> G[Enqueue successors that reached 0]
>   G --> C
>   C -->|No| D{Emitted V vertices}
>   D -->|Yes| H[Return order]
>   D -->|No| I[Cycle remains: no valid order]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static List<int>? TopoSort(int n, List<int>[] adj)
> {
>     var inDeg = new int[n];
>     foreach (var edges in adj)
>         foreach (var v in edges) inDeg[v]++;
>
>     var queue = new Queue<int>();
>     for (int i = 0; i < n; i++)
>         if (inDeg[i] == 0) queue.Enqueue(i);   // no dependencies
>
>     var order = new List<int>();
>     while (queue.Count > 0)
>     {
>         int u = queue.Dequeue();
>         order.Add(u);
>         foreach (var v in adj[u])
>             if (--inDeg[v] == 0) queue.Enqueue(v);
>     }
>
>     return order.Count == n ? order : null;     // null ⇒ a cycle exists
> }
> ```
>
> Swapping the `Queue<int>` for a `PriorityQueue<int, int>` keyed on the vertex label produces the lexicographically smallest order without changing the cycle check.

# Comparison

| Approach | Traversal | Order produced | Cycle signal | Tie-break control |
| --- | --- | --- | --- | --- |
| Kahn's | BFS over the in-degree-0 frontier, iterative | Emission order | Fewer than `V` vertices emitted | Priority queue yields a canonical (e.g. Lexicographically smallest) order |
| DFS-based | Recursive depth-first | Reverse postorder (decreasing finish time) | Back edge to a vertex on the recursion stack | Fixed by traversal order. No natural tie-break |

Kahn's fits iterative schedulers. Its queue makes the ready frontier explicit, the emitted-count check detects cycles, and a priority queue gives deterministic tie-breaking without recursion. DFS reverse postorder is shorter when a recursive traversal already exists and finish times will be reused.

[[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly Connected Components]] connect the two ideas. Kosaraju's algorithm uses DFS finish times, while Tarjan's emits components in reverse topological order as it unwinds. Contracting every SCC in a general digraph produces a DAG, so the condensation remains topologically sortable even when the original graph is cyclic. Path computations on that DAG can follow the order directly instead of using [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]].

# References

- [Topological sorting of large networks (Kahn, 1962)](https://dl.acm.org/doi/10.1145/368996.369025)
- [Topological sort (cp-algorithms)](https://cp-algorithms.com/graph/topological-sort.html)
