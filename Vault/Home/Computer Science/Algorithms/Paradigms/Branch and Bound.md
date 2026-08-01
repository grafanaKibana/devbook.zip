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

A 0/1 knapsack with 40 items has `2^40` candidate subsets; a symmetric travelling-salesman tour over 15 cities has `14!/2` orderings after fixing the start and treating reversals as equivalent. Enumerating every configuration to find the single best one is exponential and rarely finishes. Branch-and-bound searches the same space but attaches a *bound* to every partial configuration — an optimistic estimate of the best objective any completion of it could reach — and discards a whole subtree the moment its bound cannot beat the best complete solution already found.

That pruning is valid only under one precondition: the bound must be *optimistic*. For a maximisation problem it must never fall below the true best achievable in the subtree; for minimisation it must never rise above it. A bound that leans in the pessimistic direction can throw away the subtree that held the optimum. A bound so loose it never clears the best-so-far leaves plain exponential enumeration.

**Core condition:** an optimisation objective + a cheap optimistic bound from a relaxation → prune any subtree whose bound cannot beat the best complete solution so far (the incumbent) → exact search that can touch only a fraction of an exponential tree.

~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"branch-and-bound"}
```

The step that carries the whole idea is a single bound comparison that erases a subtree before it is expanded.

# Why a Subtree Can Be Discarded

Branch-and-bound turns on four moving parts:

- **Branch** — split the problem at a decision point into disjoint subproblems (item *i* is in the knapsack vs out), so the partial configurations form a search tree.
- **Bound** — at each node, compute an optimistic estimate of the best objective any completion below it could reach. For maximisation this is an *upper* bound; for minimisation a *lower* one.
- **Incumbent** — the best complete solution seen so far, and the yardstick every bound is measured against.
- **Prune / select** — if a node's bound is no better than the incumbent, discard its whole subtree; otherwise expand it and pick the next live node to visit.

The correctness of the discard rests on the optimism of the bound. For maximisation, "optimistic" means the bound is `≥` the true best of every completion in the subtree. So if `bound ≤ incumbent`, then *every* completion is `≤ incumbent`, and none of them can improve the answer — the subtree can be removed unexplored without risking the optimum. Minimisation reverses the inequality.

This is the same optimism requirement as [[Home/Computer Science/Algorithms/Graph Algorithms/A-Star Search|A* Search]]'s admissibility condition: a guided tree search stays correct only while its estimate errs in the optimistic direction and never lies pessimistically. Branch-and-bound is that same idea applied to the decision tree of an optimisation problem, with the bounding function playing the role of the heuristic. For maximisation 0/1 knapsack, an LP relaxation is a safe upper bound: its optimal fractional solution can only meet or exceed the integer optimum, so ignoring integrality never under-shoots.

# Exploration Order

Every live (unpruned, unexpanded) node is a candidate to visit next, and the order changes how fast a strong incumbent appears — which in turn changes how much gets pruned.

- **Best-first** keeps live nodes in a priority queue ordered by bound and always expands the most promising one. It tends to certify the optimum with the fewest expansions, but the queue can hold exponentially many live nodes, so memory is the binding constraint.
- **Depth-first** dives to a complete solution quickly in `O(depth)` memory, like [[Home/Computer Science/Algorithms/Paradigms/Backtracking|Backtracking]]. That early incumbent immediately starts pruning siblings, though the dive can waste effort in regions best-first would have skipped.

A good early incumbent raises the bar every later bound must clear, so more subtrees fall on a single comparison. Solvers exploit this by seeding the incumbent with a fast heuristic — often a [[Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy]] solution — before the exact search starts.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Branch and Bound complexity",
  "variables": {
    "branchingFactor": {
      "symbol": "b",
      "description": "search branching factor or radix base"
    },
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
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
              "role": "Time",
              "formula": "O(n · b)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Practical",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "instance-dependent; still exponential"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(2ⁿ · b)"
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
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Practical",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(n)",
              "curveId": "linear"
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
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Complexity

Let `n` be the number of decisions (the tree depth) and `b` the cost of computing one bound.

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n · b)` | `O(n)` | A strong early incumbent and a tight bound prune every sibling; the search follows essentially one root-to-leaf path. |
| Practical | instance-dependent; still exponential | `O(n)` | A tight bound and early incumbent often cut the visited nodes far below `2ⁿ`, but there is no general sub-exponential guarantee. |
| Worst | `O(2ⁿ · b)` | `O(n)` | A loose or non-discriminating bound prunes nothing; every node is expanded, as in brute-force enumeration. |

