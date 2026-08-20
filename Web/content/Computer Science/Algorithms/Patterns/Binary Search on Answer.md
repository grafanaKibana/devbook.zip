---
publish: true
created: 2026-08-20T20:41:15.526Z
modified: 2026-08-20T20:41:15.527Z
published: 2026-08-20T20:41:15.527Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Binary-searches the space of possible answers using a monotonic feasibility test.
level:
  - "4"
priority: Medium
status: Creation
---

A fleet must clear a queue of packages within `D` days. The unknown is the smallest ship capacity that finishes on time. That capacity lies between `max(weight)`, which can carry the heaviest package, and `sum(weights)`, which can carry everything in one day.

Feasibility is **monotone**: increasing capacity can never require more days. Across a range with a feasible upper bound, `feasible(x)` is a false prefix followed by a non-empty true suffix. The false prefix may be empty. Binary search finds the first true value. A probe does not compare `mid` with a stored array element. It runs `feasible(mid)` over the original input. This is [[Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] applied to the boundary of a monotone predicate rather than to sorted data.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"binary-search-on-answer","weights":[3,2,2,4,1,4],"days":3}
```



Six packages with weights `[3, 2, 2, 4, 1, 4]` must ship within three days. The answer strip classifies capacities `4 … 16` as known infeasible, still unknown, or known feasible. Each probe expands into the greedy day-by-day packing that supplies the predicate result, making the work inside `feasible(capacity)` visible instead of presenting the candidates as a stored array. The boundary settles at capacity `6`.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Binary Search on Answer complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements scanned by each feasibility check"
    },
    "rangeWidth": {
      "symbol": "m",
      "description": "numeric candidate-range width"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (probe every candidate)",
          "formula": "O(m·n)",
          "curveFrom": "linear",
          "curveTo": "quadratic"
        },
        {
          "kind": "approach",
          "label": "Binary search on answer",
          "formula": "O(n log m)",
          "curveFrom": "linear",
          "curveTo": "n-log-n"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (probe every candidate)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Binary search on answer",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```
````

# Why Halving the Answer Works

At the start of each iteration, the smallest feasible `x` lies inside `[lo, hi]`. Evaluating the midpoint preserves that invariant:

- `feasible(mid)` is `true`: the boundary is at or below `mid`, because monotonicity guarantees nothing above `mid` can be the _smallest_ feasible value. The range becomes `[lo, mid]`.
- `feasible(mid)` is `false`: `mid` and everything below it fail, so the boundary is strictly above `mid`. The range becomes `[mid + 1, hi]`.

Each probe keeps at most `⌈N/2⌉` of `N` candidates. The inclusive range therefore reaches one element in at most `⌈log₂(hi − lo + 1)⌉` steps, where `lo == hi` is the answer. In the closed-range first-true form, `mid` is biased low, success sets `hi = mid`, and failure sets `lo = mid + 1`. Those choices make the range shrink on every pass. The maximise-the-minimum form mirrors the predicate and biases `mid` high.

The probe is what separates this pattern from array search. Here `mid` is a candidate answer, and `feasible(mid)` rebuilds enough of the problem to judge it. That may be a greedy pass, a count, or a simulation. Typical forms minimise a maximum, such as ship capacity, or maximise a minimum, such as the smallest gap between placed resources. Integer `sqrt(x)` is the stripped-down numeric case: `feasible(m)` is only `m * m <= x`.

# When the Predicate is Not Actually Monotone

Monotonicity is the precondition. If `feasible` flips more than once, no single boundary exists. The search still returns a value because its control flow assumes that the discarded half cannot contain the answer. On `false, true, false, false, true`, a low-biased midpoint at index `2` is false, so the search moves `lo` to `3` and loses the earlier true value at index `1`. The proof belongs outside the code: increasing `x` must make the condition only easier, or only harder, without reversal.

The same mechanism creates three implementation boundaries:

