---
publish: true
created: 2026-08-10T07:58:46.844Z
modified: 2026-08-10T08:02:32.092Z
published: 2026-08-10T08:02:32.092Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Places each suffix maximum using only reversals of prefixes that begin at index zero.
level:
  - "4"
priority: Low
status: Not-Started
---

Pancake sort restricts every move to a prefix reversal. To place the largest value in the unsorted prefix, it first flips that value to index `0`, then flips the whole live prefix so the value lands at its final right boundary. The boundary shrinks and the process repeats.

The fixed suffix is the invariant: after finishing boundary `end`, every position after `end` contains its final value and is excluded from later flips. The restriction makes the algorithm useful for studying move-constrained sorting, although repeated maximum scans revisit the live prefix for every boundary.

````tabsdown
tab: Visualization

```steptrace
{ "algorithm": "pancake-sort", "array": [6, 1, 8, 3, 7, 2, 5, 4] }
```

Each move reverses `[0..k]`. When the live maximum is not already at the boundary, one flip brings it to the front and a second carries it to the boundary. At most two prefix reversals settle each position.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Pancake Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the array"
    }
  },
  "resources": {
    "time": {
      "mode": "cases",
      "entries": [
        { "kind": "case", "role": "Best", "formula": "Θ(n²)", "curveId": "quadratic" },
        { "kind": "case", "role": "Average", "formula": "Θ(n²)", "curveId": "quadratic" },
        { "kind": "case", "role": "Worst", "formula": "Θ(n²)", "curveId": "quadratic" }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        { "kind": "case", "role": "Best", "formula": "O(1)", "curveId": "constant" },
        { "kind": "case", "role": "Average", "formula": "O(1)", "curveId": "constant" },
        { "kind": "case", "role": "Worst", "formula": "O(1)", "curveId": "constant" }
      ]
    }
  }
}
```
````

# Boundary and implementation

The direct algorithm mutates the same array but is unstable because a prefix reversal can move equal keys across each other. It scans every shrinking prefix to locate the maximum even if no flips are needed. A preliminary sortedness check can return early, but it does not improve the general mechanism.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void PancakeSort(int[] values)
> {
>     for (var end = values.Length - 1; end > 0; end--)
>     {
>         var max = 0;
>         for (var i = 1; i <= end; i++)
>             if (values[i] > values[max]) max = i;
>
>         if (max == end) continue;
>         if (max > 0) Flip(values, max);
>         Flip(values, end);
>     }
> }
>
> private static void Flip(int[] values, int end)
> {
>     for (var left = 0; left < end; left++, end--)
>         (values[left], values[end]) = (values[end], values[left]);
> }
> ```
>
> No arbitrary swap occurs: every mutation is part of a prefix reversal.

# Questions

> [!QUESTION]- Why can two flips place the live maximum?
> The first moves the maximum from its current index to the front; the second reverses the full live prefix and moves the front value to its right boundary.

> [!QUESTION]- Why is the common implementation unstable?
> Reversing a prefix reverses the relative order of every pair in it, including equal keys.

# References

- [Gates and Papadimitriou, “Bounds for Sorting by Prefix Reversal”](https://doi.org/10.1016/0012-365X%2879%2990068-2) — the primary paper formalizing pancake sorting through prefix reversals.
- [NIST Dictionary of Algorithms and Data Structures: prefix reversal](https://www.nist.gov/dads/HTML/prefixReversal.html) — authoritative definition of the only move allowed by the algorithm.
