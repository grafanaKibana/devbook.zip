---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Defines finite acyclic states and recurrences, solves each state in dependency order, and reuses stored results."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Suppose a target state depends on two smaller states, and those states depend on earlier ones. Solving that dependency graph in order turns it into a table where every state is written once and later transitions read stored results instead of rebuilding them.

Dynamic programming starts with a well-defined state, base cases, and a recurrence that composes already-solved states. In the finite, one-pass formulations covered here, those dependencies form an acyclic order, whether followed lazily by recursion or eagerly by iteration. For optimization problems, that valid recurrence usually expresses **optimal substructure**: an optimum is assembled from optima of smaller states. Counting and decision DPs use the same state-and-recurrence machinery without necessarily optimizing anything. Repeated states are what make storing results pay, but they are an efficiency condition rather than a correctness requirement. Iterative methods such as value iteration are also DP, but may revisit mutually dependent value estimates until convergence rather than solve every state once.

**Core shape for finite one-pass DP:** state + base cases + recurrence + acyclic dependency order → each reached state solved once → `(number of distinct states) × (transition work per state)` time.

## Coin change — local choice versus stored subproblems

A cashier must return exactly `30¢` using real `1¢`, `10¢`, `25¢`, and `50¢` denominations. The example assumes enough of each coin that stock is not a constraint. Taking the largest usable coin first returns `25 + 1 + 1 + 1 + 1 + 1`, while `10 + 10 + 10` uses half as many coins. The five tabs keep that counterexample fixed while changing the solving strategy and level of abstraction.

```steptrace
{"selected":0,"tabs":[{"name":"Greedy","description":"Largest usable coin first: exact change, but 6 coins instead of 3.","algorithm":"coin-change-greedy"},{"name":"Naive Recursion","description":"Try every first coin; repeated remainders rebuild the same work.","algorithm":"coin-change-naive"},{"name":"Memoization","description":"Keep recursion, but save each answered remainder beside the counter.","algorithm":"coin-change-memoization"},{"name":"Tabulation","description":"Build exact change from 0¢ upward on a visual amount board.","algorithm":"coin-change-tabulation"},{"name":"Memoization (Raw)","description":"Inspect the canonical recursion tree, cache hits, and stored returns.","algorithm":"coin-change-top-down"}]}
```

The simplified Memoization and Tabulation tabs keep the cashier model visible. Memoization (Raw) exposes the transferable recursion tree beneath the counter: each node is a remaining amount, and a cache hit closes a repeated subtree. The exact approaches compute `30¢ → 3 coins`; they differ in which states are visited first and whether control lives in the call stack or a loop.

> [!ABSTRACT]- Coin-change state flow
> ```mermaid
> flowchart LR
>   A["best(30¢)"] -->|"use 1¢"| B["best(29¢) + 1"]
>   A -->|"use 10¢"| C["best(20¢) + 1"]
>   A -->|"use 25¢"| D["best(5¢) + 1"]
>   C --> E["best(10¢) + 2"]
>   E --> F["best(0¢) + 3"]
>   B --> G["other valid continuations"]
>   D --> H["five 1¢ transitions"]
>   F --> I["minimum: 3 coins"]
>   G --> I
>   H --> I
> ```

