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

In finite one-pass dynamic programming, a dependency graph becomes a set of stored answers. Each state is solved after the states it depends on, written once, and then reused by later transitions.

The formulation starts with a state definition, base cases, and a recurrence over already-solved states. In the finite one-pass cases covered here, dependencies form an acyclic order. Recursion follows that order lazily. Iteration writes it out as loops. Optimization DP usually relies on **optimal substructure**, assembling an optimum from smaller optima. Counting and decision problems use the same machinery without optimizing. Repeated states make storage worthwhile, though repetition affects efficiency rather than correctness. Other DP methods, including value iteration, may revisit mutually dependent estimates until they converge.

**Core shape for finite one-pass DP:** state + base cases + recurrence + acyclic dependency order → each reached state solved once → `(number of distinct states) × (transition work per state)` time.

~~~~~tabsdown
tab: Visualization


~~~~tabsdown
tab: Greedy


```steptrace
{"algorithm":"coin-change-greedy"}
```

Largest usable coin first: exact change, but 6 coins instead of 3.

tab: Naive Recursion


```steptrace
{"algorithm":"coin-change-naive"}
```

Try every first coin. Repeated remainders rebuild the same work.

tab: Memoization


```steptrace
{"algorithm":"coin-change-memoization"}
```

Keep recursion, but save each answered remainder beside the counter.

tab: Tabulation


```steptrace
{"algorithm":"coin-change-tabulation"}
```

Build exact change from 0¢ upward on a visual amount board.

tab: Memoization (Raw)


```steptrace
{"algorithm":"coin-change-top-down"}
```

Inspect the canonical recursion tree, cache hits, and stored returns.

~~~~


Both examples become DP only after the state discards irrelevant history. Coin change keeps the remaining amount because every denomination remains reusable; finite coin stock would also require the remaining counts. Grid path keeps the current coordinate. Two calls with the same state have the same future choices and therefore the same answer, regardless of how they arrived there.

- **Top-down (memoisation)** follows the recurrence from the target. The first visit to an amount or coordinate computes it; later visits return the saved answer. It may skip unreachable states, but it pays call-stack cost. [[Home/Computer Science/Algorithms/Paradigms/Memoization|Memoization]] develops that reuse mechanism independently of DP.
- **Bottom-up (tabulation)** starts from known answers and fills every state its target may depend on. Coin change advances from `0¢` to `30¢`; grid path moves backward from the dispatch door. The loops make dependency order explicit and avoid recursion.

The recurrence then names the dependencies. Coin change reads `best[amount - coin]` for every usable denomination and keeps the minimum plus one. Grid path reads the right and down suffix costs and adds the current tile. The animations differ because those state spaces differ—a one-dimensional amount board versus a two-dimensional matrix—but the storage rule is the same.


A cashier must return exactly `30¢` using real `1¢`, `10¢`, `25¢`, and `50¢` denominations. The example assumes enough of each coin that stock is not a constraint. Taking the largest usable coin first returns `25 + 1 + 1 + 1 + 1 + 1`, while `10 + 10 + 10` uses half as many coins. The five tabs keep that counterexample fixed while changing the solving strategy and level of abstraction.

The simplified Memoization and Tabulation tabs keep the cashier model visible. Memoization (Raw) exposes the transferable recursion tree beneath the counter: each node is a remaining amount, and a cache hit closes a repeated subtree. The exact approaches compute `30¢ → 3 coins`; they differ in which states are visited first and whether control lives in the call stack or a loop.

