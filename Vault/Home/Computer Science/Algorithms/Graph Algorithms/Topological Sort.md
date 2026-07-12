---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Linear ordering of a DAG's vertices that places every edge's source before its target, sequencing dependencies first."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

A build system holds a set of compilation units, each declaring which units must be built before it. Those dependencies form a directed graph: an edge `u → v` means `u` must precede `v`. The recurring question during scheduling is which unit can be built right now — one whose every prerequisite is already built. Topological sort answers that question for the whole graph at once: it produces a linear ordering of the vertices in which every edge points forward, so for each `u → v`, `u` appears before `v`.

Such an order exists only when the dependencies are acyclic. A cycle `a → b → … → a` demands `a` before `b` and `b` before `a` at the same time, which no linear order can satisfy. The construction that emits the order also settles this question: a directed graph admits a topological order exactly when it is acyclic.

**Core condition:** a directed acyclic graph → repeatedly emit a vertex whose prerequisites are all placed → a linear order with every edge pointing forward, in `O(V + E)`.

## One ordering

The trace runs Kahn's algorithm on a seven-vertex DAG, emitting a vertex the moment its in-degree reaches zero.

```steptrace
{"algorithm":"topological-sort","directed":true,"nodes":[{"id":"A"},{"id":"B"},{"id":"C"},{"id":"D"},{"id":"E"},{"id":"F"},{"id":"G"}],"edges":[{"from":"A","to":"B"},{"from":"A","to":"C"},{"from":"B","to":"D"},{"from":"B","to":"E"},{"from":"C","to":"D"},{"from":"C","to":"E"},{"from":"D","to":"F"},{"from":"E","to":"F"},{"from":"F","to":"G"}]}
```

A vertex with in-degree 0 has no unmet dependency — every edge into it would come from a vertex already emitted, and there are none left — so it is safe to place next. Emitting it removes its outgoing edges, which decrements the in-degree of each successor. A successor whose count reaches 0 has just had its last prerequisite satisfied and becomes eligible in turn. The frontier of ready vertices is therefore not fixed; it refills as earlier vertices leave. Here only `A` starts at in-degree 0; emitting it drops both `B` and `C` to 0, so the frontier now holds two vertices at once. Either may go next, and that fork is exactly where distinct valid orders diverge.

## Two constructions, one invariant

Both standard algorithms enforce the same invariant: no edge ends up pointing backward. One realizes it by placing a vertex only after every predecessor is placed; the other by placing a vertex ahead of every vertex reachable from it, since it finishes only after all of them. Either direction produces the same guarantee, that for each `u → v` the vertex `u` precedes `v`.

**Kahn's algorithm** works from in-degrees. Compute each vertex's in-degree, seed a queue with every in-degree-0 vertex, then repeatedly dequeue one, append it to the order, and decrement each successor's in-degree, enqueuing any that reach 0. A vertex enters the queue exactly when its last incoming edge is removed, so it is emitted strictly after all of its predecessors. The queue is just the current set of ready vertices; nothing about the traversal is recursive.

**DFS-based** works from finish times. Run [[DFS BFS|depth-first search]]; when a vertex's recursion finishes — all of its descendants fully explored and already emitted — prepend it to the order (equivalently, push it on a stack and reverse at the end, which is reverse postorder). A vertex finishes after every vertex reachable from it, so prepending on finish puts it ahead of all those descendants in the final order.

The two are valid because they realize the invariant from opposite ends. Kahn's cannot emit `v` until every `u` with `u → v` has already left the queue, so `u` precedes `v`. DFS finishes `v` before `u` whenever `u → v`, so `u`'s larger finish time places it earlier in reverse-finish order. Neither can produce a backward-pointing edge.

## Complexity

Every vertex is handled once and every edge is examined once — when its tail is dequeued in Kahn's, or when it is classified during DFS. The work tracks the graph's size, not its shape, so the two constructions share one tight bound.

| Construction | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Kahn's (in-degree queue) | `Θ(V + E)` | `O(V)` | In-degree counter per vertex plus a queue holding at most `V` ready vertices; each edge decrements one counter once. |
| DFS (reverse postorder) | `Θ(V + E)` | `O(V)` | Color/visited mark per vertex plus a recursion stack up to the longest path; each edge is classified once. |

Best, average, and worst coincide at `Θ(V + E)` — there is no lucky input that does less work and no adversarial input that does more, so a single bound is the honest statement here rather than three identical rows. The `O(V)` auxiliary space excludes the emitted list of `V` vertices. The DFS recursion stack can reach depth `V` on a single long chain, which is the usual reason to prefer Kahn's explicit queue on very deep graphs.

## Where the order fails or splits

