---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Expands whichever node looks closest by heuristic h(n) alone; fast but not optimal."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

A grid pathfinder has to reach a goal cell and cares more about producing *a* route quickly than about producing the shortest one. A cost-aware search like [[Home/Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] weighs the distance already travelled and fans out in every direction, so most of its expansions land on cells that point away from the goal. Greedy Best-First Search discards the accumulated cost and orders its frontier by the heuristic `h(n)` alone — the estimated remaining distance to the goal — so it always expands whichever node currently looks closest and drives almost straight at the target.

That single ranking key is also the whole weakness. Because `g(n)`, the cost paid to reach a node, never enters the comparison, the search cannot separate a short route from a long one that merely ends near the goal. It expands what looks close, not what is cheap: the path it returns can be far longer than necessary, and on an infinite graph it can follow a forever-improving estimate down a branch that never terminates.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"greedy-best-first-search"}
```

Greedy first moves downward because those cells have smaller `h`, then follows the lower corridor until a vertical barrier forces it back up and around. It reaches the goal with cost `12`. [[Home/Computer Science/Algorithms/Graph Algorithms/A-Star Search|A*]] uses the same grid but ranks by `g + h`, returning the optimal upper route with cost `8`. The comparison isolates the missing term: Greedy knows both routes point toward the same goal but never charges itself for the four extra steps already taken.


The frontier is a priority queue keyed by `h(n)`. Each iteration pops the node with the smallest estimate, and if it is not the goal, pushes every unvisited neighbor keyed by that neighbor's own `h`. The trace accumulates edge weights only to report the returned path cost; they never affect priority. A visited set stops a node from entering the queue twice.

The only property this maintains is that the next node expanded is the one the heuristic currently rates closest to the goal. Nothing ties the order of expansion to the length of the path built so far, which is the guarantee a cost-aware search provides and this one drops. When `h` is accurate and the map is open, the estimate shrinks along an almost straight line and the goal is reached after expanding on the order of `m` nodes. When `h` points into an obstacle, the same rule keeps re-selecting cells that hug the barrier because they still score lowest, and the accumulated `g` that would expose the detour is never consulted.

One framing makes the family relationship exact: [[Home/Computer Science/Algorithms/Graph Algorithms/A-Star Search|A*]] expands by `f = g + h`. Setting `g` to zero collapses `f` to `h`, which is precisely Greedy Best-First — the case where a node's history counts for nothing.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Greedy Best-First Search complexity",
  "variables": {
    "branchingFactor": {
      "symbol": "b",
      "description": "search-tree branching factor"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "maximum search depth"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "text",
              "role": "Nodes generated or expanded",
              "formula": "O(b·m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Typical",
          "bounds": [
            {
              "kind": "text",
              "role": "Nodes generated or expanded",
              "formula": "distribution-dependent; between O(b·m) and O(b^m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Nodes generated or expanded",
              "formula": "O(b^m)"
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
          "operation": "Best",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "O(b·m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Typical",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "up to O(b^m)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "O(b^m)"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When the Estimate Misleads

The h-only ordering fails in three distinct ways, all traceable to the missing `g` term.

**A path that looks close but is long.** Suppose neighbor `A` sits one cell from the goal in straight-line distance (`h(A) = 1`) but reaches it only through a long corridor that winds the far way around, while neighbor `B` is farther in straight line (`h(B) = 5`) yet lies on a short, direct route of about five steps. Greedy Best-First pops `A` first because `1 < 5`, follows the corridor, and returns a route many times the length of the direct route through `B`. `B` remains in the frontier when the goal is dequeued and the search terminates, and nothing flags the result as suboptimal — the search optimised "get closer now," never "minimise total cost."

**Loops without a visited set.** With no closed set, a node the search has already left can be re-enqueued, and on a cyclic graph the frontier can oscillate between two low-`h` nodes indefinitely. A visited set bounds any finite graph, but it cannot rescue an infinite one: where `h` keeps improving down a fruitless branch, there is no `g` bound to force the search to abandon that region, so it never terminates.

The concave obstacle is the common concrete case: a wall cupping the goal gives every cell inside the pocket a tempting low `h`, so the search thrashes along the barrier — re-committing to the blocked heading because those cells keep scoring lowest — before it discovers the way around.

# Reference Drawer

> [!ABSTRACT]- Control flow
>
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
>
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

# Questions

> [!QUESTION]- When is Greedy Best-First Search complete, and why is it not optimal?
> With duplicate detection, it is complete on a finite graph because it can enqueue each reachable vertex at most once and will eventually exhaust the frontier or reach the goal. It is not complete on an infinite graph, where a monotonically improving `h` can lead expansion down a branch that never reaches the goal. It is not optimal in either case because it ignores `g(n)`, the cost already spent, so a close-looking long detour can outrank a shorter route.

> [!QUESTION]- Why does a concave obstacle around the goal cause thrashing?
> Every cell inside the pocket is geometrically near the goal, so all of them score a low `h` and the frontier keeps selecting barrier-hugging cells. The direct heading is blocked, and the accumulated `g` that would reveal the long way around is never read, so expansion oscillates along the wall before escaping. It is the h-only ordering, not the map, that has no way to notice the pocket is a dead pull.

> [!QUESTION]- What does the visited set guarantee, and what does it not fix?
> It stops a node from being enqueued twice, which prevents cycles from looping forever and guarantees termination on a finite graph. It does not make the returned path optimal, and it cannot bound an infinite graph where `h` keeps improving down a fruitless branch.

# References

- [Experiments with the Graph Traverser program](https://doi.org/10.1098/rspa.1966.0205) — Doran and Michie's primary 1966 study of heuristic graph traversal and how evaluation functions guide search.
- [Best-first search (Wikipedia)](https://en.wikipedia.org/wiki/Best-first_search) — greedy best-first as the `f = h` special case of best-first search, with its optimality and completeness caveats.
- [Heuristics (Amit's A* Pages, Stanford)](https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html) — how the heuristic weight slides a search between Dijkstra, A*, and greedy behaviour.
- [Introduction to A* (Red Blob Games)](https://www.redblobgames.com/pathfinding/a-star/introduction.html) — side-by-side interactive comparison of Greedy Best-First, Dijkstra, and A* on one grid, including the concave-obstacle case.
