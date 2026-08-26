---
publish: true
created: 2026-08-20T20:41:15.511Z
modified: 2026-08-26T11:43:28.111Z
published: 2026-08-26T11:43:28.111Z
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

To find the shortest route to one destination on a road graph, [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] settles nodes in expanding rings of cost-from-source. For a target 10 km east, it settles every node with path cost below 10 km in all directions and may also settle equal-cost nodes before the target, depending on tie-breaking. Almost none of that work touches the optimal path.

A\* keeps the same cost accounting but estimates _total_ path cost as `f(n) = g(n) + h(n)`. Here, `g(n)` is the exact cost already paid to reach `n`, while `h(n)` estimates the cost still remaining to the goal. Popping the smallest-`f` node first pulls the search toward the target, collapsing the settled disc into a narrow corridor.

With nonnegative edge costs, the optimality guarantee holds when `0 ≤ h(n) ≤ h*(n)`, which also forces `h(goal) = 0`. Such an admissible heuristic keeps A\* honest when the search reopens a state after finding a cheaper path. Consistency adds the stronger condition needed to close each state after its first expansion. An overestimate can delay a node on the optimal path until a more expensive route reaches the goal first, returning a longer path with no error raised. [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] is the degenerate case `h ≡ 0`: it has no goal information and searches in uniform rings, but remains optimal.

**Core condition:** single target + nonnegative edge costs + `0 ≤ h(n) ≤ h*(n)` + reopen a state when its `g` improves → order the frontier by `f = g + h` → an optimal path, often after expanding fewer nodes than Dijkstra. If `h` is consistent, each state may instead be closed after its first expansion.

The decisive step is which node leaves the frontier next, and how `h` skews that choice toward the goal.

````tabsdown
tab: Visualization

~~~~tabsdown
tab: Coordinate grid


```steptrace
{"algorithm":"a-star","variant":"coordinate-grid"}
```

tab: Cities


```steptrace
{"algorithm":"a-star","variant":"ukraine-cities","start":"Lviv","target":"Kharkiv"}
```

tab: Building floor


```steptrace
{"algorithm":"a-star","variant":"building-floor"}
```

tab: Midtown map


```steptrace
{"algorithm":"a-star","variant":"midtown-map"}
```

~~~~

#### Why `f = g + h` Stays Optimal

With nonnegative edge costs, each iteration pops the frontier node with the smallest `f`, relaxes its outgoing edges, and pushes any neighbor whose `g` improves; `g[source] = 0` and `f[source] = h(source)` seed the search. Two properties of `h` decide whether the result is correct.

**Admissibility** — `0 ≤ h(n) ≤ h*(n)`, so `h(goal) = 0`. With reopening, this is enough for A* to return an optimal path. Before a suboptimal goal could be popped, take the first state `n` on an optimal path that has not yet been settled with its optimal cost. Its predecessor has been settled optimally, so relaxation has placed an OPEN record for `n` with `g(n) = g*(n)`; if `n` was previously expanded through a worse path, reopening restores that record to OPEN. Therefore `f(n) = g*(n) + h(n) ≤ g*(n) + h*(n)`, which equals the optimal solution cost. Because A* pops the smallest `f` and `f(goal) = g(goal)`, it cannot pop a more expensive goal first. Underestimating is safe — it only makes A* inspect a node sooner than strictly necessary.

**Consistency (monotonicity)** — `h(n) ≤ cost(n, n') + h(n')` for every edge `(n, n')`, with `h(goal) = 0`. Consistency implies admissibility and adds a stronger guarantee: `f` never decreases along a path, so the first time a node is popped its `g` is already optimal. Graph-search A* can then move that node to a closed set and never reconsider it — each node is expanded at most once.

The pull is concrete: on a 4-connected grid with Manhattan `h`, a node reached in `g = 3` that sits toward the goal (`h = 2`, `f = 5`) is popped before an equal-cost node reached in `g = 3` that faces away (`h = 5`, `f = 8`). Dijkstra ranks both by `g` alone and expands the second as readily as the first. That `h` term is the whole difference between a corridor and a disc, and setting `h ≡ 0` erases it — which is exactly what turns A* back into [[Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]].

tab: Complexity

```complexity
{
  "version": 2,
  "label": "A-Star Search complexity",
  "variables": {
    "branchingFactor": {
      "symbol": "b",
      "description": "fixed successors per expanded state, b > 1"
    },
    "parameterD": {
      "symbol": "d",
      "description": "optimal solution depth in edges; the horizontal axis samples d"
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
              "role": "Time (node expansions)",
              "formula": "Θ(d)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Estimate",
          "bounds": [
            {
              "kind": "text",
              "role": "Time (node expansions)",
              "formula": "between Θ(d) and O(b^d) for uniform edge costs"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time (node expansions)",
              "formula": "O(b^d) for uniform edge costs",
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
              "role": "Auxiliary space, fixed b",
              "formula": "O(bd)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Estimate",
          "bounds": [
            {
              "kind": "text",
              "role": "Auxiliary space",
              "formula": "O(nodes stored), heuristic-dependent"
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
              "formula": "O(b^d)",
              "curveId": "exponential"
            }
          ]
        }
      ]
    }
  }
}
```

The exponential bounds describe implicit state spaces with unit or uniform positive edge costs. On an explicit finite graph with a consistent, `O(1)` heuristic, an indexed heap with decrease-key gives `O((V + E) log V)` time and `O(V)` auxiliary space. The C# implementation below instead enqueues lazy duplicates: up to `O(E)` queue records, `O((V + E) log E)` time, and `O(V + E)` auxiliary space. Heuristic quality and tie-breaking still matter: even exact `h*` can expand many states tied at the optimal solution cost, while an uninformative heuristic approaches Dijkstra's search.

````

# When the Heuristic Breaks the Guarantee

An **overestimating** `h` exceeds the remaining cost for at least one node somewhere in the graph. That overestimate is harmless when it lands off the optimal path and never wins a pop. Optimality breaks when an inflated `f` delays a node that should have been popped before the goal. A\* reaches the goal through a cheaper-looking detour first, returns a valid but more expensive path, and signals nothing. Weighted A\* makes this trade deliberately: `f = g + ε·h` with `ε > 1` scales an admissible base heuristic up. Under standard goal-pop termination, its factor-`ε` bound holds with reopening. It also holds without reopening when the base heuristic is consistent. `ε = 1` is exact A\*. `ε → ∞` approaches greedy behavior.

An admissible but **inconsistent** `h` keeps optimality for the tree-search form but breaks the single-expansion property. Because `f` can dip along a path, a shorter `g` to an already-closed node can surface later. Graph-search A\* that refuses to revisit closed nodes then finalizes that node with a non-optimal `g`, corrupting every path routed through it. Reopening the node when a cheaper `g` appears restores optimality, at the cost of the re-expansions that consistency would have avoided.

# Diagram and C# Implementation

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
> This close-once implementation assumes nonnegative edge weights and a consistent heuristic.
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
>             continue; // with a consistent heuristic, u's best g-score was already expanded
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

# References

- [Amit's A\* Pages (Stanford, Amit Patel)](https://theory.stanford.edu/~amitp/GameProgramming/)
- [A Formal Basis for the Heuristic Determination of Minimum Cost Paths (Hart, Nilsson, Raphael 1968)](https://ieeexplore.ieee.org/document/4082128)
