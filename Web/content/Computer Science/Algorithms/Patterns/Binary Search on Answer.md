---
publish: true
created: 2026-07-18T14:02:43.963Z
modified: 2026-07-18T22:08:47.683Z
published: 2026-07-18T22:08:47.683Z
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

A fleet must clear a queue of packages within `D` days, and the unknown is the smallest ship capacity that still finishes on time. Capacity is a number in a range: at least `max(weight)` so no single package is stranded, at most `sum(weights)` so one day suffices. Checking a single candidate capacity is cheap — a greedy pass fills days at that capacity and counts them — but the range can span millions of values, and testing each in turn is `O(range · n)`.

The range collapses because feasibility is **monotone**: a larger capacity never needs _more_ days, so once some capacity clears the backlog in `D` days, every larger one does too. Read across a range whose upper bound is feasible, the predicate `feasible(x)` is a possibly empty false prefix followed by a non-empty true suffix. Binary search locates the first true value, which may be the lower bound when every candidate is already feasible. The probe at `mid` is not a comparison against a stored array element but a call to `feasible(mid)` that does real work over the input. This is [[Binary Search]] generalised from "find a value in a sorted array" to "find the boundary of a monotone predicate over a value space."

**Core condition:** a numeric answer range `[lo, hi]` with a monotone `feasible(x)` → each probe evaluates `feasible(mid)` instead of comparing an array element → `O(n · log(range))` time, `O(1)` auxiliary space beyond the check.

# Trace

Six packages with weights `[3, 2, 2, 4, 1, 4]` must ship within three days. The candidate bars cover capacities `4 … 16`; each probe runs the greedy schedule, reports its day count, and discards the half that cannot contain the smallest feasible capacity. The boundary settles at capacity `6`.

```steptrace
{"algorithm":"binary-search-on-answer","weights":[3,2,2,4,1,4],"days":3}
```

# Why halving the answer works

At the start of every iteration the true answer — the smallest feasible `x` — lies inside the current range `[lo, hi]`. Evaluating the predicate at the midpoint preserves that invariant:

- `feasible(mid)` is `true`: the boundary is at or below `mid`, because monotonicity guarantees nothing above `mid` can be the _smallest_ feasible value. The range becomes `[lo, mid]`.
- `feasible(mid)` is `false`: `mid` and everything below it fail, so the boundary is strictly above `mid`. The range becomes `[mid + 1, hi]`.

Each probe discards at least half of the remaining values, so the inclusive range reaches a single element in at most `⌈log₂(hi − lo + 1)⌉` steps, at which point `lo == hi` is the smallest feasible answer. The half-open update (`hi = mid` on success, `lo = mid + 1` on failure, with `mid` biased low) pairs the midpoint with the boundary move so the range always shrinks. The maximise-the-minimum mirror flips the predicate direction and biases `mid` high.

The step that separates this from array search is the probe itself. In [[Binary Search]] the value at `mid` is already stored and the comparison is `O(1)`. Here `mid` is a _candidate answer_, and `feasible(mid)` reconstructs enough of the problem to decide it — a greedy pass, a counting sweep, sometimes a full simulation. The family covers minimise-the-maximum (ship packages within `D` days, split an array to minimise the largest subarray sum, Koko eating bananas at the slowest speed that finishes in time), maximise-the-minimum (place resources to maximise the smallest gap), and degenerate numeric cases such as integer `sqrt(x)`, where `feasible(m)` is just `m * m <= x`.

# Complexity

The cost factors into how many candidates are probed and what each probe pays. There is no early exit: unlike array search, hitting the boundary early does not stop the loop, so the probe count is the full `log(range)` in every case.

| Component | Cost | Cause |
| --- | --- | --- |
| Probes over the range | `O(log(hi − lo + 1))` | each probe halves the inclusive answer interval `[lo, hi]` |
| One `feasible` check | `O(n)` typical | a single greedy or counting pass over the input |
| Total time | `O(n · log(range))` | probe count × per-check cost |
| Auxiliary space | `O(1)` | three integer bounds beyond whatever `feasible` allocates |

The log factor is over the _numeric range of the answer_, not the input size, so an answer space as wide as `10^18` costs only about 60 probes. When `feasible` is itself super-linear — say it runs a DP — its cost replaces the `O(n)` term. For a real-valued answer the probe count is fixed by the iteration bound (below) rather than `log(range)`.

# When the predicate is not actually monotone

Monotonicity is the whole precondition, and its absence is the classic failure. If `feasible` flips true and false more than once across the range, there is no single boundary to find. Binary search still runs and still returns a value, but each probe assumes the discarded half cannot contain the answer — an assumption that only holds under monotonicity. On a predicate that is `false, true, false, true`, a `true` at `mid` discards the upper half even though a later `true` region lived there, and the returned `lo` is confidently wrong. The precondition is proved by argument, not code: show that increasing `x` can only make the condition easier to satisfy (or only harder), never reverse it. If that argument fails, this pattern does not apply.

Three further boundaries follow from the same mechanism:

