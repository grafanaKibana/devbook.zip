---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

Naive recursive `fib(50)` makes over 40 billion calls to compute a value the recurrence defines at only 51 points, because the plain recursion has no memory that it already solved `fib(48)` the last time it needed it. Memoization gives it that memory: cache each call's result keyed on its arguments, and every repeat returns the stored value instead of re-entering the subtree beneath it. `fib(50)` collapses from `O(2ⁿ)` to `O(n)` — one computation per distinct argument, the rest cache hits.

The technique is narrow and mechanical: wrap a **pure** function — same inputs always produce the same output, no observable side effects — so its first call for a given argument computes and stores, and later calls with that argument read the store. It is the **top-down** face of [[Dynamic Programming]]: write the natural recurrence, then bolt a cache onto it. The difference from bottom-up tabulation is *when and what* gets computed — memoization is lazy and recursion-driven, evaluating only the states the recursion actually reaches; tabulation is eager and iterative, filling every cell in dependency order.

Memoization only *pays* when calls repeat — the same overlapping-subproblems condition DP needs. On a function whose every call has distinct arguments (a plain [[Divide and Conquer|divide-and-conquer]] split, an already-unique key), the cache never gets a second hit and adds pure overhead. The technique reaches beyond algorithms, too: caching an expensive pure computation, a `Lazy<T>` field, a UI framework's memoised render — all the same idea.

**Core shape:** pure function + a cache keyed on the full argument set → first call computes and stores, repeats read the store → time drops to `(distinct arguments) × (work per call)` when calls actually repeat.

> [!NOTE] Visualization pending
> Planned StepTrace: a recursion-tree card where each node's first evaluation writes a cache cell and every later occurrence of that argument returns immediately, greying out the entire subtree it would have re-expanded. No matching renderer exists in `engine.js` yet.

# Mechanism — what the cache keys on and what it needs

The cache is a map from *arguments* to *result*. Three properties have to hold or the cache silently returns wrong answers:

- **Purity.** The function's output must depend only on its arguments, with no side effects a caller could observe. Memoise a function that reads mutable global state or the clock, and a cache hit returns a value computed under conditions that no longer hold.
- **A complete, hashable key.** The key must capture *every* input that affects the result. Omit one — memoise a two-argument recurrence on only the first argument — and two genuinely different calls collide on one cache slot, and the second read is stale. This is exactly DP's [[Dynamic Programming|state-design]] problem: the key *is* the state.
- **Equality and hashing that match value identity.** For a struct or record key the default value equality is right; for a reference type, a `GetHashCode`/`Equals` that reflects the meaningful fields is required, or logically-equal arguments miss the cache.

For a recursive function, the recursion must call *through* the memoised entry point, not the raw function — otherwise the inner calls bypass the cache and the exponential tree returns. That is why the idiomatic form nests a local function that calls itself and shares one `memo` dictionary across the whole call graph.

# Where memoization breaks or costs

- **Unbounded cache growth.** A long-lived memoised function accumulates one entry per distinct argument forever — a memory leak dressed as an optimisation. Bounded caches evict; an [[LRU Cache]] is the standard policy, and .NET's `MemoryCache` adds size and time limits. The trade is that an eviction can turn a would-be hit back into a recompute.
- **The overlap has to be real.** No repeated arguments means no hits, so the cache is dead weight — the [[Divide and Conquer]] regime, where subproblems are disjoint by construction.
- **Recursion depth.** Top-down memoization inherits the call stack of the underlying recursion; a chain-shaped dependency 100k deep overflows the stack where a bottom-up loop would not. This is the main reason to convert a hot memoised recurrence to tabulation.
- **Concurrency.** A plain `Dictionary` cache corrupts under concurrent writes. `ConcurrentDictionary.GetOrAdd` is thread-safe for the store but can run the factory more than once for the same key under a race; `Lazy<T>` values in the dictionary fix that when the computation must run exactly once.