The table describes depth-first branch-and-bound over an `n`-decision binary tree (0/1 knapsack), so auxiliary space is the `O(n)` recursion stack. Best-first exploration keeps live nodes in a priority queue instead of a stack, so its auxiliary space grows with the frontier — up to `O(2ⁿ)` nodes — even though it usually expands the fewest nodes to certify the optimum. A permutation problem such as TSP has an `n!` tree in place of `2ⁿ`. In every case the worst case is exponential: branch-and-bound can reduce the nodes visited on practical instances, but never the complexity class.

# When the Bound Stops Helping

A **non-optimistic bound returns a wrong answer, silently.** Suppose a maximisation subtree's true best is 90 but the bound reports 78, and the incumbent is 80. The subtree is pruned, its 90 is never found, and the search halts reporting 80 as *proven optimal*. Nothing flags the error — the optimality certificate is simply false. The defence is to derive a relaxation that provably upper-bounds maximisation or lower-bounds minimisation, even when that makes the bound looser.

A **bound too loose to discriminate degenerates to brute force.** "Assume every remaining item is taken at full value with no weight limit" is optimistic and valid, but it exceeds the incumbent at nearly every node, so nothing is pruned and the frontier never shrinks below the full `2ⁿ` tree. Validity keeps the answer correct; tightness is what decides the practical runtime, and the two goals pull against per-node cost.

**Best-first exploration exhausts memory before time.** On a hard instance the priority queue accumulates exponentially many live nodes and the process runs out of RAM long before it runs out of clock. Depth-first or iterative-deepening branch-and-bound bounds space to `O(depth)`, at the cost of re-expanding nodes or losing some global pruning quality.

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
> The example accepts a nonnegative capacity, strictly positive weights, and nonnegative values; the guards preserve the ratio ordering and the fractional upper-bound argument. Updating `best` on entry, before the bound check, means a fresh incumbent tightens pruning for the sibling branch immediately. `Bound` returns an upper bound on every completion of the current node, so `Bound(...) <= best` proves the subtree cannot improve the answer.

# Questions

> [!QUESTION]- Why must the bounding function be optimistic?
> The bound gates pruning: a subtree is discarded when its bound cannot beat the incumbent. If a maximisation bound under-estimates a subtree's true best, that subtree can be pruned while it still holds the optimum, and the search returns a suboptimal incumbent labelled as proven-optimal — a silent correctness failure. The requirement is exactly A* search's admissibility: the estimate may only err optimistically. For maximisation 0/1 knapsack, an LP relaxation satisfies it because a fractional optimum can only meet or exceed the integer one.

> [!QUESTION]- What determines how much of the tree is actually explored?
> Two factors independent of the worst-case class: the tightness of the bound and how early a strong incumbent is found. A tight bound rejects more subtrees per comparison; an early incumbent raises the bar every later bound must clear. Exploration order feeds the second — best-first prioritises the strongest bounds and often reduces the work needed to certify optimality, while depth-first commonly reaches the first incumbent sooner in `O(depth)` memory.

> [!QUESTION]- Does branch-and-bound lower the complexity class of an NP-hard problem?
> No. The worst case stays exponential; on an adversarial instance the bound prunes nothing and it reduces to brute-force enumeration. It can reduce the explored nodes by orders of magnitude on practical instances and returns a certificate of optimality — but not polynomial time. On very large instances the practical answer is an approximation, not a proven optimum.

# References

- [An Automatic Method of Solving Discrete Programming Problems](https://doi.org/10.2307/1910129) — Land and Doig's 1960 Econometrica paper introducing branch-and-bound for integer programming; the origin of the branch/bound/prune formulation.
- [Integer programming](https://en.wikipedia.org/wiki/Integer_programming) — how LP-relaxation bounds drive branch-and-bound inside commercial MIP solvers.
- [Admissible heuristic](https://en.wikipedia.org/wiki/Admissible_heuristic) — the optimism condition the bounding function shares with an A* search heuristic.
- [0/1 Knapsack using Branch and Bound](https://www.geeksforgeeks.org/0-1-knapsack-using-branch-and-bound/) — the fractional-LP bound worked through the 0/1 knapsack search tree.
