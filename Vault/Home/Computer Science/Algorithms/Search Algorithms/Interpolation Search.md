---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Estimates the target's position from value ratios, with O(log log n) expected probes on uniform sorted data."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A sorted array holds ten million evenly spaced sensor readings, and one reading must be located by value. [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] reaches it in about 24 probes by halving the range each time, ignoring one fact the data offers: when values are exactly evenly spaced, the target's *value* determines its *index*. A reading whose value sits 95% of the way between the smallest and largest one sits 95% of the way through the array.

Interpolation Search probes at that predicted position instead of the middle. Given the current bounds `lo` and `hi`, it maps the target's value-offset into an index:

`pos = lo + (target - a[lo]) * (hi - lo) / (a[hi] - a[lo])`

To find `950` in `[0 … 1000]` it probes near index `95%`, not `50%` — the same instinct that opens a phone book near the back to find "Smith". On exactly evenly spaced values, the estimate lands exactly on a present target in the idealized arithmetic model, often making the lookup `O(1)`. The expected `O(log log n)` result concerns a different case: sorted keys sampled uniformly at random, where each probe leaves a much smaller range in expectation. As an asymptotic illustration, that model grows to roughly five probes over a billion elements while Binary Search grows to about 30. Without the uniform model that expected guarantee disappears. Some non-uniform inputs remain fast, while adversarial skew can force `Θ(n)` probes, below Binary Search's guaranteed `O(log n)`.

**Core condition:** sorted numeric input whose values predict their indices → idealized `O(1)` on exactly even spacing, expected `O(log log n)` for uniformly sampled random keys, and no sublinear guarantee outside that model; adversarial skew can require `Θ(n)`.

The distinguishing step is where the first probe lands.

~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"interpolation-search","array":[0,1,4,9,16,25,36,49,64,81,100,121],"target":81}
```

# Trace

The trace searches for `81` in the quadratic sequence `a[i] = i²`. The target sits about 67% across the initial value span but at index `9` of `11`, so the first estimate undershoots at index `7`. Two recalculations over the smaller value ranges move the probe through indices `8` and `9`. This makes the useful mechanism visible: interpolation is not a one-shot guess; every miss remaps the target against the new endpoints.

# Why the Range Collapses Faster

At the start of every loop the target, if present, lies in `[a[lo], a[hi]]` — the same invariant Binary Search maintains. Interpolation Search adds an assumption about *where* inside that range it lies. The formula treats the values between `a[lo]` and `a[hi]` as points on a straight line against their indices: the fraction `(target - a[lo]) / (a[hi] - a[lo])` of the value span maps to that same fraction of the index span. When the data actually follows that line, the probe lands on or beside the target's true index, and even a miss leaves a sub-range far smaller than half.

The comparison that follows is identical to Binary Search. `a[pos] < target` proves indices `lo … pos` are too small, so `lo` moves to `pos + 1`; `a[pos] > target` moves `hi` to `pos - 1`. The loop also guards `a[lo] <= target <= a[hi]`, so a target that falls outside the current value window exits immediately rather than interpolating into an empty region.

On exactly evenly spaced values, a present target's value fraction equals its index fraction, so the first estimate lands exactly in the idealized arithmetic model. The `O(log log n)` bound is an expected result under the separate uniform random-key model: after a probe, the expected remaining candidate count is on the order of the previous count's *square root* rather than its half. Repeated square-root reduction of `n` reaches one candidate in about `log log n` steps. An individual search can shrink by more or less than that model predicts. The iterative form stores only `lo`, `hi`, and `pos`, so auxiliary space stays `O(1)`.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Interpolation Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(log log n)"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```
~~~~~

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | The first interpolated probe equals the target. |
| Average | `O(log log n)` | `O(1)` | Under the uniform random-key model: each probe shrinks the candidate set to about its square root in expectation. |
| Worst | `Θ(n)` | `O(1)` | Adversarially skewed values push every estimate toward a boundary, so the range advances by roughly one element per probe. |

The average bound is inseparable from its assumption: without the uniform random-key model, the expected `O(log log n)` guarantee disappears. A non-uniform input may still search quickly, but adversarial skew can exhibit the worst-case row. Binary Search's `O(log n)` carries no such condition, which is the trade Interpolation Search makes for its faster expected case.

