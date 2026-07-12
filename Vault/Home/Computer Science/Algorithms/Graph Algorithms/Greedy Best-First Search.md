---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Expands whichever node looks closest by heuristic h(n) alone; fast but neither optimal nor complete."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A grid pathfinder has to reach a goal cell and cares more about producing *a* route quickly than about producing the shortest one. A cost-aware search like [[Dijkstra]] weighs the distance already travelled and fans out in every direction, so most of its expansions land on cells that point away from the goal. Greedy Best-First Search discards the accumulated cost and orders its frontier by the heuristic `h(n)` alone — the estimated remaining distance to the goal — so it always expands whichever node currently looks closest and drives almost straight at the target.

That single ranking key is also the whole weakness. Because `g(n)`, the cost paid to reach a node, never enters the comparison, the search cannot separate a short route from a long one that merely ends near the goal. It expands what looks close, not what is cheap: the path it returns can be far longer than necessary, and on an infinite graph it can follow a forever-improving estimate down a branch that never terminates.

**Core condition:** frontier ordered by `h(n)` alone → always expand the node that looks closest → fast and goal-directed, but neither optimal nor complete.

The decisive behaviour is the moment the heuristic selects a node that looks close and commits the search to a longer path.

> [!NOTE] Visualization pending
> Planned StepTrace: a graph-search card showing a frontier ordered by the heuristic `h` alone — always expanding the node that looks closest to the goal, sometimes down a misleading path. No matching renderer exists in `engine.js` yet.

## Ordering by the estimate

The frontier is a priority queue keyed by `h(n)`. Each iteration pops the node with the smallest estimate, and if it is not the goal, pushes every unvisited neighbor keyed by that neighbor's own `h`. The edge weight `w(u, v)` is available but never read; a visited set stops a node from entering the queue twice.

The only property this maintains is that the next node expanded is the one the heuristic currently rates closest to the goal. Nothing ties the order of expansion to the length of the path built so far, which is the guarantee a cost-aware search provides and this one drops. When `h` is accurate and the map is open, the estimate shrinks along an almost straight line and the goal is reached after expanding on the order of `m` nodes. When `h` points into an obstacle, the same rule keeps re-selecting cells that hug the barrier because they still score lowest, and the accumulated `g` that would expose the detour is never consulted.

One framing makes the family relationship exact: [[A-Star Search|A*]] expands by `f = g + h`. Setting `g` to zero collapses `f` to `h`, which is precisely Greedy Best-First — the case where a node's history counts for nothing.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(b·m)` | `O(b·m)` | A near-perfect heuristic guides expansion almost directly to the goal, one productive node per level. |
| Average | between `O(b·m)` and `O(b^m)` | up to `O(b^m)` | Heuristic quality sets how far expansion strays from the direct route. |
| Worst | `O(b^m)` | `O(b^m)` | A misleading heuristic offers no guidance and expansion degrades toward uninformed search. |

`b` is the branching factor and `m` the maximum depth of the search space. Every bound is governed by heuristic quality: a strong `h` keeps the frontier small and the path close to direct, while a weak one distinguishes no better than an uninformed traversal. Like A*, Greedy Best-First holds every generated node in memory, so space tracks the number of nodes generated and is usually the binding limit before time is.

## When the estimate misleads

The h-only ordering fails in three distinct ways, all traceable to the missing `g` term.

**A path that looks close but is long.** Suppose neighbor `A` sits one cell from the goal in straight-line distance (`h(A) = 1`) but reaches it only through a long corridor that winds the far way around, while neighbor `B` is farther in straight line (`h(B) = 5`) yet lies on a short, direct route of about five steps. Greedy Best-First pops `A` first because `1 < 5`, follows the corridor, and returns a route many times the length of the direct route through `B`. `B` is dequeued only after the goal has already been reached, and nothing flags the result as suboptimal — the search optimised "get closer now," never "minimise total cost."

**Loops without a visited set.** With no closed set, a node the search has already left can be re-enqueued, and on a cyclic graph the frontier can oscillate between two low-`h` nodes indefinitely. A visited set bounds any finite graph, but it cannot rescue an infinite one: where `h` keeps improving down a fruitless branch, there is no `g` bound to force the search to abandon that region, so it never terminates.

**A poor heuristic collapses to uninformed search.** If `h` returns near-constant or weakly correlated values, the priority queue no longer separates directions and expansion degrades to an uninformed fan-out, paying the full `O(b^m)`. The concave obstacle is the common concrete case: a wall cupping the goal gives every cell inside the pocket a tempting low `h`, so the search thrashes along the barrier — re-committing to the blocked heading because those cells keep scoring lowest — before it discovers the way around.

## Reference drawer

