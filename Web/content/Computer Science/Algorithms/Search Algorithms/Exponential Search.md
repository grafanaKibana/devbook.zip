---
publish: true
created: 2026-08-20T20:41:15.533Z
modified: 2026-08-20T20:41:15.533Z
published: 2026-08-20T20:41:15.533Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Finds a range containing the target by doubling probe indices, then binary-searches that range.
level:
  - "4"
priority: Medium
status: Creation
---

A sorted, indexable sequence may not expose its length. [[Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] cannot choose a first midpoint without a right endpoint, so Exponential Search discovers one. It probes indices `1, 2, 4, 8, 16, …` until a value reaches the target or the probe passes the end. Binary Search then works inside `[bound/2, min(bound, n − 1)]`.

The window is sound because its lower edge comes from the last probe below the target. Its upper edge is the first probe at or beyond the target, or the end of the sequence.

````tabsdown
tab: Visualization



```steptrace
{ "algorithm": "exponential-search", "array": [2, 4, 7, 11, 18, 29, 41, 56, 72], "target": 41 }
```



The trace searches for `41` in `[2, 4, 7, 11, 18, 29, 41, 56, 72]`. During the gallop, hatched bars are already too small, muted bars are not reached yet, and the blue probe jumps through indices `0, 1, 2, 4, 8`. Once index `8` passes the target, the live bracket becomes `[4, 8]` and the same card switches to binary search. Its midpoint is index `6`, where the target is found.



The gallop maintains one fact through every iteration: as long as the loop continues, `a[bound] < target`, so the target's position lies strictly to the right of `bound`. Doubling may jump past the answer, but it doubles only after proving the current bound is too small; the skipped interval is retained between the previous and new bounds. The loop stops for exactly one of two reasons:

- `a[bound] >= target`: the current probe reached or passed the target. The previous probe, `bound/2`, was the last index the loop confirmed as `a[bound/2] < target`, so the target lies in `[bound/2, bound]`.
- `bound >= n`: the probe galloped past the end before catching the target. The last confirmed `a[bound/2] < target` still holds, so the target, if present, lies in `[bound/2, n − 1]`.

Either way the window is `[bound/2, min(bound, n − 1)]`. Index `0` is checked before the gallop because `bound` starts at `1`.

The unbounded, indexable variant never references `n`. It generates the indices it probes (`1, 2, 4, …`) and asks only "is `a[bound]` still below the target?" An unknown-length finite source must also report that a probe is past the end so the high bound can be clamped to the last valid index. Index `0` is handled before the loop, since `bound` starts at `1`: if `a[0] == target`, the answer is `0`.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Exponential Search complexity",
  "variables": {
    "expansionIndex": {
      "symbol": "i",
      "description": "zero-based position of the target element"
    },
    "inputSize": {
      "symbol": "n",
      "description": "number of elements in the bounded sorted input"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Successful at position i",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log(i + 1))",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Absent from a bounded input",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(log n)",
              "curveId": "log-n"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Best",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Successful at position i",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Absent from a bounded input",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```

The position-sensitive bound applies only when the target exists. A miss in a bounded input is measured against the full input because there is no target position to substitute.
````

# When the Assumptions Stop Holding

Unknown length does not mean forward-only access. The closing binary search revisits earlier positions, so the source must support indexed reads. A stream can meet that contract only by buffering the prefix through the discovered upper bound. An unknown-length source must also turn an out-of-range probe into a clean stopping signal and expose the last valid index for clamping.

Doubling overshoots by design. On a bounded array, `bound` can land past `n − 1`, so the binary-search bracket must end at `min(bound, n − 1)`. The doubling operation can overflow too: `bound *= 2` may wrap a 32-bit index into a negative probe. Capping `bound` at `n`, or using a wider index type, handles both failures.

The bracket is only as trustworthy as the ordering. On `[2, 100, 3, 4, 5]`, a search for `5` stops at index `1` because `100 >= 5`, brackets `[0, 1]`, and misses index `4`. Exponential Search discovers a range. It does not remove the sorting precondition.

# Diagram and C# Implementation

> [!ABSTRACT]- Two-phase control flow
>
> ```mermaid
> flowchart TD
>   A[Sorted input and target] --> B{value at index 0 equals target}
>   B -->|Yes| Y[Return 0]
>   B -->|No| C[Set bound to 1]
>   C --> D{bound in range and value at bound is below target}
>   D -->|Yes| E[Double the bound]
>   E --> D
>   D -->|No| F[Binary search the bracket from bound over 2 to min of bound and last index]
>   F --> Z[Return found index or minus one]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int ExponentialSearch(int[] arr, int target)
> {
>     var n = arr.Length;
>     if (n == 0) return -1;
>     if (arr[0] == target) return 0;
>
>     // Gallop: double the bound until it reaches or passes the target.
>     var bound = 1;
>     while (bound < n && arr[bound] < target)
>     {
>         bound = bound > n / 2 ? n : bound * 2;
>     }
>
>     // Target, if present, is in [bound/2, min(bound, n - 1)].
>     var left = bound / 2;
>     var right = Math.Min(bound, n - 1);
>     return BinarySearch(arr, target, left, right);
> }
>
> private static int BinarySearch(int[] arr, int target, int left, int right)
> {
>     while (left <= right)
>     {
>         var mid = left + (right - left) / 2;
>         if (arr[mid] == target) return mid;
>         if (arr[mid] < target) left = mid + 1;
>         else right = mid - 1;
>     }
>     return -1;
> }
> ```
>
> `Math.Min(bound, n - 1)` clamps the overshoot from the last doubling. An unknown-length indexable variant replaces the `bound < n` guard with an out-of-range probe signal.

# References

- [An almost optimal algorithm for unbounded searching](https://doi.org/10.1016/0020-0190%2876%2990071-5)