> [!EXAMPLE]- Coin change, top-down and bottom-up (C#)
> ```csharp
> static int FewestCoinsTopDown(int amount, int[] coins)
> {
>     var memo = new Dictionary<int, int> { [0] = 0 };
>     var answer = Solve(amount);
>     return answer > amount ? -1 : answer;
>
>     int Solve(int remaining)
>     {
>         if (remaining < 0) return amount + 1;
>         if (memo.TryGetValue(remaining, out var cached)) return cached;
>
>         var best = amount + 1;
>         foreach (var coin in coins)
>             best = Math.Min(best, Solve(remaining - coin) + 1);
>
>         memo[remaining] = best;
>         return best;
>     }
> }
> ```
>
> ```csharp
> static int FewestCoinsBottomUp(int amount, int[] coins)
> {
>     var dp = Enumerable.Repeat(amount + 1, amount + 1).ToArray();
>     dp[0] = 0;
>
>     for (var remaining = 1; remaining <= amount; remaining++)
>         foreach (var coin in coins)
>             if (coin <= remaining)
>                 dp[remaining] = Math.Min(dp[remaining], dp[remaining - coin] + 1);
>
>     return dp[amount] > amount ? -1 : dp[amount];
> }
> ```
> `FewestCoinsTopDown(30, [1, 10, 25, 50])` and the bottom-up version both return `3`.

## Grid path — repeated coordinates versus a filled matrix

A warehouse robot may move only right or down from the loading bay to the dispatch door. Choosing the cheaper immediate tile walks into an expensive corridor and costs `21`; the best complete route costs `10`. Naive recursion eventually finds it, but different route prefixes repeatedly reach the same coordinate.

```steptrace
{"selected":0,"tabs":[{"name":"Greedy","description":"Choose the cheaper next tile; the route is trapped by later costs.","algorithm":"grid-path-greedy"},{"name":"Naive Recursion","description":"Explore every right/down route and revisit the same coordinates.","algorithm":"grid-path-naive"},{"name":"Memoization","description":"Write solved remaining costs into the warehouse map and reuse repeated tiles.","algorithm":"grid-path-memoization"},{"name":"Tabulation","description":"Fill the warehouse map backward from the dispatch door and reveal the route.","algorithm":"grid-path-tabulation"},{"name":"Memoization (Raw)","description":"Inspect the canonical coordinate recursion tree and cache hits.","algorithm":"grid-path-top-down"}]}
```

Here the state is a coordinate rather than an amount. `best(R2C2)` means “the minimum remaining cost from this tile,” independent of how the robot arrived. The four simplified tabs use one warehouse matrix with integrated context, while Memoization (Raw) exposes the canonical recursion tree. Memoization stops repeated calls to a saved coordinate; tabulation makes the dependency order spatial by reading the already-solved tiles to the right and below.

> [!ABSTRACT]- Grid-path state flow
> ```mermaid
> flowchart LR
>   A["best(R1C1)"] -->|right| B["best(R1C2)"]
>   A -->|down| C["best(R2C1)"]
>   B -->|down| D["best(R2C2)"]
>   C -->|right| D
>   D --> E["minimum of right and down"]
>   E --> F["dispatch door"]
> ```
> `R2C2` is one state even though two route prefixes reach it. Memoization computes its suffix once; tabulation fills it once before either predecessor reads it.

> [!EXAMPLE]- Grid path, top-down and bottom-up (C#)
> ```csharp
> static int CheapestPathTopDown(int[,] cost)
> {
>     var rows = cost.GetLength(0);
>     var columns = cost.GetLength(1);
>     var memo = new int?[rows, columns];
>
>     return Solve(0, 0);
>
>     int Solve(int row, int column)
>     {
>         if (row >= rows || column >= columns) return int.MaxValue / 4;
>         if (row == rows - 1 && column == columns - 1) return cost[row, column];
>         if (memo[row, column] is int cached) return cached;
>
>         var answer = cost[row, column] + Math.Min(
>             Solve(row + 1, column),
>             Solve(row, column + 1));
>         memo[row, column] = answer;
>         return answer;
>     }
> }
> ```
>
> ```csharp
> static int CheapestPathBottomUp(int[,] cost)
> {
>     var rows = cost.GetLength(0);
>     var columns = cost.GetLength(1);
>     var dp = new int[rows, columns];
>
>     for (var row = rows - 1; row >= 0; row--)
>     for (var column = columns - 1; column >= 0; column--)
>     {
>         if (row == rows - 1 && column == columns - 1)
>         {
>             dp[row, column] = cost[row, column];
>             continue;
>         }
>
>         var down = row + 1 < rows ? dp[row + 1, column] : int.MaxValue / 4;
>         var right = column + 1 < columns ? dp[row, column + 1] : int.MaxValue / 4;
>         dp[row, column] = cost[row, column] + Math.Min(down, right);
>     }
>
>     return dp[0, 0];
> }
> ```
> Both versions return the same minimum route cost; the visualization keeps the full table so it can also highlight the chosen route.

## Mechanism — state, recurrence, and the two forms

Both examples become DP only after the state discards irrelevant history. Coin change keeps the remaining amount because every denomination remains reusable; finite coin stock would also require the remaining counts. Grid path keeps the current coordinate. Two calls with the same state have the same future choices and therefore the same answer, regardless of how they arrived there.

- **Top-down (memoisation)** follows the recurrence from the target. The first visit to an amount or coordinate computes it; later visits return the saved answer. It may skip unreachable states, but it pays call-stack cost. [[Home/Computer Science/Algorithms/Paradigms/Memoization|Memoization]] develops that reuse mechanism independently of DP.
- **Bottom-up (tabulation)** starts from known answers and fills every state its target may depend on. Coin change advances from `0¢` to `30¢`; grid path moves backward from the dispatch door. The loops make dependency order explicit and avoid recursion.

The recurrence then names the dependencies. Coin change reads `best[amount - coin]` for every usable denomination and keeps the minimum plus one. Grid path reads the right and down suffix costs and adds the current tile. The animations differ because those state spaces differ—a one-dimensional amount board versus a two-dimensional matrix—but the storage rule is the same.

## Complexity

DP's running time is structural: distinct states multiplied by transitions examined per state.

| Problem | State count | Transitions per state | Time | Stored answers | Top-down stack |
| --- | --- | --- | --- | --- | --- |
| Coin change, target `W`, `D` denominations | `W + 1` amounts | up to `D` coins | `O(WD)` | `O(W)` | `O(W)` |
| Grid path, `R × C` matrix | `R·C` coordinates | at most right + down | `O(RC)` | `O(RC)` | `O(R + C)` |

Grid-path tabulation can keep one row in `O(C)` space when only the minimum cost matters. The visualization retains all `R·C` cells because reconstructing and highlighting the chosen route needs predecessor information. Coin change similarly needs an extra chosen-coin array if the result must include the actual coins rather than only their count.

## Boundaries

The recurrence and state definition are load-bearing; reuse and table shape determine whether the formulation is practical.

- **The state omits necessary history.** A coordinate is sufficient only because movement is restricted to right and down and the remaining tile costs depend solely on position. If the robot had fuel, keys, or visited-tile restrictions, those values would also belong in the state.
- **The dependency order is cyclic.** Right/down movement forms a DAG. Allowing unrestricted movement can create cycles, so a single recursive or tabulated pass is no longer enough; the formulation needs a graph shortest-path algorithm or another convergence rule.
- **A state may be unreachable.** Coin change without a `1¢` denomination can leave some amounts impossible. The sentinel must survive the recurrence without overflowing, and the public result should distinguish “no solution” from a large valid answer.
- **No repeated states.** A memo with no cache hits only adds overhead. This is the usual [[Home/Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] regime: merge sort's subarrays are distinct even though its recurrence is valid.

Optimization DP still needs a valid composition rule. For the same US-coin drawer, the largest-coin rule returns `25 + 1 + 1 + 1 + 1 + 1` for `30¢`, while the recurrence compares every allowed predecessor and finds `10 + 10 + 10`. The [[Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy algorithms]] note develops this failure of the greedy-choice property and the conditions under which the cheaper local rule is safe.

## Questions

> [!QUESTION]- Why are remaining amount and current coordinate valid states?
> Each captures everything that can change the future answer. With reusable denominations, the coins already chosen do not change which combinations can finish a remaining amount; finite stock would add the remaining counts to the state. Once the coordinate is known, the route prefix does not change the right/down suffix costs. Calls with the same state are therefore interchangeable and may share one stored answer.

> [!QUESTION]- Why does greedy coin selection fail while the DP succeeds?
> Greedy commits to `25¢` because it is the largest usable coin, leaving five pennies and producing six coins. DP compares every predecessor of `30¢`, including the `20¢` state reached by taking `10¢`, so it can keep the globally smaller `10 + 10 + 10` result. The extra work buys freedom from an unproved greedy-choice property.

> [!QUESTION]- What changes between memoization and tabulation if the recurrence is the same?
> Evaluation order and control flow. Memoization begins at the target, follows recursive dependencies, and stores states on demand. Tabulation begins at base cases and fills states in a predetermined order. Their asymptotic work matches when both visit the same states; tabulation avoids call-stack cost, while memoization may skip states the target never reaches.

## References

- [Dynamic programming (Wikipedia)](https://en.wikipedia.org/wiki/Dynamic_programming) — formal definition, Bellman's origin of the term, and the optimal-substructure / overlapping-subproblems conditions.
- [MIT 6.006 Introduction to Algorithms, Spring 2020](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — the dynamic-programming unit frames DP as recursion plus memoisation and works through subproblem/state design.
- Cormen, Leiserson, Rivest, Stein, *Introduction to Algorithms* — the "Dynamic Programming" chapter (Ch. 15 in the 3rd edition, Ch. 14 in the 4th edition) develops state recurrences, optimal substructure, overlapping subproblems, and both evaluation orders.