> [!ABSTRACT]- Control flow
> ```mermaid
> flowchart TD
>   A[Push source keyed by h of source] --> B{Priority queue empty}
>   B -->|Yes| Z[No path found]
>   B -->|No| C[Pop node u with smallest h]
>   C --> D{u is the goal}
>   D -->|Yes| Y[Reconstruct path from parents]
>   D -->|No| E[For each unvisited neighbor v]
>   E --> F[Set parent of v to u and mark visited]
>   F --> G[Push v keyed by h of v, ignoring edge cost]
>   G --> E
>   E --> B
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public static IReadOnlyList<int>? GreedyBestFirstSearch(
>     IReadOnlyList<IReadOnlyList<int>> neighbors,
>     Func<int, int> heuristic,
>     int source,
>     int goal)
> {
>     var frontier = new PriorityQueue<int, int>();
>     var parent = new Dictionary<int, int>();
>     var visited = new HashSet<int> { source };
>     frontier.Enqueue(source, heuristic(source));
>
>     while (frontier.Count > 0)
>     {
>         var u = frontier.Dequeue();
>         if (u == goal)
>         {
>             return Reconstruct(u);
>         }
>
>         foreach (var v in neighbors[u])
>         {
>             if (visited.Add(v))
>             {
>                 parent[v] = u;
>                 frontier.Enqueue(v, heuristic(v)); // key is h(v) alone; edge cost never read
>             }
>         }
>     }
>
>     return null;
>
>     List<int> Reconstruct(int node)
>     {
>         var path = new List<int> { node };
>         while (parent.TryGetValue(node, out var previous))
>         {
>             node = previous;
>             path.Add(node);
>         }
>         path.Reverse();
>         return path;
>     }
> }
> ```
> The priority key is `heuristic(v)` with no `g` term, so the frontier orders by estimated distance to the goal alone. `visited` guarantees termination on a finite graph but says nothing about path length.

## Comparison

| Strategy | Frontier key | Time (worst) | Optimal | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Greedy Best-First | `h(n)` | `O(b^m)` | No | Any acceptable path is needed fast and `h` is strong | Path cost matters, or `h` is weak or the geometry is concave |
| [[A-Star Search\|A*]] | `f = g + h` | `O(b^m)` | Yes, with an admissible `h` | A shortest path is required while still exploiting a heuristic | Stores and re-expands more nodes, so memory is the ceiling |
| [[Dijkstra]] | `g(n)` | `O((V + E) log V)` | Yes | Optimal paths with no usable heuristic, or many goals at once | No goal direction, so it expands outward in every direction |
| [[DFS BFS\|BFS]] | insertion order | `O(V + E)` | Yes on unit edges | Fewest-edge path on an unweighted graph | Weighted edges, and no heuristic pull toward the goal |

Greedy Best-First, A*, and Dijkstra are one family separated only by how much the cost-so-far counts: Dijkstra weights `g` fully and ignores the goal, Greedy Best-First weights it at zero and follows the goal blindly, and A* weights both — with an admissible heuristic it keeps the goal pull while restoring optimality. Greedy Best-First is the fast fit when any reasonable path suffices and the heuristic is strong, as in an interactive pathfinding preview that redraws while the goal is being dragged. A* becomes the fit when the returned path must be optimal, and it pays for that with more expansions and more memory; weighted A* with a large weight approximates the greedy behaviour while still tracking `g`. BFS remains the fit only when edges are unweighted and no heuristic is available.

## Questions

> [!QUESTION]- Why is Greedy Best-First Search neither optimal nor complete?
> It orders the frontier by `h(n)` alone and never accounts for `g(n)`, the cost already spent. A neighbor that is close in straight-line distance but reached by a long detour is expanded before a farther-looking neighbor that sits beside the goal, so the returned path can be far from shortest — not optimal. On an infinite graph a monotonically improving `h` can lead expansion down a branch that never reaches the goal — not complete. A finite graph with a visited set terminates, but the path it returns can still be long.

> [!QUESTION]- What single change turns Greedy Best-First Search into A*, and what does it restore?
> Adding the cost-so-far to the key: ranking by `f = g + h` instead of `h` alone. With an admissible heuristic this restores optimality, because a node reached expensively can no longer outrank a cheaper route that merely looks farther. Greedy Best-First is A* with `g` weighted at zero.

> [!QUESTION]- Why does a concave obstacle around the goal cause thrashing?
> Every cell inside the pocket is geometrically near the goal, so all of them score a low `h` and the frontier keeps selecting barrier-hugging cells. The direct heading is blocked, and the accumulated `g` that would reveal the long way around is never read, so expansion oscillates along the wall before escaping. It is the h-only ordering, not the map, that has no way to notice the pocket is a dead pull.

> [!QUESTION]- What does the visited set guarantee, and what does it not fix?
> It stops a node from being enqueued twice, which prevents cycles from looping forever and guarantees termination on a finite graph. It does not make the returned path optimal, and it cannot bound an infinite graph where `h` keeps improving down a fruitless branch.

## References

- [Best-first search (Wikipedia)](https://en.wikipedia.org/wiki/Best-first_search) — greedy best-first as the `f = h` special case of best-first search, with its optimality and completeness caveats.
- [Heuristics (Amit's A* Pages, Stanford)](https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html) — how the heuristic weight slides a search between Dijkstra, A*, and greedy behaviour.
- [Introduction to A* (Red Blob Games)](https://www.redblobgames.com/pathfinding/a-star/introduction.html) — side-by-side interactive comparison of Greedy Best-First, Dijkstra, and A* on one grid, including the concave-obstacle case.
