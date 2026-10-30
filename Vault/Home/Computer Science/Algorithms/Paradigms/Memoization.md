---
topic: [Computer Science]
subtopic: [Algorithms]
summary: "Caches pure function results by arguments so repeated subproblems return without recomputation."
level: ["4"]
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Computer Science"
qard-topic: "Algorithms/Paradigms/Memoization"
flashcard_uid: "0f376618"
created: "2026-07-12T19:33:38.000Z"
modified: "2026-10-28T12:33:42.000Z"
---

Naive recursive `fib(50)` makes over 40 billion calls even though the recurrence has only 51 argument values from `0` through `50`. The recursion keeps forgetting that it already solved states such as `fib(48)`. Memoization fixes that repetition by caching each result under its arguments. A repeated call returns the stored value instead of entering the same subtree again.

The mechanism is small: wrap a **pure** function, compute and store the first call for each argument set, then return the stored result on later calls. A pure function always produces the same output from the same inputs and has no observable side effects. For a recurrence with overlapping subproblems, memoization is the usual **top-down** form of [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|dynamic programming]]. The recurrence drives evaluation and reaches only the states it needs. Bottom-up tabulation instead fills planned states eagerly in dependency order.

Memoization only *pays* when calls repeat. If every call has distinct arguments, as in many [[Home/Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] splits, the cache never gets a second hit and adds overhead. The same mechanism appears outside textbook recurrences in cached pure computations, `Lazy<T>` fields, and memoised UI rendering.

**Core shape:** pure function + a cache keyed on the full argument set → first call computes and stores, repeats read the store → time drops to `(distinct arguments) × (work per call)` when calls actually repeat.

%% tabs %%

%% tab: Visualization %%

```steptrace
{ "algorithm": "memoization" }
```

The trace uses abstract states rather than tying the mechanism to one recurrence. The left branch computes and stores states `D` and `E`. The right branch requests both keys again: cached `D` skips its two child calls, while cached base state `E` returns immediately.

The cache is a map from *arguments* to *result*. A correct and useful cache depends on three things; failures either return a stale answer or destroy the expected hit rate:

- **Valid cached results.** Purity is a simple sufficient condition: the same arguments produce the same result, and skipping execution loses no required observable effect. If mutable external data affects the result, its version must be represented in the key or cached entries must be invalidated when it changes.
- **A complete, stable key.** The key must capture *every* input that affects the result and must not change while stored. Omit one — memoise a two-argument recurrence on only the first argument — and two genuinely different calls collide on one cache slot, so the second read can be stale. Mutate a stored key and the entry can become unreachable. This is exactly DP's [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|state-design]] problem: the key *is* the state.
- **Lookup semantics that match value identity.** A cache needs equality appropriate to its store. For a `Dictionary`, equality and hashing must use the meaningful fields; a record key usually supplies both. Reference identity for logically equal arguments normally causes avoidable misses rather than wrong values, while inconsistent `Equals` and `GetHashCode` breaks dictionary lookup.

For a recursive function, the recursion must call *through* the memoised entry point, not the raw function — otherwise the inner calls bypass the cache and the exponential tree returns. That is why the idiomatic form nests a local function that calls itself and shares one `memo` dictionary across the whole call graph.

%% tab: Complexity %%

```complexity
{
  "version": 2,
  "label": "Fibonacci recursion with and without memoization",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "Fibonacci index"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive recursive Fibonacci",
          "formula": "O(2^n)",
          "curveId": "exponential"
        },
        {
          "kind": "approach",
          "label": "Memoized Fibonacci",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive recursive Fibonacci",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Memoized Fibonacci",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```

%% endtabs %%

# Where Memoization Breaks or Costs

- **Unbounded cache growth.** A long-lived memoised function can retain one entry per distinct argument forever. Bounded caches evict entries. .NET's `MemoryCache` supports expiration and eviction policies. Any evicted entry may need to be computed again.
- **The overlap has to be real.** No repeated states means no hits, so the cache is dead weight. This is common in [[Home/Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] algorithms whose branches receive unique, non-overlapping subproblem states. State overlap is not storage overlap: two subproblems can read the same immutable input or adjacent regions of one array without representing the same cached state.
- **Recursion depth.** Top-down memoization inherits the call stack of the underlying recursion. A chain-shaped dependency 100k calls deep can overflow the stack even though a bottom-up loop over the same states would not. Deep dependency chains are a strong reason to use tabulation.
- **Concurrency.** A plain `Dictionary` does not support concurrent writes and may fail or corrupt its state. `ConcurrentDictionary.GetOrAdd` protects the store but can invoke its value factory more than once for the same key. When the underlying computation must run once, the dictionary stores `Lazy<T>` values created with `LazyThreadSafetyMode.ExecutionAndPublication`, and each caller reads `.Value` from the `Lazy<T>` that `GetOrAdd` returns. Competing wrappers may be created, but the stored wrapper initializes once.

# Diagram and C# Implementation

> [!ABSTRACT]- First call computes, repeat reads the store
>
> ```mermaid
> flowchart TD
>   A["call f(x)"] --> B{"x in cache?"}
>   B -->|Yes| C["return cache[x]"]
>   B -->|No| D["result = f(x)"] --> E["cache[x] = result"] --> F["return result"]
> ```

> [!EXAMPLE]- Recursive memoisation and a generic wrapper (C#)
>
> ```csharp
> // Top-down Fibonacci: the inner Go calls itself, so every level shares one memo.
> public static long Fib(int n)
> {
>     var memo = new Dictionary<int, long>
>     {
>         [0] = 0,
>         [1] = 1
>     };
>
>     long Go(int k)
>     {
>         if (memo.TryGetValue(k, out var cached)) return cached;
>         return memo[k] = Go(k - 1) + Go(k - 2);   // recurse through the cache
>     }
>
>     return Go(n);
> }
>
> // Generic memoiser for any pure single-argument function.
> public static Func<T, TResult> Memoize<T, TResult>(Func<T, TResult> f)
>     where T : notnull
> {
>     var cache = new Dictionary<T, TResult>();
>     return arg =>
>     {
>         if (!cache.TryGetValue(arg, out var result))
>             cache[arg] = result = f(arg);
>         return result;
>     };
> }
> ```
> `Fib` seeds the base cases and recurses through `Go`, so every argument is computed at most once. Its input contract is `0 <= n <= 92`: negative values never reach a base case, and larger results overflow `long`. Production code should reject inputs outside that range or use `BigInteger` for larger indices. Later visits return from `memo`. The simple `Memoize` wrapper assumes a pure `f`. For a multi-argument recurrence, the key becomes a tuple or record so it captures the full state.

# Comparison

Memoization differs from nearby techniques in when results are computed and what gets retained.

Memoization fits a naturally recursive recurrence when only a fraction of the possible states are reachable and the call depth is safe. It evaluates those states on demand and leaves the recurrence visible in the code. [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|Tabulation]] is usually better when nearly every state will be visited, a rolling array can reduce memory, or recursion would exhaust the stack. Memoization is a specialized cache for deterministic function results. Application caches also store mutable or external data, so they need explicit freshness and invalidation rules instead of a purity assumption.

# Questions

> [!qard]- What is memoization, and when does it improve performance?
> Memoization caches a function's results by argument. The first call with a given set of arguments computes the result and stores it. Later calls with the same arguments return the stored result instead of computing it again.
>
> It improves performance only when the same arguments recur. Naive recursive Fibonacci is the classic case: `fib(n)` calls `fib(n - 1)` and `fib(n - 2)`, and both branches keep recomputing the same smaller values. The number of calls therefore grows exponentially, although only `n + 1` distinct arguments exist. With memoization each argument is computed once, and the time becomes linear in `n`. In general, the time drops to roughly the number of distinct argument sets times the work per call.
>
> In a recursive function, the recursive calls must also go through the cache. Calls to the raw, uncached function bypass it and bring the repeated work back.
>
> - **No repeats, no gain:** if every call has distinct arguments, as with the unique subarrays in merge sort, the cache never hits and only adds lookup and storage overhead.
> - **Memory:** a long-lived cache keeps one entry per distinct argument set unless it is bounded. An evicted entry is recomputed when it is requested again.
> 
> Applied to a recurrence with overlapping subproblems, memoization is the top-down form of dynamic programming.
>
> [MIT 6.006: Memoization](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/ea1cb4a29625017bdbcaf2dfd61b179e_MIT6_006F11_lec19_orig.pdf)

<!-- qard-id: 8a2ffe34-cdd8-4e4c-a363-728820006ecc -->
> [!qard]- What is dynamic programming, and what does a typical DP solution need to define?
> Dynamic programming solves a problem through a recurrence over smaller subproblems. It stores each subproblem's result so later steps reuse it instead of recomputing it. In finite, one-pass DP, the dependencies between subproblems are acyclic, so each distinct subproblem is solved only once.
>
> A typical DP solution defines:
>
> - **State (subproblem):** what each subproblem means, such as `best(a)`, the fewest coins that make amount `a`. The state must capture everything the remaining answer depends on, so every path that reaches the same state needs the same answer.
> - **Stored result:** the value kept for each state, such as a minimum, a count or a yes/no answer.
> - **Base cases:** states answered directly, such as `best(0) = 0`.
> - **Recurrence:** how a state's result is computed from the results of the states it depends on, such as `best(a) = 1 + min(best(a - c))` over usable coins `c`.
> - **Evaluation order:** for a finite set of states with acyclic dependencies, an order that solves every dependency before any state that reads it. Memoized recursion follows that order on demand, and tabulation writes it out as loops.
> 
> In this one-pass form, the running time is roughly the number of distinct states times the work to compute one state from its stored dependencies.
>
> If the dependencies form a cycle, no such order exists, and a single recursive or tabulated pass cannot solve the problem. Such problems need another method that can revisit states until their values converge, such as a graph shortest-path algorithm or repeated updates.
>
> Storing results pays off when different paths reach the same state (overlapping subproblems). Optimal substructure means an optimum can be built from optimal answers to subproblems. It matters only when the goal is to choose an optimum. Counting and decision problems use the same machinery without optimizing.
>
> [MIT 6.006: Dynamic Programming](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/28461a74f81101874a13d9679a40584d_MIT6_006S20_lec16.pdf) · [MIT 6.006: Memoization](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/ea1cb4a29625017bdbcaf2dfd61b179e_MIT6_006F11_lec19_orig.pdf)

<!-- qard-id: b6bd9177-d445-429b-83b5-aadc835da419 -->
> [!qard]- When is memoizing a function call correct?
> Memoizing a call is correct when returning the stored result is indistinguishable, to callers, from running the function again. Two conditions make that true:
>
> - **The key determines the result.** The cache key includes every input that can change the result. If an input is missing, calls that differ only in that input share one entry. A later call then receives the earlier call's answer even when its own answer would differ.
> - **Skipping the call loses nothing required.** A cache hit does not execute the function, so the function must not perform an effect that every call needs, such as sending a message or recording each request.
> 
> A pure function's result depends only on its arguments, and the function has no observable side effects. Purity therefore guarantees the second condition. It also narrows the first condition to the arguments, but the key must still represent every argument that affects the result. A pure two-argument function cached by its first argument alone can return wrong results. Purity with a complete key is a simple sufficient condition, not a necessary one. A function with effects that no caller requires can also qualify.
>
> When the result also depends on mutable external data, such as a price table, entries computed from the old data can become stale once that data changes. Either the data's version becomes part of the key, or affected entries are invalidated when the data changes.
>
> [MIT 6.006: Memoization](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/ea1cb4a29625017bdbcaf2dfd61b179e_MIT6_006F11_lec19_orig.pdf)

<!-- qard-id: d457ca1e-9e52-4889-8915-71e58d80e03e -->
> [!qard]- Why must a memoization key include every part of a subproblem’s state?
> A cache hit returns whatever is stored under the key, without checking which subproblem produced it. If two different subproblems produce the same key, the later one receives the earlier one's answer. Whenever their true answers differ, the result is silently wrong rather than reported as an error. Some colliding subproblems happen to have the same answer, but an incomplete key removes any guarantee that a hit is correct.
>
> **Example: 0/1 knapsack.** `best(i, capacity)` is the highest value obtainable from items `i` onward with `capacity` weight remaining, so its answer depends on both values.
>
> 1. One branch reaches item 3 with 10 units of capacity left, computes the best value of the remaining items and stores it under key `3`.
> 2. Another branch reaches item 3 with only 2 units left.
> 3. The lookup for key `3` hits and returns the result for 10 units. That value can include items that do not fit in 2 units, so the second branch can receive an answer that is too high.
> 
> Keying the cache on `(i, capacity)` keeps those subproblems separate. The memo key is the DP state, so it must include everything that affects the remaining answer. History that does not affect it, such as which earlier items were chosen, can be left out. Including such history would still be correct, but it would create more distinct keys and fewer cache hits.
>
> [MIT 6.006: Dynamic Programming](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/28461a74f81101874a13d9679a40584d_MIT6_006S20_lec16.pdf) · [MIT 6.006: Memoization](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/ea1cb4a29625017bdbcaf2dfd61b179e_MIT6_006F11_lec19_orig.pdf)

# References

- [MIT 6.006 Lecture 19: Memoization, subproblems, guessing, bottom-up](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/mit6_006f11_lec19_orig/)
- [ConcurrentDictionary<TKey,TValue>.GetOrAdd method (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.getoradd?view=net-10.0)
