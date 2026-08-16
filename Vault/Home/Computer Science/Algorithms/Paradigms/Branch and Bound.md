---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "A search paradigm for optimisation that prunes any branch whose optimistic bound cannot beat the best solution so far."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A 0/1 knapsack with 40 items has `2^40` candidate subsets. A symmetric travelling-salesman tour over 15 cities still has `14!/2` orderings after fixing the start and treating reversals as equivalent. Branch-and-bound explores these decision trees while attaching an optimistic bound to each partial candidate. Once a subtree cannot beat the best complete solution found so far, the search discards it.

The bound must be *optimistic*. In a maximisation problem it cannot fall below the true best achievable in the subtree. In minimisation it cannot rise above the true best. A pessimistic error can discard the optimum. At the other extreme, a loose bound that never loses to the incumbent leaves plain exponential enumeration.

**Core condition:** an optimisation objective + a cheap optimistic bound from a relaxation → prune any subtree whose bound cannot beat the best complete solution so far (the incumbent) → exact search that can touch only a fraction of an exponential tree.

~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"branch-and-bound"}
```

The step that carries the whole idea is a single bound comparison that erases a subtree before it is expanded.


Branch-and-bound turns on four moving parts:

- **Branch** — split the problem at a decision point into disjoint subproblems (item *i* is in the knapsack vs out), so the partial configurations form a search tree.
- **Bound** — at each node, compute an optimistic estimate of the best objective any completion below it could reach. For maximisation this is an *upper* bound; for minimisation a *lower* one.
- **Incumbent** — the best complete solution seen so far, and the yardstick every bound is measured against.
- **Prune / select** — if a node's bound is no better than the incumbent, discard its whole subtree; otherwise expand it and pick the next live node to visit.

The correctness of the discard rests on the optimism of the bound. For maximisation, "optimistic" means the bound is `≥` the true best of every completion in the subtree. So if `bound ≤ incumbent`, then *every* completion is `≤ incumbent`, and none of them can improve the answer — the subtree can be removed unexplored without risking the optimum. Minimisation reverses the inequality.

This is the same optimism requirement as [[Home/Computer Science/Algorithms/Graph Algorithms/A-Star Search|A* Search]]'s admissibility condition: a guided tree search stays correct only while its estimate errs in the optimistic direction and never lies pessimistically. Branch-and-bound is that same idea applied to the decision tree of an optimisation problem, with the bounding function playing the role of the heuristic. For maximisation 0/1 knapsack, an LP relaxation is a safe upper bound: its optimal fractional solution can only meet or exceed the integer optimum, so ignoring integrality never under-shoots.


Every live (unpruned, unexpanded) node is a candidate to visit next, and the order changes how fast a strong incumbent appears — which in turn changes how much gets pruned.

Best-first keeps live nodes in a priority queue ordered by bound. Depth-first follows one branch to a complete candidate before returning to siblings, using the same choose-and-undo discipline as [[Home/Computer Science/Algorithms/Paradigms/Backtracking|backtracking]], which often produces an incumbent earlier.


A good early incumbent raises the bar every later bound must clear, so more subtrees fall on a single comparison. Solvers exploit this by seeding the incumbent with a fast heuristic — often a [[Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] solution — before the exact search starts.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Branch and Bound complexity",
  "variables": {
    "branchingFactor": {
      "symbol": "b",
      "description": "maximum children per expanded node"
    },
    "boundCost": {
      "symbol": "c",
      "description": "cost of evaluating the bound at one expanded node"
    },
    "inputSize": {
      "symbol": "n",
      "description": "maximum decision-tree depth"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (enumerate every assignment)",
          "formula": "O(b^n)",
          "curveFrom": "exponential",
          "curveTo": "unbounded"
        },
        {
          "kind": "text",
          "label": "Branch and bound",
          "formula": "O(b^n · c)"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (enumerate every assignment)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "text",
          "label": "Branch and bound",
          "formula": "O(n) depth-first; up to O(b^n) best-first"
        }
      ]
    }
  }
}
```

Best-first can retain every live node and exhaust memory on a hard instance. Depth-first retains only the current search path, trading that smaller frontier for less global control over which bound is explored next.

