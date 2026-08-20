---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Walks forward across ordered neighbors and steps backward after each adjacent swap."
level:
  - "4"
priority: Low
status: Not-Started
publish: true
---

Gnome sort maintains a sorted prefix with a single index. An ordered pair, `a[i-1] <= a[i]`, moves the index forward. An inverted pair swaps, then the index steps back so the displaced value can keep moving toward its insertion point. At the front of the array, the scan resumes from index `1`.

The mechanism is [[Home/Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] expressed as adjacent swaps instead of shifting a saved value. Every swap removes one inversion, which guarantees termination. Equal values never cross because the comparison is strict, so the sort is stable.

~~~~~tabsdown
tab: Visualization

```steptrace
{ "algorithm": "gnome-sort", "array": [7, 3, 5, 2, 8, 1, 6, 4] }
```

Forward steps confirm the current prefix remains ordered. A swap steps back by one position; repeated swaps walk the smaller value left until its predecessor is no greater, after which the scan moves forward again.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Gnome Sort complexity",
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

# Inversion cost and adjacent swaps

Ordered input needs one forward scan. Reverse-ordered input contains `n(n-1)/2` inversions and forces the same number of adjacent swaps. Insertion Sort has the same asymptotic bound but writes less: it shifts a block and places the saved value once. Gnome Sort is mainly useful as a compact demonstration of inversion removal.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void GnomeSort(int[] values)
> {
>     var i = 1;
>     while (i < values.Length)
>     {
>         if (values[i - 1] <= values[i])
>         {
>             i++;
>         }
>         else
>         {
>             (values[i - 1], values[i]) = (values[i], values[i - 1]);
>             i = Math.Max(1, i - 1);
>         }
>     }
> }
> ```
>
> Clamping the index to `1` avoids reading `values[-1]` after a swap at the front.

# References

- [Dick Grune, “Gnome Sort — The Simplest Sort Algorithm”](https://dickgrune.com/Programs/gnomesort.html)
