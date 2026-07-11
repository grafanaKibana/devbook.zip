---
publish: true
created: 2026-07-11T07:15:29.936Z
modified: 2026-07-11T07:15:29.936Z
published: 2026-07-11T07:15:29.936Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

Computing the nth Fibonacci number straight from the definition `f(n) = f(n-1) + f(n-2)` grows a recursion tree that re-derives the same values exponentially often: `fib(5)` evaluates `f(2)` three separate times, and `fib(50)` makes over 40 billion calls for a quantity the recurrence defines at only 51 distinct points. The subproblems overlap heavily — few distinct ones exist — yet the plain recursion has no memory of having solved any of them.

Dynamic programming removes that redundancy: solve each distinct subproblem once, store the result, and return the stored value wherever the subproblem recurs. It applies when a problem has **optimal substructure** — an optimal solution is assembled from optimal solutions to subproblems — and **overlapping subproblems** — the same subproblem recurs across the recursion. Optimal substructure is what makes composing sub-answers valid; overlap is what makes storing them pay.

**Core condition:** optimal substructure + overlapping subproblems → each distinct state solved once and reused → `(number of distinct states) × (work per state)` time.

## Where the repeated work goes

The trace expands naive `fib(5)`, one node per recursive call.

```steptrace
{"algorithm":"fibonacci","n":5}
```

The decisive event is the second time any state appears. In the recursion-only expansion, `f(3)`, `f(2)`, and `f(1)` are rebuilt from scratch on every occurrence, and the tree reaches 15 calls. Once each state's result is memoised, its first evaluation writes a cache entry and every later occurrence returns immediately — the entire subtree beneath that repeated node is never re-entered. The exponential tree collapses to 9 calls: one computation per distinct state, the rest immediate cache hits. Those pruned subtrees are precisely the overlapping subproblems, and skipping them is what turns `O(2ⁿ)` into `O(n)`.

The second trace fills the longest-common-subsequence table for `AGCAT` and `GAC`, showing where a subproblem's answer comes from.

```steptrace
{"algorithm":"lcs","a":"AGCAT","b":"GAC"}
```

Each cell `dp[i][j]` holds the LCS length of the prefixes `a[0..i)` and `b[0..j)`, and it is filled only from cells already present. On a character match it takes the diagonal `dp[i-1][j-1] + 1`; on a mismatch it takes `max(dp[i-1][j], dp[i][j-1])`, the better of the top and left sub-answers. That transition is optimal substructure made concrete — the optimum for a prefix pair is built from the optima of shorter prefix pairs. Because every cell depends only on neighbours that already exist, one row-by-row sweep visits each of the `m·n` states exactly once.

## Mechanism — state, recurrence, and the two forms

Once the state and recurrence are fixed, DP takes one of two equivalent shapes.

- **Top-down (memoisation)** — write the natural recursion, then cache each subproblem's result keyed by its arguments. The first call to a state computes; later calls hit the cache. It evaluates only the states actually reached and follows the recurrence directly, at the cost of call-stack depth.
- **Bottom-up (tabulation)** — fill a table iteratively from the base cases, in an order where every cell's dependencies are already filled. No recursion, tight loops, and it often admits space reduction by keeping only the rows still read.

The difficulty is neither form; it is **state design** — choosing the arguments that uniquely identify a subproblem. The state has to capture everything that affects the answer, or two genuinely different subproblems collide on one cache slot and the answer is wrong; and nothing more, or the table's size, and the running time, inflate. For LCS the state is a pair of prefix lengths `(i, j)`; for 0/1 knapsack it is `(item index, remaining capacity)`; for edit distance it is again a pair of prefix lengths. The recurrence states how a cell is composed from smaller states, and the base cases pin down the smallest ones.

## Complexity

DP's running time is structural: the number of distinct states multiplied by the work to combine each state from its sub-states. LCS makes both factors concrete.

