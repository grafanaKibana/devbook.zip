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

A dataset holds daily sales for a year, and a report asks for the total of dozens of arbitrary date ranges. Re-adding the elements of each range costs `O(n)` per question, so `q` questions cost `O(nq)`, and most of that work re-adds the same interior values over and over. A prefix sum precomputes every running total once: `prefix[i]` is the sum of the first `i` elements, with `prefix[0] = 0` standing for the empty prefix. The sum of an inclusive range `[l, r]` is then `prefix[r + 1] - prefix[l]` — a single subtraction, because the shared left portion `prefix[l]` cancels out and only the elements between the two totals survive.

The trade is one `O(n)` pass and `O(n)` extra memory for `O(1)` answers thereafter, and it holds only while the array never changes.

**Core shape:** static array → one running-sum pass → any range sum is a difference of two totals → `O(1)` query, `O(n)` space.

> [!NOTE] Visualization pending
> Planned StepTrace: a running-sum-array card that builds `prefix` in one left-to-right pass, then highlights `prefix[r + 1]` and `prefix[l]` and shows their difference isolating a range. No matching renderer exists in `engine.js` yet.

## Why the difference is the range sum

`prefix[k]` accumulates every element strictly before index `k`, so `prefix[r + 1]` covers `a[0..r]` and `prefix[l]` covers `a[0..l-1]`. Subtracting them removes the common head `a[0..l-1]` exactly, leaving `a[l] + ... + a[r]`. The `prefix[0] = 0` sentinel and the length-`(n + 1)` array are what let `l = 0` use the same formula as any other left bound: `prefix[0]` supplies the empty sum with no special case.

The idea extends along two independent axes:

- **2D (summed-area table).** `P[i][j]` holds the sum of the sub-rectangle from the origin to `(i-1, j-1)`. A rectangle sum comes from inclusion–exclusion over four corners: `P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]`. The two subtractions strip the region above and the region to the left of the target; those overlap in the top-left block, which is removed twice, so the final term adds it back once. Build is `O(nm)`, each query still `O(1)`.
- **Difference array (the dual).** Prefix sums turn point values into range queries; a difference array turns range updates into point values. Adding `v` to every element of `a[l..r]` is two writes — `diff[l] += v`, `diff[r + 1] -= v` — and one prefix-sum pass over `diff` at the end materialises the final array. That gives `O(1)` range *updates* with a one-time `O(n)` reconstruction, the mirror image of `O(1)` range *queries*.

## Complexity

| Operation | Time | Space | Cause |
| --- | --- | --- | --- |
| Build `prefix` | `O(n)` | `O(n)` | One pass writes `n + 1` running totals; the array is the stored state. |
| Range-sum query | `O(1)` | `O(1)` | A single subtraction of two precomputed totals; nothing is re-scanned. |
| Naive re-sum (no prefix) | `O(n)` per query | `O(1)` | Each query re-adds every element of the range from scratch. |

The build pays for itself the moment a second query arrives: two queries against `prefix` cost `O(n) + O(1)`, while two naive re-sums cost `O(n)` each and only grow from there. The 2D table shifts the same accounting to `O(nm)` build for `O(1)` rectangle sums.

## When the precompute stops holding

The array must be **static** for the whole query phase. Writing `a[j] = x` changes every running total at index `j + 1` and beyond, so a single element update invalidates the entire tail of `prefix` and forces an `O(n)` rebuild. Interleaving `q` updates with queries degrades the whole approach to `O(nq)` — the exact cost the precompute was meant to remove. A workload that mutates the array between reads wants a [[Fenwick Tree]] (point update plus prefix query, each `O(log n)`) or a [[Segment Tree]] (range update and range query) instead; both accept the log factor per query in exchange for cheap updates.

The `+1` convention is the classic off-by-one. Because the formula is `prefix[r + 1] - prefix[l]` for the inclusive range `[l, r]`, mixing inclusive and exclusive endpoints, or dropping the leading `prefix[0] = 0`, shifts the answer by exactly one element — a full-array or single-element query surfaces it immediately. The half-open shape (`prefix` covers elements *before* the index) is a fixed contract; querying it with a closed-interval mental model silently reads one slot too few or too many.

Accumulated totals also grow far faster than any individual element. A million `int` values near `2^31` overflow a 32-bit prefix long before any single value does, wrapping to a wrong — often negative — total while every input looked in range. Accumulating in a 64-bit type keeps the running sum valid; the same risk carries into the difference between two large prefixes.

## Reference drawer

