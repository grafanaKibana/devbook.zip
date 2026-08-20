---
publish: true
created: 2026-08-20T20:41:15.541Z
modified: 2026-08-20T20:41:15.541Z
published: 2026-08-20T20:41:15.541Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Rotates permutation cycles so displaced elements are written directly to final positions.
level:
  - "4"
priority: Low
status: Not-Started
---

Cycle sort reads the mapping from current positions to sorted positions as a set of cycles. At `cycleStart`, it counts smaller values to find where the current value belongs. It writes the value straight there, picks up the displaced value, and follows the cycle until it returns to `cycleStart`.

With distinct values, each displaced element goes to its final position in one write and never moves again. This is the minimum number of writes for a comparison sort that reuses the input array. The tradeoff is repeated scanning: every carried value needs another count over the remaining suffix. Duplicate values also require skipping equal destinations, or the cycle may keep exchanging indistinguishable entries.

````tabsdown
tab: Visualization

```steptrace
{ "algorithm": "cycle-sort", "array": [5, 2, 8, 2, 1, 7, 4, 3] }
```

The trace separates comparisons from writes. A scan computes the rank of the carried value, then one overwrite places it and picks up the displaced value. Equal values are skipped when selecting the destination.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Cycle Sort complexity",
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

# Write minimization and duplicate keys

Cycle sort is unstable because skipping past equal destinations does not preserve the input order of equal records. Its minimum-write property is cleanest with distinct keys, where every displaced element needs one final-position write. The algorithm fits the narrow case where writes cost far more than reads. Most production sorts avoid its repeated scans.

> [!EXAMPLE]- C# implementation returning the write count
>
> ```csharp
> public static int CycleSort(int[] values)
> {
>     var writes = 0;
>     for (var start = 0; start < values.Length - 1; start++)
>     {
>         var item = values[start];
>         var position = start;
>         for (var i = start + 1; i < values.Length; i++)
>             if (values[i] < item) position++;
>
>         if (position == start) continue;
>         while (item == values[position]) position++;
>         (item, values[position]) = (values[position], item);
>         writes++;
>
>         while (position != start)
>         {
>             position = start;
>             for (var i = start + 1; i < values.Length; i++)
>                 if (values[i] < item) position++;
>             while (item == values[position]) position++;
>             (item, values[position]) = (values[position], item);
>             writes++;
>         }
>     }
>     return writes;
> }
> ```

# References

- [B. K. Haddon, “Cycle-Sort: A Linear Sorting Method”](https://doi.org/10.1093/comjnl/33.4.365)
