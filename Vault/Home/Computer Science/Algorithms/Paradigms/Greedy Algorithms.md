---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Builds a solution by repeatedly making the locally best choice and never reconsidering. Exact only when a proof connects the rule to the optimum."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

To schedule the most non-overlapping meetings into one room, sort the meetings by finish time, then walk the list once, accepting each meeting whose start is at or after the last accepted finish. The scan produces a maximum-size schedule without enumerating subsets or reconsidering an accepted meeting.

Greedy algorithms build the answer through a sequence of commitments. Each step takes the option ranked best by a fixed local rule and never revisits it. An exact greedy algorithm needs proof that these local commitments compose into a global optimum. A plausible rule is not enough, and a wrong one usually fails without warning. Approximation algorithms use the same pattern but prove a bound instead of exact optimality.

**Exactness condition:** a fixed local rule + the greedy-choice property + optimal substructure → the committed choices form a global optimum.

~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"activity-selection"}
```


Sorting by finish time moves the earliest release opportunity first; the sweep then accepts a compatible meeting permanently or rejects it as soon as it overlaps the last accepted finish.

The first commitment, `[1, 4]`, rejects `[3, 5]` and `[0, 6]`. Meetings `[5, 7]` and `[8, 9]` remain compatible, producing a maximum schedule of three meetings. The accepted lane illustrates the exchange intuition: each commitment leaves at least as much room as any alternative first choice.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Greedy Algorithms complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of candidate intervals in the activity-selection model"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (test every subset)",
          "formula": "O(2^n·n)",
          "curveFrom": "exponential",
          "curveTo": "factorial"
        },
        {
          "kind": "approach",
          "label": "Greedy (sort, then scan)",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (test every subset)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Greedy (sort, then scan)",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```
~~~~~

# When Local Choices Reach the Global Optimum

Two properties decide whether committing to a local choice is safe.

- **Greedy-choice property.** Some globally optimal solution contains the choice the local rule makes first, so committing to it never forecloses optimality. This is the property that fails most often and the one that must be proven.
- **Optimal substructure.** After the committed choice is removed, the remainder is the same problem on a smaller input. The argument can then continue by induction.

An **exchange argument** proves correctness by starting with any optimal solution and replacing one of its choices with the greedy choice without reducing quality. Repeating that exchange turns an optimum into the greedy solution without making it worse. For a hereditary independence system, the Rado–Edmonds theorem gives a sharper characterization: the standard weight-ordered greedy algorithm succeeds for every weight assignment exactly when the system is a matroid. The theorem does not validate an arbitrary local rule.

For activity selection, each accepted meeting extends a partial schedule and makes its overlapping candidates impossible. The invariant is that the partial schedule can still be extended to an optimum. Other greedy algorithms need their own invariant. [[Home/Computer Science/Algorithms/Graph Algorithms/Dijkstra|Dijkstra]] finalizes the shortest distance of each settled vertex, while Prim and Kruskal accept only edges justified by the cut or cycle properties of a [[Home/Computer Science/Algorithms/Graph Algorithms/Minimum Spanning Tree|Minimum Spanning Tree]].

# Where the Greedy-choice Property Fails

Coin change with denominations `{1, 3, 4}` making `6` exposes the failure directly. The largest-coin rule takes `4 + 1 + 1`, while `3 + 3` uses only two coins. The first commitment, `4`, appears in no optimal solution. Nothing in the loop can repair that choice. The local rule is wrong for this denomination set. Systems such as `{1, 5, 10, 25}` are canonical because the largest-coin rule is optimal for every amount, but coin systems do not have this property in general.

The 0/1 knapsack breaks the same property under a different local rule: value per unit of weight. With capacity `50`, consider items `(value 60, weight 10)`, `(100, 20)`, and `(120, 30)`, whose ratios are `6`, `5`, and `4`. Greedy takes the first two items for value `160`. The third no longer fits. The optimal packing takes the second and third items for value `220`, excluding the highest-ratio item entirely. Fractional knapsack changes the boundary. An item may be split to fill the remaining capacity, so the highest-ratio item always belongs to an optimal solution and the ratio rule becomes exact.

[[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|Dynamic programming]] handles the indivisible case by keeping both take and skip branches instead of committing to the local ratio winner.

Both examples fail for the same reason: the locally best first choice belongs to no optimal solution. The code still runs and returns a plausible answer. The hard part of a greedy algorithm is therefore the proof, not the scan.

# Diagram and C# Implementation

> [!ABSTRACT]- Greedy template
>
> ```mermaid
> flowchart TD
>   A[Order candidates by the greedy key] --> B{Candidates remain}
>   B -->|No| Z[Return committed solution]
>   B -->|Yes| C[Take next best candidate]
>   C --> D{Feasible with committed set}
>   D -->|Yes| E[Commit and never revisit]
>   D -->|No| F[Discard]
>   E --> B
>   F --> B
> ```

> [!EXAMPLE]- C# implementation — activity selection
>
> ```csharp
> public static int MaxActivities((int start, int end)[] acts)
> {
>     var ordered = acts.ToArray();
>     Array.Sort(ordered, (a, b) => a.end.CompareTo(b.end)); // earliest finish first
>     int count = 0, lastEnd = int.MinValue;
>     foreach (var (start, end) in ordered)
>     {
>         if (start >= lastEnd) // compatible with the last committed activity
>         {
>             count++;
>             lastEnd = end;
>         }
>     }
>     return count;
> }
> ```

# References

- [Algorithms (Jeff Erickson)](https://jeffe.cs.illinois.edu/teaching/algorithms/)
- [Matroids and the greedy algorithm (Jack Edmonds)](https://link.springer.com/article/10.1007/BF01584082)