> [!ABSTRACT]- Range sum as a difference of prefixes
> ```mermaid
> flowchart LR
>   A["prefix[l]<br/>sum of a[0..l-1]"] --> C["prefix[r+1] - prefix[l]"]
>   B["prefix[r+1]<br/>sum of a[0..r]"] --> C
>   C --> D["sum of a[l..r]"]
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> // Build once, then answer any range sum in O(1).
> public static long[] BuildPrefix(int[] a)
> {
>     var prefix = new long[a.Length + 1];           // prefix[0] = 0, length n + 1
>     for (int i = 0; i < a.Length; i++)
>         prefix[i + 1] = prefix[i] + a[i];          // long guards against overflow
>     return prefix;
> }
>
> // Sum of a[l..r] inclusive.
> public static long RangeSum(long[] prefix, int l, int r) => prefix[r + 1] - prefix[l];
>
> // Add v to every element of a[l..r] via a difference array, then reconstruct.
> public static int[] ApplyRangeUpdates(int n, IEnumerable<(int L, int R, int V)> updates)
> {
>     var diff = new int[n + 1];
>     foreach (var (l, r, v) in updates)
>     {
>         diff[l] += v;
>         diff[r + 1] -= v;                          // r + 1 may equal n; the extra slot absorbs it
>     }
>     var a = new int[n];
>     int run = 0;
>     for (int i = 0; i < n; i++) { run += diff[i]; a[i] = run; }
>     return a;
> }
> ```
> `RangeSum` assumes `0 <= l <= r < n`; the `+1` slot in both arrays is what removes the `l == 0` and `r == n - 1` boundary cases.

## Comparison

| Approach | Range query | Update | Preprocessing | Stronger case | Semantic limit |
| --- | --- | --- | --- | --- | --- |
| Naive re-sum | `O(n)` | `O(1)` (data is just the array) | None | A handful of queries, or the array changes constantly | Re-reads the whole range every time |
| Prefix sum | `O(1)` | `O(n)` rebuild | `O(n)` build, `O(n)` space | Many range sums over a static array | Any element write invalidates the table |
| [[Fenwick Tree]] | `O(log n)` prefix query | `O(log n)` point update | `O(n)` build | Point updates interleaved with prefix/range sums | Prefix-style associative queries only |
| [[Segment Tree]] | `O(log n)` | `O(log n)`, range update with lazy propagation | `O(n)` build, `~2–4n` space | Range updates and general associative range queries | Higher constant factor and memory |
| [[Sliding Window]] | `O(1)` amortized over a moving window | window slides in `O(1)` | None | One contiguous window advancing over the array | No random-access range; endpoints only move forward |

Prefix sums give the cheapest possible range query — a single subtraction — but only on data that stays fixed for the query phase, and every write forces a full rebuild. Once the array is updated between queries, a Fenwick tree is the smaller structure for point-update-plus-prefix-sum, and a segment tree covers range updates and arbitrary associative range queries at a larger constant. A sliding window is the lighter choice when the query is a single contiguous span that only advances, since it never materialises the running-total array at all.

## Questions

> [!QUESTION]- Why does `prefix[r + 1] - prefix[l]` yield the sum of `a[l..r]`?
> `prefix[r + 1]` is the sum of every element before index `r + 1`, i.e. `a[0..r]`, and `prefix[l]` is the sum of `a[0..l-1]`. Their difference cancels the shared head `a[0..l-1]` exactly, leaving `a[l] + ... + a[r]`. The `prefix[0] = 0` sentinel lets `l = 0` use the same formula with no special case.

> [!QUESTION]- What makes prefix sums unsuitable once the array is updated between queries?
> Writing one element changes every running total from that index onward, so the whole tail of `prefix` is invalid and must be rebuilt in `O(n)`. With `q` interleaved updates this degrades to `O(nq)`. A Fenwick tree (point update and prefix query in `O(log n)`) or a segment tree (range update and query) keeps updates cheap instead.

> [!QUESTION]- How does a difference array relate to a prefix sum?
> It is the dual. A prefix sum makes range *queries* `O(1)` by storing running totals; a difference array makes range *updates* `O(1)` by storing deltas at the two endpoints (`diff[l] += v`, `diff[r + 1] -= v`). A single prefix-sum pass over the difference array then reconstructs the final values in `O(n)`.

## References

- [Prefix sum (Wikipedia)](https://en.wikipedia.org/wiki/Prefix_sum) — definition, the parallel-scan formulation, and the difference-array duality.
- [Summed-area table (Wikipedia)](https://en.wikipedia.org/wiki/Summed-area_table) — the 2D extension and its inclusion–exclusion rectangle query, with the integral-image application.
- [Fenwick (Binary Indexed) Tree](https://cp-algorithms.com/data_structures/fenwick.html) — the `O(log n)` structure to switch to once the underlying array is mutated between queries.
- [Subarray Sum Equals K (LeetCode #560)](https://leetcode.com/problems/subarray-sum-equals-k/) — canonical use of running prefixes to answer a range-count question in one pass.
</content>
</invoke>