| Quantity | LCS of lengths m, n | Cause |
| --- | --- | --- |
| Distinct states | `m·n` | one per prefix pair `(i, j)` |
| Work per state | `O(1)` | a match test and one `max` of two neighbours |
| Time | `O(m·n)` | states × work per state |
| Space, full table | `O(m·n)` | every cell kept for the traceback |
| Space, rolling | `O(min(m, n))` | a cell reads only its row and the one above |

The rolling-array reduction works because each cell reads its own row and the previous row only; keeping two rows — indexed on the shorter string — is enough to compute the length. Recovering the actual subsequence rather than its length needs the full table or a re-derivation, so the space reduction trades away the traceback.

## Boundaries

Both prerequisites are load-bearing, and each failure has a distinct signature.

- **No overlapping subproblems.** If every subproblem is distinct, a memo never records a second hit and adds only overhead. That is the regime of plain [[Divide and Conquer|divide and conquer]]: merge sort splits into non-overlapping halves, so there is nothing to reuse.
- **No optimal substructure.** If a globally optimal answer is not composed of optimal sub-answers, the recurrence is simply wrong. The longest _simple_ path in a general graph is the standard failure — the best path into a vertex can force a worse continuation, so per-vertex optima do not compose into the global optimum, and the problem needs full search ([[Backtracking]]). (The opposite extreme is [[Greedy Algorithms|greedy]], which is not a failure of optimal substructure but a _strengthening_ of it: when the problem also has the greedy-choice property — one locally optimal choice is provably part of some global optimum — the table collapses to a single committed choice at each step.)
- **State space too large to tabulate.** The time bound is also the memory bound. A knapsack with capacity `10⁹` has `10⁹` states per item; the `states × work` product that is polynomial in one parameter can still be exponential in the input's bit length (0/1 knapsack is NP-hard). Memoising only the reached states, or redefining the state, is the escape.
- **Wrong state definition.** Omitting a dimension the answer depends on maps two different subproblems to the same slot, and the second read returns a stale value with no error. Bottom-up, the analogous defect is filling a cell before its dependencies and reading uninitialised sub-answers. Both are silent: nothing crashes, the table just answers the wrong question.

## Reference drawer

> [!ABSTRACT]- When DP applies, and its two forms
>
> ```mermaid
> flowchart TD
>   A[Problem] --> B{Same subproblems recur?}
>   B -->|No| C[Divide and conquer: nothing to reuse]
>   B -->|Yes| D{Optimum built from optimal sub-solutions?}
>   D -->|No| E[Full search / backtracking]
>   D -->|One provably safe choice| F[Greedy]
>   D -->|Many combined| G[Dynamic programming]
>   G --> H[Top-down: recurse, memoise reached states]
>   G --> I[Bottom-up: tabulate in dependency order]
> ```

