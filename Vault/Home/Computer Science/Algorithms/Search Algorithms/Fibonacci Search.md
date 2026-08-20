---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Searches a sorted array by shrinking a Fibonacci-sized window around an offset."
level:
  - "4"
priority: Low
status: Not-Started
publish: true
---

Fibonacci Search locates a value in a sorted, random-access array without repeatedly dividing the search interval. It keeps three consecutive Fibonacci numbers large enough to cover the candidate range and probes at `offset + F(k-2)`.

Every possible target index stays greater than `offset` and inside the current Fibonacci window. A value below the target advances the offset. A value above it keeps the offset and contracts the window to its left component. Like [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]], the algorithm repeatedly discards part of the candidate range. Its distinction is the Fibonacci offset arithmetic.

~~~~~tabsdown
tab: Visualization

```steptrace
{ "algorithm": "fibonacci-search", "array": [2, 5, 8, 13, 21, 34, 55, 89, 144], "target": 55 }
```

The trace grows a Fibonacci window that covers the nine values, then probes from an offset initially set before index `0`. Each comparison either advances the offset past a proven-small prefix or contracts the live range to the smaller Fibonacci component. A final one-element check handles the remaining candidate after the main window reaches size one.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Fibonacci Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the sorted array"
    }
  },
  "resources": {
    "time": {
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
          "formula": "O(log n)",
          "curveId": "log-n"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(log n)",
          "curveId": "log-n"
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
~~~~~

# Boundaries

The array must be sorted under the same comparison used by the search. Otherwise, neither discarded side is proven irrelevant. Random access is required as well because the algorithm jumps to computed indices. A forward-only stream cannot do that.

Duplicates are safe, though the returned match is arbitrary. A lower-bound or upper-bound [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] is clearer when the first or last duplicate matters. The covering Fibonacci number should use a wider integer type so it cannot overflow near the maximum array length.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int FibonacciSearch(int[] values, int target)
> {
>     long fib2 = 0;
>     long fib1 = 1;
>     long fib = fib1 + fib2;
>
>     while (fib < values.Length)
>     {
>         fib2 = fib1;
>         fib1 = fib;
>         fib = fib1 + fib2;
>     }
>
>     var offset = -1;
>     while (fib > 1)
>     {
>         var probe = (int)Math.Min(offset + fib2, values.Length - 1L);
>         if (values[probe] < target)
>         {
>             fib = fib1;
>             fib1 = fib2;
>             fib2 = fib - fib1;
>             offset = probe;
>         }
>         else if (values[probe] > target)
>         {
>             fib = fib2;
>             fib1 -= fib2;
>             fib2 = fib - fib1;
>         }
>         else
>         {
>             return probe;
>         }
>     }
>
>     var last = offset + 1;
>     return fib1 == 1 && last < values.Length && values[last] == target ? last : -1;
> }
> ```
>
> The `long` Fibonacci state protects the covering-number calculation. Array probes are clamped back into the valid `int` index range.

# References

- [David E. Ferguson, “Fibonaccian Searching”](https://doi.org/10.1145/367487.367496)
- [NIST Dictionary of Algorithms and Data Structures: Fibonaccian search](https://www.nist.gov/dads/HTML/fibonaccianSearch.html)
