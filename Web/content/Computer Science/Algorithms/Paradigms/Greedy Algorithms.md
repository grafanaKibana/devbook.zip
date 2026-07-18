---
publish: true
created: 2026-07-12T14:27:20.407Z
modified: 2026-07-18T11:30:03.814Z
published: 2026-07-18T11:30:03.814Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Builds a solution by repeatedly making the locally best choice and never reconsidering; correct only when provably applicable.
level:
  - "4"
priority: High
status: Ready to Repeat
---

Scheduling the most non-overlapping meetings into one room has an exponential number of candidate subsets. A greedy algorithm skips that search: sort the meetings by finish time, then walk the list once, accepting each meeting whose start is at or after the last accepted finish. One sort and one pass produce a maximum-size schedule — no subset is ever enumerated, and no accepted meeting is ever reconsidered.

That is the shape of every greedy algorithm: build the answer incrementally, at each step commit to the option that ranks best under a fixed local rule, and never revisit a committed choice. The cost is almost always a sort (or a priority queue) plus a linear scan. The commitment is valid only when the local rule provably composes into a global optimum — most plausible-looking rules do not, and the paradigm gives no signal when a rule is wrong.

**Core condition:** a fixed local rule + the greedy-choice property + optimal substructure → one sort-and-scan reaches the global optimum → typically `O(n log n)` time, `O(1)`–`O(n)` space.

A run of the meeting schedule would animate the activity-selection pass over intervals sorted by finish time.

> [!NOTE] Visualization pending
> Planned StepTrace: a sequence-of-locally-optimal-choices card showing each step take the best immediate option and never reconsider it — for activity selection, the earliest-finishing compatible interval is highlighted and committed while every overlapping candidate drops out of contention. No matching renderer exists in `engine.js` yet.

# When local choices reach the global optimum

Two properties decide whether committing to a local choice is safe.

- **Greedy-choice property** — some globally optimal solution contains the choice the local rule makes first, so committing to it never forecloses optimality. This is the property that fails most often and the one that must be proven.
- **Optimal substructure** — after the committed choice is removed, the remainder is the same problem on a smaller input, so the same argument applies again by induction.

Correctness is established by an **exchange argument**: take any optimal solution, show one of its choices can be replaced by the greedy choice without reducing quality, then repeat the swap until the optimal solution becomes the greedy one. Because no swap makes the solution worse, greedy is at least as good as any optimum. Where the candidates form a matroid, the same result follows from the Rado–Edmonds theorem instead of a hand-written swap.

At each step the state that changes is a single element committed to the partial solution; the candidates that conflict with it become impossible; and the invariant that survives is that the partial solution stays a prefix of some optimal solution. [[Dijkstra]] shortest paths, Prim and Kruskal for a [[Minimum Spanning Tree]], Huffman coding, activity selection, and fractional knapsack all carry a published exchange (or cut/cycle) argument for exactly this invariant.

# Complexity

| Phase | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Order candidates by the greedy key | `O(n log n)` | `O(n)` or `O(log n)` | A comparison sort of `n` candidates dominates the total. |
| Feasibility scan | `O(n)` | `O(1)` | Each candidate is examined once, then committed or discarded. |
| Priority-queue variant | `O((V + E) log V)` | `O(V)` | [[Dijkstra]] and Prim re-rank candidates as edges are relaxed rather than sorting once. |

When the greedy key needs no comparison sort — bucketable weights, an already-ordered stream — the ordering phase drops and the whole algorithm is `O(n)`. Greedy keeps no memoization table, so on any problem where both apply it stays below a [[Dynamic Programming]] solution in both time and space.

# Where the greedy-choice property fails

Coin change with denominations `{1, 3, 4}` making `6` exposes the failure directly. The largest-coin rule takes `4`, then `1`, then `1` — three coins — while `3 + 3` uses two. The rule is locally optimal at every step, yet its first commitment (the `4`) appears in no optimal solution, so the greedy-choice property does not hold and there is nothing to patch in the loop: the rule itself is wrong for this denomination set. Canonical currencies like `{1, 5, 10, 25}` are constructed so the property does hold, which is why greedy is optimal there and nowhere guarantees it in general.