# Reference drawer

> [!ABSTRACT]- First call computes, repeat reads the store
> ```mermaid
> flowchart TD
>   A["call f(x)"] --> B{"x in cache?"}
>   B -->|Yes| C["return cache[x]"]
>   B -->|No| D["result = f(x)"] --> E["cache[x] = result"] --> F["return result"]
> ```

> [!EXAMPLE]- Recursive memoisation and a generic wrapper (C#)
> ```csharp
> // Top-down Fibonacci: the inner Go calls itself, so every level shares one memo.
> public static long Fib(int n)
> {
>     var memo = new Dictionary<int, long>();
>
>     long Go(int k)
>     {
>         if (k < 2) return k;
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
> `Fib` recurses through `Go`, so an argument computed once is never re-entered. `Memoize` works only for a genuinely pure `f`; for a multi-argument recurrence the key becomes a tuple or record so it captures the full state.

# Comparison

Memoization sits next to the other ways of not redoing work; the axis is *when* results are computed and *what* is kept.

| Technique | When computed | What is stored | Reaches only used states | Stack cost | Fails when |
| --- | --- | --- | --- | --- | --- |
| Memoization (top-down DP) | Lazily, on first call | One entry per distinct argument | Yes | Recursion depth | Cache grows unbounded; recursion too deep |
| Tabulation (bottom-up DP) | Eagerly, in dependency order | Full table (or rolling window) | No — fills every cell | `O(1)` loop | Many states are never needed |
| Plain result caching | On demand, then reused | Whatever the app decides to keep | Yes | None | Keys aren't pure; staleness on data change |
| No cache | Every call | Nothing | — | Recursion depth | Overlapping subproblems recompute exponentially |

Memoization is the fit when the recurrence is natural to write recursively, the reachable state space is a small fraction of the whole table, and stack depth is bounded — it evaluates only what's needed and mirrors the maths directly. [[Dynamic Programming|Tabulation]] wins when nearly all states are visited anyway (so laziness buys nothing), when a rolling array can shrink memory, or when the recursion would be too deep for the stack. Plain caching is memoization's generalisation outside recurrences — an expensive pure call cached for reuse — carrying the same purity and key-completeness obligations plus an invalidation problem when the underlying data changes.

# Questions

> [!QUESTION]- What is the relationship between memoization and dynamic programming?
> Memoization is the top-down *implementation* of DP: write the recurrence, cache each subproblem's result. Bottom-up tabulation is the other implementation. Both require overlapping subproblems (or the cache never hits) and optimal substructure (or the recurrence is wrong). Memoization additionally evaluates only the states the recursion reaches, where tabulation fills the whole table.

> [!QUESTION]- Why must a memoised function be pure, and what breaks if it isn't?
> The cache returns a stored result for repeated arguments without re-running the function. If the output also depends on hidden state — a global, the clock, an I/O read — a cache hit hands back a value computed under conditions that may no longer hold, and side effects the caller expected simply don't happen on a hit. Only same-input-same-output, side-effect-free functions are safe to memoise.

> [!QUESTION]- When should a memoised recurrence be rewritten as bottom-up tabulation?
> When the recursion is deep enough to risk a stack overflow (a long chain of dependencies), when essentially every state gets visited so laziness saves nothing, or when a rolling-array reduction can cut memory that the recursive form can't exploit. Tabulation runs in tight iterative loops with `O(1)` stack, at the cost of computing states a lazy memo might have skipped.

# References

- [Memoization (Wikipedia)](https://en.wikipedia.org/wiki/Memoization) — definition, the purity requirement, and the distinction from general caching.
- [Dynamic programming (MIT 6.006)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — frames DP as "recursion plus memoisation" and works through top-down versus bottom-up on the same recurrences.
- [`Lazy<T>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.lazy-1) — thread-safe compute-once-and-cache, the single-value case of memoisation, with the initialisation-race modes that matter under concurrency.