A topological order exists if and only if the graph is a DAG, and both constructions surface a violation instead of returning garbage. Kahn's emits fewer than `V` vertices: the vertices trapped behind a cycle keep at least one incoming edge from another cycle member, so their in-degree never reaches 0 and they are never enqueued. DFS reports the cycle the instant it follows an edge to a vertex still open on the recursion stack — a descendant reaching an ancestor, a back edge. Testing the emitted count, or the color, is the acyclicity check; a `null`/`false` result is frequently the answer the caller wanted (which modules form the circular dependency).

The order is generally not unique. Whenever two or more vertices sit at in-degree 0 together — as `B` and `C` do above — the choice between them is free, and any DAG with such a moment admits several valid orders. A deterministic order comes from replacing Kahn's plain queue with a priority queue keyed on the tie-break; taking the smallest label at each step yields the lexicographically smallest order, at the cost of `O(V log V)` for the heap operations.

Direction is load-bearing. An undirected edge carries no before/after, so topological sort is undefined on undirected graphs, and a directed graph with even one cycle has no order at all. Both cases lie outside the DAG precondition and are not repaired by the algorithm — they are detected by it.

## Reference drawer

> [!ABSTRACT]- Kahn's control flow
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

## Comparison

| Approach | Traversal | Order produced | Cycle signal | Tie-break control |
| --- | --- | --- | --- | --- |
| Kahn's | BFS over the in-degree-0 frontier, iterative | Emission order | Fewer than `V` vertices emitted | Priority queue yields a canonical (e.g. lexicographically smallest) order |
| DFS-based | Recursive depth-first | Reverse postorder (decreasing finish time) | Back edge to a vertex on the recursion stack | Fixed by traversal order; no natural tie-break |

Kahn's fits when cycle detection and iterative control matter: the count check is a free acyclicity test, the frontier is an explicit queue with no recursion-depth ceiling, and a priority queue turns it deterministic. DFS reverse-postorder is the compact choice when a recursive traversal is already in place, because it hands back finish times that other algorithms reuse. [[Strongly Connected Components]] detection connects here: Kosaraju's is built on exactly those finish times, while Tarjan's uses DFS discovery indices and low-links, emitting components in reverse topological order as it unwinds. Contracting each strongly connected component of a general digraph to a single vertex gives the condensation, which is always a DAG and therefore topologically sortable even when the original graph is not. A topological order also linearizes any DP or path computation over a DAG: relaxing edges in topological order gives single-source shortest paths in `O(V + E)`, so [[Dijkstra]] — and its non-negative-weight requirement — is unnecessary on an acyclic graph, and the same linear pass additionally handles negative weights and longest paths, which Dijkstra cannot.

## Questions

> [!QUESTION]- Why does a topological order exist only for a DAG?
> A valid order must place `u` before `v` for every edge `u → v`. A cycle `a → b → … → a` would require `a` before `b` and `b` before `a` at once, which is impossible. So an order exists iff the graph is acyclic, and the construction that finds the order doubles as the acyclicity test.

> [!QUESTION]- How does each construction detect a cycle?
> Kahn's only enqueues a vertex when its in-degree reaches 0. A vertex on a cycle keeps at least one incoming edge from another cycle member, so its count never reaches 0 and it is never emitted; an output shorter than `V` means a cycle remains. The DFS construction reports a cycle when it follows an edge to a vertex still open on the recursion stack — a descendant reaching an ancestor.

> [!QUESTION]- Why is the topological order generally not unique, and how is a deterministic one obtained?
> Whenever two or more vertices have in-degree 0 at the same time, either may be emitted next, so most DAGs admit many orders. Keying Kahn's frontier with a priority queue instead of a plain queue fixes the choice — for example always taking the smallest label yields the lexicographically smallest order.

> [!QUESTION]- Why does an acyclic graph make Dijkstra unnecessary for shortest paths?
> On a DAG the vertices can be laid out in topological order and their outgoing edges relaxed in that order in a single `O(V + E)` pass; every edge is relaxed after its source is final. Dijkstra's priority queue and non-negative-weight restriction exist to cope with graphs where such an ordering is impossible, so both are unneeded here — and the linear pass also handles negative weights and longest paths.

## References

- [Topological sorting of large networks (Kahn, 1962)](https://dl.acm.org/doi/10.1145/368996.369025) — the original in-degree/queue construction the algorithm is named after.
- [Topological sorting (Wikipedia)](https://en.wikipedia.org/wiki/Topological_sorting) — both constructions with correctness proofs and the reverse-postorder argument.
- [Topological sort (cp-algorithms)](https://cp-algorithms.com/graph/topological-sort.html) — DFS finish-time implementation, cycle handling, and applications.
- [Course Schedule II (LeetCode #210)](https://leetcode.com/problems/course-schedule-ii/) — topological order with cycle detection as an exercise; returns an empty order when the prerequisites cycle.
