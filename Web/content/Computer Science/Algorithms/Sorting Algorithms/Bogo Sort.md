---
publish: true
created: 2026-08-20T20:41:15.539Z
modified: 2026-08-20T20:41:15.539Z
published: 2026-08-20T20:41:15.539Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Repeatedly permutes the input until it happens to be sorted, illustrating probabilistic nontermination.
level:
  - "4"
priority: Low
status: Not-Started
---

Bogo sort takes generate-and-test literally. It checks whether the array is sorted, shuffles when it is not, then starts over. With `n` distinct values, only one of the `n!` permutations is sorted, so each random attempt succeeds with probability `1/n!`. The shuffles can miss forever.

Bogo Sort is useful as a counterexample. Practical sorting algorithms preserve progress by shrinking the unsorted region or removing disorder. Bogo Sort discards all previous work after every shuffle.

````tabsdown
tab: Visualization

```steptrace
{ "algorithm": "bogo-sort", "array": [3, 1, 4, 2] }
```

The teaching trace enumerates a deterministic bounded sequence of permutations instead of depending on random luck. It accepts at most five items and stops after at most 120 attempts. Those limits keep the card reproducible and finite; the classical algorithm remains random and has no finite worst-case bound.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Bogo Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of distinct elements in the array"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Sort",
          "bounds": [
            { "kind": "curve", "role": "Best", "formula": "O(n)", "curveId": "linear" },
            { "kind": "text", "role": "Expected", "formula": "Θ(n · n!)" },
            { "kind": "text", "role": "Worst", "formula": "Unbounded without an attempt cap" }
          ]
        }
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

# Attempt cap and termination

The storage result shown above assumes an unbiased Fisher–Yates shuffle that modifies the array directly. An attempt cap makes a program terminate but changes the contract: it may return failure with an unsorted array. The deterministic StepTrace demonstrates the state space. It is not evidence that random Bogo Sort finishes within 120 attempts.

> [!EXAMPLE]- C# bounded demonstration
>
> ```csharp
> public static bool TryBogoSort(int[] values, Random random, int maxAttempts)
> {
>     if (IsSorted(values)) return true;
>
>     for (var attempt = 0; attempt < maxAttempts; attempt++)
>     {
>         random.Shuffle(values);
>         if (IsSorted(values)) return true;
>     }
>     return false;
> }
>
> private static bool IsSorted(int[] values)
> {
>     for (var i = 1; i < values.Length; i++)
>         if (values[i - 1] > values[i]) return false;
>     return true;
> }
> ```
>
> `Random.Shuffle` performs an unbiased shuffle directly on the array in current .NET. The initial state is checked before the attempt budget starts, and `maxAttempts` counts the later shuffles. Every allowed shuffle is checked, including the last one. Returning `false` makes the cap explicit instead of claiming success with an unsorted array.

# References

- [Gruber, Holzer, and Ruepp, “Sorting the Slow Way”](https://doi.org/10.1007/978-3-540-72914-3_17)
- [NIST Dictionary of Algorithms and Data Structures: bogosort](https://www.nist.gov/dads/HTML/bogosort.html)
