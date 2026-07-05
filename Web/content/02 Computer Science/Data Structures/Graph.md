---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

Graphs model relationships between entities using vertices (nodes) and edges. Unlike trees, graphs can have cycles, multiple paths between nodes, and no single root. In .NET, there is no built-in `Graph<T>` type — you compose graphs from `Dictionary<TNode, List<TNode>>` for adjacency lists, `bool[,]` for adjacency matrices, and `PriorityQueue<TElement, int>` for weighted shortest-path algorithms. A production example: a microservice dependency graph with 200 services uses BFS from a failing service node to identify all downstream services affected by the outage, generating an automated blast radius report in under 50 ms.

## Deeper Explanation

The most common representation is an adjacency list: each node maps to its neighbors. Adjacency lists cost O(V + E) space and are efficient for sparse graphs where E ≪ V².

**Adjacency matrix** costs O(V²) space and offers O(1) edge-existence checks, but wastes memory on sparse graphs. In .NET, a `bool[,]` or `int[,]` can serve as a matrix.

**Weighted graphs** extend either representation: an adjacency list becomes `Dictionary<int, List<(int neighbor, int weight)>>`, while a matrix stores `int[,]` with a sentinel (0 or `int.MaxValue`) for absent edges. Dijkstra's algorithm requires weights and pairs naturally with `PriorityQueue<TElement, int>` in .NET for O((V + E) log V) performance.

**Directed vs undirected**: Directed graphs (digraphs) model one-way relationships — `A → B` does not imply `B → A` — and require asymmetric adjacency structures. Undirected graphs store each edge in both directions. Most shortest-path algorithms (Dijkstra, Bellman-Ford) operate on directed graphs; connectivity checks work on either.

## Structure

```mermaid
graph TD
    A[node a] --> B[node b]
    A --> C[node c]
    B --> D[node d]
    C --> D
```

### Example

```csharp
var graph = new Dictionary<string, List<string>>
{
    ["A"] = new() { "B", "C" },
    ["B"] = new() { "D" },
    ["C"] = new(),
    ["D"] = new()
};
```

### Pitfalls

- **Infinite loops without cycle detection** — a DFS or BFS that does not track visited nodes will loop forever on cyclic graphs. Always maintain a `HashSet<TNode>` of visited nodes. In production, a service health checker without cycle detection caused a CPU spike to 100% when a circular dependency was introduced between services.
- **Stack overflow on recursive DFS** — graphs with 10K+ nodes and deep chains blow the default 1 MB .NET stack. Use iterative DFS with an explicit `Stack<TNode>` for unknown-depth graphs.
- **Adjacency matrix on sparse graphs** — a matrix for 10K nodes costs 100M entries (400 MB for `int[,]`), even if only 50K edges exist. An adjacency list for the same graph costs O(V + E) = roughly 60K entries. Always match representation to graph density.

### Tradeoffs

- Adjacency list is better for sparse graphs.
- Adjacency matrix can be useful for dense graphs with fixed node sets.
- `PriorityQueue<TElement, TPriority>` is useful for weighted shortest-path algorithms.

## Core Algorithms

The data structure only matters in service of the algorithms that run on it. The ones worth knowing cold:

| Problem | Algorithm | Complexity | Notes |
|---|---|---|---|
| Reachability / shortest path (unweighted) | **BFS** | O(V + E) | Queue + visited set; layer = distance |
| Explore / detect cycles / components | **DFS** | O(V + E) | Recursion or explicit `Stack`; color nodes white/grey/black to detect back-edges |
| Shortest path, non-negative weights | **Dijkstra** | O((V + E) log V) | `PriorityQueue`; **fails with negative weights** |
| Shortest path, negative weights allowed | **Bellman–Ford** | O(V·E) | Detects negative cycles |
| All-pairs shortest paths | **Floyd–Warshall** | O(V³) | Dense graphs / small V |
| Order a DAG by dependencies | **Topological sort** | O(V + E) | Kahn's (in-degree queue) or DFS post-order; only valid on a DAG |
| Minimum spanning tree | **Prim / Kruskal** | O(E log V) | Kruskal pairs with [[02 Computer Science/Algorithms/Union-Find\|Union-Find]] |
| Connectivity / dynamic union | **Union-Find** | ~O(α(n)) | Near-constant with path compression — see [[02 Computer Science/Algorithms/Union-Find\|Union-Find]] |

The two decisions that trip people up: **use BFS, not Dijkstra, for unweighted shortest paths** (same answer, far simpler), and **switch from Dijkstra to Bellman–Ford the moment any edge weight can be negative** (Dijkstra's greedy "settle once" assumption breaks).

## Questions

> [!QUESTION]- Which collections are typically used for BFS?
> `Queue<T>` for frontier and `HashSet<T>` for visited tracking.

> [!QUESTION]- When must you use Bellman–Ford instead of Dijkstra?
> When edges can have negative weights. Dijkstra settles each node once on the assumption that a shorter path can never appear later — negative edges violate that. Bellman–Ford relaxes all edges V−1 times and can also report a negative cycle.

> [!QUESTION]- How do you detect a cycle in a directed graph during DFS?
> Three-color marking: white (unvisited), grey (on the current recursion stack), black (fully explored). Encountering a grey node via an edge means a back-edge → a cycle. (Topological sort via Kahn's algorithm detects the same condition: leftover nodes with non-zero in-degree.)

## Links

- [Collections and data structures overview](https://learn.microsoft.com/en-us/dotnet/standard/collections/) — Microsoft overview of built-in collection types; graphs are typically composed from these primitives.
- [PriorityQueue<TElement, TPriority> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — API reference for the priority queue used in weighted graph algorithms like Dijkstra.
- [.NET libraries update with Dijkstra example](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries#collections) — .NET 9 release notes showing PriorityQueue usage in a real Dijkstra implementation.
- [Dijkstra test implementation in dotnet runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections/tests/Generic/PriorityQueue/PriorityQueue.Tests.Dijkstra.cs) — reference implementation of Dijkstra using .NET collections.