> [!ABSTRACT]- Coin-change state flow
>
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
>
> ```csharp
> static int FewestCoinsTopDown(int amount, int[] coins)
> {
>     ArgumentNullException.ThrowIfNull(coins);
>     ArgumentOutOfRangeException.ThrowIfNegative(amount);
>     if (amount == int.MaxValue)
>         throw new ArgumentOutOfRangeException(nameof(amount), "amount + 1 must fit in Int32.");
>     if (coins.Any(coin => coin <= 0))
>         throw new ArgumentException("Coin denominations must be positive.", nameof(coins));
>
>     var memo = new Dictionary<int, int> { [0] = 0 };
>     var answer = Solve(amount);
>     return answer > amount ? -1 : answer;
>
>     int Solve(int remaining)
>     {
>         if (memo.TryGetValue(remaining, out var cached)) return cached;
>
>         var best = amount + 1;
>         foreach (var coin in coins)
>         {
>             if (coin > remaining) continue;
>             var suffix = Solve(remaining - coin);
>             if (suffix <= amount)
>                 best = Math.Min(best, suffix + 1);
>         }
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
>     ArgumentNullException.ThrowIfNull(coins);
>     ArgumentOutOfRangeException.ThrowIfNegative(amount);
>     if (amount == int.MaxValue)
>         throw new ArgumentOutOfRangeException(nameof(amount), "amount + 1 must fit in Int32.");
>     if (coins.Any(coin => coin <= 0))
>         throw new ArgumentException("Coin denominations must be positive.", nameof(coins));
>
>     var dp = Enumerable.Repeat(amount + 1, amount + 1).ToArray();
>     dp[0] = 0;
>
>     for (var remaining = 1; remaining <= amount; remaining++)
>         foreach (var coin in coins)
>             if (coin <= remaining)
>             {
>                 var suffix = dp[remaining - coin];
>                 if (suffix <= amount)
>                     dp[remaining] = Math.Min(dp[remaining], suffix + 1);
>             }
>
>     return dp[amount] > amount ? -1 : dp[amount];
> }
> ```
> `FewestCoinsTopDown(30, [1, 10, 25, 50])` and the bottom-up version both return `3`. The contract requires `0 <= amount < int.MaxValue` and strictly positive denominations; those constraints keep dependencies acyclic and the sentinel arithmetic valid.


A warehouse robot may move only right or down from the loading bay to the dispatch door. Choosing the cheaper immediate tile and breaking ties to the right walks into an expensive corridor and costs `21`; the best complete route costs `10`. Naive recursion eventually finds it, but different route prefixes repeatedly reach the same coordinate.

~~~~tabsdown
tab: Greedy


```steptrace
{"algorithm":"grid-path-greedy"}
```

Choose the cheaper next tile, breaking ties right. Later costs trap the route.

tab: Naive Recursion


```steptrace
{"algorithm":"grid-path-naive"}
```

Explore every right/down route and revisit the same coordinates.

tab: Memoization


```steptrace
{"algorithm":"grid-path-memoization"}
```

Write solved remaining costs into the warehouse map and reuse repeated tiles.

tab: Tabulation


```steptrace
{"algorithm":"grid-path-tabulation"}
```

Fill the warehouse map backward from the dispatch door and reveal the route.

tab: Memoization (Raw)


```steptrace
{"algorithm":"grid-path-top-down"}
```

Inspect the canonical coordinate recursion tree and cache hits.

~~~~

Here the state is a coordinate rather than an amount. `best(R2C2)` means “the minimum remaining cost from this tile,” independent of how the robot arrived. The four simplified tabs use one warehouse matrix with integrated context, while Memoization (Raw) exposes the canonical recursion tree. Memoization stops repeated calls to a saved coordinate; tabulation makes the dependency order spatial by reading the already-solved tiles to the right and below.

