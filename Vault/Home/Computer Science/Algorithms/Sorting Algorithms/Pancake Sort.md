---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Places each suffix maximum using only reversals of prefixes that begin at index zero."
level:
  - "4"
priority: Low
status: Not-Started
publish: true
---

Pancake sort works under an unusual constraint: the only legal move reverses a prefix beginning at index `0`. To place the largest value in the unsorted region, one flip brings it to the front and another moves it to the region's right boundary. Then the boundary shrinks.

The settled suffix is the invariant. After boundary `end` has been processed, every position to its right holds its final value and later flips cannot reach it. The price of the restricted move is repeated scanning: every new boundary requires another search for the maximum of the live prefix.

~~~~~tabsdown
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
~~~~~

# Prefix reversals, stability, and scan cost

The direct algorithm mutates the array in place. It is unstable because reversing a prefix can carry equal keys past each other. Every shrinking prefix is still scanned for its maximum, even when that maximum already sits at the boundary. A preliminary sortedness check helps only with the fully sorted case. It does not change the quadratic scan pattern.

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
> Every mutation belongs to a prefix reversal. The implementation never uses an arbitrary swap.

# References

- [Gates and Papadimitriou, “Bounds for Sorting by Prefix Reversal”](https://doi.org/10.1016/0012-365X%2879%2990068-2)
