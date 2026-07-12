---
publish: true
created: 2026-07-12T14:27:20.399Z
modified: 2026-07-12T14:27:20.400Z
published: 2026-07-12T14:27:20.400Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Best-first shortest-path search ordering its frontier by f(n) = g(n) + h(n), optimal when the heuristic is admissible.
level:
  - "4"
priority: High
status: Creation
---

# Intro

To find the shortest route to one destination on a road graph, [[Dijkstra]] settles nodes in expanding rings of cost-from-source: reaching a target 10 km east, it also settles nodes 10 km north, west, and south first. Almost none of that work touches the optimal path. A\* keeps the same cost accounting but reorders the frontier by an estimate of _total_ path cost, `f(n) = g(n) + h(n)` — `g(n)` is the exact cost already paid to reach `n`, and `h(n)` is a heuristic estimate of the cost still remaining to the goal. Popping the smallest-`f` node first pulls the search toward the target, collapsing that settled disc into a narrow corridor.

The saving holds only when `h` never overestimates the remaining cost. A heuristic that underestimates keeps A\* honest; one that overestimates can make it commit to a node that looks close but is not, and return a longer path with no error raised. [[Dijkstra]] is the degenerate case `h ≡ 0` — no goal information, uniform rings, still optimal.

**Core condition:** single target + an admissible `h` (never overestimates remaining cost) → order the frontier by `f = g + h` → optimal path while settling a fraction of Dijkstra's nodes.

The decisive step is which node leaves the frontier next, and how `h` skews that choice toward the goal.

> [!NOTE] Visualization pending
> Planned StepTrace: a frontier ordered by `f = g + h`, expanding the lowest-`f` node first, the heuristic biasing expansion toward the goal. The decisive frame is a node with small `g` but large `h` losing its turn to a node deeper along the goal direction. No matching renderer exists in `engine.js` yet.

## Why `f = g + h` stays optimal

Each iteration pops the frontier node with the smallest `f`, relaxes its outgoing edges, and pushes any neighbor whose `g` improves; `g[source] = 0` and `f[source] = h(source)` seed the search. Two properties of `h` decide whether the result is correct.

**Admissibility** — `h(n)` never exceeds the true remaining cost `h*(n)`. This alone makes A\* return an optimal path. When the goal is popped, `h(goal) = 0`, so its `f` equals its `g`: the exact cost of the path found. Any other frontier node `n` has `f(n) = g(n) + h(n) ≤ g(n) + h*(n)`, a lower bound on the best path through `n`; if that lower bound is no smaller than the goal's cost, no cheaper path is hiding on the frontier. Underestimating is safe — it only makes A\* inspect a node sooner than strictly necessary.

**Consistency (monotonicity)** — `h(n) ≤ cost(n, n') + h(n')` for every edge `(n, n')`, with `h(goal) = 0`. Consistency implies admissibility and adds a stronger guarantee: `f` never decreases along a path, so the first time a node is popped its `g` is already optimal. Graph-search A\* can then move that node to a closed set and never reconsider it — each node is expanded at most once.

The pull is concrete: on a 4-connected grid with Manhattan `h`, a node reached in `g = 3` that sits toward the goal (`h = 2`, `f = 5`) is popped before an equal-cost node reached in `g = 3` that faces away (`h = 5`, `f = 8`). Dijkstra ranks both by `g` alone and expands the second as readily as the first. That `h` term is the whole difference between a corridor and a disc, and setting `h ≡ 0` erases it — which is exactly what turns A\* back into [[Dijkstra]].

## Complexity

