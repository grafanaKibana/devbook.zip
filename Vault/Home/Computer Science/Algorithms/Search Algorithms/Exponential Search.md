---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finds a range containing the target by doubling probe indices, then binary-searches it, in O(log(i + 1)) by target position."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A sorted sequence arrives without a known length — a seekable file, an indexable paginated API, a lazily materialized random-access list — and a lookup still has to land on one value. [[Home/Computer Science/Algorithms/Search Algorithms/Binary Search|Binary Search]] cannot begin: its first midpoint needs a right endpoint, and there is none to compute. Exponential search manufactures that endpoint by probing outward. It reads index `1`, then `2, 4, 8, 16, …`, doubling the probe until `a[bound] >= target` or the probe runs off the end. Every earlier probe was still below the target, so at the stopping point the target — if present — must sit between the previous probe and this one. The gallop has produced a bounded window `[bound/2, min(bound, n − 1)]`, and Binary Search finishes inside it.

Doubling reaches or passes a present target at position `i` after `O(log(i + 1))` steps. For `i >= 1`, the inclusive window holds at most `i + 1` elements; once `i >= 2`, the tighter bound is at most `i`. The closing binary search is therefore another `O(log(i + 1))`, including the constant-time positions `0` and `1` without taking `log 0`. The total cost tracks the *position of the answer*, not the array length. When `i + 1 ≪ n`, this is below Binary Search's `O(log n)`; when the length is simply unknown, the gallop is what makes any bisection possible at all. An absent target has no position `i`, so on a bounded input its cost is stated separately as `O(log n)`.

**Core condition:** sorted, indexable input of unknown or unbounded length → double a probe to bracket the target, then bisect the bracket → `O(log(i + 1))` for a target at position `i`, or `O(log n)` when a bounded input contains no target, with `O(1)` auxiliary space.

## Trace

The trace searches for `41` in `[2, 4, 7, 11, 18, 29, 41, 56, 72]`. During the gallop, hatched bars are already too small, muted bars are not reached yet, and the blue probe jumps through indices `0, 1, 2, 4, 8`. Once index `8` passes the target, the live bracket becomes `[4, 8]` and the same card switches to binary search. Binary search probes midpoint `6`; `a[6]` is `41`, so the search finishes at index `6` after six total probes.

```steptrace
{ "algorithm": "exponential-search", "array": [2, 4, 7, 11, 18, 29, 41, 56, 72], "target": 41 }
```

## Why doubling brackets the target

The gallop maintains one fact through every iteration: as long as the loop continues, `a[bound] < target`, so the target's position lies strictly to the right of `bound`. Doubling may jump past the answer, but it doubles only after proving the current bound is too small; the skipped interval is retained between the previous and new bounds. The loop stops for exactly one of two reasons:

- `a[bound] >= target`: the current probe reached or passed the target. The previous probe, `bound/2`, was the last index the loop confirmed as `a[bound/2] < target`, so the target lies in `[bound/2, bound]`.
- `bound >= n`: the probe galloped past the end before catching the target. The last confirmed `a[bound/2] < target` still holds, so the target, if present, lies in `[bound/2, n − 1]`.

Either way the window is `[bound/2, min(bound, n − 1)]`. For a successful search at `i >= 1`, the window spans at most `i + 1` elements; after at least one doubling (`i >= 2`), `bound/2` is a confirmed probe below the target, so `bound/2 < i` and the tighter window bound is at most `i` elements. Binary Search over either bound is `O(log(i + 1))`, and the doubling that built it also took `O(log(i + 1))` steps. Index `0` is checked before the gallop, so the same expression covers every successful position without the undefined `log 0` case.

The unbounded, indexable variant never references `n`. It generates the indices it probes (`1, 2, 4, …`) and asks only "is `a[bound]` still below the target?" An unknown-length finite source must also report that a probe is past the end so the high bound can be clamped to the last valid index. Index `0` is handled before the loop, since `bound` starts at `1`: if `a[0] == target`, the answer is `0`.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | The target is at index `0` or `1`, found before any doubling. |
| Successful at position `i` | `O(log(i + 1))` | `O(1)` | Doubling brackets `i`; binary search then examines a window of at most `i + 1` elements. |
| Absent from a bounded input | `O(log n)` | `O(1)` | Doubling reaches the end, then binary search rejects the final bracket. |

The position-sensitive bound applies only when the target exists. It beats Binary Search when `i + 1 ≪ n` and becomes `O(log n)` when the target is near the end. An absent target has no position to substitute for `i`, so its bounded-input cost is `O(log n)`. Auxiliary space is `O(1)` for the iterative binary search below. A recursive binary search would add `O(log(i + 1))` call-stack space for a successful search, or `O(log n)` when the target is absent.

## When the assumptions stop holding

The headline use case is unknown-length input, but the source must still support indexed reads because the closing binary search revisits earlier positions. A forward-only stream does not satisfy that contract unless it buffers the prefix through the discovered upper bound and binary-searches the buffer. For an indexable source whose length is unknown, an out-of-range probe must act as a terminating signal alongside `a[bound] >= target`, and the eventual high bound must be clamped to the last valid index.

On a bounded array the doubling overshoots by design: `bound` is the first power of two at or beyond the target, so it can land past `n − 1`. The high end of the bracket must be clamped with `min(bound, n − 1)` before bisecting; without the clamp the binary search reads `a[bound]` outside the array. The doubling itself is a second overflow site — `bound *= 2` on a very large array can wrap a 32-bit index negative, producing a negative probe or a loop that never terminates. Capping `bound` at `n` (or widening the index type) closes both.

The bracket is only as trustworthy as the ordering. The gallop's `a[bound] < target` test assumes sorted input; on `[2, 100, 3, 4, 5]` a search for `5` stops at index `1` because `100 >= 5`, incorrectly brackets `[0, 1]`, and misses the target at index `4`. Exponential search buys range discovery, not freedom from the sorting precondition.

## Reference drawer

> [!ABSTRACT]- Two-phase control flow
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
>         bound *= 2;
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

## Questions

> [!QUESTION]- Why is a successful exponential search `O(log(i + 1))` rather than `O(log n)`?
> Doubling stops as soon as `bound` reaches or passes the target's position `i`, after `O(log(i + 1))` steps, and the bracket contains at most `i + 1` elements, so the closing binary search has the same bound. The `+1` covers positions `0` and `1`; an absent target has no position `i` and costs `O(log n)` on a bounded input.

> [!QUESTION]- Why must the high end of the bracket be clamped, and what breaks without it?
> The final doubling makes `bound` the first power of two at or beyond the target, so it can land past the last valid index. Bisecting `[bound/2, bound]` without clamping the upper end to `min(bound, n − 1)` reads outside the array; on an unknown-length finite source, the probe must report the terminal boundary or safely treat an out-of-range position as greater than the target. `bound *= 2` can also overflow a 32-bit index into a negative probe.

## References

- [An almost optimal algorithm for unbounded searching](https://doi.org/10.1016/0020-0190%2876%2990071-5) — Bentley and Yao's original doubling-search analysis for searching an ordered sequence of unknown length.
- [Exponential search (Wikipedia)](https://en.wikipedia.org/wiki/Exponential_search) — the doubling-then-binary-search scheme and its unbounded-array motivation.
- [Timsort listsort.txt (CPython source)](https://github.com/python/cpython/blob/main/Objects/listsort.txt) — Tim Peters' description of galloping mode, exponential search running inside a production sort.
