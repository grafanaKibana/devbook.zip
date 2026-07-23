---
publish: true
created: 2026-07-21T18:52:02.735Z
modified: 2026-07-22T18:57:23.947Z
published: 2026-07-22T18:57:23.947Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Ready to Repeat
---

# Intro

Naive recursive `fib(50)` makes over 40 billion calls to compute a value the recurrence defines at only 51 points, because the plain recursion has no memory that it already solved `fib(48)` the last time it needed it. Memoization gives it that memory: cache each call's result keyed on its arguments, and every repeat returns the stored value instead of re-entering the subtree beneath it. `fib(50)` collapses from `O(2ⁿ)` to `O(n)` — one computation per distinct argument, the rest cache hits.

The technique is narrow and mechanical: wrap a **pure** function — same inputs always produce the same output, no observable side effects — so its first call for a given argument computes and stores, and later calls with that argument read the store. For a recurrence with overlapping subproblems, memoization is the usual **top-down** form of [[Computer Science/Algorithms/Paradigms/Dynamic Programming|dynamic programming]]: write the natural recurrence, then add a cache. The difference from bottom-up tabulation is _when and what_ gets computed — memoization is lazy and recursion-driven, evaluating only the states the recursion actually reaches; tabulation is eager and iterative, filling every cell in dependency order.

