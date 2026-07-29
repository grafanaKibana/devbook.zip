---
publish: true
created: 2026-07-18T14:02:43.935Z
modified: 2026-07-28T20:49:05.970Z
published: 2026-07-28T20:49:05.970Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Best-first shortest-path search ordered by f(n) = g(n) + h(n): admissibility gives optimality when improved states reopen, while consistency permits close-once graph search."
level:
  - "4"
priority: High
status: Creation
---

To find the shortest route to one destination on a road graph, [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] settles nodes in expanding rings of cost-from-source: reaching a target 10 km east, it also settles nodes 10 km north, west, and south first. Almost none of that work touches the optimal path. A\* keeps the same cost accounting but reorders the frontier by an estimate of _total_ path cost, `f(n) = g(n) + h(n)` — `g(n)` is the exact cost already paid to reach `n`, and `h(n)` is a heuristic estimate of the cost still remaining to the goal. Popping the smallest-`f` node first pulls the search toward the target, collapsing that settled disc into a narrow corridor.

The optimality guarantee holds when `h` never overestimates the remaining cost. A heuristic that underestimates keeps A\* honest when the search reopens a state after finding a cheaper path; consistency adds the stronger condition needed to close each state after its first expansion. One that overestimates can make A\* commit to a node that looks close but is not, and return a longer path with no error raised. [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] is the degenerate case `h ≡ 0` — no goal information, uniform rings, still optimal.

**Core condition:** single target + an admissible `h` + reopen a state when its `g` improves → order the frontier by `f = g + h` → an optimal path, often after expanding fewer nodes than Dijkstra. If `h` is consistent, each state may instead be closed after its first expansion.

The decisive step is which node leaves the frontier next, and how `h` skews that choice toward the goal.

```steptrace
{"tabs":[{"name":"Coordinate grid","description":"A winding 6 × 4 grid makes the heuristic steer around two barriers.","algorithm":"a-star","variant":"coordinate-grid"},{"name":"Cities","description":"Choose From and To in Options; Haversine distance guides a route across 25 regional centers.","algorithm":"a-star","variant":"ukraine-cities","start":"Lviv","target":"Kharkiv"},{"name":"Building floor","description":"A locked fire door blocks the direct corridor, forcing a lower-corridor detour.","algorithm":"a-star","variant":"building-floor"},{"name":"Midtown map","description":"One-way streets and a West 44th closure force the route onto Broadway.","algorithm":"a-star","variant":"midtown-map"}]}
```

# Why `f = g + h` Stays Optimal

Each iteration pops the frontier node with the smallest `f`, relaxes its outgoing edges, and pushes any neighbor whose `g` improves; `g[source] = 0` and `f[source] = h(source)` seed the search. Two properties of `h` decide whether the result is correct.

**Admissibility** — `h(n)` never exceeds the true remaining cost `h*(n)`. With reopening, this is enough for A\* to return an optimal path. Before a suboptimal goal could be popped, take the first state `n` on an optimal path that has not yet been settled with its optimal cost. Its predecessor has been settled optimally, so relaxation has placed an OPEN record for `n` with `g(n) = g*(n)`; if `n` was previously expanded through a worse path, reopening restores that record to OPEN. Therefore `f(n) = g*(n) + h(n) ≤ g*(n) + h*(n)`, which equals the optimal solution cost. Because A\* pops the smallest `f` and `f(goal) = g(goal)`, it cannot pop a more expensive goal first. Underestimating is safe — it only makes A\* inspect a node sooner than strictly necessary.

**Consistency (monotonicity)** — `h(n) ≤ cost(n, n') + h(n')` for every edge `(n, n')`, with `h(goal) = 0`. Consistency implies admissibility and adds a stronger guarantee: `f` never decreases along a path, so the first time a node is popped its `g` is already optimal. Graph-search A\* can then move that node to a closed set and never reconsider it — each node is expanded at most once.

The pull is concrete: on a 4-connected grid with Manhattan `h`, a node reached in `g = 3` that sits toward the goal (`h = 2`, `f = 5`) is popped before an equal-cost node reached in `g = 3` that faces away (`h = 5`, `f = 8`). Dijkstra ranks both by `g` alone and expands the second as readily as the first. That `h` term is the whole difference between a corridor and a disc, and setting `h ≡ 0` erases it — which is exactly what turns A\* back into [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]].

# Complexity

