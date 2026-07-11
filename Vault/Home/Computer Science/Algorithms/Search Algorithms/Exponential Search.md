---
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A sorted sequence arrives without a known length — a forward-read file, a paginated API that is indexable but not measurable, a lazily materialized list — and a lookup still has to land on one value. [[Binary Search]] cannot begin: its first midpoint needs a right endpoint, and there is none to compute. Exponential search manufactures that endpoint by probing outward. It reads index `1`, then `2, 4, 8, 16, …`, doubling the probe until `a[bound] >= target` or the probe runs off the end. Every earlier probe was still below the target, so at the stopping point the target — if present — must sit between the previous probe and this one. The gallop has produced a bounded window `[bound/2, min(bound, n − 1)]`, and Binary Search finishes inside it.

Doubling reaches or passes the target's position `i` after about `log i` steps, and the window it brackets holds fewer than `i` elements, so the closing binary search is another `O(log i)`. The total cost tracks `i`, the *position of the answer*, not the array length. When the target sits near the front, `i ≪ n`, and `O(log i)` is strictly below Binary Search's `O(log n)`; when the length is simply unknown, the gallop is what makes any bisection possible at all.

**Core condition:** sorted, indexable input of unknown or unbounded length → double a probe to bracket the target, then bisect the bracket → `O(log i)` lookup in the answer's position `i` with `O(1)` auxiliary space.

The doubling gallop and the binary search that closes it have no registered renderer.

> [!NOTE] Visualization pending
> Planned StepTrace: a search card doubling a probe index `1, 2, 4, 8, …` until `a[bound] >= target` or the array end, then a binary search within the bracket `[bound/2, bound]`. No matching renderer exists in `engine.js` yet.

## Why doubling brackets the target

The gallop maintains one fact through every iteration: as long as the loop continues, `a[bound] < target`, so the target's position lies strictly to the right of `bound`. Doubling therefore never steps over the answer — it only advances a boundary that is provably still too small. The loop stops for exactly one of two reasons:

- `a[bound] >= target`: the current probe reached or passed the target. The previous probe, `bound/2`, was the last index the loop confirmed as `a[bound/2] < target`, so the target lies in `[bound/2, bound]`.
- `bound >= n`: the probe galloped past the end before catching the target. The last confirmed `a[bound/2] < target` still holds, so the target, if present, lies in `[bound/2, n − 1]`.

Either way the window is `[bound/2, min(bound, n − 1)]`, and its lower end satisfies `a[bound/2] < target`. Because that probe is strictly below the target, `bound/2 < i`, so the window spans fewer than `i` elements. Binary Search over it is `O(log i)`, and the doubling that built it took `O(log i)` steps — the whole search is `O(log i)`.

The gallop never references `n`. It generates the indices it probes (`1, 2, 4, …`) and asks only "is `a[bound]` still below the target?" That is why it runs on an unbounded source: drop the `bound < n` guard and let `a[bound] >= target` — or an end-of-stream signal from the probe — stop the doubling. Index `0` is handled before the loop, since `bound` starts at `1`: if `a[0] == target`, the answer is `0`.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | The target is at the front (`a[0]`), found before the gallop starts. |
| Average | `O(log i)` | `O(1)` | Doubling reaches position `i` in `~log i` steps; bisecting a window of fewer than `i` elements adds another `O(log i)`. |
| Worst | `O(log i)` → `O(log n)` | `O(1)` | The target sits near the end (`i ≈ n`), so both phases run their full `log n` length. |

The bound is expressed in `i`, the target's position, which is what makes it beat Binary Search when `i ≪ n`; it degrades to `O(log n)` only when the target is near the end, never worse. Auxiliary space is `O(1)` for the iterative binary search below. A recursive binary search over the bracket would add `O(log i)` call-stack space without changing the time bound.

## When the assumptions stop holding

The headline use case is unknown-length input, but a loop guarded on `bound < n` silently reintroduces the requirement it was meant to avoid. On a genuine stream that guard cannot be evaluated; removing it without an alternative stop condition lets the doubling index past the last element and read out of bounds. A streaming implementation must instead treat "probe returned past the end" as a terminating signal alongside `a[bound] >= target`, and clamp the eventual high bound to the last valid index.

