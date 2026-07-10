---
topic:
  - Computer Science
subtopic:
  - Algorithms
tags:
  - FolderNote
publish: true
level:
  - '4'
status: Creation
priority: High
---

# Intro

Graphs model relationships: networks, dependencies, routes, permissions, and many real-world system structures. Graph algorithms help you traverse, rank, and optimize those relationships efficiently. Example: shortest-path algorithms answer "what's the cheapest route" while BFS/DFS answer "what's reachable".

## Diagram

```mermaid
flowchart TD
  A[Graph problem] --> B{Need reachability or levels}
  B -->|Yes| C[DFS BFS]
  B -->|No| D{Need minimum path cost}
  D -->|Yes with non negative weights| E{Have a heuristic to the target}
  E -->|Yes| E1[A Star Search]
  E -->|No| E2[Dijkstra]
  D -->|Can have negative edges| F[Bellman Ford]
  D -->|Need all pairs shortest paths| G[Floyd Warshall]
  A --> H{Need structure not distance}
  H -->|Cheapest way to connect every node| I[Minimum Spanning Tree]
  H -->|Mutually reachable groups in a digraph| J[Strongly Connected Components]
  H -->|Single points of failure| K[Articulation Points and Bridges]
  H -->|Throughput through a capacitated network| L[Maximum Flow]
```

## Algorithm Selection

### Shortest path

| Algorithm | Solves | Time | Constraint |
| --- | --- | --- | --- |
| [[DFS BFS]] | Reachability, shortest path by edge count | O(V + E) | Unweighted graphs |
| [[DFS BFS]] | Cycle detection, topological sort, components | O(V + E) | Any graph |
| [[Dijkstra]] | Single-source shortest path | O((V + E) log V) | Non-negative weights |
| [[A* Search]] | Point-to-point shortest path | O((V + E) log V), far fewer nodes expanded | Non-negative weights **and** an admissible heuristic |
| [[Greedy Best-First Search]] | Fast point-to-point path, not optimal | O((V + E) log V) | Heuristic only; sacrifices optimality for speed |
| [[Bidirectional Search]] | Point-to-point shortest path | O(b^(d/2)) vs O(b^d) | Target known; graph must be reversible |
| [[Bellman-Ford]] | Single-source shortest path | O(V·E) | Handles negative edges; detects negative cycles |
| [[Floyd-Warshall]] | All-pairs shortest path | O(V³) | Small/dense graphs; detects negative cycles |

### Structure and connectivity

| Algorithm | Solves | Time | Constraint |
| --- | --- | --- | --- |
| [[Minimum Spanning Tree]] | Cheapest edge set connecting all vertices | O(E log V) | Connected, undirected, weighted |
| [[Topological Sort]] | Linear order respecting dependencies | O(V + E) | Directed acyclic graph |
| [[Strongly Connected Components]] | Maximal mutually-reachable vertex sets | O(V + E) | Directed graphs |
| [[Articulation Points and Bridges]] | Cut vertices and cut edges | O(V + E) | Undirected graphs |
| [[Maximum Flow]] | Max s–t throughput; min cut | O(V·E²) (Edmonds–Karp) | Capacitated network |

## Questions

> [!QUESTION]- When do you pick BFS over DFS?
> - BFS is preferred for shortest path by edge count in unweighted graphs.
> - DFS is preferred for deep traversal tasks like cycle detection and topological ordering.
> - BFS uses more memory on wide graphs because of the frontier queue.
> - Both are O(V+E), so pick by the property you need, not by speed: BFS guarantees shortest paths but its frontier can hold a whole layer; DFS uses depth-bounded memory but gives no distance guarantee.

> [!QUESTION]- Why is Dijkstra not valid with negative edges?
> - Dijkstra assumes once a node is finalized, its best distance is known.
> - Negative edges can later produce a shorter route to a finalized node.
> - Bellman Ford handles negative edges by repeated relaxation.
> - Dijkstra is faster (O((V+E) log V)) but only valid with non-negative weights; Bellman–Ford accepts negative edges at O(V·E) — pay the slower cost only when weights can go negative.

> [!QUESTION]- Adjacency list or adjacency matrix?
> - Adjacency list is the default for sparse graphs (most real-world graphs): O(V+E) space and efficient neighbor iteration.
> - Adjacency matrix uses O(V²) space but answers "is there an edge A→B?" in O(1).
> - In .NET, `Dictionary<T, List<T>>` is a common adjacency-list implementation.
> - The list saves memory and speeds traversal on sparse graphs; the matrix trades O(V²) memory for constant-time edge checks, so reach for it only on dense graphs or edge-query-heavy workloads.

## References

- [Graph algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Graph_algorithm)
- [Introduction to algorithms graph lectures MIT](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)
- [Graph algorithms cp algorithms](https://cp-algorithms.com/graph/)
- [Graph algorithms (Sedgewick and Wayne, Algorithms 4th ed.)](https://algs4.cs.princeton.edu/40graphs/) — Practitioner-oriented chapter covering graph representations, traversal implementations, and shortest-path algorithms with Java code and performance analysis.
