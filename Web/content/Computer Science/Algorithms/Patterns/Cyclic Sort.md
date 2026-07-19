---
publish: true
created: 2026-07-18T14:02:43.965Z
modified: 2026-07-18T19:54:12.337Z
published: 2026-07-18T19:54:12.337Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Sorts a permutation of 1..n in O(n) time and O(1) space by swapping each value to its home index.
level:
  - "4"
priority: Medium
status: Creation
---

An array holds `n` integers that are a permutation of `1..n`. Sorting it with a comparison sort costs `O(n log n)`, but the permutation already tells us where every value belongs: value `v` has exactly one correct home, index `v − 1`, so each value can be routed to its slot without comparing it against its neighbours.

Cyclic Sort walks the array and, at each position, swaps whatever value sits there into its home index, repeating until the value that belongs at the current position arrives. Every swap drops at least one value into its permanent home, so the whole pass finishes in `O(n)` despite the nested-looking swap loop, and it rearranges in place. Problems that ask for a missing or duplicate value use a guarded variant: values still map to `1..n`, but collisions and empty homes are allowed, and a final mismatch scan exposes them.

**Core condition:** values form a permutation of a contiguous range → value `v` maps to index `v − 1` → each swap finalises one element → `O(n)` time, `O(1)` auxiliary space.

The cursor stays put after a swap because the displaced value still needs inspection; it advances only when the resident value is home.

```steptrace
{ "algorithm": "cyclic-sort", "array": [3, 1, 5, 4, 2] }
```

# Why each swap finalises an element

The placement rule at index `i` is a single decision. Let `v = a[i]` and `home = v − 1`:

- If `v` is in range and `a[home] != v`, the slot `home` does not yet hold `v`, so swapping `a[i]` with `a[home]` drops `v` into its home permanently. The value that swaps back into `i` is unplaced, so `i` does not advance — the same position is re-examined with its new value.
- Otherwise `v` is already home, out of range, or `home` already holds an equal value; nothing more can be done at `i`, so `i` advances.

The inner loop can re-process a single index several times, which makes the code look quadratic. It is not: a swap only ever fires when it moves a value into a home that did not previously hold it, and a value never leaves its home once placed. There are `n` values and each is finalised at most once, so at most `n − 1` swaps happen across the entire run. The outer walk contributes another `n` steps, so total work is `O(n)`. All movement happens inside the input array, so auxiliary space stays `O(1)`.

