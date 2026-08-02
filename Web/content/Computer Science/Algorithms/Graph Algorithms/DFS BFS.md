---
publish: true
created: 2026-07-18T14:02:43.943Z
modified: 2026-08-01T18:31:33.340Z
published: 2026-08-01T18:31:33.340Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "The two fundamental O(V + E) graph traversals: BFS gives distance ordering by layers, DFS gives depth ordering."
level:
  - "4"
priority: Medium
status: Done
---

Reaching every node connected to a source without processing any node twice is the traversal underneath most graph work — reachability, fewest-hop paths, cycle detection, component labelling. Any correct traversal reads each vertex and each edge once, so completing it costs `O(V + E)` no matter how it proceeds. The one open decision is which discovered-but-unexplored node to expand next, and a single container settles it. A queue returns the oldest node in the frontier, so the search widens one distance layer at a time. A stack returns the newest, so the search drives down one branch until it dead-ends and backtracks. BFS is the queue version and DFS the stack version; they share all their machinery — a visited set and a frontier — and that ordering is the only thing distinguishing them.

**Core shape:** source + reachable set → frontier of discovered nodes → queue pops by distance (BFS) or stack pops by depth (DFS) → `O(V + E)` either way, order is the whole difference.

````tabsdown
tab: Visualization



~~~~tabsdown
tab: BFS (Breadth-First Search)

```steptrace
{"algorithm":"bfs","start":"A","target":"J","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"},{"id":"H"},{"id":"I"},{"id":"J"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"A","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"F"},{"from":"C","to":"G"},{"from":"D","to":"I"},{"from":"E","to":"H"},{"from":"H","to":"J"},{"from":"I","to":"J"}]}
```

# BFS (Breadth-First Search)

The trace searches for `J` from `A` on a ten-node graph under BFS's queue order.

Because the queue is FIFO, a node enters the frontier only from one that is a single edge closer to the source, and it leaves before anything discovered later. Every node at distance `k` is therefore dequeued before any node at distance `k+1`. That yields the property BFS is chosen for: the first time it reaches a node is along a path with the fewest edges. Here it dequeues nine nodes — `A, B, C, D, E, F, G, I, H` — before `J`, yet the route it recorded to `J` runs `A → D → I → J`, three edges, the shortest by hop count rather than the four-edge branch through `H`. The frontier holds an entire distance layer at once, so its size tracks the graph's width. Edge weights are invisible to this ordering; a fewest-edges path is a shortest path only when every edge costs the same, which is why weighted graphs fall to [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] instead.



tab: DFS (Depth-First Search)

```steptrace
{"algorithm":"dfs","start":"A","target":"J","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"},{"id":"H"},{"id":"I"},{"id":"J"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"A","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"F"},{"from":"C","to":"G"},{"from":"D","to":"I"},{"from":"E","to":"H"},{"from":"H","to":"J"},{"from":"I","to":"J"}]}
```

# DFS (Depth-First Search)

The same query — `J` from `A` on the same graph — runs under stack order.

A stack is LIFO, so the most recently discovered neighbour is expanded next and the search commits to one branch before touching its siblings. From `A` it takes the first edge to `B`, then descends `B → E → H → J`, reaching the target after five visits — half of BFS's count — because that branch happened to contain `J`. But it arrives along `A → B → E → H → J`, four edges, not the three-edge route: depth-first order finds *a* path quickly and guarantees nothing about its length. Recursive DFS or an iterator-frame implementation holds the current path in `O(h)` frontier space; the eager vertex stack shown below can hold `O(V)` discovered vertices. The order in which nodes finish — the moment a node has no unexplored neighbours and backtracks — is what powers [[Computer Science/Algorithms/Graph Algorithms/Topological Sort|Topological Sort]], [[Computer Science/Algorithms/Graph Algorithms/Strongly Connected Components|Strongly Connected Components]], and directed-edge classification.

~~~~

tab: Complexity

