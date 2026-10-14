---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Caches pure function results by arguments so repeated subproblems return without recomputation."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
qard-deck: "Computer Science"
qard-topic: "Algorithms/Paradigms/Memoization"
flashcard_uid: "0f376618"
---

Naive recursive `fib(50)` makes over 40 billion calls even though the recurrence has only 51 argument values from `0` through `50`. The recursion keeps forgetting that it already solved states such as `fib(48)`. Memoization fixes that repetition by caching each result under its arguments. A repeated call returns the stored value instead of entering the same subtree again.

The mechanism is small: wrap a **pure** function, compute and store the first call for each argument set, then return the stored result on later calls. A pure function always produces the same output from the same inputs and has no observable side effects. For a recurrence with overlapping subproblems, memoization is the usual **top-down** form of [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|dynamic programming]]. The recurrence drives evaluation and reaches only the states it needs. Bottom-up tabulation instead fills planned states eagerly in dependency order.

Memoization only *pays* when calls repeat. If every call has distinct arguments, as in many [[Home/Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] splits, the cache never gets a second hit and adds overhead. The same mechanism appears outside textbook recurrences in cached pure computations, `Lazy<T>` fields, and memoised UI rendering.

**Core shape:** pure function + a cache keyed on the full argument set → first call computes and stores, repeats read the store → time drops to `(distinct arguments) × (work per call)` when calls actually repeat.

~~~~~tabsdown
tab: Visualization


```steptrace
{ "algorithm": "memoization" }
```


The trace uses abstract states rather than tying the mechanism to one recurrence. The left branch computes and stores states `D` and `E`. The right branch requests both keys again: cached `D` skips its two child calls, while cached base state `E` returns immediately.


The cache is a map from *arguments* to *result*. A correct and useful cache depends on three things; failures either return a stale answer or destroy the expected hit rate:

- **Valid cached results.** Purity is a simple sufficient condition: the same arguments produce the same result, and skipping execution loses no required observable effect. If mutable external data affects the result, its version must be represented in the key or cached entries must be invalidated when it changes.
- **A complete, stable key.** The key must capture *every* input that affects the result and must not change while stored. Omit one — memoise a two-argument recurrence on only the first argument — and two genuinely different calls collide on one cache slot, so the second read can be stale. Mutate a stored key and the entry can become unreachable. This is exactly DP's [[Home/Computer Science/Algorithms/Paradigms/Dynamic Programming|state-design]] problem: the key *is* the state.
- **Lookup semantics that match value identity.** A cache needs equality appropriate to its store. For a `Dictionary`, equality and hashing must use the meaningful fields; a record key usually supplies both. Reference identity for logically equal arguments normally causes avoidable misses rather than wrong values, while inconsistent `Equals` and `GetHashCode` breaks dictionary lookup.

For a recursive function, the recursion must call *through* the memoised entry point, not the raw function — otherwise the inner calls bypass the cache and the exponential tree returns. That is why the idiomatic form nests a local function that calls itself and shares one `memo` dictionary across the whole call graph.

tab: Complexity

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
~~~~~

# Where Memoization Breaks or Costs

- **Unbounded cache growth.** A long-lived memoised function can retain one entry per distinct argument forever. Bounded caches evict entries. .NET's `MemoryCache` supports expiration and eviction policies. Any evicted entry may need to be computed again.
- **The overlap has to be real.** No repeated states means no hits, so the cache is dead weight. This is common in [[Home/Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] algorithms whose branches receive unique, non-overlapping subproblem states. State overlap is not storage overlap: two subproblems can read the same immutable input or adjacent regions of one array without representing the same cached state.
- **Recursion depth.** Top-down memoization inherits the call stack of the underlying recursion. A chain-shaped dependency 100k calls deep can overflow the stack even though a bottom-up loop over the same states would not. Deep dependency chains are a strong reason to use tabulation.
- **Concurrency.** A plain `Dictionary` does not support concurrent writes and may fail or corrupt its state. `ConcurrentDictionary.GetOrAdd` protects the store but can invoke its value factory more than once for the same key. When the underlying computation must run once, store `Lazy<T>` values created with `LazyThreadSafetyMode.ExecutionAndPublication`, use the `Lazy<T>` returned by `GetOrAdd`, and read its `.Value`. Competing wrappers may be created, but the stored wrapper initializes once.

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

<!-- qard-id: 8a2ffe34-cdd8-4e4c-a363-728820006ecc -->
> [!qard]- What is dynamic programming, and what does a typical DP solution need to define?
> Dynamic programming solves subproblems and reuses their results. A formulation defines what each subproblem represents, the result stored for it, base cases, and a recurrence that computes a result from dependencies. For a finite acyclic dependency graph, evaluate states in an order that makes each dependency available first. Reuse helps when different paths reach the same state; optimal substructure matters when the goal is to choose an optimum. [MIT 6.006: Dynamic Programming](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/28461a74f81101874a13d9679a40584d_MIT6_006S20_lec16.pdf)

<!-- qard-id: b6bd9177-d445-429b-83b5-aadc835da419 -->
> [!qard]- When is memoizing a function call correct?
> Memoization is correct when the cache key captures every input that can change the result and the cached value remains valid for that key. A cache hit skips the computation, so it must not omit a required observable effect. Mutable external data may require including a version in the key or invalidating entries when it changes. [MIT 6.006: Memoization](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/ea1cb4a29625017bdbcaf2dfd61b179e_MIT6_006F11_lec19_orig.pdf)

<!-- qard-id: d457ca1e-9e52-4889-8915-71e58d80e03e -->
> [!qard]- Why must a memoization key include every part of a subproblem’s state?
> Two different subproblems that map to one cache key can incorrectly share a result. In knapsack, caching only by item position is wrong if the answer also depends on remaining capacity; the key must represent both. [MIT 6.006: Dynamic Programming](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/28461a74f81101874a13d9679a40584d_MIT6_006S20_lec16.pdf) · [MIT 6.006: Memoization](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/ea1cb4a29625017bdbcaf2dfd61b179e_MIT6_006F11_lec19_orig.pdf)

# References

- [MIT 6.006 Lecture 19: Memoization, subproblems, guessing, bottom-up](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/mit6_006f11_lec19_orig/)
- [ConcurrentDictionary<TKey,TValue>.GetOrAdd method (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.getoradd?view=net-10.0)