| Case | Time (node expansions) | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(L)`, `L` = optimal-path length | `O(nodes stored)` | `h` equals the true remaining cost, so A\* expands only nodes on the optimal path. |
| Typical | between `Θ(L)` and `O(b^L)` | `O(nodes stored)` | An informative admissible `h` prunes off-path branches; the effective branching factor drops below the raw `b`. |
| Worst | `O(b^L)` | `O(b^L)` | `h` carries no goal information (`h ≡ 0`, uninformed search); every node cheaper than the goal is expanded. |

Each expansion also does a heap pop plus edge relaxations, a `log(frontier)` factor over the raw expansion counts. On an _explicit_ finite graph those counts are capped by the graph itself: a consistent heuristic expands each of the `V` nodes at most once, giving `O((V + E) log V)` — precisely Dijkstra's bound, which is what `h ≡ 0` reduces to. The exponential figures belong to _implicit_ state spaces generated on the fly, where quality of `h` is the only thing bounding the search. Space is the operational limit in either setting: A\* retains every generated node across the open and closed sets, so memory, not time, is what fails first on large maps.

## When the heuristic breaks the guarantee

An **inadmissible** `h` overestimates the remaining cost for at least one node somewhere in the graph. That overestimate is harmless where it lands off the optimal path and never wins a pop. Optimality breaks only when an inflated `f` pre-empts the true optimal path — a node on that path (or one whose `f` should have been popped before the goal) is delayed, so A\* pops the goal through a cheaper-looking detour first. It returns _a_ path, just not the cheapest, and signals nothing. Weighted A\* makes exactly this trade deliberately: `f = g + ε·h` with `ε > 1` scales the heuristic up, expanding far fewer nodes for a path guaranteed within a factor `ε` of optimal. `ε = 1` is exact A\*; `ε → ∞` approaches greedy behavior.

An admissible but **inconsistent** `h` keeps optimality for the tree-search form but breaks the single-expansion property. Because `f` can dip along a path, a shorter `g` to an already-closed node can surface later. Graph-search A\* that refuses to revisit closed nodes then finalizes that node with a non-optimal `g`, corrupting every path routed through it. The remedy is reopening — pulling the node back onto the frontier when a cheaper `g` appears — which restores optimality at the cost of the re-expansions consistency would have avoided.

The binding limit is memory. A\* holds every generated node across the open frontier and the closed set, `O(nodes stored)`, and on a large state space that exhausts memory long before time. IDA\* trades it back: an iterative-deepening variant that keeps only the current path (`O(L)` memory) and re-expands nodes across successive `f`-cost thresholds. Weighted A\* attacks the same limit from the other side, shrinking the frontier by biasing toward the goal at a bounded loss of optimality.

## Reference drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Push source with f equals h of source] --> B{Frontier empty}
>   B -->|Yes| Z[No path exists]
>   B -->|No| C[Pop node u with smallest f]
>   C --> D{u is the goal}
>   D -->|Yes| Y[Reconstruct path from parents]
>   D -->|No| E[For each edge u to v with weight w]
>   E --> F{g of u plus w less than g of v}
>   F -->|Yes| G[Update g of v, set f to g plus h of v, set parent]
>   G --> H[Push v onto the frontier]
>   H --> E
>   F -->|No| E
>   E --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static IReadOnlyList<int>? AStar(
>     int source,
>     int goal,
>     Func<int, IEnumerable<(int next, double weight)>> neighbors,
>     Func<int, double> heuristic)
> {
>     var g = new Dictionary<int, double> { [source] = 0 };
>     var parent = new Dictionary<int, int>();
>     var closed = new HashSet<int>();
>     var open = new PriorityQueue<int, double>();
>     open.Enqueue(source, heuristic(source));
>
>     while (open.TryDequeue(out var u, out _))
>     {
>         if (u == goal)
>         {
>             return Reconstruct();
>         }
>
>         if (!closed.Add(u))
>         {
>             continue; // a cheaper copy of u was already expanded
>         }
>
>         foreach (var (v, w) in neighbors(u))
>         {
>             var tentative = g[u] + w;
>             if (tentative < g.GetValueOrDefault(v, double.PositiveInfinity))
>             {
>                 g[v] = tentative;
>                 parent[v] = u;
>                 open.Enqueue(v, tentative + heuristic(v)); // f = g + h
>             }
>         }
>     }
>
>     return null;
>
>     List<int> Reconstruct()
>     {
>         var path = new List<int> { goal };
>         for (var at = goal; parent.TryGetValue(at, out var prev); at = prev)
>         {
>             path.Add(prev);
>         }
>         path.Reverse();
>         return path;
>     }
> }
> ```
>
> .NET's `PriorityQueue<TElement, TPriority>` has no decrease-key, so an improved node is enqueued again rather than updated; the `closed` guard discards the stale higher-`f` copy when it later surfaces. Dropping that guard — reopening — is what an inconsistent heuristic requires to stay optimal.

## Questions

> [!QUESTION]- What does admissibility guarantee, and what does consistency add on top?
> Admissibility (`h(n)` never exceeds the true remaining cost) makes A\* return an optimal path: when the goal is popped its `f` equals its actual cost, and every frontier node's `f` is a lower bound on any path through it, so nothing cheaper is hidden. Consistency (`h(n) ≤ cost(n, n') + h(n')`) additionally forces `f` to be non-decreasing along a path, so a node's first pop is already optimal — graph-search A\* can close it and never reopen it, expanding each node at most once.

> [!QUESTION]- An inadmissible heuristic returns a longer path with no error. What causes that?
> Overestimating the remaining cost for a node on the true optimal path inflates that node's `f`. A\* then pops the goal through a cheaper-looking detour before it expands the node on the real shortest path. The search still terminates and returns a valid path — just not the minimum-cost one — because the inflated `f` reordered the frontier against the optimum. Weighted A\* (`f = g + ε·h`, `ε > 1`) does this on purpose for a path bounded within `ε` of optimal.

> [!QUESTION]- Why is memory the usual failure mode, and what do IDA\* and weighted A\* trade for it?
> A\* keeps every generated node in the open frontier and closed set, `O(nodes stored)`, which on a large state space exhausts memory before running out of time. IDA\* keeps only the current path (`O(L)` memory) and re-expands nodes across rising `f`-cost thresholds, paying repeated work for a small footprint. Weighted A\* keeps A\*'s structure but scales `h` to shrink the frontier, trading a bounded loss of optimality for fewer stored nodes.

## References

- [A\* search algorithm (Wikipedia)](https://en.wikipedia.org/wiki/A*_search_algorithm) — formal definition, the admissibility and consistency proofs, and weighted and memory-bounded variants.
- [Amit's A\* Pages (Stanford, Amit Patel)](https://theory.stanford.edu/~amitp/GameProgramming/) — the practical reference for grid heuristics (Manhattan, Chebyshev, octile, Euclidean) and matching `h` to the movement model.
- [Introduction to A\* (Red Blob Games)](https://www.redblobgames.com/pathfinding/a-star/introduction.html) — interactive walkthrough of Dijkstra, Greedy Best-First, and A\* on the same map, showing the corridor-versus-disc difference.
- [A Formal Basis for the Heuristic Determination of Minimum Cost Paths (Hart, Nilsson, Raphael 1968)](https://ieeexplore.ieee.org/document/4082128) — the original paper introducing A\* and proving optimality under an admissible heuristic.