| Case | Time (node expansions) | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(d)`, `d` = optimal solution depth | `O(nodes stored)` | With a unique optimal route and favorable tie-breaking, exact `h*` keeps expansion to that route. |
| Typical | between `Θ(d)` and `O(b^d)` for uniform edge costs | `O(nodes stored)` | An informative admissible `h` reduces off-path expansion; the effective branching factor drops below the maximum branching factor `b`. |
| Worst | `O(b^d)` for uniform edge costs | `O(b^d)` | `h` carries no goal information (`h ≡ 0`, uninformed search); every node cheaper than the goal may be expanded. |

Exact `h*` does not make the best case automatic: every state on an optimal route that is reached with `g = g*` has `f = C*`, so multiple optimal routes or unfavorable tie-breaking can still expand many tied states. The `O(b^d)` bound assumes unit or uniform positive edge costs. With arbitrary positive weights, let `δ` be the minimum edge cost and `C*` the optimal solution cost; the corresponding depth bound is `O(b^{⌊C*/δ⌋})`. Each expansion also does a heap pop plus edge relaxations, a `log(frontier)` factor over the raw expansion counts. On an _explicit_ finite graph those counts are capped by the graph itself: a consistent heuristic expands each of the `V` nodes at most once, giving `O((V + E) log V)` — precisely Dijkstra's bound, which is what `h ≡ 0` reduces to. The exponential figures belong to _implicit_ state spaces generated on the fly, where quality of `h` is the only thing bounding the search. Space is the operational limit in either setting: A\* retains every generated node across the open and closed sets, so memory, not time, is what fails first on large maps.

# When the Heuristic Breaks the Guarantee

An **inadmissible** `h` overestimates the remaining cost for at least one node somewhere in the graph. That overestimate is harmless where it lands off the optimal path and never wins a pop. Optimality breaks only when an inflated `f` pre-empts the true optimal path — a node on that path (or one whose `f` should have been popped before the goal) is delayed, so A\* pops the goal through a cheaper-looking detour first. It returns _a_ path, just not the cheapest, and signals nothing. Weighted A\* makes exactly this trade deliberately: `f = g + ε·h` with `ε > 1` scales an admissible base heuristic up. Under standard goal-pop termination, its factor-`ε` bound holds with reopening; it also holds without reopening when the base heuristic is consistent. `ε = 1` is exact A\*; `ε → ∞` approaches greedy behavior.

An admissible but **inconsistent** `h` keeps optimality for the tree-search form but breaks the single-expansion property. Because `f` can dip along a path, a shorter `g` to an already-closed node can surface later. Graph-search A\* that refuses to revisit closed nodes then finalizes that node with a non-optimal `g`, corrupting every path routed through it. The remedy is reopening — pulling the node back onto the frontier when a cheaper `g` appears — which restores optimality at the cost of the re-expansions consistency would have avoided.

The binding limit is memory. A\* holds every generated node across the open frontier and the closed set, `O(nodes stored)`, and on a large state space that exhausts memory long before time. IDA\* trades it back: an iterative-deepening variant that keeps only the current path (`O(d)` memory) and re-expands nodes across successive `f`-cost thresholds. Weighted A\* attacks the same limit from the other side, shrinking the frontier by biasing toward the goal. With an admissible base heuristic and standard goal-pop termination, reopening gives the factor-`ε` bound; a consistent base heuristic preserves the same bound without reopening.

# Reference Drawer

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
>             continue; // the optimal copy of u was already expanded
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
> This implementation assumes a consistent heuristic, so a node's first pop has its optimal `g` and the `closed` guard may reject later stale copies. .NET's `PriorityQueue<TElement, TPriority>` has no decrease-key, so an improved node is enqueued again rather than updated. With an admissible but inconsistent heuristic, the search must instead reopen a closed node when its `g` improves and use a termination rule compatible with those re-expansions.

# Questions

> [!QUESTION]- What does admissibility guarantee, and what does consistency add on top?
> Admissibility (`h(n)` never exceeds the true remaining cost) makes A\* optimal when a cheaper path can reopen a state. Before a suboptimal goal could be popped, the frontier contains a node on an optimal path discovered with its optimal `g`, and that node has `f` no greater than the optimal solution cost. Consistency (`h(n) ≤ cost(n, n') + h(n')`) additionally forces `f` to be non-decreasing along a path, so a node's first pop is already optimal — graph-search A\* can close it and never reopen it, expanding each node at most once.

> [!QUESTION]- How can an inadmissible heuristic return a longer path with no error?
> Overestimating the remaining cost for a node on the true optimal path inflates that node's `f`. A\* then pops the goal through a cheaper-looking detour before it expands the node on the real shortest path. The search still terminates and returns a valid path — just not the minimum-cost one — because the inflated `f` reordered the frontier against the optimum. Weighted A\* (`f = g + ε·h`, `ε > 1`) makes this trade deliberately. With an admissible base `h` and standard goal-pop termination, its factor-`ε` bound holds with reopening, or without reopening when the base heuristic is consistent.

> [!QUESTION]- Why is memory the usual failure mode, and what do IDA\* and weighted A\* trade for it?
> A\* keeps every generated node in the open frontier and closed set, `O(nodes stored)`, which on a large state space exhausts memory before running out of time. IDA\* keeps only the current path (`O(d)` memory) and re-expands nodes across rising `f`-cost thresholds, paying repeated work for a small footprint. Weighted A\* keeps A\*'s structure but scales an admissible base `h` to shrink the frontier. With standard goal-pop termination, the factor-`ε` bound holds with reopening, or without reopening when the base heuristic is consistent.

# References

- [A\* search algorithm (Wikipedia)](https://en.wikipedia.org/wiki/A*_search_algorithm) — formal definition, the admissibility and consistency proofs, and weighted and memory-bounded variants.
- [Amit's A\* Pages (Stanford, Amit Patel)](https://theory.stanford.edu/~amitp/GameProgramming/) — the practical reference for grid heuristics (Manhattan, Chebyshev, octile, Euclidean) and matching `h` to the movement model.
- [Introduction to A\* (Red Blob Games)](https://www.redblobgames.com/pathfinding/a-star/introduction.html) — interactive walkthrough of Dijkstra, Greedy Best-First, and A\* on the same map, showing the corridor-versus-disc difference.
- [A Formal Basis for the Heuristic Determination of Minimum Cost Paths (Hart, Nilsson, Raphael 1968)](https://ieeexplore.ieee.org/document/4082128) — the original paper introducing A\* and proving optimality under an admissible heuristic.
