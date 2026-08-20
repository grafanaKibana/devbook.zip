---
publish: true
created: 2026-08-20T20:41:15.514Z
modified: 2026-08-20T20:41:15.514Z
published: 2026-08-20T20:41:15.514Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "The two fundamental graph traversals: BFS gives distance ordering by layers, DFS gives depth ordering."
level:
  - "4"
priority: Medium
status: Done
---

Reachability, fewest-hop paths, cycle detection, and component labelling all build on graph traversal. The central decision is which discovered vertex should be expanded next. A queue picks the oldest frontier entry, so breadth-first search widens one distance layer at a time. A stack picks the newest, so depth-first search follows one branch until it runs out and then backtracks. Both use a visited set and a frontier. Their ordering produces different guarantees.

````tabsdown
tab: Visualization


~~~~tabsdown
tab: BFS (Breadth-First Search)

```steptrace
{"algorithm":"bfs","start":"A","target":"J","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"},{"id":"H"},{"id":"I"},{"id":"J"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"A","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"F"},{"from":"C","to":"G"},{"from":"D","to":"I"},{"from":"E","to":"H"},{"from":"H","to":"J"},{"from":"I","to":"J"}]}
```


Because the queue is FIFO, a node enters the frontier only from one that is a single edge closer to the source, and it leaves before anything discovered later. Every node at distance `k` is therefore dequeued before any node at distance `k+1`. That yields the property BFS is chosen for: the first time it reaches a node is along a path with the fewest edges. Here it dequeues nine nodes — `A, B, C, D, E, F, G, I, H` — before `J`, yet the route it recorded to `J` runs `A → D → I → J`, three edges, the shortest by hop count rather than the four-edge branch through `H`. The frontier holds an entire distance layer at once, so its size tracks the graph's width. Edge weights are invisible to this ordering. A fewest-edges path is a shortest path only when every edge costs the same, which is why weighted graphs fall to [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] instead.


tab: DFS (Depth-First Search)

```steptrace
{"algorithm":"dfs","start":"A","target":"J","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"},{"id":"H"},{"id":"I"},{"id":"J"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"A","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"F"},{"from":"C","to":"G"},{"from":"D","to":"I"},{"from":"E","to":"H"},{"from":"H","to":"J"},{"from":"I","to":"J"}]}
```


A stack is LIFO, so the most recently discovered neighbour is expanded next and the search commits to one branch before touching its siblings. From `A` it takes the first edge to `B`, then descends `B → E → H → J`, reaching the target after five visits — half of BFS's count — because that branch happened to contain `J`. But it arrives along `A → B → E → H → J`, four edges, not the three-edge route: depth-first order finds *a* path quickly and guarantees nothing about its length. The order in which nodes finish — the moment a node has no unexplored neighbours and backtracks — is what powers [[Computer Science/Algorithms/Graph Algorithms/Topological Sort|Topological Sort]], [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly Connected Components]], and directed-edge classification.

~~~~

tab: Complexity

```complexity
{
  "version": 2,
  "label": "DFS BFS complexity",
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
          "operation": "BFS",
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
          "operation": "DFS",
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
          "operation": "BFS",
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
          "operation": "DFS",
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

# Where the Traversal Breaks

The visited set makes traversal terminate. Without it, a cycle such as `A → B → A` adds `A` to the frontier forever. Both implementations mark a vertex when it is discovered, before enqueueing or pushing it, so each vertex enters the frontier once. Marking only during expansion permits duplicates unless another guard rejects them.

Recursive DFS stores one call frame per vertex on the current path. A chain of 100k vertices can therefore exhaust the call stack before the traversal finishes.

Cycle detection in a _directed_ graph needs more than a visited flag. A back edge into a vertex still being explored closes a cycle. An edge into a finished vertex does not. DFS separates these cases with `unvisited`, `in-progress`, and `done` states. An edge to an in-progress vertex reports a cycle. Collapsing the last two states into one bit creates false positives.

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   B0[Enqueue source, mark visited] --> B1{Queue empty}
>   B1 -->|No| B2[Dequeue front v, record v]
>   B2 --> B3[For each neighbour u of v]
>   B3 --> B4{u visited}
>   B4 -->|No| B5[Mark u visited, enqueue u]
>   B4 -->|Yes| B3
>   B5 --> B3
>   B1 -->|Yes| B6[Done]
> ```
>
> ```mermaid
> flowchart TD
>   D0[Mark source visited, push source] --> D1{Stack empty}
>   D1 -->|No| D2[Pop v]
>   D2 --> D4[Record v]
>   D4 --> D5[Mark and push each unvisited neighbour of v]
>   D5 --> D1
>   D1 -->|Yes| D6[Done]
> ```

> [!EXAMPLE]- C# implementations
>
> ```csharp
> public static IReadOnlyList<int> Bfs(IReadOnlyList<int>[] adjacency, int source)
> {
>     var order = new List<int>();
>     var visited = new bool[adjacency.Length];
>     var queue = new Queue<int>();
>
>     visited[source] = true;          // mark on discovery, so each node enqueues once
>     queue.Enqueue(source);
>
>     while (queue.Count > 0)
>     {
>         var node = queue.Dequeue();
>         order.Add(node);
>
>         foreach (var next in adjacency[node])
>         {
>             if (visited[next]) continue;
>             visited[next] = true;
>             queue.Enqueue(next);
>         }
>     }
>
>     return order;
> }
>
> public static IReadOnlyList<int> Dfs(IReadOnlyList<int>[] adjacency, int source)
> {
>     var order = new List<int>();
>     var visited = new bool[adjacency.Length];
>     var stack = new Stack<int>();
>
>     visited[source] = true;
>     stack.Push(source);
>
>     while (stack.Count > 0)
>     {
>         var node = stack.Pop();
>         order.Add(node);
>
>         for (var i = adjacency[node].Count - 1; i >= 0; i--)
>         {
>             var next = adjacency[node][i];
>             if (visited[next]) continue;
>             visited[next] = true;
>             stack.Push(next);
>         }
>     }
>
>     return order;
> }
> ```
>
> Both implementations mark on discovery, so each node enters its frontier once. DFS pushes neighbours in reverse to preserve the adjacency-list order on tree-shaped branches. Cross edges can still make an eager explicit-stack order differ from recursive DFS.

# Comparison

BFS fits distance and fewest-edge queries while a full layer still fits in memory. DFS fits problems driven by finish order or edge type, including topological sorting and cycle detection. Recursive or iterator-frame DFS keeps the active frontier to the current path. The eager explicit-stack form avoids call-stack overflow but may store more pending neighbours. Neither traversal solves weighted shortest paths. Once edge costs differ, [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] supplies the required cost ordering for non-negative weights.

# References

- [Undirected graphs](https://algs4.cs.princeton.edu/41graph/)