- **The range must contain the boundary.** `lo` must be infeasible or equal to the answer, and `hi` must be feasible. A tight upper bound can exclude the answer. A loose one costs only extra probes. For ship-within-`D`-days, `max(weights)` and `sum(weights)` bracket every valid capacity.
- **Integer versus real domain.** Over integers, `lo < hi` with `mid + 1` terminates exactly. Over reals the interval never collapses to a single value. To reduce an initial width `hi − lo` to at most an absolute tolerance `δ`, choose at least `⌈log₂((hi − lo) / δ)⌉` iterations. The fixed count therefore belongs to the domain and required precision rather than a universal constant. A loop that waits for an `eps` comparison can stall on floating-point rounding.
- **Returning the correct side of the flip.** The template returns the first `x` where the predicate becomes true — a `lower_bound`-style boundary. Minimise-the-maximum wants that value. Maximise-the-minimum wants the last `true` before the flip, which needs the mirrored update and a high-biased midpoint. Mixing the update direction with the wrong midpoint bias either loops forever on `lo == mid` or returns the neighbour of the intended answer.

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[lo = smallest answer, hi = largest] --> B{lo < hi}
>   B -->|No| Z[Return lo: smallest feasible answer]
>   B -->|Yes| C[mid = lo + (hi - lo) / 2]
>   C --> D{feasible of mid}
>   D -->|True| E[hi = mid]
>   D -->|False| F[lo = mid + 1]
>   E --> B
>   F --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Smallest x in [lo, hi] with feasible(x) true, given feasible is monotone false -> true.
> public static long SearchBoundary(long lo, long hi, Func<long, bool> feasible)
> {
>     ArgumentNullException.ThrowIfNull(feasible);
>     if (lo < 0 || hi < lo)
>         throw new ArgumentOutOfRangeException(nameof(lo), "SearchBoundary requires 0 <= lo <= hi.");
>     if (!feasible(hi))
>         throw new ArgumentException("hi must be feasible.", nameof(hi));
>
>     while (lo < hi)
>     {
>         var mid = lo + (hi - lo) / 2;    // biased low; pairs with hi = mid
>         if (feasible(mid)) hi = mid;      // mid works, a smaller one might too
>         else               lo = mid + 1;  // mid fails, the answer is strictly larger
>     }
>
>     return lo;                            // lo == hi == smallest feasible answer
> }
>
> // Capacity to ship all packages within D days (minimise-the-maximum).
> public static long ShipWithinDays(int[] weights, int days)
> {
>     ArgumentNullException.ThrowIfNull(weights);
>     if (weights.Length == 0 || weights.Any(weight => weight <= 0))
>         throw new ArgumentException("Weights must be nonempty and positive.", nameof(weights));
>     ArgumentOutOfRangeException.ThrowIfLessThan(days, 1);
>
>     bool CanShip(long cap)
>     {
>         long used = 1, load = 0;
>         foreach (var w in weights)
>         {
>             if (w > cap) return false;         // one package exceeds capacity
>             if (load + w > cap) { used++; load = 0; }
>             load += w;
>         }
>
>         return used <= days;
>     }
>
>     return SearchBoundary(weights.Max(), weights.Sum(w => (long)w), CanShip);
> }
> ```
>
> `SearchBoundary` enforces a nonnegative range and a feasible upper bound, which also makes `hi - lo` safe in `long`. `ShipWithinDays` rejects empty or nonpositive weights and `days < 1`. `CanShip` is the monotone predicate: a larger `cap` never increases `used`, so feasibility never flips back to false. The first feasible capacity may be `max(weights)` itself. Split-array-largest-sum is the same predicate with `days` read as the allowed number of subarrays.

# Comparison

| Approach | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Binary search on answer | monotone `feasible`. A numeric range with `lo`/`hi` | numeric optimum whose validity is cheap to check | feasibility that is not monotone |
| Linear scan of candidates | a checker, but no monotonicity | tiny ranges, or when monotonicity cannot be proved | wide numeric ranges |
| [[Computer Science/Algorithms/Search Algorithms/Binary Search\|Binary Search]] on the array | values physically sorted in an array | locating a stored value or insertion point | the answer is not an element of any array |
| Greedy / [[Computer Science/Algorithms/Paradigms/Dynamic Programming\|Dynamic Programming]] formula | problem-specific structure that yields the optimum | a closed form or direct construction exists | no direct construction is known |
| [[Computer Science/Algorithms/Search Algorithms/Ternary Search\|Ternary Search]] | a **unimodal** objective with one peak or valley | optimising a value that rises then falls | a monotone yes/no predicate |

Plain [[Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] searches stored data with a predicate such as `a[mid] < target`. [[Computer Science/Algorithms/Search Algorithms/Ternary Search|Ternary Search]] handles a different shape: a unimodal objective with one extremum. One method needs a boundary. The other needs a peak or valley.

# References

- [Nimrod Megiddo, "Applying Parallel Computation Algorithms in the Design of Serial Algorithms" (1983)](https://doi.org/10.1145/2157.322410)
