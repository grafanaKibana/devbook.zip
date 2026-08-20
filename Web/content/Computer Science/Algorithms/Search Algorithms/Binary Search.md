---
publish: true
created: 2026-08-20T20:41:15.533Z
modified: 2026-08-20T20:41:15.533Z
published: 2026-08-20T20:41:15.533Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Finds a target in a sorted array by repeatedly halving the search range.
level:
  - "4"
priority: Medium
status: Done
---

A sorted array may contain a million user IDs, yet Binary Search needs only about twenty comparisons to find one. Each comparison uses the ordering to discard half of the remaining range.

That reduction has two requirements. The values must be ordered, and the middle element must be cheap to reach by index. Without ordering, a comparison says nothing about the untouched half. Without random access, reaching each midpoint may cost as much as scanning the range.

````tabsdown
tab: Visualization



```steptrace
{"algorithm":"binary-search","array":[4,9,13,18,22,27,31,38,45,52,58,64,70,77,83,91],"target":83}
```



The trace searches for `83` in a sorted 16-element array.

The first probe inspects `38` at index 7. Because `38 < 83` and the array is sorted, indices 0 through 7 are no longer candidates; the next range begins at index 8. Repeating that elimination reaches `83`.

Binary Search does not change the comparison itself; ordering makes each result eliminate an entire half-range that [[Computer Science/Algorithms/Search Algorithms/Linear Search|Linear Search]] cannot discard.



At the start of every loop, the target—if it exists—must lie inside the inclusive range `[left, right]`. The middle comparison preserves that invariant:

- `a[mid] < target` proves every index at or left of `mid` is too small, so the next range is `[mid + 1, right]`.
- `a[mid] > target` proves every index at or right of `mid` is too large, so the next range is `[left, mid - 1]`.
- Equality ends the search.

The range strictly shrinks after every miss. The iterative form carries the two boundaries and their midpoint.

Compute the midpoint as `left + (right - left) / 2`. It is algebraically equivalent to `(left + right) / 2`, but it never forms the potentially overflowing sum.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Binary Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the sorted random-access array"
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
````

# When the Assumptions Stop Holding

On `[2, 100, 3, 4, 5]`, a search for `100` begins at `3`, moves right, and discards the half containing the target. The algorithm still terminates normally. Its answer is simply wrong.

Duplicates create a different ambiguity. Searching `[2, 5, 5, 5, 9]` may return any of the three matching indices. A first-match variant stores `mid` as a candidate and continues left with `right = mid - 1`. A last-match variant continues right.

Boundary conventions have to stay paired. This version uses an inclusive range, so the loop condition is `left <= right`, and each update excludes `mid` with `mid + 1` or `mid - 1`. Mixing those updates with a half-open range can skip an element or leave the interval unchanged.

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Start with sorted input] --> B[Set left and right]
>   B --> C{left is at most right}
>   C -->|No| Z[Target is absent]
>   C -->|Yes| D[Compute midpoint]
>   D --> E{Compare middle value with target}
>   E -->|Equal| F[Return midpoint]
>   E -->|Too small| G[Move left past midpoint]
>   E -->|Too large| H[Move right before midpoint]
>   G --> C
>   H --> C
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int BinarySearch(int[] values, int target)
> {
>     var left = 0;
>     var right = values.Length - 1;
>
>     while (left <= right)
>     {
>         var mid = left + (right - left) / 2;
>         var value = values[mid];
>
>         if (value == target)
>         {
>             return mid;
>         }
>
>         if (value < target)
>         {
>             left = mid + 1;
>         }
>         else
>         {
>             right = mid - 1;
>         }
>     }
>
>     return -1;
> }
> ```
>
> This implementation uses an inclusive search range and returns `-1` when the target is absent. .NET's `Array.BinarySearch` instead returns the bitwise complement of the insertion index.

# References

- [`Array.BinarySearch` method](https://learn.microsoft.com/en-us/dotnet/api/system.array.binarysearch)
- [Binary search](https://cp-algorithms.com/num_methods/binary_search.html)