> [!EXAMPLE]- LCS, top-down and bottom-up (C#)
>
> ```csharp
> // Top-down: memoise over the (i, j) prefix-length state.
> public static int Lcs(string a, string b)
> {
>     var memo = new int?[a.Length + 1, b.Length + 1];
>     return Solve(a, b, a.Length, b.Length, memo);
> }
>
> private static int Solve(string a, string b, int i, int j, int?[,] memo)
> {
>     if (i == 0 || j == 0) return 0;
>     if (memo[i, j] is int cached) return cached;
>
>     int result = a[i - 1] == b[j - 1]
>         ? Solve(a, b, i - 1, j - 1, memo) + 1
>         : Math.Max(Solve(a, b, i - 1, j, memo), Solve(a, b, i, j - 1, memo));
>
>     memo[i, j] = result;
>     return result;
> }
> ```
>
> ```csharp
> // Bottom-up: fill in increasing prefix order; O(m·n) time and space.
> public static int Lcs(string a, string b)
> {
>     var dp = new int[a.Length + 1, b.Length + 1];
>     for (int i = 1; i <= a.Length; i++)
>         for (int j = 1; j <= b.Length; j++)
>             dp[i, j] = a[i - 1] == b[j - 1]
>                 ? dp[i - 1, j - 1] + 1
>                 : Math.Max(dp[i - 1, j], dp[i, j - 1]);
>     return dp[a.Length, b.Length];
> }
> ```
>
> Both return the LCS length. Keeping two rows instead of the full `dp` drops space to `O(min(m, n))` but removes the table needed to reconstruct the subsequence itself.

## Comparison

The shared baseline is naive full recursion, which re-solves overlapping subproblems and runs in exponential time. The four paradigms differ in whether — and how — they avoid redoing work on the same problem.

| Paradigm | Reuses subresults | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| Dynamic programming | Yes — each state cached once | Optimal substructure + overlap; enumerable states | Optimisation over overlapping subproblems with a small state space | Huge or continuous state space; no overlap to amortise |
| [[Divide and Conquer]] | No — subproblems disjoint | Split into independent parts | Independent halves (sort, FFT, closest pair) | Subproblems overlap, so work is recomputed |
| [[Greedy Algorithms]] | No — one choice, never revisited | Greedy-choice property | A local rule is provably globally optimal | The safe local choice cannot be proven |
| [[Backtracking]] | No — explores, prunes, discards | A feasibility / constraint test | Enumerate or verify configurations with no exploitable overlap | Overlap exists that a memo could reuse |

Dynamic programming earns its place exactly when the subproblems overlap and the optimum is composed of sub-optima: it pays `(states × work)` in time and, unless a rolling array applies, the same in memory. Divide and conquer skips the memo entirely when the subproblems are independent; greedy skips the table and runs in near-linear time when one local choice is provably safe; backtracking searches configurations directly when there is no reusable overlap. DP is the fit for optimisation over overlapping subproblems whose state space is small enough to hold.

## Questions

> [!QUESTION]- What two properties must hold for DP to apply, and what does each guarantee?
> Optimal substructure — an optimal solution is composed of optimal solutions to subproblems — makes combining sub-answers valid. Overlapping subproblems — the same subproblem recurs — makes caching worthwhile. Without the first, the recurrence yields a wrong optimum; without the second, a memo never gets a second hit and only adds overhead, which is the divide-and-conquer regime.

> [!QUESTION]- Where does DP's running time come from?
> The number of distinct states multiplied by the work to combine each state from its sub-states. LCS over lengths m and n has `m·n` prefix-pair states with `O(1)` work each, giving `O(m·n)`. The state count is also the memory bound, unless a rolling array drops rows that are no longer read.

> [!QUESTION]- What separates DP from divide and conquer and from greedy?
> All three decompose into subproblems. Divide and conquer's subproblems are independent, so there is nothing to cache. Greedy commits to one provably safe local choice and never reconsiders it, exploring no alternatives. DP sits between them: subproblems overlap, so each distinct one is solved once and reused across every place it recurs.

> [!QUESTION]- How can a correct recurrence still produce wrong answers once implemented?
> If the state omits an argument the answer depends on, two different subproblems map to the same cache slot and the second read returns a stale value with no error raised. Bottom-up, the analogous failure is filling a cell before its dependencies, reading uninitialised sub-answers.

## References

- [Dynamic programming (Wikipedia)](https://en.wikipedia.org/wiki/Dynamic_programming) — formal definition, Bellman's origin of the term, and the optimal-substructure / overlapping-subproblems conditions.
- [Longest common subsequence (Wikipedia)](https://en.wikipedia.org/wiki/Longest_common_subsequence) — the `O(m·n)` table recurrence used here as the running example, plus traceback and the rolling-array space reduction.
- [MIT 6.006 Introduction to Algorithms, Spring 2020](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — the dynamic-programming unit frames DP as recursion plus memoisation and works through subproblem/state design.
- Cormen, Leiserson, Rivest, Stein, _Introduction to Algorithms_ — the "Dynamic Programming" chapter (Ch. 15 in the 3rd edition, Ch. 14 in the 4th edition) develops optimal substructure, overlapping subproblems, and both implementation forms with LCS and matrix-chain examples.
