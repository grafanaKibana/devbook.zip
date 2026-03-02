---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Creation
dg-publish: true
---

# Intro

Graphs model relationships between entities using vertices and edges. In .NET, graph structures are commonly implemented with collection primitives like `Dictionary<TNode, List<TNode>>`.

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

- Missing cycle detection can cause infinite traversal loops.
- Recursive DFS can overflow stack for deep graphs.
- Choosing matrix representation for sparse graphs wastes memory.

### Tradeoffs

- Adjacency list is better for sparse graphs.
- Adjacency matrix can be useful for dense graphs with fixed node sets.
- `PriorityQueue<TElement, TPriority>` is useful for weighted shortest-path algorithms.

## Questions

> [!QUESTION]- Does .NET provide a built-in `Graph<T>` type?
> No. You usually build graphs using `Dictionary`, `List`, `HashSet`, and `Queue`/`Stack`.

> [!QUESTION]- Which collections are typically used for BFS?
> `Queue<T>` for frontier and `HashSet<T>` for visited tracking.

## Links

- [Collections and data structures overview](https://learn.microsoft.com/en-us/dotnet/standard/collections/) — Microsoft overview of built-in collection types; graphs are typically composed from these primitives.
- [PriorityQueue<TElement, TPriority> class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — API reference for the priority queue used in weighted graph algorithms like Dijkstra.
- [.NET libraries update with Dijkstra example](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9/libraries#collections) — .NET 9 release notes showing PriorityQueue usage in a real Dijkstra implementation.
- [Dijkstra test implementation in dotnet runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections/tests/Generic/PriorityQueue/PriorityQueue.Tests.Dijkstra.cs) — reference implementation of Dijkstra using .NET collections.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/02 Computer Science|02 Computer Science]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Data Structures/Dictionary|Dictionary]]
> - [[Software Engineering/02 Computer Science/Data Structures/HashMap|HashMap]]
> - [[Software Engineering/02 Computer Science/Data Structures/HashSet|HashSet]]
> - [[Software Engineering/02 Computer Science/Data Structures/Hashtable|Hashtable]]
> - [[Software Engineering/02 Computer Science/Data Structures/Heap|Heap]]
> - [[Software Engineering/02 Computer Science/Data Structures/LinkedList|LinkedList]]
> - [[Software Engineering/02 Computer Science/Data Structures/List|List]]
> - [[Software Engineering/02 Computer Science/Data Structures/Queue|Queue]]
> - [[Software Engineering/02 Computer Science/Data Structures/Span|Span]]
> - [[Software Engineering/02 Computer Science/Data Structures/Stack|Stack]]
> - [[Software Engineering/02 Computer Science/Data Structures/Trees|Trees]]
<!-- whats-next:end -->
