---
publish: true
created: 2026-08-20T20:41:15.547Z
modified: 2026-08-20T20:41:15.547Z
published: 2026-08-20T20:41:15.547Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Repeatedly selects the minimum of the unsorted suffix and places it at the next prefix position.
level:
  - "4"
priority: Low
status: Ready to Repeat
---

Selection sort is useful when writes cost much more than comparisons, such as on flash or EEPROM with limited erase cycles. Pass `i` scans the unsorted suffix `a[i..n-1]`, finds its minimum, and swaps that value into position `i`. The guarded implementation performs at most one swap per pass. Position `i` is now final, while the other position touched by the swap remains in the unsorted suffix and may be written again.

The minimum scan is unconditional. It examines every remaining element whether the input is sorted, reversed, or random. The write count stays small, but the comparison schedule never improves with input order.

**Operating condition:** each full suffix scan finalizes one prefix position with at most one swap.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"selection-sort","array":[8,3,5,1,9,2,7,4]}
```



The first pass scans all eight elements, finds the minimum `1` at index 3, and swaps it with `a[0]`. That swap writes both indices 0 and 3, and it fixes index 0 permanently: no smaller value remains in the suffix, so index 0 is never revisited. Index 3 remains in the unsorted suffix and may be written again. The second pass repeats the scan over `a[1..7]`, now seven elements, and places `2`. Each pass performs at most one swap and shortens the unsorted suffix by one, so the sorted prefix on the left grows by one element per pass while the comparison work on the right falls by one — the sorted region and the scanning cost move in opposite directions.

#### Why Each Placement is Final

After pass `i` completes, `a[0..i]` holds the `i + 1` smallest values in sorted order, and each of them is less than or equal to every value still in `a[i+1..n-1]`. Pass `i` establishes that invariant by choosing the true minimum of the suffix: no later pass can surface a smaller value to displace it, so the placement is settled and the prefix stays sorted without ever being re-examined.

The scan is unconditional: there is no shortcut that ends a pass early and no outer flag that notices an already-sorted array. Each pass still ends with at most one swap. The prefix position becomes final; the suffix position does not and can be written again.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Selection Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the input array"
    }
  },
  "resources": {
    "time": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "Θ(n²)",
          "curveId": "quadratic"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "Θ(n²)",
          "curveId": "quadratic"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "Θ(n²)",
          "curveId": "quadratic"
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```

Comparisons dominate the running time and are identical across all three rows — the direct consequence of an unconditional scan. Swaps are the axis that varies, yet even the worst case stays linear at no more than one swap per pass. Auxiliary space is `O(1)`: the sort runs in place over the original array using a handful of index variables.


A stable variant exists but abandons the write budget that motivates the algorithm. Rather than swapping the minimum into place, it removes the minimum and shifts the intervening elements up by one — the same move [[Computer Science/Algorithms/Sorting Algorithms/Insertion Sort|Insertion Sort]] makes. Preserving equal-key order costs `Θ(n)` writes per pass, restoring the `Θ(n²)` write total that the swap-based form was chosen to avoid.
````

Selection sort is unstable because a long-distance swap can carry one equal key past another. Sorting `[5a, 3, 5b, 1]` by value produces `[1, 3, 5b, 5a]`. The two fives have changed order.

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> graph TD
>   A[Start array A] --> B[Set i to 0]
>   B --> C{i less than n minus 1}
>   C -->|No| Z[Done]
>   C -->|Yes| D[Set min to i and set j to i plus 1]
>   D --> E{j less than n}
>   E -->|No| L{min != i}
>   L -->|No| G[Increment i]
>   L -->|Yes| F[Swap A at i and A at min]
>   F --> G
>   G --> C
>   E -->|Yes| H{A at j less than A at min}
>   H -->|Yes| I[Set min to j]
>   H -->|No| J[No op]
>   I --> K[Increment j]
>   J --> K
>   K --> E
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static void SelectionSort(int[] a)
> {
>     int n = a.Length;
>     for (int i = 0; i < n - 1; i++)
>     {
>         int minIdx = i;
>         for (int j = i + 1; j < n; j++)
>         {
>             if (a[j] < a[minIdx])
>                 minIdx = j;
>         }
>         if (minIdx != i)
>             (a[i], a[minIdx]) = (a[minIdx], a[i]);
>     }
> }
> ```
>
> The `minIdx != i` guard avoids a write when the minimum is already in place. A sorted input therefore performs no swaps, although it still runs every comparison.

# References

- [Elementary Sorts (Sedgewick & Wayne, algs4)](https://algs4.cs.princeton.edu/21elementary/)
