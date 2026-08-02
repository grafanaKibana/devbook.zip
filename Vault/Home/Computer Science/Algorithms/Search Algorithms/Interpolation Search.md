---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Estimates a target's position from value ratios in uniformly distributed sorted data."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A sorted array holds ten million evenly spaced sensor readings, and one reading must be located by value. Binary Search ignores one fact the data offers: when values are exactly evenly spaced, the target's *value* determines its *index*. A reading whose value sits 95% of the way between the smallest and largest one sits 95% of the way through the array.

Interpolation Search probes at that predicted position instead of the middle. Given the current bounds `lo` and `hi`, it maps the target's value-offset into an index:

`pos = lo + (target - a[lo]) * (hi - lo) / (a[hi] - a[lo])`

To find `950` in `[0 … 1000]` it probes near index `95%`, not `50%` — the same instinct that opens a phone book near the back to find "Smith". Without the uniform model, value ratios stop predicting index ratios.



The distinguishing step is where the first probe lands.

~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"interpolation-search","array":[0,1,4,9,16,25,36,49,64,81,100,121],"target":81}
```



The trace searches for `81` in the quadratic sequence `a[i] = i²`. The target sits about 67% across the initial value span but at index `9` of `11`, so the first estimate undershoots at index `7`. Each miss remaps the target against the new endpoints until the probe reaches index `9`.



At the start of every loop the target, if present, lies in `[a[lo], a[hi]]` — the same invariant Binary Search maintains. Interpolation Search adds an assumption about *where* inside that range it lies. The formula treats the values between `a[lo]` and `a[hi]` as points on a straight line against their indices: the fraction `(target - a[lo]) / (a[hi] - a[lo])` of the value span maps to that same fraction of the index span. When the data actually follows that line, the probe lands on or beside the target's true index, and even a miss leaves a sub-range far smaller than half.

The comparison that follows is identical to Binary Search. `a[pos] < target` proves indices `lo … pos` are too small, so `lo` moves to `pos + 1`; `a[pos] > target` moves `hi` to `pos - 1`. The loop also guards `a[lo] <= target <= a[hi]`, so a target that falls outside the current value window exits immediately rather than interpolating into an empty region.

On exactly evenly spaced values, a present target's value fraction equals its index fraction, so the first estimate lands exactly in the idealized arithmetic model. An individual search can shrink by more or less than the uniform model predicts.

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

The expected row assumes uniformly distributed keys. Skewed values can repeatedly place the estimated probe near one boundary, which is why binary search has a stronger unconditional guarantee.
~~~~~

# When the Distribution Stops Cooperating

Non-uniform data breaks the relationship between value ratios and index ratios. When one maximum dominates the value span, estimates cluster near `lo` even while the target remains near the far end by index. Clustered timestamps and Zipfian frequency tables can mislead the probe in the same way.

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

> [!QUESTION]- Why can it not run on arbitrary comparable keys?
> The probe computes `(target - a[lo]) * (hi - lo) / (a[hi] - a[lo])`, which needs subtraction and a ratio with numeric meaning. Ordering-only types such as strings under a custom comparator support comparison but not that arithmetic, so no position can be estimated and only comparison-based search applies.

# References

- [Interpolation search](https://en.wikipedia.org/wiki/Interpolation_search)
- [Perl, Itai & Avni, "Interpolation Search" (1978)](https://dl.acm.org/doi/10.1145/359545.359557) — the primary source for interpolation search under uniformly distributed keys.