The comparison inside the guard is against the _value_ at `home`, not the index. `a[home] != v` stops the moment a duplicate would swap into a slot already holding its equal — that is both the termination guard and the mechanism that surfaces a duplicate.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n)` | `O(1)` | Input already placed: `n` guard checks, zero swaps. |
| Average | `O(n)` | `O(1)` | A mix of in-place and displaced values; each displaced value is finalised by one swap. |
| Worst | `O(n)` | `O(1)` | Maximally displaced permutation: up to `n − 1` swaps, but every swap still finalises one element. |

The bound is an amortised accounting argument rather than a per-iteration one: an individual position may be visited more than once, yet the number of swaps is capped by the number of elements because each swap retires a value for good. There is no recursion, so no stack space enters the table.

# Guarded anomaly variants

Duplicates and out-of-range values break the pure sorting contract, but not the guarded placement variant's linear bound. Each successful swap still fills an unsatisfied in-range home; values with no valid home, or whose home already contains an equal value, are skipped.

Out-of-range values have no home. On `[3, 4, -1, 1]` (a _First Missing Positive_ input), the value `-1` and any value `> n` cannot be placed; the guard must skip them (`v < 1 || v > n`) and advance. Dropping that check computes `home = -2` and indexes out of bounds.

Duplicates share a home. On `[1, 3, 3, 4]`, once `3` sits at index 2 the second `3` also wants index 2. Guarding on `i != home` instead of `a[home] != v` never sees the slot as satisfied, so the two equal values swap forever — an infinite loop. Comparing the values (`a[home] != v`) treats "the home already holds my value" as done, which both terminates and marks the duplicate.

Neither case is a general sort. Cyclic Sort cannot order arbitrary integers, floats, or keys with no index correspondence; strip the value-equals-index mapping and the swap target is undefined.

# Reference drawer

> [!ABSTRACT]- Placement decision at index `i`
>
> ```mermaid
> flowchart TD
>   A[Set i to zero] --> B{i less than n}
>   B -->|No| Z[Scan for first index whose value is not i plus one]
>   B -->|Yes| C[Compute home as value minus one]
>   C --> D{value in range and home does not already hold it}
>   D -->|Yes| E[Swap value into its home and keep i fixed]
>   D -->|No| F[Advance i]
>   E --> B
>   F --> B
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Place a permutation of 1..n in O(n) time, O(1) space.
> public static void CyclicSort(int[] a)
> {
>     var i = 0;
>     while (i < a.Length)
>     {
>         var home = a[i] - 1;                       // value v belongs at index v - 1
>         if (a[i] >= 1 && a[i] <= a.Length && a[i] != a[home])
>         {
>             (a[i], a[home]) = (a[home], a[i]);      // swap v home; do NOT advance i
>         }
>         else
>         {
>             i++;                                    // already placed or out of range
>         }
>     }
> }
>
> // Find All Numbers Disappeared in an Array (LeetCode 448).
> public static IList<int> FindDisappeared(int[] a)
> {
>     var i = 0;
>     while (i < a.Length)
>     {
>         var home = a[i] - 1;
>         if (a[i] != a[home])                        // duplicates make a[i] == a[home], so they are skipped
>         {
>             (a[i], a[home]) = (a[home], a[i]);
>         }
>         else
>         {
>             i++;
>         }
>     }
>
>     var missing = new List<int>();
>     for (var j = 0; j < a.Length; j++)
>     {
>         if (a[j] != j + 1)                          // slot j should hold j + 1
>         {
>             missing.Add(j + 1);
>         }
>     }
>
>     return missing;
> }
> ```
>
> The guard tests `a[i] != a[home]` on values, not `i != home` on indices — that is what stops a duplicate from swapping forever and what lets the final scan report the anomaly.

# Comparison

| Strategy | Time | Auxiliary space | Required input | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Cyclic Sort | `O(n)` | `O(1)` | Values mapped to a contiguous range; uniqueness for the pure sort | Place a permutation, or find a missing/duplicate in `1..n`, with no extra memory | Wide or non-contiguous ranges; read-only input |
| [[Computer Science/Algorithms/Sorting Algorithms/Counting Sort\|Counting Sort]] | `O(n + k)` | `O(n + k)` | Small integer range `k` | Any small integer range, including counts and stable order | Large `k` inflates the count buffer |
| General comparison sort | `O(n log n)` | `O(1)`–`O(n)` | Any comparable keys | Arbitrary keys with no index mapping | Loses the linear-time advantage a range grants |
| Hash set / boolean array | `O(n)` | `O(n)` | Any hashable values | Detecting missing/duplicate over an arbitrary domain | The extra `O(n)` buffer violates a no-extra-space constraint |

Cyclic Sort is the in-place, `O(1)`-space tool for problems whose values already index the array — the standard way to find a missing or duplicate number without allocating. [[Computer Science/Algorithms/Sorting Algorithms/Counting Sort|Counting Sort]] handles any small integer range and keeps counts, but pays `O(n + k)` memory; a comparison sort accepts any keys at `O(n log n)`; a hash set or boolean array answers missing/duplicate over a wider domain but spends the `O(n)` space that cyclic sort exists to avoid. For the narrower read-only contract of `n + 1` values drawn from `1..n`, [[Computer Science/Algorithms/Patterns/Fast and Slow Pointers|Fast and Slow Pointers]] can recover the duplicate by treating the array as a functional graph; it is not a general replacement for other read-only missing-value inputs.

# Questions

> [!QUESTION]- Why is Cyclic Sort `O(n)` despite an inner loop that can revisit an index?
> A swap fires only when it moves a value into a home that did not already hold it, and a placed value never moves again. With `n` values, at most `n − 1` swaps occur across the whole run; the outer walk adds `n` steps. Amortising over "each swap finalises one element" gives `O(n)`, not `O(n²)`.

> [!QUESTION]- What precondition does the method require, and why does it fail on arbitrary arrays?
> Pure Cyclic Sort requires a permutation of `1..n`: every value is in range and unique, so each has exactly one home. Guarded anomaly variants relax uniqueness, and sometimes range membership, by checking collisions or invalid homes before a final mismatch scan. Arbitrary integers have no defined index mapping, so the swap target is undefined.

> [!QUESTION]- What makes the guard `a[home] != v` rather than `i != home`?
> When a duplicate exists its home already holds an equal value. Comparing values recognises that slot as satisfied, which both terminates the loop and marks the duplicate. Comparing indices never sees the slot as done, so the two equal values swap forever.

# References

- [Find All Numbers Disappeared in an Array (LeetCode #448)](https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/) — the canonical cyclic-sort application; every slot should hold `index + 1`.
- [First Missing Positive (LeetCode #41)](https://leetcode.com/problems/first-missing-positive/) — cyclic sort with out-of-range values guarded and skipped.
- [Find the Duplicate Number (LeetCode #287)](https://leetcode.com/problems/find-the-duplicate-number/) — contrasts the mutating placement approach with the read-only pointer method.
