---
publish: true
created: 2026-07-12T14:27:20.411Z
modified: 2026-07-12T14:27:20.411Z
published: 2026-07-12T14:27:20.411Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Finds the extremum of a unimodal function by splitting the range in thirds each step.
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

A ball launched at angle `θ` carries farther as `θ` climbs toward the optimum, then falls off as the angle steepens past it: the range is a single-peaked function of `θ` with no closed-form optimum once drag enters the model. Locating that peak means sampling the function and narrowing toward it, which needs a rule for deciding which samples to keep. [[Binary Search]] cannot supply the rule — there is no order to compare a target against, only a value that rises then falls.

Ternary search is that rule for a **unimodal** function — one that strictly increases to a single peak, then strictly decreases (or the mirror image for a valley). Two interior probes `m1` and `m2` at the third-points of `[lo, hi]` bracket the peak: whichever probe returns the smaller value sits on the far slope, so the third of the interval beyond it cannot hold the maximum and is discarded. Each step removes a third of the range using two function evaluations.

The same name describes a three-way split of a sorted array, but there it is strictly worse than binary search: two comparisons per level shrink the range to a third (`2·log₃ n ≈ 1.82·ln n` comparisons) where one comparison already shrinks it to a half (`log₂ n ≈ 1.44·ln n`). The extra split earns nothing on ordered data. Its distinct value is the unimodal case, which binary search does not address at all — one-parameter convex optimization, geometric extremum problems (closest point on a parabola), and [[Binary Search on Answer|parametric search]] whose objective is unimodal rather than monotone.

**Core condition:** a strictly unimodal `f` over `[lo, hi]` → two third-point probes reveal the peak's side → one third of the interval is discarded per step → `Θ(log n)` evaluations, `O(1)` space.

No StepTrace renderer covers this search yet.

> [!NOTE] Visualization pending
> Planned StepTrace: a card placing two probes at the third-points of the range on a unimodal function, discarding the third that cannot contain the maximum each step. No matching renderer exists in `engine.js` yet.

## Why a third can be dropped

The interval `[lo, hi]` holds the peak `p` at the start of every step, and the discard rule preserves that. Let `m1 < m2` be the third-point probes. Strict unimodality means `f` increases on `[lo, p]` and decreases on `[p, hi]`.

