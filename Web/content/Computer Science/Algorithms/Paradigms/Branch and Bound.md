---
publish: true
created: 2026-08-10T06:36:38.079Z
modified: 2026-08-10T06:36:38.079Z
published: 2026-08-10T06:36:38.079Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: A search paradigm for optimisation that prunes any branch whose optimistic bound cannot beat the best solution so far.
level:
  - "4"
priority: Medium
status: Creation
---

A 0/1 knapsack with 40 items has `2^40` candidate subsets; a symmetric travelling-salesman tour over 15 cities has `14!/2` orderings after fixing the start and treating reversals as equivalent. Branch-and-bound explores the same decision tree but attaches an optimistic bound to each partial candidate, discarding a subtree once it cannot beat the incumbent.

That pruning is valid only under one precondition: the bound must be _optimistic_. For a maximisation problem it must never fall below the true best achievable in the subtree; for minimisation it must never rise above it. A bound that leans in the pessimistic direction can throw away the subtree that held the optimum. A bound so loose it never clears the best-so-far leaves plain exponential enumeration.

**Core condition:** an optimisation objective + a cheap optimistic bound from a relaxation → prune any subtree whose bound cannot beat the best complete solution so far (the incumbent) → exact search that can touch only a fraction of an exponential tree.

````tabsdown
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

This is the same optimism requirement as [[Computer Science/Algorithms/Graph Algorithms/A-Star Search|A* Search]]'s admissibility condition: a guided tree search stays correct only while its estimate errs in the optimistic direction and never lies pessimistically. Branch-and-bound is that same idea applied to the decision tree of an optimisation problem, with the bounding function playing the role of the heuristic. For maximisation 0/1 knapsack, an LP relaxation is a safe upper bound: its optimal fractional solution can only meet or exceed the integer optimum, so ignoring integrality never under-shoots.


Every live (unpruned, unexpanded) node is a candidate to visit next, and the order changes how fast a strong incumbent appears — which in turn changes how much gets pruned.

Best-first keeps live nodes in a priority queue ordered by bound. Depth-first follows one branch to a complete candidate before returning to siblings, using the same choose-and-undo discipline as [[Computer Science/Algorithms/Paradigms/Backtracking|backtracking]], which often produces an incumbent earlier.


A good early incumbent raises the bar every later bound must clear, so more subtrees fall on a single comparison. Solvers exploit this by seeding the incumbent with a fast heuristic — often a [[Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] solution — before the exact search starts.

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
````

# When the Bound Stops Helping

A **non-optimistic bound returns a wrong answer, silently.** Suppose a maximisation subtree's true best is 90 but the bound reports 78, and the incumbent is 80. The subtree is pruned, its 90 is never found, and the search halts reporting 80 as _proven optimal_. Nothing flags the error — the optimality certificate is simply false. The defence is to derive a relaxation that provably upper-bounds maximisation or lower-bounds minimisation, even when that makes the bound looser.

A **bound too loose to discriminate degenerates to brute force.** "Assume every remaining item is taken at full value with no weight limit" is optimistic and valid, but it exceeds the incumbent at nearly every node, so nothing is pruned and the frontier never shrinks below the full `2ⁿ` tree. Validity keeps the answer correct; tightness is what decides the practical runtime, and the two goals pull against per-node cost.

# Reference Drawer

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
> public static int Knapsack(Item[] items, int capacity)
> {
>     ArgumentNullException.ThrowIfNull(items);
>     ArgumentOutOfRangeException.ThrowIfNegative(capacity);
>     if (items.Any(i => i.Weight <= 0 || i.Value < 0))
>         throw new ArgumentException("Weights must be positive and values nonnegative.", nameof(items));
>
>     // Sort by value-to-weight ratio so the fractional bound is a simple prefix fill.
>     var order = items.OrderByDescending(i => (double)i.Value / i.Weight).ToArray();
>     int best = 0;
>
>     // Fractional (LP) relaxation: fill the remaining room by ratio, last item taken fractionally.
>     // The fractional optimum dominates the 0/1 optimum, so this never under-shoots.
>     double Bound(int index, int weight, int value)
>     {
>         double bound = value;
>         int room = capacity - weight;
>         for (int i = index; i < order.Length && room > 0; i++)
>         {
>             int take = Math.Min(order[i].Weight, room);
>             bound += take * (double)order[i].Value / order[i].Weight;
>             room -= take;
>         }
>         return bound;
>     }
>
>     void Explore(int index, int weight, int value)
>     {
>         if (weight > capacity) return;                    // infeasible: constraint prune
>         if (value > best) best = value;                   // a feasible completion; update incumbent
>         if (index == order.Length) return;
>         if (Bound(index, weight, value) <= best) return;  // optimistic bound loses -> prune subtree
>
>         Explore(index + 1, weight + order[index].Weight, value + order[index].Value); // take
>         Explore(index + 1, weight, value);                                            // skip
>     }
>
>     Explore(0, 0, 0);
>     return best;
> }
> ```
>
> The example accepts a nonnegative capacity, strictly positive weights, and nonnegative values; the guards preserve the ratio ordering and the fractional upper-bound argument. Updating `best` on entry, before the bound check, means a fresh incumbent tightens pruning for the sibling branch immediately. `Bound` returns an upper bound on every completion of the current node, so `Bound(...) <= best` proves the subtree cannot improve the answer.

# Questions

> [!QUESTION]- Why must the bounding function be optimistic?
> The bound gates pruning: a subtree is discarded when its bound cannot beat the incumbent. If a maximisation bound under-estimates a subtree's true best, that subtree can be pruned while it still holds the optimum, and the search returns a suboptimal incumbent labelled as proven-optimal — a silent correctness failure. The requirement is exactly A\* search's admissibility: the estimate may only err optimistically. For maximisation 0/1 knapsack, an LP relaxation satisfies it because a fractional optimum can only meet or exceed the integer one.

# References

- [An Automatic Method of Solving Discrete Programming Problems](https://doi.org/10.2307/1910129) — Land and Doig's 1960 Econometrica paper introducing branch-and-bound for integer programming; the origin of the branch/bound/prune formulation.
- [Integer programming](https://en.wikipedia.org/wiki/Integer_programming) — how LP-relaxation bounds drive branch-and-bound inside commercial MIP solvers.
- [Admissible heuristic](https://en.wikipedia.org/wiki/Admissible_heuristic) — the optimism condition the bounding function shares with an A\* search heuristic.
- [0/1 Knapsack using Branch and Bound](https://www.geeksforgeeks.org/0-1-knapsack-using-branch-and-bound/) — the fractional-LP bound worked through the 0/1 knapsack search tree.
