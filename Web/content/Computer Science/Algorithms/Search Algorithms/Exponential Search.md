---
publish: true
created: 2026-07-21T18:52:02.836Z
modified: 2026-08-08T07:48:02.814Z
published: 2026-08-08T07:48:02.814Z
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

A sorted sequence arrives without a known length — a seekable file, an indexable paginated API, a lazily materialized random-access list — and a lookup still has to land on one value. [[Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] cannot begin: its first midpoint needs a right endpoint, and there is none to compute. Exponential search manufactures that endpoint by probing outward. It reads index `1`, then `2, 4, 8, 16, …`, doubling the probe until `a[bound] >= target` or the probe runs off the end. Every earlier probe was still below the target, so at the stopping point the target — if present — must sit between the previous probe and this one. The gallop has produced a bounded window `[bound/2, min(bound, n − 1)]`, and Binary Search finishes inside it.

The discovered window is anchored by the last probe below the target and the first probe at or beyond it.

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

The headline use case is unknown-length input, but the source must still support indexed reads because the closing binary search revisits earlier positions. A forward-only stream does not satisfy that contract unless it buffers the prefix through the discovered upper bound and binary-searches the buffer. For an indexable source whose length is unknown, an out-of-range probe must act as a terminating signal alongside `a[bound] >= target`, and the eventual high bound must be clamped to the last valid index.

On a bounded array the doubling overshoots by design: `bound` is the first power of two at or beyond the target, so it can land past `n − 1`. The high end of the bracket must be clamped with `min(bound, n − 1)` before bisecting; without the clamp the binary search reads `a[bound]` outside the array. The doubling itself is a second overflow site — `bound *= 2` on a very large array can wrap a 32-bit index negative, producing a negative probe or a loop that never terminates. Capping `bound` at `n` (or widening the index type) closes both.

The bracket is only as trustworthy as the ordering. The gallop's `a[bound] < target` test assumes sorted input; on `[2, 100, 3, 4, 5]` a search for `5` stops at index `1` because `100 >= 5`, incorrectly brackets `[0, 1]`, and misses the target at index `4`. Exponential search buys range discovery, not freedom from the sorting precondition.

# Reference Drawer

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
> `Math.Min(bound, n - 1)` clamps the overshoot from the last doubling; an unknown-length indexable variant replaces the `bound < n` guard with an out-of-range probe signal.

# Questions

> [!QUESTION]- Why must the high end of the bracket be clamped, and what breaks without it?
> The final doubling makes `bound` the first power of two at or beyond the target, so it can land past the last valid index. Bisecting `[bound/2, bound]` without clamping the upper end to `min(bound, n − 1)` reads outside the array; on an unknown-length finite source, the probe must report the terminal boundary or safely treat an out-of-range position as greater than the target. `bound *= 2` can also overflow a 32-bit index into a negative probe.

# References

- [An almost optimal algorithm for unbounded searching](https://doi.org/10.1016/0020-0190%2876%2990071-5) — Bentley and Yao's original doubling-search analysis for searching an ordered sequence of unknown length.
- [Exponential search (Wikipedia)](https://en.wikipedia.org/wiki/Exponential_search) — the doubling-then-binary-search scheme and its unbounded-array motivation.
- [Timsort listsort.txt (CPython source)](https://github.com/python/cpython/blob/main/Objects/listsort.txt) — Tim Peters' description of galloping mode, exponential search running inside a production sort.
