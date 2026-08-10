---
publish: true
created: 2026-08-10T07:56:54.913Z
modified: 2026-08-10T09:32:47.561Z
published: 2026-08-10T09:32:47.561Z
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

Bogo sort applies generate-and-test without useful guidance: check whether the array is sorted; if not, shuffle it and try again. For `n` distinct values only one of the `n!` permutations is sorted, so a random attempt succeeds with probability `1/n!`. A sequence of random shuffles can miss indefinitely.

The algorithm is a counterexample, not a production choice. It makes the value of progress invariants concrete: a real sorting algorithm proves that each step shrinks disorder or fixes a region, while Bogo Sort forgets all previous work after every shuffle.

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
            { "kind": "curve", "role": "Expected", "formula": "Θ(n · n!)", "curveId": "factorial" },
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

# Boundary and implementation

The storage result shown above assumes an unbiased Fisher–Yates shuffle that modifies the array directly. An attempt cap makes a program terminate but changes the contract: it may return failure with an unsorted array. The deterministic StepTrace demonstrates the state space; it is not evidence that random Bogo Sort finishes within 120 attempts.

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
> `Random.Shuffle` performs an unbiased shuffle directly on the array in current .NET. `maxAttempts` counts shuffles: the initial state is checked once, and every shuffle—including the final allowed shuffle—is checked before returning `false`. Returning `false` exposes the cap instead of pretending the array was sorted.

# Questions

> [!QUESTION]- Why is the expected time factorial?
> With distinct values, each unbiased shuffle selects one of `n!` permutations and only one is sorted. The expected number of attempts is proportional to `n!`; each Fisher–Yates shuffle costs `Θ(n)`, while the order check is `O(n)` in the worst case, so expected time is `Θ(n · n!)`. The worst case remains unbounded because random shuffles may miss the sorted permutation indefinitely.

> [!QUESTION]- What important guarantee does an attempt cap change?
> It guarantees termination by allowing failure. The method is no longer a sorting algorithm that always returns a sorted result.

# References

- [Gruber, Holzer, and Ruepp, “Sorting the Slow Way”](https://doi.org/10.1007/978-3-540-72914-3_17) — the primary formal analysis of Bogo Sort and related randomized pessimal algorithms.
- [NIST Dictionary of Algorithms and Data Structures: bogosort](https://www.nist.gov/dads/HTML/bogosort.html) — authoritative definition and the published expected-time lower bound.
- [`Random.Shuffle<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.random.shuffle) — official .NET API used by the bounded C# demonstration.
