---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Topological sort produces a linear ordering of the vertices of a **directed acyclic graph (DAG)** such that for every edge `u → v`, `u` comes before `v`. In plain terms: it sequences tasks so that every dependency is satisfied before the thing that depends on it. It only exists for a DAG — a cycle means a circular dependency with no valid order. It's the engine behind build systems (compile order), task/job schedulers, package managers resolving dependencies, course prerequisites, and spreadsheet recalculation.

## How It Works

Two standard algorithms, both **O(V + E)**:

- **Kahn's algorithm (BFS / in-degree)** — compute each node's in-degree, start a queue with all in-degree-0 nodes (no dependencies), repeatedly remove one, append it to the order, and decrement its neighbours' in-degrees, enqueuing any that hit 0. If you output fewer than V nodes, the graph had a **cycle**.
- **DFS-based** — depth-first search; when a node's recursion *finishes* (all descendants done), push it onto a stack. The reversed stack is a valid topological order. Detect cycles via the grey/black coloring (a back-edge to a node on the current stack = cycle).

Kahn's is usually preferred in practice: it detects cycles naturally and avoids recursion-depth limits.

## Example

Kahn's algorithm:

```csharp
public static List<int>? TopoSort(int n, List<int>[] adj)
{
    var inDeg = new int[n];
    foreach (var edges in adj)
        foreach (var v in edges) inDeg[v]++;

    var queue = new Queue<int>();
    for (int i = 0; i < n; i++)
        if (inDeg[i] == 0) queue.Enqueue(i);   // no dependencies

    var order = new List<int>();
    while (queue.Count > 0)
    {
        int u = queue.Dequeue();
        order.Add(u);
        foreach (var v in adj[u])
            if (--inDeg[v] == 0) queue.Enqueue(v);
    }

    return order.Count == n ? order : null;     // null ⇒ a cycle exists
}
```

## Pitfalls

- **Cycles have no topological order** — this is not an edge case to ignore; it's *the* validity check. Kahn's flags it (fewer than V nodes emitted); DFS flags it (a back-edge). Skipping the check produces a silently truncated/invalid order. A "we got a cycle" result is often itself the useful answer (e.g. "circular dependency between modules A and B").
- **Only valid on directed graphs** — an undirected edge has no before/after; topological sort is meaningless without direction.
- **Order is not unique** — any node with no remaining dependencies can come next, so a DAG usually has many valid orders. If you need a *specific* tie-break (e.g. lexicographically smallest), use a **priority queue** instead of a plain queue in Kahn's.
- **DFS recursion depth** — the recursive DFS version can `StackOverflow` on long dependency chains (10k+); prefer Kahn's or an explicit stack.

## Tradeoffs

| Algorithm | Style | Cycle detection | Notes |
|---|---|---|---|
| **Kahn's** | BFS, in-degree queue | Natural (count < V) | No recursion; easy lexicographic tie-break via priority queue |
| **DFS-based** | Post-order + reverse | Grey/black back-edge | Elegant; risks deep recursion; gives finish-time ordering for free |

**Decision rule**: default to **Kahn's** — it's iterative, detects cycles cleanly, and adapts to ordered tie-breaks. Use the DFS version when you already need DFS finish times (e.g. computing strongly connected components with Tarjan/Kosaraju). Topological order is also the prerequisite for **DAG shortest/longest paths** in O(V + E) and for DP over a DAG.

## Questions

> [!QUESTION]- Why does a topological sort only exist for a DAG?
> A valid order requires every edge `u → v` to place `u` before `v`. A cycle `a → b → … → a` would require `a` before `b` and `b` before `a` simultaneously — impossible. So the order exists **iff** the graph is acyclic, which is why both algorithms double as cycle detectors.

> [!QUESTION]- How does Kahn's algorithm detect a cycle?
> It only ever enqueues nodes whose in-degree has reached 0 (all dependencies resolved). Nodes inside a cycle never reach in-degree 0, so they're never emitted. If the produced order contains fewer than V nodes, the leftover nodes form (or depend on) a cycle.

> [!QUESTION]- Is the topological order unique?
> Generally no. Whenever multiple nodes have no outstanding dependencies, any of them may come next, so most DAGs admit many valid orders. To get a deterministic or "smallest" order, replace Kahn's queue with a priority queue keyed by your tie-break rule.

## References

- [Topological sorting (Wikipedia)](https://en.wikipedia.org/wiki/Topological_sorting) — Kahn's and DFS algorithms with correctness proofs.
- [Topological sort (cp-algorithms)](https://cp-algorithms.com/graph/topological-sort.html) — DFS implementation and applications.
- [Course Schedule II (LeetCode #210)](https://leetcode.com/problems/course-schedule-ii/) — topological sort with cycle detection as a coding exercise.
