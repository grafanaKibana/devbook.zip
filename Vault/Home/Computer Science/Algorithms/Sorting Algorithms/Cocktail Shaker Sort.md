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

Cocktail shaker sort is bidirectional [[Home/Computer Science/Algorithms/Sorting Algorithms/Bubble Sort|Bubble Sort]]. A forward pass swaps adjacent inversions and fixes the largest remaining value at the right boundary. A backward pass then fixes the smallest remaining value at the left boundary. Both boundaries shrink after a round.

The backward pass repairs Bubble Sort's asymmetry: a small value near the tail can travel many positions toward the front in one round instead of one position per forward pass. Strict comparison keeps equal values from crossing, so the result is stable. Its value is explanatory rather than production performance.

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

# Boundary and implementation

Early exit depends on stopping after a swap-free round. Removing that flag schedules every shrinking pass even when the input is already ordered. Bidirectional motion improves some displaced-value patterns, but [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] is usually the better simple algorithm for small or nearly sorted inputs.

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
> Strict comparison preserves equal-key order; changing `>` to `>=` would make the implementation unstable.

# Questions

> [!QUESTION]- What does each direction settle?
> The forward pass fixes the largest live value at the right boundary; the backward pass fixes the smallest live value at the left boundary.

> [!QUESTION]- Why is cocktail shaker sort still a teaching algorithm?
> Two-way movement repairs Bubble Sort's one-direction weakness but not its quadratic comparison count. General-purpose `O(n log n)` sorts dominate once inputs are not tiny.

# References

- [Donald Knuth, *The Art of Computer Programming*, Volume 3](https://cs.stanford.edu/~knuth/taocp.html) — the primary sorting text discussing oscillating/shaker refinements to exchange sorting.
- [NIST Dictionary of Algorithms and Data Structures: bidirectional bubble sort](https://www.nist.gov/dads/HTML/bidirectionalBubbleSort.html) — authoritative definition of the alternating-direction Bubble Sort variant.
