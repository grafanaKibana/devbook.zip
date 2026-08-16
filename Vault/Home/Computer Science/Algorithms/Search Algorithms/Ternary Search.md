---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finds the extremum of a unimodal function by splitting the range in thirds each step."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A ball's range rises as its launch angle `θ` approaches the optimum, then falls after passing it. Once a model includes drag, the best angle may have no useful closed form. The search must sample the function and narrow the interval around its single peak. [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] solves a different problem because there is no ordered target here, only values that rise and then fall.

Ternary search works on a **unimodal** function: one that strictly increases to a single peak and then strictly decreases, or the reverse for a valley. It evaluates two interior points, `m1` and `m2`, at the thirds of `[lo, hi]`. The smaller value lies on the slope farther from the maximum, so the outer third beyond that probe can be discarded. Two evaluations remove one third of the interval.

The name also appears in sorted-array lookup, where a three-way split buys nothing: binary search chooses the correct half with fewer comparisons. Ternary search is useful for unimodal objectives, including one-parameter optimization and geometric extrema. [[Home/Computer Science/Algorithms/Patterns/Binary Search on Answer|Binary Search on Answer]] solves a different shape: a monotone feasibility predicate rather than a non-monotone objective that rises and falls.



~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"ternary-search","array":[1,4,9,12,11,7,2],"goal":"maximum"}
```



The values rise to `12` and then fall, giving one strict peak. Each ternary step shows both third-point probes at once; the lower side is discarded, and a final scan of at most three positions confirms the maximum at index `3`.



The interval `[lo, hi]` holds the peak `p` at the start of every step, and the discard rule preserves that. Let `m1 < m2` be the third-point probes. Strict unimodality means `f` increases on `[lo, p]` and decreases on `[p, hi]`.

- `f(m1) < f(m2)` puts `p` strictly right of `m1`. If instead `p ≤ m1`, both probes would sit on the decreasing slope and give `f(m1) > f(m2)`, a contradiction. So `lo = m1` keeps the peak.
- `f(m1) > f(m2)` is the mirror case: `p` lies left of `m2`, so `hi = m2` keeps it.
- `f(m1) == f(m2)` forces the unique peak strictly between the two probes under the renderer's strict-unimodal contract, so both outer thirds may be dropped. A flat maximum changes the answer from one point to an interval, but does not prevent finding some maximizer — see [When unimodality fails](#when-unimodality-fails).

Golden-section search changes the probe placement so the next interval can reuse one value already evaluated. That matters when `f` is a simulation or physical measurement rather than an array read.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Ternary Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of discrete candidates or search positions"
    },
    "lowerBound": {
      "symbol": "lo",
      "description": "inclusive lower search bound"
    },
    "tolerance": {
      "symbol": "eps",
      "description": "continuous-search tolerance"
    },
    "upperBound": {
      "symbol": "hi",
      "description": "inclusive upper search bound"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Discrete candidates",
          "bounds": [
            {
              "kind": "curve",
              "role": "Cost",
              "formula": "Θ(log n) iterations",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Iterations to tolerance eps (continuous)",
          "bounds": [
            {
              "kind": "text",
              "role": "Cost",
              "formula": "Θ(log((hi − lo)/eps))"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Function evaluations",
          "bounds": [
            {
              "kind": "curve",
              "role": "Cost",
              "formula": "2 per iteration (1 per iteration with golden-section reuse)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Sorted-array lookup (misuse)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Cost",
              "formula": "2·log₃ n ≈ 1.82·ln n comparisons",
              "curveId": "log-n"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Auxiliary space",
          "bounds": [
            {
              "kind": "curve",
              "role": "Cost",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```

The chart counts interval reductions. If evaluating the objective is not fixed-cost, multiply the probe count by the cost of one evaluation; cache repeated evaluations when that function is expensive. Golden-section search retains about 0.618 of the interval per step and reuses one probe, while ternary search retains about 0.667 and evaluates two new probes; prefer golden-section search when objective evaluation is expensive.
~~~~~

# When Unimodality Fails

Unimodality is the algorithmic precondition. Strict unimodality is the StepTrace renderer's narrower contract, and it is easy to violate either one.

A second hump breaks the discard rule. Suppose `f` has peaks at `x = 1` with height 5 and `x = 4` with height 4, separated by a valley. Probes on opposite sides of the valley can point toward the shorter peak and discard the third containing the global maximum. The algorithm then returns a local maximum without any runtime signal.

A flat maximum changes what can be promised. If the task accepts any maximizer, equality can keep the middle interval and ternary search still converges to a point on the plateau. If the task needs the whole maximizing interval, its left endpoint, or its right endpoint, an arbitrary tie update may discard part of that answer. Boundary searches or a final scan are then required. StepTrace deliberately accepts only strict increase-then-decrease so the visual has one unambiguous peak and every equality case has a single interpretation.

Discrete search needs a different stopping rule. With integer division, `m1 = lo + (hi − lo)/3` or `m2 = hi − (hi − lo)/3` eventually lands on a bound. A loop waiting for `lo == hi` can then stop making progress. The integer form loops while `hi − lo > 2` and scans the final two or three positions.

For membership in a sorted array, binary search remains the smaller and faster choice.

# Diagram and C# Implementation

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
>     if (!(eps > 0) || !double.IsFinite(eps))
>         throw new ArgumentOutOfRangeException(nameof(eps));
>
>     while (hi - lo > eps)
>     {
>         double m1 = lo + (hi - lo) / 3.0;
>         double m2 = hi - (hi - lo) / 3.0;
>         if (m1 == lo && m2 == hi) break;   // floating-point progress guard
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
> Reversing the comparison to `f(m1) > f(m2)` finds a minimum. The method rejects non-positive or non-finite tolerances. Its equality guard also stops when floating-point rounding prevents either probe from shrinking the interval.

# References

- [J. Kiefer, “Sequential Minimax Search for a Maximum” (1953)](https://doi.org/10.2307/2032161)
- [Ternary search (cp-algorithms)](https://cp-algorithms.com/num_methods/ternary_search.html)
