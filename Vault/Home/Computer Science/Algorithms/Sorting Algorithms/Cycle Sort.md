---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Rotates permutation cycles so displaced elements are written directly to final positions."
level:
  - "4"
priority: Low
status: Not-Started
publish: true
---

Cycle sort treats the mapping from current positions to sorted positions as a set of cycles. For the value at `cycleStart`, it counts smaller values to find the final position, writes the value there, and carries the displaced value to its own final position. The rotation ends when the displaced chain returns to `cycleStart`.

For distinct values, every displaced element is written directly to its final position and never moved again. That minimizes writes among comparison sorts that reuse the input array, while repeatedly counting smaller suffix values still revisits the remainder for each cycle. Duplicate values require advancing past equal values so a cycle does not keep exchanging indistinguishable entries.

~~~~~tabsdown
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
~~~~~

# Boundary and implementation

Cycle sort is unstable: placing a duplicate after equal destinations does not preserve the original order among equal records. The minimum-write argument is strongest for distinct keys, where each displaced element needs one final-position write. It is a niche choice when writes are substantially more expensive than reads; production sorts usually prefer fewer repeated scans.

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

# Questions

> [!QUESTION]- Why does Cycle Sort perform few writes but many comparisons?
> It computes each final position by scanning and counting smaller values, then writes directly to that position. Avoiding intermediate writes does not avoid the repeated scans.

> [!QUESTION]- Why must duplicate destinations be skipped?
> Writing a value onto an equal value would not advance the cycle and can repeat indefinitely. Advancing past equal entries selects the next valid slot.

# References

- [B. K. Haddon, “Cycle-Sort: A Linear Sorting Method”](https://doi.org/10.1093/comjnl/33.4.365) — the original primary paper deriving sorting from the cycle decomposition of a permutation.
- [The Computer Journal, Volume 33 bibliography](https://www.sigmod.org/publications/dblp/db/journals/cj/cj33.html) — bibliographic record for Haddon's 1990 Cycle-Sort paper.
