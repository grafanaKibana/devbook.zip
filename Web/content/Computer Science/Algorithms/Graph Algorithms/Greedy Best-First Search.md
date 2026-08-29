---
publish: true
created: 2026-08-20T20:41:15.516Z
modified: 2026-08-26T18:31:48.315Z
published: 2026-08-26T18:31:48.315Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Expands whichever node looks closest by heuristic h(n) alone. Fast but not optimal.
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

A grid pathfinder may value a quick route over the shortest route. A cost-aware search such as [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] counts the distance already travelled and can fan out in directions that lead away from the goal. Greedy Best-First Search ignores that accumulated cost. It orders the frontier only by `h(n)`, the estimated distance remaining, and expands whichever node currently looks closest to the target.

That ranking rule is also the weakness. The search cannot distinguish a short route from a long one that happens to end near the goal because `g(n)`, the cost already paid, never enters the comparison. A returned path may be far longer than necessary. On an infinite graph, an improving estimate can also pull the search down a branch that never terminates.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"greedy-best-first-search"}
```

Greedy first moves downward because those cells have smaller `h`, then follows the lower corridor until a vertical barrier forces it back up and around. It reaches the goal with cost `12`. [[Computer Science/Algorithms/Graph Algorithms/A-Star Search|A*]] uses the same grid but ranks by `g + h`, returning the optimal upper route with cost `8`. The comparison isolates the missing term: Greedy knows both routes point toward the same goal but never charges itself for the four extra steps already taken.


The frontier is a priority queue keyed by `h(n)`. Each iteration pops the node with the smallest estimate, and if it is not the goal, pushes every unvisited neighbor keyed by that neighbor's own `h`. The trace accumulates edge weights only to report the returned path cost; they never affect priority. A visited set stops a node from entering the queue twice.

The only property this maintains is that the next node expanded is the one the heuristic currently rates closest to the goal. Nothing ties the order of expansion to the length of the path built so far, which is the guarantee a cost-aware search provides and this one drops. When `h` is accurate and the map is open, the estimate shrinks along an almost straight line and the goal is reached after expanding on the order of `m` nodes. When `h` points into an obstacle, the same rule keeps re-selecting cells that hug the barrier because they still score lowest, and the accumulated `g` that would expose the detour is never consulted.

One framing makes the family relationship exact: [[Computer Science/Algorithms/Graph Algorithms/A-Star Search|A*]] expands by `f = g + h`. Setting `g` to zero collapses `f` to `h`, which is precisely Greedy Best-First — the case where a node's history counts for nothing.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Greedy Best-First Search complexity",
  "variables": {
    "branchingFactor": {
      "symbol": "b",
      "description": "fixed search-tree branching factor, b > 1"
    },
    "secondarySize": {
      "symbol": "m",
      "description": "maximum search depth; the horizontal axis samples m"
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
              "kind": "curve",
              "role": "Nodes generated or expanded",
              "formula": "O(b·m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Estimate",
          "bounds": [
            {
              "kind": "curve",
              "role": "Nodes generated or expanded",
              "formula": "distribution-dependent; between O(b·m) and O(b^m)",
              "curveFrom": "linear",
              "curveTo": "exponential"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Nodes generated or expanded",
              "formula": "O(b^m)",
              "curveId": "exponential"
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
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(b·m)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Estimate",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "distribution-dependent; between O(b·m) and O(b^m)",
              "curveFrom": "linear",
              "curveTo": "exponential"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(b^m)",
              "curveId": "exponential"
            }
          ]
        }
      ]
    }
  }
}
```
````

# When the Estimate Misleads

Every failure here comes from the missing `g` term.

**A path that looks close but is long.** Suppose neighbor `A` is one cell from the goal by straight-line distance (`h(A) = 1`) but can reach it only through a corridor that winds around an obstacle. Neighbor `B` looks farther away (`h(B) = 5`) and lies on a direct route of about five steps. Greedy Best-First pops `A` because `1 < 5`, follows the corridor, and may reach the goal while `B` still waits in the frontier. Nothing marks the result as suboptimal. The ranking asks which node looks closer now, not which complete path costs less.

**Loops without a visited set.** Without a closed set, the search can enqueue a node again after leaving it. A cyclic graph may then keep the frontier moving between low-`h` nodes. A visited set bounds this behavior on a finite graph. It cannot rescue an infinite graph where `h` keeps improving along a fruitless branch because no `g` bound forces the search to leave that region.

A concave obstacle is the common concrete case. A wall cupping the goal gives every cell inside the pocket a tempting low `h`, so the search keeps returning to the blocked heading before it discovers the way around.

# Diagram and C# Implementation

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
>
> The priority key is `heuristic(v)` with no `g` term, so the frontier orders by estimated distance to the goal alone. `visited` guarantees termination on a finite graph but says nothing about path length.

# References

- [Experiments with the Graph Traverser program](https://doi.org/10.1098/rspa.1966.0205)
- [Heuristics (Amit's A\* Pages, Stanford)](https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html)