The general `b`-ary model expands `1 + b + ... + b^n = Θ(b^n)` nodes when pruning fails. Binary 0/1 knapsack specializes that model to two take-or-skip branches per item, giving `O(2^n · c)` time. TSP does not have a constant branching factor: the number of remaining-city choices shrinks by one per level, so exhaustive search can remain factorial. `c` isolates the per-node cost of evaluating the relaxation from the branching factor `b`.
~~~~~

# When the Bound Stops Helping

A **non-optimistic bound can return the wrong answer without warning.** Suppose a maximisation subtree contains a solution worth 90, its bound reports 78, and the incumbent is 80. The search prunes the subtree and returns 80 as *proven optimal*. The certificate is false. Bounds therefore come from relaxations that provably upper-bound maximisation or lower-bound minimisation, even when a safe bound is looser.

A **bound too loose to discriminate degenerates to brute force.** Assuming every remaining item can be taken at full value with no weight limit is optimistic and valid. It also beats the incumbent at nearly every node, so almost nothing is pruned from the `2ⁿ` tree. Validity protects the answer. Tightness controls practical runtime and must be weighed against the cost of computing the bound.


# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Pop a live node from the frontier] --> B[Compute its optimistic bound]
>   B --> C{Bound beats the incumbent}
>   C -->|No| D[Discard the subtree]
>   C -->|Yes| E{Node is a complete solution}
>   E -->|Yes| F[Replace incumbent if better]
>   E -->|No| G[Branch into child subproblems, push to frontier]
>   D --> H{Frontier empty}
>   F --> H
>   G --> H
>   H -->|No| A
>   H -->|Yes| I[Return incumbent as proven optimum]
> ```

> [!EXAMPLE]- C# implementation — 0/1 knapsack with an LP-relaxation bound
>
> ```csharp
> public sealed record Item(int Value, int Weight);
>
> public static long Knapsack(Item[] items, int capacity)
> {
>     ArgumentNullException.ThrowIfNull(items);
>     ArgumentOutOfRangeException.ThrowIfNegative(capacity);
>     if (items.Any(i => i.Weight <= 0 || i.Value < 0))
>         throw new ArgumentException("Weights must be positive and values nonnegative.", nameof(items));
>
>     // Exact cross-products avoid rounding the value-to-weight ordering.
>     var order = items.ToArray();
>     Array.Sort(order, static (a, b) =>
>         ((Int128)b.Value * a.Weight).CompareTo((Int128)a.Value * b.Weight));
>     long best = 0;
>
>     // Round the fractional remainder upward so the integer bound stays optimistic.
>     long Bound(int index, long weight, long value)
>     {
>         long bound = value;
>         long room = (long)capacity - weight;
>         for (int i = index; i < order.Length && room > 0; i++)
>         {
>             if (order[i].Weight <= room)
>             {
>                 room -= order[i].Weight;
>                 bound = checked(bound + order[i].Value);
>                 continue;
>             }
>
>             Int128 numerator = (Int128)room * order[i].Value;
>             long fractionalCeiling = (long)((numerator + order[i].Weight - 1) / order[i].Weight);
>             return checked(bound + fractionalCeiling);
>         }
>         return bound;
>     }
>
>     void Explore(int index, long weight, long value)
>     {
>         if (weight > capacity) return;                    // infeasible: constraint prune
>         if (value > best) best = value;                   // a feasible completion; update incumbent
>         if (index == order.Length) return;
>         if (Bound(index, weight, value) <= best) return;  // optimistic bound loses -> prune subtree
>
>         Explore(index + 1,
>             checked(weight + order[index].Weight),
>             checked(value + order[index].Value));                                  // take
>         Explore(index + 1, weight, value);                                            // skip
>     }
>
>     Explore(0, 0, 0);
>     return best;
> }
> ```
> The guards require a nonnegative `int` capacity, positive `int` weights, and nonnegative `int` values. Cumulative totals use checked `long` arithmetic. Exact `Int128` cross-products order ratios without floating-point drift, and the fractional remainder is rounded upward, so `Bound(...) <= best` proves that the subtree cannot improve the answer.

# References

- [An Automatic Method of Solving Discrete Programming Problems](https://doi.org/10.2307/1910129)