Memoization only _pays_ when calls repeat. On a function whose every call has distinct arguments, as in many [[Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] splits with unique subproblem states, the cache never gets a second hit and adds pure overhead. The technique reaches beyond algorithms, too: caching an expensive pure computation, a `Lazy<T>` field, a UI framework's memoised render — all the same idea.

**Core shape:** pure function + a cache keyed on the full argument set → first call computes and stores, repeats read the store → time drops to `(distinct arguments) × (work per call)` when calls actually repeat.

The trace uses abstract states rather than tying the mechanism to one recurrence. The left branch computes and stores states `D` and `E`. The right branch requests both keys again: cached `D` skips its two child calls, while cached base state `E` returns immediately.

```steptrace
{ "algorithm": "memoization" }
```

## Mechanism — what the cache keys on and what it needs

The cache is a map from _arguments_ to _result_. A correct and useful cache depends on three things; failures either return a stale answer or destroy the expected hit rate:

- **Purity.** The function's output must depend only on its arguments, with no side effects a caller could observe. Memoise a function that reads mutable global state or the clock, and a cache hit returns a value computed under conditions that no longer hold.
- **A complete, stable key.** The key must capture _every_ input that affects the result and must not change while stored. Omit one — memoise a two-argument recurrence on only the first argument — and two genuinely different calls collide on one cache slot, so the second read can be stale. Mutate a stored key and the entry can become unreachable. This is exactly DP's [[Computer Science/Algorithms/Paradigms/Dynamic Programming|state-design]] problem: the key _is_ the state.
- **Lookup semantics that match value identity.** A cache needs equality appropriate to its store. For a `Dictionary`, equality and hashing must use the meaningful fields; a record key usually supplies both. Reference identity for logically equal arguments normally causes avoidable misses rather than wrong values, while inconsistent `Equals` and `GetHashCode` breaks dictionary lookup.

For a recursive function, the recursion must call _through_ the memoised entry point, not the raw function — otherwise the inner calls bypass the cache and the exponential tree returns. That is why the idiomatic form nests a local function that calls itself and shares one `memo` dictionary across the whole call graph.

## Where memoization breaks or costs

- **Unbounded cache growth.** A long-lived memoised function accumulates one entry per distinct argument forever — a memory leak dressed as an optimisation. Bounded caches evict; .NET's `MemoryCache` supports expiration and eviction policies. The trade is that an eviction can turn a would-be hit back into a recompute.
- **The overlap has to be real.** No repeated states means no hits, so the cache is dead weight. This is common in [[Computer Science/Algorithms/Paradigms/Divide and Conquer|divide-and-conquer]] algorithms whose branches receive unique, non-overlapping subproblem states. State overlap is not storage overlap: two subproblems can read the same immutable input or adjacent regions of one array without representing the same cached state.
- **Recursion depth.** Top-down memoization inherits the call stack of the underlying recursion; a chain-shaped dependency 100k deep overflows the stack where a bottom-up loop would not. This is the main reason to convert a hot memoised recurrence to tabulation.
- **Concurrency.** A plain `Dictionary` does not support concurrent writes and may fail or corrupt its state. `ConcurrentDictionary.GetOrAdd` protects the store but can invoke its value factory more than once for the same key. When the underlying computation must run once, store `Lazy<T>` values created with `LazyThreadSafetyMode.ExecutionAndPublication`, use the `Lazy<T>` returned by `GetOrAdd`, and read its `.Value`; competing wrappers may be created, but the stored wrapper initializes once.

## Reference drawer

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
>
> `Fib` seeds the base cases and recurses through `Go`, so every argument is computed at most once; later visits return from `memo`. `Memoize` works only for a genuinely pure `f`; for a multi-argument recurrence the key becomes a tuple or record so it captures the full state.

## Comparison

Memoization sits next to the other ways of not redoing work; the axis is _when_ results are computed and _what_ is kept.

| Form | Evaluation order | What is stored | Work coverage | Control-flow stack | Main cost |
| --- | --- | --- | --- | --- | --- |
| Recursive top-down DP | Lazily, on first call | One entry per reached state | Reachable states only | Recursion depth | Cache growth; deep call chains |
| Dense bottom-up tabulation | In dependency order | Full table or rolling window | Planned table region | Usually `O(1)` | Computes planned states even when some are unreachable |
| Nonrecursive application caching | On demand | Entries chosen by cache policy | Requested keys only | Determined by the caller | Staleness, eviction, and invalidation |
| Plain recursive computation | Every call | Nothing | Full call tree | Recursion depth | Repeated states recompute |

Memoization is the fit when the recurrence is natural to write recursively, the reachable state space is a small fraction of the whole table, and stack depth is bounded — it evaluates only what's needed and mirrors the maths directly. [[Computer Science/Algorithms/Paradigms/Dynamic Programming|Tabulation]] wins when nearly all states are visited anyway (so laziness buys nothing), when a rolling array can shrink memory, or when the recursion would be too deep for the stack. Memoization is a specialized form of caching for deterministic function results. Application caches are broader: they may store data from mutable or external sources, which replaces the purity assumption with explicit freshness, expiration, and invalidation rules.

## Questions

> [!QUESTION]- What is the relationship between memoization and dynamic programming?
> Memoization is DP's top-down implementation: write the recurrence and cache each subproblem's result. Bottom-up tabulation is the iterative alternative. Repeated, overlapping states are what make memoization useful; without them, the cache adds overhead but does not make the recurrence incorrect. Optimal substructure is a separate requirement for optimization problems: an optimal solution must be constructible from optimal solutions to its subproblems. Memoization additionally evaluates only the states recursion reaches, while tabulation usually fills the planned table in dependency order.

> [!QUESTION]- Why must a memoised function be pure, and what breaks if it isn't?
> The cache returns a stored result for repeated arguments without re-running the function. If the output also depends on hidden state — a global, the clock, an I/O read — a cache hit hands back a value computed under conditions that may no longer hold, and side effects the caller expected simply don't happen on a hit. Only same-input-same-output, side-effect-free functions are safe to memoise.

> [!QUESTION]- What is the most common correctness bug when memoising a recurrence?
> An incomplete cache key. If the key omits an argument the result depends on — caching a `(i, capacity)` knapsack state on `i` alone — two different subproblems map to the same slot and the second read returns a stale value, silently. The key must be the full state, the same requirement DP calls state design.

> [!QUESTION]- When should a memoised recurrence be rewritten as bottom-up tabulation?
> When the recursion is deep enough to risk a stack overflow (a long chain of dependencies), when essentially every state gets visited so laziness saves nothing, or when a rolling-array reduction can cut memory that the recursive form can't exploit. Tabulation runs in tight iterative loops with `O(1)` stack, at the cost of computing states a lazy memo might have skipped.

## References

- [Memoization (Wikipedia)](https://en.wikipedia.org/wiki/Memoization) — definition, the purity requirement, and the distinction from general caching.
- [Dynamic programming (MIT 6.006)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — frames DP as "recursion plus memoisation" and works through top-down versus bottom-up on the same recurrences.
- [`Lazy<T>` class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.lazy-1?view=net-10.0) — thread-safe compute-once-and-cache, the single-value case of memoisation, with the initialisation-race modes that matter under concurrency.
- [Dictionary\<TKey,TValue> class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2?view=net-10.0) — documents that `Dictionary<TKey,TValue>` is only thread-safe for multiple readers when the collection is not modified.
- [Thread-safe collections in .NET (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/standard/collections/thread-safe/) — states that `Dictionary<TKey,TValue>` provides no synchronization for concurrent writes.
- [ConcurrentDictionary\<TKey,TValue> class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2?view=net-10.0) — thread-safe concurrent dictionary implementation.
- [ConcurrentDictionary\<TKey,TValue>.GetOrAdd method (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary-2.getoradd?view=net-10.0) — explains that the value factory runs outside the locks, so the call is thread-safe but not fully atomic.
- [LazyThreadSafetyMode enum (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/system.threading.lazythreadsafetymode?view=net-10.0) — defines `ExecutionAndPublication`, which lets one stored `Lazy<T>` publish a single initialized value to all readers.
- [MemoryCache class (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.caching.memory.memorycache?view=net-10.0) — in-memory cache API with expiration and eviction policy hooks.
