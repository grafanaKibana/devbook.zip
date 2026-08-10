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

Fibonacci search is a comparison search for a sorted, random-access array. It keeps three consecutive Fibonacci numbers large enough to cover the remaining candidate range. A probe lands at `offset + F(k-2)`; comparing that value with the target discards one side and shifts the Fibonacci triple down without division.

The invariant is that every possible target index is greater than `offset` and inside the current Fibonacci window. A probe below the target moves `offset` to the probe. A probe above the target keeps the offset and replaces the window with its smaller left component. Like [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]], the method is logarithmic and requires sorted input; the practical distinction is Fibonacci-offset arithmetic rather than repeated midpoint calculation.

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

The array must be sorted under the same comparison used by the search. Unsorted input invalidates the discarded ranges. Random access is also required: Fibonacci search jumps to computed indices and is not a forward-only stream algorithm.

Duplicate targets are safe, but the algorithm returns an arbitrary matching index rather than the first or last occurrence. A lower-bound or upper-bound [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] is the direct choice when duplicate boundaries matter. Building the Fibonacci numbers in a wider integer type prevents the covering value from overflowing near the maximum array length.

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
> The `long` Fibonacci state protects the covering-number calculation; array probes are clamped back into the valid `int` index range.

# Questions

> [!QUESTION]- What does `offset` prove after a probe below the target?
> Every index through that probe is too small, so the target, if present, must be strictly to its right. The next Fibonacci window is therefore anchored after the new offset.

> [!QUESTION]- Why is Fibonacci search not a general replacement for binary search?
> Both require sorted random-access data and have `O(log n)` comparisons. Fibonacci search changes the probe arithmetic and can favor storage where nearby forward offsets are useful, while binary search is simpler and directly supports standard lower-bound and upper-bound forms.

# References

- [David E. Ferguson, “Fibonaccian Searching”](https://doi.org/10.1145/367487.367496) — the 1960 primary paper introducing the Fibonacci-interval search method.
- [NIST Dictionary of Algorithms and Data Structures: Fibonaccian search](https://www.nist.gov/dads/HTML/fibonaccianSearch.html) — authoritative definition, interval rule, and bibliography for the original algorithm.
