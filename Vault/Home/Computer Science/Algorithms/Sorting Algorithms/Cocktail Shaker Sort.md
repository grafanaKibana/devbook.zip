---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Alternates forward and backward bubble passes so both ends settle during each round."
level:
  - "4"
priority: Low
status: Not-Started
publish: true
---

Cocktail shaker sort runs [[Home/Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]] in both directions. The forward pass fixes the largest remaining value at the right boundary. The backward pass fixes the smallest at the left. Both boundaries then move inward.

The backward pass addresses Bubble Sort's main weakness. A small value near the tail can move several positions toward the front in one round instead of one position per forward pass. Strict comparison keeps equal values from crossing, so the sort remains stable. It is still mainly useful for explaining adjacent-swap behavior.

~~~~~tabsdown
tab: Visualization

```steptrace
{ "algorithm": "cocktail-shaker-sort", "array": [8, 3, 5, 1, 9, 2, 7, 4] }
```

The forward sweep carries the largest live value to the right edge. The backward sweep carries the smallest live value to the left edge. A complete sweep with no swap proves that no adjacent inversion remains, so the array is sorted.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Cocktail Shaker Sort complexity",
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
        { "kind": "case", "role": "Best", "formula": "O(n)", "curveId": "linear" },
        { "kind": "case", "role": "Average", "formula": "O(n²)", "curveId": "quadratic" },
        { "kind": "case", "role": "Worst", "formula": "O(n²)", "curveId": "quadratic" }
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

# Early exit and stability

Early exit requires the swap flag. Without it, every shrinking pass runs even when the input is already ordered. Two-way movement helps with some displaced values, but [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] is usually the better simple choice for small or nearly sorted inputs.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void CocktailShakerSort(int[] values)
> {
>     var left = 0;
>     var right = values.Length - 1;
>     var swapped = true;
>
>     while (swapped && left < right)
>     {
>         swapped = false;
>         for (var i = left; i < right; i++)
>             if (values[i] > values[i + 1])
>             {
>                 (values[i], values[i + 1]) = (values[i + 1], values[i]);
>                 swapped = true;
>             }
>
>         right--;
>         if (!swapped) break;
>
>         swapped = false;
>         for (var i = right; i > left; i--)
>             if (values[i - 1] > values[i])
>             {
>                 (values[i - 1], values[i]) = (values[i], values[i - 1]);
>                 swapped = true;
>             }
>
>         left++;
>     }
> }
> ```
>
> Strict comparison preserves equal-key order. Changing `>` to `>=` would make the implementation unstable.

# References

- [NIST Dictionary of Algorithms and Data Structures: bidirectional bubble sort](https://www.nist.gov/dads/HTML/bidirectionalBubbleSort.html)