On a bounded array the doubling overshoots by design: `bound` is the first power of two at or beyond the target, so it can land past `n − 1`. The high end of the bracket must be clamped with `min(bound, n − 1)` before bisecting; without the clamp the binary search reads `a[bound]` outside the array. The doubling itself is a second overflow site — `bound *= 2` on a very large array can wrap a 32-bit index negative, producing a negative probe or a loop that never terminates. Capping `bound` at `n` (or widening the index type) closes both.

The bracket is only as trustworthy as the ordering. The gallop's `a[bound] < target` test assumes sorted input; on `[2, 100, 3, 4, 5]` a search for `100` stops doubling at the first probe where the value happens to meet the target and brackets a window that need not contain the real match — the same plausible false negative Binary Search produces on unsorted data, now inherited by both phases. Exponential search buys range discovery, not freedom from the sorting precondition.

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
> `Math.Min(bound, n - 1)` clamps the overshoot from the last doubling; an unbounded variant drops the `bound < n` guard and stops on an end-of-stream probe instead.

## Comparison

| Strategy | Lookup time | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| [[Binary Search]] | `O(log n)` | Sorted, indexable, known length `n` | Bounded array with targets spread uniformly | Length unknown or unbounded; target skewed to the front |
| Exponential Search | `O(log i)` | Sorted, indexable; length may be unknown | Unbounded or unknown-length input; targets near the front | Known `n` with no front bias — the extra gallop earns nothing |
| [[Jump Search]] | `O(√n)` | Sorted; cheap forward stepping | Sequential media where backward seeks are expensive | Random access is `O(1)`, where `log i` beats `√n` |
| [[Interpolation Search]] | `O(log log n)` average, `O(n)` worst | Sorted, near-uniform numeric keys | Large uniformly distributed numeric arrays | Skewed distributions or non-numeric keys |

Exponential search fits sorted data whose size is unknown or unbounded, and sorted arrays whose targets cluster near the front: it pays one extra doubling phase to discover the right endpoint that Binary Search assumes it already has, and is rewarded with an `O(log i)` bound in the answer's position. Once the length is known and targets carry no front bias, that phase buys nothing — plain Binary Search reaches the same asymptotics with less code. The doubling gallop is also the core of Timsort's merge step, where "galloping mode" skips a long run of one side in `O(log k)` comparisons instead of one at a time.

## Questions

> [!QUESTION]- Why is exponential search `O(log i)` rather than `O(log n)`?
> Doubling stops as soon as `bound` reaches or passes the target's position `i`, after about `log i` steps, and the bracket it leaves spans fewer than `i` elements, so the closing binary search is another `O(log i)`. Neither phase inspects the whole array, so the cost tracks the answer's position, not the array length — strictly better than `O(log n)` when the target is near the front and no worse when it is near the end.

> [!QUESTION]- What makes exponential search applicable to unknown-length input when binary search is not?
> Binary Search needs `n` to compute a midpoint and cannot start without it. Exponential search generates the indices it probes (`1, 2, 4, …`) and only ever asks whether `a[bound]` is still below the target, so the doubling stops the moment a probe reaches or exceeds the target — bounding a finite window without ever referencing the total size.

> [!QUESTION]- Why must the high end of the bracket be clamped, and what breaks without it?
> The final doubling makes `bound` the first power of two at or beyond the target, so it can land past the last valid index. Bisecting `[bound/2, bound]` without clamping the upper end to `min(bound, n − 1)` reads outside the array; on an unbounded source the same overshoot indexes past end-of-stream. `bound *= 2` can also overflow a 32-bit index into a negative probe.

## References

- [An almost optimal algorithm for unbounded searching](https://doi.org/10.1016/0020-0190%2876%2990071-5) — Bentley and Yao's original doubling-search analysis for searching an ordered sequence of unknown length.
- [Exponential search (Wikipedia)](https://en.wikipedia.org/wiki/Exponential_search) — the doubling-then-binary-search scheme and its unbounded-array motivation.
- [Timsort listsort.txt (CPython source)](https://github.com/python/cpython/blob/main/Objects/listsort.txt) — Tim Peters' description of galloping mode, exponential search running inside a production sort.