> [!ABSTRACT]- Grid-path state flow
>
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
>
> ```csharp
> static long CheapestPathTopDown(int[,] cost)
> {
>     ArgumentNullException.ThrowIfNull(cost);
>     var rows = cost.GetLength(0);
>     var columns = cost.GetLength(1);
>     if (rows == 0 || columns == 0)
>         throw new ArgumentException("The cost grid must be nonempty.", nameof(cost));
>     var memo = new long?[rows, columns];
>
>     return Solve(0, 0);
>
>     long Solve(int row, int column)
>     {
>         if (row == rows - 1 && column == columns - 1) return cost[row, column];
>         if (memo[row, column] is long cached) return cached;
>
>         long suffix = row == rows - 1
>             ? Solve(row, column + 1)
>             : column == columns - 1
>                 ? Solve(row + 1, column)
>                 : Math.Min(Solve(row + 1, column), Solve(row, column + 1));
>         var answer = checked((long)cost[row, column] + suffix);
>         memo[row, column] = answer;
>         return answer;
>     }
> }
> ```
>
> ```csharp
> static long CheapestPathBottomUp(int[,] cost)
> {
>     ArgumentNullException.ThrowIfNull(cost);
>     var rows = cost.GetLength(0);
>     var columns = cost.GetLength(1);
>     if (rows == 0 || columns == 0)
>         throw new ArgumentException("The cost grid must be nonempty.", nameof(cost));
>     var dp = new long[rows, columns];
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
>         long suffix = row == rows - 1
>             ? dp[row, column + 1]
>             : column == columns - 1
>                 ? dp[row + 1, column]
>                 : Math.Min(dp[row + 1, column], dp[row, column + 1]);
>         dp[row, column] = checked((long)cost[row, column] + suffix);
>     }
>
>     return dp[0, 0];
> }
> ```
> Both versions require a nonempty grid and return the same checked `long` route cost. Explicit edge transitions prevent an out-of-grid sentinel from winning against a large valid suffix. The visualization keeps the full table so it can also highlight the chosen route.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Dynamic Programming complexity",
  "variables": {
    "optionCount": {
      "symbol": "m",
      "description": "number of coin denominations considered at each state"
    },
    "targetSize": {
      "symbol": "n",
      "description": "target amount in the coin-change comparison"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (recurse every coin choice)",
          "formula": "O(m^n)",
          "curveFrom": "exponential",
          "curveTo": "unbounded"
        },
        {
          "kind": "approach",
          "label": "Dynamic programming",
          "formula": "O(n·m)",
          "curveFrom": "linear",
          "curveTo": "quadratic"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (recurse every coin choice)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Dynamic programming",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```
~~~~~

# Boundaries

A DP formulation is only as sound as its state definition and recurrence. Reuse and table shape decide whether it is practical.

- **The state omits necessary history.** A coordinate is sufficient because movement is restricted to right and down and the remaining tile costs depend only on position. Fuel, keys, or visited-tile restrictions would also have to become part of the state.
- **The dependency order is cyclic.** Right/down movement forms a DAG. Unrestricted movement can introduce cycles, so one recursive or tabulated pass no longer works. The problem needs a graph shortest-path algorithm or another convergence rule.
- **A state may be unreachable.** Coin change without a `1¢` denomination can leave some amounts impossible. Its sentinel must pass through the recurrence without overflowing, and the public result must distinguish “no solution” from a large valid answer.
- **No states repeat.** A memo with no cache hits adds overhead. This is the usual [[Home/Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] regime: merge sort has a valid recurrence, but every subarray state is unique.

Optimization DP still needs a valid composition rule. For the same US-coin drawer, the largest-coin rule returns `25 + 1 + 1 + 1 + 1 + 1` for `30¢`. The recurrence compares every allowed predecessor and finds `10 + 10 + 10`. The [[Home/Computer Science/Algorithms/Paradigms/Greedy Algorithms|greedy algorithms]] note explains why that local rule fails and when it is safe.

# Questions

> [!QUESTION]- What changes between memoization and tabulation if the recurrence is the same?
> Evaluation order and control flow. Memoization starts at the target, follows recursive dependencies, and stores states on demand. Tabulation starts at the base cases and fills states in a fixed order. Their asymptotic work matches when they visit the same states. Tabulation avoids call-stack cost, while memoization may skip states the target never reaches.

# References

- [Richard Bellman, "The Theory of Dynamic Programming" (1954)](https://www.ams.org/bull/1954-60-06/S0002-9904-1954-09848-8/S0002-9904-1954-09848-8.pdf)
- [MIT 6.006 Dynamic Programming lecture notes, Spring 2020](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/)