- `f(m1) < f(m2)` puts `p` strictly right of `m1`. If instead `p ≤ m1`, both probes would sit on the decreasing slope and give `f(m1) > f(m2)`, a contradiction. So `lo = m1` keeps the peak.
- `f(m1) > f(m2)` is the mirror case: `p` lies left of `m2`, so `hi = m2` keeps it.
- `f(m1) == f(m2)` forces `p` strictly between the two probes under strict unimodality, so either bound may move safely. A flat stretch removes that guarantee — see [When unimodality fails](#when-unimodality-fails).

Each step keeps `2/3` of the width, so `k` steps leave `(2/3)^k · (hi − lo)`. Reaching a tolerance `eps` takes `log_{3/2}((hi − lo)/eps)` steps — logarithmic, but with base `3/2` the interval shrinks more slowly per step than under binary search's halving. Only `lo`, `hi`, and the two probes persist, so auxiliary space is `O(1)`.

Golden-section search sharpens the constant without changing the shape: placing the probes at the golden ratio makes one probe of the next step coincide with a probe already evaluated, so every step after the first spends one new evaluation instead of two. The saving matters when `f` is a simulation or a physical measurement rather than an array read.

## Complexity

The cost is deterministic in the interval width rather than data-dependent, so the table is organized by quantity, not by best/average/worst.

| Quantity | Cost | Cause |
| --- | --- | --- |
| Iterations to tolerance `eps` (continuous) | `log_{3/2}((hi − lo)/eps)` = `Θ(log n)` | Each step keeps `2/3` of the interval |
| Function evaluations | `2` per iteration (`1` per iteration with golden-section reuse) | Two fresh probes `f(m1)`, `f(m2)` each step |
| Auxiliary space | `O(1)` | Only `lo`, `hi`, `m1`, `m2` are stored |
| Sorted-array lookup (misuse) | `2·log₃ n ≈ 1.82·ln n` comparisons | Two comparisons buy a `3×` reduction; binary search's one comparison already buys `2×` (`log₂ n ≈ 1.44·ln n`) |

The `Θ(log n)` bound and the `2·log₃ n` comparison count describe the same asymptotic class, so the deciding difference between ternary and binary search is the constant factor — and on monotone data it always favours binary search.

## When unimodality fails

Strict unimodality is the entire precondition, and it is easy to violate.

A second hump defeats the discard rule. Take `f` with peaks at `x = 1` (height 5) and `x = 4` (height 4) separated by a valley. If the two probes straddle that valley, the taller probe points back toward its own hump, and the step discards the third containing the _other_ hump — which here holds the global maximum. The returned point is then a local maximum, silently wrong, with nothing thrown or logged.

A flat plateau breaks the tie logic. When `f` is constant across a stretch that both probes land in, `f(m1) == f(m2)` carries no direction, and moving `hi` to `m2` can drop part of the optimal set if the plateau extends past `m2`. Strict increase-then-decrease is precisely what excludes this; with genuine ties, scanning the flat region or reformulating the objective is the fix.

The discrete domain needs a different stopping rule. With integer bounds and integer division, `m1 = lo + (hi − lo)/3` and `m2 = hi − (hi − lo)/3` do not collide, but a probe can coincide with a bound (e.g. `m1 == lo` once `hi − lo` is small), leaving the interval unchanged, and a loop that waits for `lo == hi` never advances. The integer form loops while `hi − lo > 2` and finishes by scanning the two or three remaining indices, which also sidesteps the rounding traps of three-way integer splits.

For membership in a sorted array the boundary is simpler still: binary search dominates. Same `O(log n)` class, fewer comparisons, one probe per step instead of two.

## Reference drawer

> [!ABSTRACT]- Control flow (maximizing form)
>
> ```mermaid
> flowchart TD
>   A[Interval lo to hi over a unimodal function] --> B{hi minus lo greater than eps}
>   B -->|No| Z[Return midpoint of lo and hi]
>   B -->|Yes| C[Probe m1 at one third and m2 at two thirds]
>   C --> D{f of m1 less than f of m2}
>   D -->|Yes| E[Move lo to m1: peak is not left of m1]
>   D -->|No| F[Move hi to m2: peak is not right of m2]
>   E --> B
>   F --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Returns the argument maximizing a strictly unimodal function on [lo, hi].
> public static double ArgMaxUnimodal(Func<double, double> f, double lo, double hi, double eps = 1e-9)
> {
>     while (hi - lo > eps)
>     {
>         double m1 = lo + (hi - lo) / 3.0;
>         double m2 = hi - (hi - lo) / 3.0;
>
>         if (f(m1) < f(m2))
>         {
>             lo = m1;   // peak is not to the left of m1
>         }
>         else
>         {
>             hi = m2;   // peak is not to the right of m2
>         }
>     }
>
>     return (lo + hi) / 2.0;
> }
> ```
>
> Flipping the comparison to `f(m1) > f(m2)` minimizes instead. `eps` must stay above the machine resolution of `double`, or `hi - lo` never crosses it and the loop spins; bounding the iteration count is the safe guard.

## Questions

> [!QUESTION]- Why does the smaller of the two probe values mark a discardable third?
> Under strict unimodality `f` rises to the peak then falls. The probe returning the smaller value sits farther down a slope, on the side away from the peak, so the interval beyond it lies entirely on that slope and cannot contain the maximum. Two probes are needed because a single point on a non-monotone function cannot reveal which side the peak is on.

> [!QUESTION]- What does golden-section search change, and when does it matter?
> It places the probes at the golden ratio so one probe of each step reuses an evaluation from the previous step. Golden-section retains ≈0.618 of the interval per step versus ternary's 0.667 — a slightly _faster_ shrink — while reusing one of the two probe evaluations, so it costs one new function call per step instead of two. It dominates ternary on both axes at once whenever evaluating `f` is expensive — a simulation or a measurement rather than an array read.

> [!QUESTION]- What input makes the discard rule return a wrong answer?
> A non-unimodal function or a flat plateau. With two humps, probes straddling the valley can discard the third holding the global maximum and return a local one. A plateau makes `f(m1) == f(m2)` uninformative, so a bound can move past part of the optimal set. Strict increase-then-decrease is the precondition that excludes both.

## References

- [Ternary search (Wikipedia)](https://en.wikipedia.org/wiki/Ternary_search) — definition, the unimodality requirement, and the iteration-count derivation.
- [Ternary search (cp-algorithms)](https://cp-algorithms.com/num_methods/ternary_search.html) — continuous and integer forms with correctness reasoning and the `hi − lo > 2` stopping rule.
- [Golden-section search (Wikipedia)](https://en.wikipedia.org/wiki/Golden-section_search) — the evaluation-reuse trick and why the golden ratio is the optimal probe placement.
