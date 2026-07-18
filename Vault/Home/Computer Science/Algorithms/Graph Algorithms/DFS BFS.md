---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "The two fundamental O(V + E) graph traversals: BFS gives distance ordering by layers, DFS gives depth ordering."
level:
  - "4"
priority: Medium
status: Done
publish: true
---

Reaching every node connected to a source without processing any node twice is the traversal underneath most graph work — reachability, fewest-hop paths, cycle detection, component labelling. Any correct traversal reads each vertex and each edge once, so completing it costs `O(V + E)` no matter how it proceeds. The one open decision is which discovered-but-unexplored node to expand next, and a single container settles it. A queue returns the oldest node in the frontier, so the search widens one distance layer at a time. A stack returns the newest, so the search drives down one branch until it dead-ends and backtracks. BFS is the queue version and DFS the stack version; they share all their machinery — a visited set and a frontier — and that ordering is the only thing distinguishing them.

**Core shape:** source + reachable set → frontier of discovered nodes → queue pops by distance (BFS) or stack pops by depth (DFS) → `O(V + E)` either way, order is the whole difference.

# BFS (Breadth-First Search)

The trace searches for `J` from `A` on a ten-node graph under BFS's queue order.

```steptrace
{"algorithm":"bfs","start":"A","target":"J","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"},{"id":"H"},{"id":"I"},{"id":"J"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"A","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"F"},{"from":"C","to":"G"},{"from":"D","to":"I"},{"from":"E","to":"H"},{"from":"H","to":"J"},{"from":"I","to":"J"}]}
```

Because the queue is FIFO, a node enters the frontier only from one that is a single edge closer to the source, and it leaves before anything discovered later. Every node at distance `k` is therefore dequeued before any node at distance `k+1`. That yields the property BFS is chosen for: the first time it reaches a node is along a path with the fewest edges. Here it dequeues nine nodes — `A, B, C, D, E, F, G, I, H` — before `J`, yet the route it recorded to `J` runs `A → D → I → J`, three edges, the shortest by hop count rather than the four-edge branch through `H`. The frontier holds an entire distance layer at once, so its size tracks the graph's width. Edge weights are invisible to this ordering; a fewest-edges path is a shortest path only when every edge costs the same, which is why weighted graphs fall to [[Dijkstra]] instead.

# DFS (Depth-First Search)

The same query — `J` from `A` on the same graph — runs under stack order.

```steptrace
{"algorithm":"dfs","start":"A","target":"J","nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"},{"id":"H"},{"id":"I"},{"id":"J"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"A","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"F"},{"from":"C","to":"G"},{"from":"D","to":"I"},{"from":"E","to":"H"},{"from":"H","to":"J"},{"from":"I","to":"J"}]}
```

A stack is LIFO, so the most recently discovered neighbour is expanded next and the search commits to one branch before touching its siblings. From `A` it takes the first edge to `B`, then descends `B → E → H → J`, reaching the target after five visits — half of BFS's count — because that branch happened to contain `J`. But it arrives along `A → B → E → H → J`, four edges, not the three-edge route: depth-first order finds *a* path quickly and guarantees nothing about its length. Whether recursive or explicit, DFS holds only the current root-to-frontier path plus each node's unexplored neighbours, so its live memory scales with path depth rather than layer width. The order in which nodes finish — the moment a node has no unexplored neighbours and backtracks — is what powers [[Topological Sort]], [[Strongly Connected Components]], and directed-edge classification.

# Complexity

| Traversal | Time | Auxiliary space | What sets the space |
| --- | --- | --- | --- |
| BFS | `Θ(V + E)` | `O(V)` | Queue holds one full distance layer; the widest layer can approach `V` |
| DFS | `Θ(V + E)` | `O(h)` | Recursion or stack depth equals the current path length `h`, up to `V` |

Each vertex is enqueued or pushed once and each edge inspected once, so a full traversal costs `Θ(V + E)` regardless of strategy; a targeted search can stop the moment it removes the target, `O(1)` in the best case when the target is the source. Space is where the two diverge. On a wide, shallow graph BFS's frontier is large while a DFS path stays short; on a deep, narrow graph the reverse holds, and DFS's `O(h)` is a call-stack cost that becomes a hard failure past the runtime's frame limit. Iterative DFS trades that call stack for an explicit heap-allocated stack of the same order.

# Where the traversal breaks

The visited set is not an optimization; it is what makes traversal terminate. Without it, a cycle `A → B → A` re-enqueues or re-pushes `A` indefinitely, the frontier never empties, and neither traversal returns. Where the mark goes depends on the traversal. BFS marks on enqueue, so a node enters the queue exactly once. Iterative DFS instead marks on pop behind a visited-guard, so a node can sit on the stack more than once yet is recorded and expanded only on its first pop. Either discipline is correct; dropping the mark or the guard is what lets a node be added and processed several times.

Recursive DFS carries its frontier on the call stack, one frame per node on the current path. A graph shaped like a chain of 100k nodes produces a recursion 100k frames deep and overflows the stack before it finishes. Moving the frontier to an explicit heap-allocated stack (in the drawer) keeps DFS's visit order but removes the frame limit. BFS never hits this — its queue already lives on the heap — and instead pays with an `O(V)` frontier on wide graphs.