The 0/1 knapsack breaks the same greedy-choice property under a different local rule: value-per-weight. With capacity `50` and items `(value 60, weight 10)`, `(100, 20)`, `(120, 30)` — ratios `6`, `5`, `4` — greedy commits to the highest-ratio item first and ends with items 1 and 2 for weight `30` and value `160`, unable to fit the third. The only optimal packing is `(100, 20)` with `(120, 30)`, weight `50` and value `220`, and it excludes the highest-ratio item entirely — so the first local commitment is already outside every optimum. The problem still has optimal substructure — `OPT(cap, items) = max(OPT(cap, items∖{i}), v_i + OPT(cap − w_i, items∖{i}))` — which is exactly what makes the `O(nW)` [[Dynamic Programming]] solution correct; the greedy-choice property is what fails, not the substructure. Fractional knapsack, where the highest-ratio item can be cut to fill the capacity, always admits that item into an optimal solution, restoring the greedy-choice property and making greedy-by-ratio optimal.

The common thread: both are the greedy-choice property failing under a different local rule — fewest coins via the largest denomination, most value via the highest ratio — and in each case the locally best first choice belongs to no optimal solution. The failure is silent — the code runs and returns a plausible, suboptimal result — so the difficult part of applying greedy is proving the property holds, not writing the scan.

# Reference drawer

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
>     Array.Sort(acts, (a, b) => a.end.CompareTo(b.end)); // earliest finish first
>     int count = 0, lastEnd = int.MinValue;
>     foreach (var (start, end) in acts)
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
>
> The sort fixes the greedy key; `start >= lastEnd` is the only place a candidate is rejected. Replacing the key with shortest-duration or earliest-start breaks the exchange argument and the result, even though the code still runs.

# Questions

> [!QUESTION]- Why does greedy solve coin change for `{1, 5, 10, 25}` but not `{1, 3, 4}`?
> Standard denominations are constructed so the largest coin not exceeding the remainder always belongs to some optimal solution — the greedy-choice property holds, and an exchange argument confirms it. For `{1, 3, 4}` making `6`, the largest-coin rule yields `4 + 1 + 1` (three coins) while `3 + 3` (two coins) is optimal, so the first greedy commitment is in no optimal solution and the property fails. The loop is identical in both cases; only the denomination set decides correctness.

> [!QUESTION]- What does an exchange argument establish?
> That the greedy first choice is contained in some optimal solution. Starting from an arbitrary optimal solution, one of its choices is swapped for the greedy choice and shown not to reduce quality; repeating the swap transforms it into the greedy solution without ever getting worse, so greedy is at least as good as any optimum. Combined with optimal substructure, induction extends the result to the entire run.

> [!QUESTION]- Why is fractional knapsack inside greedy but 0/1 knapsack outside it?
> In fractional knapsack the highest value-per-weight item can always be taken — cut to fit the remaining capacity — so it belongs to an optimal solution and the greedy-choice property holds. In 0/1 knapsack an item is all-or-nothing, so a high-ratio item can be excluded from every optimal packing when a different indivisible combination uses its capacity for more total value; the greedy-choice property fails even though the problem keeps optimal substructure — the `max(OPT(cap, items∖{i}), v_i + OPT(cap − w_i, items∖{i}))` recurrence that the `O(nW)` DP exploits. The failing property is the greedy choice, not the substructure.

# References

- [Greedy algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Greedy_algorithm) — definition, the greedy-choice property, and the matroid characterization of when greedy is provably optimal.
- [Algorithms (Jeff Erickson)](https://jeffe.cs.illinois.edu/teaching/algorithms/) — the greedy chapter gives exchange-argument proofs for scheduling and Huffman codes, and the failure modes of plausible-but-wrong greedy rules.
- [Matroid (Wikipedia)](https://en.wikipedia.org/wiki/Matroid) — the Rado–Edmonds theorem: the greedy algorithm is optimal on a set system exactly when it forms a matroid.
