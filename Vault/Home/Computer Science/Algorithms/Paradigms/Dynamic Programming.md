---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Intro

Dynamic programming (DP) solves a problem by breaking it into **overlapping subproblems**, solving each once, and reusing the stored result instead of recomputing it. It applies when a problem has two properties: **optimal substructure** (an optimal solution is built from optimal solutions to subproblems) and **overlapping subproblems** (the same subproblem recurs many times). The payoff is turning exponential brute-force recursion into polynomial time — naive Fibonacci is O(2ⁿ); memoised, it's O(n). DP underlies edit distance, knapsack, longest common subsequence, shortest paths (Bellman-Ford, Floyd-Warshall), and countless interview problems.

## How It Works

There are two equivalent implementation styles:

- **Top-down (memoisation)** — write the natural recursion, then cache each subproblem's answer in a table/dictionary keyed by its arguments. The first call computes; later calls hit the cache. Easy to derive from the recurrence; uses the call stack.
- **Bottom-up (tabulation)** — fill a table iteratively from the base cases up to the answer, in an order that guarantees each cell's dependencies are already computed. No recursion overhead; often allows **space optimisation** by keeping only the last row/few cells.

The recipe: (1) define the **state** (what arguments uniquely identify a subproblem), (2) write the **recurrence** (how a state combines sub-states), (3) set **base cases**, (4) choose memoisation or tabulation, (5) optionally **reduce space**.


## Visualization

**The paradigm itself — overlapping subproblems.** Run naive `fib(5)` and every call becomes its own node; the tree balloons to **15 calls** because the same states (`f(3)`, `f(2)`, …) are recomputed again and again. Memoise, and the second time any state appears it becomes a **cache hit** whose entire subtree is skipped — the identical answer in just **9 calls**. Those repeated, greyed-out subtrees are exactly the *overlapping subproblems* that make a problem worth memoising: they are the redundant work caching removes.

```steptrace
{"algorithm":"fibonacci","n":5}
```

**Optimal substructure — the recurrence in action.** The longest-common-subsequence table builds each cell from its neighbours: on a match it inherits `diagonal + 1`, on a mismatch it inherits the optimum of its top/left sub-answer — the concrete statement that an optimal solution is composed of optimal sub-solutions. The per-step traceback then decomposes the finished answer back into the sub-answers it was built from, one cell at a time.

```steptrace
{"algorithm":"lcs","a":"AGCAT","b":"GAC"}
```

## Example

Top-down memoisation (clear, derived straight from the recurrence):

```csharp
public static long Fib(int n, Dictionary<int, long> memo)
{
    if (n < 2) return n;
    if (memo.TryGetValue(n, out var cached)) return cached;
    return memo[n] = Fib(n - 1, memo) + Fib(n - 2, memo);
}
```

Bottom-up with O(1) space — 0/1 nothing fancy, just the two previous values:

```csharp
public static long Fib(int n)
{
    long prev = 0, curr = 1;
    for (int i = 2; i <= n; i++)
        (prev, curr) = (curr, prev + curr);
    return n == 0 ? 0 : curr;
}
```

0/1 Knapsack (classic 2-D DP — max value within a weight budget):

```csharp
public static int Knapsack(int[] w, int[] v, int capacity)
{
    var dp = new int[capacity + 1];               // dp[c] = best value with capacity c
    for (int i = 0; i < w.Length; i++)
        for (int c = capacity; c >= w[i]; c--)    // iterate capacity DOWN for 0/1 (each item once)
            dp[c] = Math.Max(dp[c], dp[c - w[i]] + v[i]);
    return dp[capacity];
}
```

## Pitfalls

- **No optimal substructure ⇒ DP is wrong** — DP assumes a globally optimal answer is composed of optimal sub-answers. Problems where a locally suboptimal choice can lead to a better whole (e.g. longest *simple* path in a general graph) are **not** DP-solvable this way; don't force it.
- **Wrong iteration order** — bottom-up only works if every cell's dependencies are filled first. The knapsack capacity loop runs *downward* precisely so each item is used at most once; reversing it silently turns 0/1 knapsack into unbounded knapsack.
- **State that's too coarse or too fine** — miss a dimension and different subproblems collide (wrong answers); add an unnecessary dimension and the table explodes (TLE/MLE). Defining the minimal correct state is the real skill.
- **Memoisation key/recursion-depth issues** — deep top-down DP can `StackOverflow` on large inputs; convert to bottom-up. And the memo key must capture *all* arguments that affect the result, or you'll cache and return stale answers.

## Tradeoffs

| Aspect | Top-down (memoisation) | Bottom-up (tabulation) |
|---|---|---|
| Derivation | Easy — just cache the recursion | Needs an explicit fill order |
| Overhead | Recursion + hash lookups; stack-depth risk | No recursion; tight loops |
| Computes | Only states actually reached (lazy) | Often all states (even unused ones) |
| Space optimisation | Harder | Easy — drop old rows |

**Decision rule**: prototype with top-down memoisation (fastest to get correct from the recurrence); convert to bottom-up when you hit stack limits or want to shrink memory. Before reaching for DP, confirm optimal substructure — otherwise consider [[Greedy Algorithms|greedy]] (if a local rule provably suffices) or [[Backtracking]] (if you must search all configurations).

## Questions

> [!QUESTION]- What two properties must a problem have for dynamic programming to apply?
> **Optimal substructure** (an optimal solution is built from optimal solutions of subproblems) and **overlapping subproblems** (the same subproblem is solved repeatedly). Without overlap, plain divide-and-conquer (like merge sort) is enough — there's nothing to cache. Without optimal substructure, combining sub-answers doesn't yield the global optimum.

> [!QUESTION]- What's the difference between memoisation and tabulation?
> Both store subproblem results to avoid recomputation. **Memoisation** is top-down: recurse naturally and cache on the way, computing only the states you actually need. **Tabulation** is bottom-up: iteratively fill a table from base cases in dependency order, with no recursion and easier space optimisation. They produce the same answers; the choice is about overhead, stack depth, and memory.

> [!QUESTION]- How is DP related to greedy and divide-and-conquer?
> All three break a problem into subproblems. **Divide-and-conquer** subproblems are *independent* (no overlap) so no caching helps. **DP** subproblems *overlap*, so you cache. **Greedy** is a special case where a single local choice is provably optimal, so you don't even explore alternatives — when greedy works it's faster than DP, but it works far less often.

## References

- [Dynamic programming (Wikipedia)](https://en.wikipedia.org/wiki/Dynamic_programming) — formal definitions, classic problems, and Bellman's origin.
- [DP for Computing Contests (cp-algorithms)](https://cp-algorithms.com/dynamic_programming/intro-to-dp.html) — state design and common DP families.
- [Dynamic Programming patterns (LeetCode discuss)](https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns) — a categorised tour of the recurring DP templates.