# When the Distribution Stops Cooperating

Non-uniform data removes the expected bound rather than forcing one outcome. Let `a[i] = 2^i` over `n` positions and search for `a[n − 1 − ⌈log₂ n⌉]`, a target roughly `max/n` that still sits at index `n − 1 − Θ(log n)`. The maximum dominates the value span, so the interpolation fraction starts near `1/n` and early estimates land close to `lo`; the boundary advances only a few positions at a time while the target remains near the far end by index. Isolating it can therefore take `Θ(n)` probes, slower than the `O(log n)` Binary Search that was given up. Clustered timestamps and Zipfian frequency tables can produce the same collapse when value ratios poorly predict index ratios.

The probe also requires keys with meaningful arithmetic. `(target - a[lo]) * (hi - lo) / (a[hi] - a[lo])` needs subtraction and a ratio, not just an ordering. Strings under a custom comparator, GUIDs, or opaque records support comparison but not a numeric offset, so the position cannot be estimated at all; those inputs are restricted to comparison-based search such as Binary Search.

The denominator fails when `a[hi] == a[lo]`. A run of equal values, or a range that has collapsed to one element, makes the value span zero. An unguarded integer implementation throws `DivideByZeroException`; floating-point variants produce a non-finite estimate that cannot be used as an index. The C# implementation below detects the flat block before division and resolves it with a direct equality check — the same category of defensive guard as computing a midpoint that cannot overflow.

# Reference Drawer

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Sorted array and target] --> B{lo not past hi and target within value range}
>   B -->|No| Z[Target is absent]
>   B -->|Yes| C{value at hi equals value at lo}
>   C -->|Yes| D[Flat block: compare directly]
>   C -->|No| E[Estimate pos by linear interpolation]
>   E --> F{value at pos equals target}
>   F -->|Yes| Y[Return pos]
>   F -->|No| G{value at pos less than target}
>   G -->|Yes| H[Move lo past pos]
>   G -->|No| I[Move hi before pos]
>   H --> B
>   I --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int InterpolationSearch(int[] values, int target)
> {
>     var lo = 0;
>     var hi = values.Length - 1;
>
>     while (lo <= hi && target >= values[lo] && target <= values[hi])
>     {
>         // Flat block: the interpolation denominator would be zero.
>         if (values[hi] == values[lo])
>         {
>             return values[lo] == target ? lo : -1;
>         }
>
>         // Widen an operand to long before subtracting and multiplying, so
>         // neither the value difference nor the product overflows 32-bit int.
>         var span = ((long)target - values[lo]) * (hi - lo);
>         var pos = lo + (int)(span / ((long)values[hi] - values[lo]));
>
>         if (values[pos] == target)
>         {
>             return pos;
>         }
>
>         if (values[pos] < target)
>         {
>             lo = pos + 1;
>         }
>         else
>         {
>             hi = pos - 1;
>         }
>     }
>
>     return -1;
> }
> ```
>
> The `target >= values[lo] && target <= values[hi]` guard doubles as the absence check: once the target leaves the range's value window, no interpolated position can be valid.

# Questions

> [!QUESTION]- What property of a value distribution can produce the linear worst case?
> A value distribution where ratios do not predict index ratios. In `a[i] = 2^i`, choosing the target near `max/n` places it at index `n − 1 − Θ(log n)` while the first interpolation fraction is only about `1/n`, so early probes stay near `lo`. The range then advances by only a few positions per probe and can require `Θ(n)` work.

> [!QUESTION]- Why can it not run on arbitrary comparable keys?
> The probe computes `(target - a[lo]) * (hi - lo) / (a[hi] - a[lo])`, which needs subtraction and a ratio with numeric meaning. Ordering-only types such as strings under a custom comparator support comparison but not that arithmetic, so no position can be estimated and only comparison-based search applies.

# References

- [Interpolation search](https://en.wikipedia.org/wiki/Interpolation_search) — the estimate formula, the `O(log log n)` analysis, and the uniformity precondition behind it.
- [Perl, Itai & Avni, "Interpolation search — a log log N search" (CACM, 1978)](https://dl.acm.org/doi/10.1145/359545.359557) — the primary source proving the `O(log log n)` expected-probe bound on uniformly distributed keys.
