---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Recursively sorts overlapping two-thirds ranges in a first-last-first sequence."
level:
  - "4"
priority: Low
status: Not-Started
publish: true
---

Stooge sort compares the endpoints of a range and swaps them when they are inverted. For a range longer than two elements, it sorts the first two-thirds, the last two-thirds, then the first two-thirds again. The final call repairs values displaced by the middle call.

All three recursive calls still run when the range is already ordered. Non-adjacent endpoint swaps make the algorithm unstable. Its practical value is as a recurrence-analysis exercise.

~~~~~tabsdown
tab: Visualization

```steptrace
{ "algorithm": "stooge-sort", "array": [5, 2, 6, 1, 4, 3] }
```

The trace marks the active recursive range before comparing its endpoints. The visualization accepts at most seven items and stops at a 900-frame ceiling, preventing the three-way recursion from overwhelming either host.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Stooge Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the array"
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
            { "kind": "text", "role": "Best", "formula": "Θ(n^log₁.₅3) ≈ Θ(n².7095)" },
            { "kind": "text", "role": "Average", "formula": "Θ(n^log₁.₅3) ≈ Θ(n².7095)" },
            { "kind": "text", "role": "Worst", "formula": "Θ(n^log₁.₅3) ≈ Θ(n².7095)" }
          ]
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        { "kind": "case", "role": "Best", "formula": "O(log n)", "curveId": "log-n" },
        { "kind": "case", "role": "Average", "formula": "O(log n)", "curveId": "log-n" },
        { "kind": "case", "role": "Worst", "formula": "O(log n)", "curveId": "log-n" }
      ]
    }
  }
}
```

The recurrence is `T(n) = 3T(2n/3) + O(1)`, giving `Θ(n^log₁.₅3) ≈ Θ(n².7095)`. The recursion stack follows one branch at a time.
~~~~~

# Recursive work and the demonstration ceiling

Each child range is about two-thirds of its parent, but every non-base call branches three times. Already sorted input still expands the same call tree. The StepTrace ceiling bounds the demonstration only. It does not change the algorithm.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void StoogeSort(int[] values) => Sort(values, 0, values.Length - 1);
>
> private static void Sort(int[] values, int left, int right)
> {
>     if (left >= right) return;
>     if (values[left] > values[right])
>         (values[left], values[right]) = (values[right], values[left]);
>
>     var length = right - left + 1;
>     if (length <= 2) return;
>
>     var third = length / 3;
>     Sort(values, left, right - third);
>     Sort(values, left + third, right);
>     Sort(values, left, right - third);
> }
> ```

# References

- [NIST Dictionary of Algorithms and Data Structures: stooge sort](https://www.nist.gov/dads/HTML/stoogesort.html)
