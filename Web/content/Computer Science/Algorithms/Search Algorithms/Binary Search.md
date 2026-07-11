---
publish: true
created: 2026-07-10T18:24:51.326Z
modified: 2026-07-10T18:24:51.326Z
published: 2026-07-10T18:24:51.326Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Done
---

# Intro

A sorted array contains one million user IDs. Locating one ID with a linear scan may inspect every entry; Binary Search needs at most 20 probes because each comparison removes half of the remaining range.

The reduction depends on two properties: the values are ordered, and the middle element is directly accessible by index. Without ordering, a comparison cannot prove which half is irrelevant. Without cheap random access, reaching the middle can cost as much as scanning the range.

**Core condition:** sorted, indexable input → one comparison removes half of the candidates → `O(log n)` lookup with `O(1)` auxiliary space.

## One search

The trace searches for `83` in a sorted 16-element array.

```steptrace
{"algorithm":"binary-search","array":[4,9,13,18,22,27,31,38,45,52,58,64,70,77,83,91],"target":83}
```

The first probe inspects `38` at index 7. Because `38 < 83` and the array is sorted, indices 0 through 7 are no longer candidates; the next range begins at index 8. Four probes find `83` in this 16-element array. A linear scan of the same input would inspect 15 elements before reaching it.

Binary Search does not make an individual comparison cheaper than [[Linear Search]]. Its advantage comes from eliminating exponentially more future work with each comparison.

## Why the range shrinks

At the start of every loop, the target—if it exists—must lie inside the inclusive range `[left, right]`. The middle comparison preserves that invariant:

- `a[mid] < target` proves every index at or left of `mid` is too small, so the next range is `[mid + 1, right]`.
- `a[mid] > target` proves every index at or right of `mid` is too large, so the next range is `[left, mid - 1]`.
- Equality ends the search.

The range strictly shrinks after every miss. After `k` probes, roughly `n / 2^k` candidates remain, so a non-empty input needs at most `⌊log₂ n⌋ + 1` probes. The iterative form stores only three indices—`left`, `right`, and `mid`—which keeps extra space at `O(1)`.

Compute the midpoint as `left + (right - left) / 2`. It is algebraically equivalent to `(left + right) / 2`, but it never forms the potentially overflowing sum.

## Complexity

| Case | Time | Auxiliary space | Shape of the search |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | The first midpoint equals the target. |
| Average | `O(log n)` | `O(1)` | Several halvings isolate the target. |
| Worst | `O(log n)` | `O(1)` | The target is absent or survives until the final one-element range. |

The table describes the iterative implementation below. A recursive implementation keeps the same time bounds but uses `O(log n)` call-stack space in the average and worst cases.

## When the assumptions stop holding

On `[2, 100, 3, 4, 5]`, a search for `100` begins at `3`, moves right, and permanently discards the half containing the target. Nothing crashes; unsorted input produces a plausible false negative. Sorting first costs `O(n log n)`, which only pays back when later searches reuse that ordering.

Duplicates create a different ambiguity. Searching `[2, 5, 5, 5, 9]` may return any of the three matching indices. A first-match variant stores `mid` as a candidate and continues left with `right = mid - 1`; a last-match variant continues right. Both retain the `O(log n)` time bound.

Boundary conventions remain paired. This version uses an inclusive range, so its loop is `left <= right` and its updates exclude the inspected element with `mid + 1` or `mid - 1`. Combining those updates with a half-open range can skip elements or prevent the range from shrinking.

## Reference drawer

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

## Comparison

| Strategy | Lookup time | Additional cost | Stronger case | Weaker case |
| --- | --- | --- | --- | --- |
| [[Linear Search]] | `O(n)` | None | One lookup over unsorted or very small data | Repeated searches as the collection grows |
| Binary Search | `O(log n)` | Sorted input; `O(1)` search space | Existing sorted order, range queries, insertion points | Frequent inserts or data without cheap indexing |
| Hash lookup | `O(1)` average, `O(n)` worst | `O(n)` memory and an `O(n)` build | Repeated exact-match lookups where order is irrelevant | Ordered traversal, range queries, or memory-sensitive data |
| [[Interpolation Search]] | `O(log log n)` average, `O(n)` worst | Sorted, near-uniform numeric distribution | Large uniformly distributed numeric arrays | Skewed distributions or non-numeric keys |

Binary Search sits between a scan and an index: it keeps the collection in its original sorted representation while reducing lookup to logarithmic time. A hash table is faster on average for exact matches but gives up ordering and allocates a separate index. Interpolation Search can outperform Binary Search on unusually uniform numeric data, but its distribution assumption makes its worst case linear.

In .NET, `Array.BinarySearch` and `List<T>.BinarySearch` expose the standard arbitrary-match operation. Lower-bound and upper-bound variants cover first match, last match, and insertion-point queries.

## Questions

> [!QUESTION]- Why does Binary Search require sorted data?
> The comparison at `mid` must prove that an entire half cannot contain the target. Ordering supplies that proof: if `a[mid] < target`, every earlier value is also too small. Without ordering, moving either boundary is a guess and can discard the answer.

> [!QUESTION]- How do you find the first occurrence of a duplicated value?
> A first-occurrence variant stores `mid` as the current answer and continues through the left half with `right = mid - 1`. The stored candidate becomes the result when the range is empty. This removes the plain search's early exit in exchange for a defined duplicate policy.

> [!QUESTION]- When is a hash lookup a better fit?
> Hash-based lookup fits repeated exact-match searches where ordering is irrelevant and the additional memory is acceptable. Binary Search retains an advantage when sorted order already exists or supports adjacent operations such as lower bounds, insertion points, and range queries.

## References

- [`Array.BinarySearch` method](https://learn.microsoft.com/en-us/dotnet/api/system.array.binarysearch) — .NET's built-in array search contract, including its insertion-point encoding for missing values.
- [`ArraySortHelper<T>` in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/ArraySortHelper.cs) — runtime source for the generic array-search implementation and its internal comparison loop.
- [Binary search](https://cp-algorithms.com/num_methods/binary_search.html) — lower-bound, upper-bound, and predicate-based variants derived from the same range invariant.
- [Nearly all binary searches and mergesorts are broken](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/) — Joshua Bloch's account of the midpoint-overflow defect and the safer calculation.