- **The range needs sensible `lo`/`hi`.** Binary search only locates a boundary that lies inside `[lo, hi]`. `lo` must be small enough to be infeasible-or-boundary and `hi` large enough to be feasible; a too-tight `hi` clips the true answer, a wildly loose one only adds a handful of probes. For ship-within-`D`-days, `lo = max(weights)` and `hi = sum(weights)` bracket every valid capacity.
- **Integer versus real domain.** Over integers, `lo < hi` with `mid + 1` terminates exactly. Over reals the interval never collapses to a single value, so termination comes from a **fixed iteration count** (about 100 halvings drives the interval below double precision) rather than an `eps` comparison, which is problem-dependent and can stall on floating-point rounding.
- **Returning the correct side of the flip.** The template returns the first `x` where the predicate becomes true — a `lower_bound`-style boundary. Minimise-the-maximum wants that value; maximise-the-minimum wants the last `true` before the flip, which needs the mirrored update and a high-biased midpoint. Mixing the update direction with the wrong midpoint bias either loops forever on `lo == mid` or returns the neighbour of the intended answer.

# Reference drawer

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
> public static int ShipWithinDays(int[] weights, int days)
> {
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
>     return (int)SearchBoundary(weights.Max(), weights.Sum(), CanShip);
> }
> ```
>
> `CanShip` is the monotone predicate: a larger `cap` never increases `used`, so feasibility never flips back to false. The first feasible capacity may be `max(weights)` itself. Split-array-largest-sum is the same predicate with `days` read as the allowed number of subarrays.

# Comparison

| Approach | Time | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| Binary search on answer | `O(n · log(range))` | monotone `feasible`; a numeric range with `lo`/`hi` | numeric optimum whose validity is cheap to check | feasibility that is not monotone |
| Linear scan of candidates | `O(range · n)` | a checker, but no monotonicity | tiny ranges, or when monotonicity cannot be proved | wide numeric ranges |
| [[Binary Search]] on the array | `O(log n)` | values physically sorted in an array | locating a stored value or insertion point | the answer is not an element of any array |
| Greedy / [[Dynamic Programming]] formula | `O(n)`–`O(n·k)` direct | problem-specific structure that yields the optimum | a closed form or DP exists | no direct construction is known |
| [[Ternary Search]] | `O(n · log(range))` | a **unimodal** objective (single peak/valley) | optimising a value that rises then falls | a monotone yes/no predicate |

Binary search on the answer is the `O(n · log(range))` tool when the answer is numeric and feasibility is monotone; its cost is one full predicate sweep per probe. A closed-form greedy or DP beats it whenever the optimum can be constructed directly instead of searched for — split-array-largest-sum runs `O(n log sum)` by search versus `O(n²k)` by DP, but a problem with an `O(1)` formula never justifies the log factor. Plain [[Binary Search]] is the special case where the predicate is `a[mid] < target` over stored data. [[Ternary Search]] answers the neighbouring shape — a unimodal objective with no monotone predicate — and is not interchangeable: its precondition is a single extremum, not a single boundary.

# Questions

> [!QUESTION]- What precondition makes binary search on the answer valid, and how is it checked?
> The feasibility predicate must be monotone in `x`, and the supplied upper bound must be feasible. For the minimizing form, `feasible` has a possibly empty false prefix followed by a true suffix; the search returns the first true value, even when it is `lo`. Monotonicity is verified by argument, not code: show that increasing the candidate can only make the condition easier to satisfy, so it never reverses. If the predicate can flip back and forth, no boundary exists and the search can discard the half that holds the answer.

> [!QUESTION]- Why is the time `O(n · log(range))` rather than tied to the input length the usual way?
> The log factor counts probes over the `hi − lo + 1` integer candidates in `[lo, hi]`, halving that count each time. Every probe runs `feasible`, typically an `O(n)` pass over the input, giving `O(n · log(range))`. The log is over the value range, so a `10^18`-wide answer space is still only about 60 probes — which is why the search wins when checking a candidate is far cheaper than computing the optimum directly.

> [!QUESTION]- How does the termination differ between an integer answer and a real-valued one?
> Over integers, `lo < hi` with the `mid + 1` update collapses the interval to one value and stops exactly. Over reals the interval never reaches a single point, so termination comes from a fixed iteration count — roughly 100 halvings drops the interval below double precision — instead of an `eps` comparison, whose correct value is problem-dependent and can stall on floating-point rounding.

> [!QUESTION]- Why does ternary search not substitute for this pattern?
> Ternary search optimises a unimodal objective — a value that rises then falls (or the reverse) with one extremum — by discarding an outer third each step. Binary search on the answer needs a monotone yes/no predicate with one boundary. The preconditions differ: a monotone predicate has no peak to find, and a unimodal objective has no single true/false flip, so neither reduction applies to the other's input.

# References

- [Binary search (CP Algorithms)](https://cp-algorithms.com/num_methods/binary_search.html) — the "binary search on the answer" section and the monotone-predicate framing behind `lower_bound`-style boundaries.
- [Capacity To Ship Packages Within D Days (LeetCode #1011)](https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/) — the minimise-the-maximum instance whose predicate is the reference implementation above.
- [Split Array Largest Sum (LeetCode #410)](https://leetcode.com/problems/split-array-largest-sum/) — the same monotone predicate under "minimise the largest subarray sum" wording.
- [Koko Eating Bananas (LeetCode #875)](https://leetcode.com/problems/koko-eating-bananas/) — minimise-the-speed variant, with `feasible(speed)` summing `ceil(pile / speed)` hours.