Cycle detection in a *directed* graph needs more than a visited flag. A boolean flag cannot separate a back edge, into a node still being explored, which closes a cycle, from a cross or forward edge into a node whose exploration already finished, which does not. DFS distinguishes them with three states — unvisited, in-progress (on the current recursion path), and done — and reports a cycle exactly when it follows an edge into an in-progress node. Collapsing in-progress and done into one "visited" bit flags cycles that are not there.

# Reference drawer

> [!ABSTRACT]- Control flow
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
> ```mermaid
> flowchart TD
>   D0[Push source] --> D1{Stack empty}
>   D1 -->|No| D2[Pop v]
>   D2 --> D3{v visited}
>   D3 -->|Yes| D1
>   D3 -->|No| D4[Mark v visited, record v]
>   D4 --> D5[Push each unvisited neighbour of v]
>   D5 --> D1
>   D1 -->|Yes| D6[Done]
> ```

> [!EXAMPLE]- C# implementations
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
>     stack.Push(source);
>
>     while (stack.Count > 0)
>     {
>         var node = stack.Pop();
>         if (visited[node]) continue; // guard: a node can be pushed by several parents
>         visited[node] = true;
>         order.Add(node);
>
>         for (var i = adjacency[node].Count - 1; i >= 0; i--)
>         {
>             var next = adjacency[node][i];
>             if (!visited[next]) stack.Push(next);
>         }
>     }
>
>     return order;
> }
> ```
> BFS marks on enqueue, so a node enters the queue exactly once. Iterative DFS instead marks on pop and re-checks `visited`, because a node can sit on the stack more than once before it is first popped; pushing neighbours in reverse makes the iterative order match recursive DFS.

# Comparison

| Property | BFS | DFS |
| --- | --- | --- |
| Frontier container | FIFO queue | LIFO stack or recursion |
| Visit order | increasing distance from source | deep along one branch, then backtrack |
| First path found to a node | fewest edges (shortest by hop count) | any path, length not bounded |
| Auxiliary space | `O(V)`, scales with graph width | `O(h)`, scales with graph depth |
| Structural signal exposed | distance layers | discovery/finish times, edge classification |
| Typical applications | unweighted shortest path, level order | topological order, SCCs, cycle detection, components |

BFS fits when the answer is a distance or a fewest-edge path and the graph is not so wide that a full layer exhausts memory. DFS fits when the answer depends on finish order or edge type — topological sorts, cycle detection, connectivity — or when the graph is deep and narrow enough that a queued layer would dwarf a single path. Weighted shortest paths belong to neither: ordering by edge count is wrong once edges differ in cost, and [[Dijkstra]] takes over there.

# Questions

> [!QUESTION]- Why does BFS return a fewest-edge path while DFS does not?
> The FIFO queue dequeues nodes in nondecreasing distance from the source, so the first time BFS reaches a node it is along a path with the minimum number of edges. DFS's LIFO stack commits to one branch, so it can reach a node through a longer branch before a shorter one would surface; the first path it records carries no length guarantee.

> [!QUESTION]- What sets BFS versus DFS auxiliary space, and when does each lose?
> BFS's queue holds a full distance layer, so its space is `O(V)` and grows with graph width — a wide, shallow graph can put most vertices in the frontier at once. DFS's frontier is the current root-to-node path, `O(h)`; a deep, narrow graph makes that path long, and recursive DFS then overflows the call stack.

> [!QUESTION]- Why is a visited set required for termination, and when must a node be marked?
> Without it, a cycle re-adds a node to the frontier forever and the traversal never ends. A node must be marked at discovery, when it enters the frontier, because between discovery and expansion it can be reached from several neighbours; marking only at expansion lets duplicates accumulate in BFS, and in iterative DFS forces a second `visited` check at pop time.

> [!QUESTION]- Why does directed cycle detection need three states rather than a visited flag?
> A visited flag cannot tell a back edge, into a node still on the current DFS path and therefore closing a cycle, from a cross or forward edge into a node whose subtree already finished. Tracking unvisited, in-progress, and done marks a cycle only when an edge leads into an in-progress node.

# References

- [Breadth-first search](https://en.wikipedia.org/wiki/Breadth-first_search) — algorithm description, the fewest-edge-path property, and standard applications.
- [Depth-first search](https://en.wikipedia.org/wiki/Depth-first_search) — edge classification, finish-time ordering, and applications to cycle detection and topological sort.
- [Undirected graphs](https://algs4.cs.princeton.edu/41graph/) — Sedgewick & Wayne reference implementations of both traversals over an adjacency-list graph, with connected-component labelling.
- [Breadth-first search](https://cp-algorithms.com/graph/breadth-first-search.html) — iterative queue implementation and the shortest-path-by-edges construction.
- [Depth-first search](https://cp-algorithms.com/graph/depth-first-search.html) — recursive and explicit-stack forms, back edges, and the in-progress/done state machine for cycle detection.