```complexity
{
  "version": 2,
  "label": "DFS BFS complexity",
  "variables": {
    "edgeCount": {
      "symbol": "E",
      "description": "number of edges"
    },
    "vertexCount": {
      "symbol": "V",
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
              "kind": "text",
              "role": "Time",
              "formula": "Θ(V + E)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "DFS",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(V + E)"
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
              "formula": "O(V)",
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
              "formula": "O(V)",
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

# Complexity

| Traversal | Time | Auxiliary space | What sets the space |
| --- | --- | --- | --- |
| BFS | `Θ(V + E)` | `O(V)` | Queue holds one full distance layer; the widest layer can approach `V` |
| DFS | `Θ(V + E)` | `O(V)` | The visited set is `O(V)`; an eager explicit stack can also hold `O(V)`, while recursion or iterator frames use `O(h)` frontier space |

Each vertex is enqueued or pushed once and each edge inspected once, so a full traversal costs `Θ(V + E)` regardless of strategy; a targeted search can stop the moment it removes the target, `O(1)` in the best case when the target is the source. Both traversals need an `O(V)` visited set. BFS's queue and an eager explicit DFS stack can each grow to `O(V)`; recursive DFS or an iterator-frame implementation adds only `O(h)` frontier frames, but recursion becomes a hard failure past the runtime's frame limit.

# Where the Traversal Breaks

The visited set is not an optimization; it is what makes traversal terminate. Without it, a cycle `A → B → A` re-enqueues or re-pushes `A` indefinitely, the frontier never empties, and neither traversal returns. Both implementations below mark on discovery, before adding a node to the frontier, so each vertex is queued or stacked exactly once. Marking only when a node is removed can accumulate duplicate frontier entries and loses that bound unless a second visited guard rejects them.

Recursive DFS carries its frontier on the call stack, one frame per node on the current path. A graph shaped like a chain of 100k nodes produces a recursion 100k frames deep and overflows the stack before it finishes. Moving the frontier to an explicit heap-allocated stack (in the drawer) removes the frame limit, but that eager vertex stack can hold `O(V)` discovered nodes. BFS already keeps its queue on the heap and likewise has an `O(V)` worst-case frontier.

Cycle detection in a _directed_ graph needs more than a visited flag. A boolean flag cannot separate a back edge, into a node still being explored, which closes a cycle, from a cross or forward edge into a node whose exploration already finished, which does not. DFS distinguishes them with three states — unvisited, in-progress (on the current recursion path), and done — and reports a cycle exactly when it follows an edge into an in-progress node. Collapsing in-progress and done into one "visited" bit flags cycles that are not there.

# Reference Drawer

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
> Both implementations mark on discovery, so each node enters its frontier once. DFS pushes neighbours in reverse to preserve the adjacency-list order on tree-shaped branches; cross edges can still make an eager explicit-stack order differ from recursive DFS.

# Comparison

| Property | BFS | DFS |
| --- | --- | --- |
| Frontier container | FIFO queue | LIFO stack or recursion |
| Visit order | increasing distance from source | deep along one branch, then backtrack |
| First path found to a node | fewest edges (shortest by hop count) | any path, length not bounded |
| Auxiliary space | `O(V)` visited + up to `O(V)` queue | `O(V)` visited + up to `O(V)` eager stack; recursive/iterator frontier is `O(h)` |
| Structural signal exposed | distance layers | discovery/finish times, edge classification |
| Typical applications | unweighted shortest path, level order | topological order, SCCs, cycle detection, components |

BFS fits when the answer is a distance or a fewest-edge path and the graph is not so wide that a full layer exhausts memory. DFS fits when the answer depends on finish order or edge type — topological sorts, cycle detection, connectivity. Recursive or iterator-frame DFS can keep its frontier to the current path, while the eager explicit-stack version trades that bound for freedom from call-stack overflow. Weighted shortest paths belong to neither: ordering by edge count is wrong once edges differ in cost, and [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] takes over there.

# Questions

> [!QUESTION]- Why does BFS return a fewest-edge path while DFS does not?
> The FIFO queue dequeues nodes in nondecreasing distance from the source, so the first time BFS reaches a node it is along a path with the minimum number of edges. DFS's LIFO stack commits to one branch, so it can reach a node through a longer branch before a shorter one would surface; the first path it records carries no length guarantee.

> [!QUESTION]- What sets BFS versus DFS auxiliary space, and when does each lose?
> Both need an `O(V)` visited set. BFS can queue an entire distance layer, and an eager iterative DFS can stack `O(V)` discovered vertices. Recursive DFS or an iterator-frame DFS keeps only the current `O(h)` path, but a deep graph can then overflow the call stack.

> [!QUESTION]- Why is a visited set required for termination, and when must a node be marked?
> Without it, a cycle re-adds a node to the frontier forever and the traversal never ends. Marking at discovery, before enqueue or push, guarantees one frontier entry per vertex. Marking only at expansion permits duplicates and requires a second visited check when the node is removed.

> [!QUESTION]- Why does directed cycle detection need three states rather than a visited flag?
> A visited flag cannot tell a back edge, into a node still on the current DFS path and therefore closing a cycle, from a cross or forward edge into a node whose subtree already finished. Tracking unvisited, in-progress, and done marks a cycle only when an edge leads into an in-progress node.

# References

- [Introduction to Algorithms, Chapter 20](https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/) — primary textbook treatment of breadth-first and depth-first search, including predecessor trees, discovery/finish times, and `Θ(V + E)` analysis.
- [Undirected graphs](https://algs4.cs.princeton.edu/41graph/) — Sedgewick & Wayne reference implementations of both traversals over an adjacency-list graph, with connected-component labelling.
- [Breadth-first search](https://cp-algorithms.com/graph/breadth-first-search.html) — iterative queue implementation and the shortest-path-by-edges construction.
- [Depth-first search](https://cp-algorithms.com/graph/depth-first-search.html) — recursive and explicit-stack forms, back edges, and the in-progress/done state machine for cycle detection.
