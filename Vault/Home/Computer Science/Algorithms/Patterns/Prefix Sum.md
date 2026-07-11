---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Precomputes cumulative sums so any range sum becomes one O(1) subtraction after an O(n) build."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A prefix sum (cumulative sum) precomputes `pre[i] = a[0] + a[1] + ... + a[i-1]` so that the sum of any range `a[l..r]` becomes `pre[r+1] - pre[l]` — a single subtraction in `O(1)` after an `O(n)` build. The trailing `+1` convention (`pre[0] = 0`, `pre` has length `n+1`) is what makes the boundary arithmetic clean: no special case for `l == 0`. The insight is that a range sum is a *difference of two running totals*, so once you have the totals you never touch the underlying array again.

**Reach for it when you see** many range-sum (or range-count, range-XOR) queries over **static** data — the array doesn't change between queries. If the data is updated between queries, prefix sums go stale after every write; use a Fenwick (binary indexed) tree or a segment tree instead, which trade `O(1)` queries for `O(log n)` queries in exchange for `O(log n)` updates. For a *single* pass looking for a contiguous range meeting a constraint, a [[Sliding Window]] is lighter — but prefix sums generalise to negatives and to counting where a window cannot.

## How It Works

- **Build** — one left-to-right pass: `pre[i+1] = pre[i] + a[i]`. `pre[0] = 0` represents the empty prefix.
- **Query** — `sum(l, r) = pre[r+1] - pre[l]` for the inclusive range `[l, r]`.
- **2D extension (summed-area table / integral image)** — precompute `P[i][j] = ` sum of the sub-rectangle from `(0,0)` to `(i-1,j-1)`. Any axis-aligned rectangle sum comes from **inclusion–exclusion** over four corners: `sum = P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]`. The two subtracted terms remove the strips above and to the left; the final `+` term adds back the top-left corner that both subtractions removed. This is the trick behind Viola–Jones face detection, which needs constant-time box sums over an image.
- **Difference array (the dual)** — prefix sum turns point values into range sums; a difference array does the reverse. To add `v` to every element of `a[l..r]`, do `diff[l] += v` and `diff[r+1] -= v` — two `O(1)` writes. After all updates, a single prefix-sum pass over `diff` materialises the final array. This gives `O(1)` **range updates** with a one-time `O(n)` reconstruction, the mirror image of prefix sums giving `O(1)` range *queries*.
- **Prefix sum + hash map** — to count sub-arrays summing to `k`, keep a running prefix `run` and a hash map of how many times each prefix value has occurred. Since `sum(i, j) = run_j - run_{i-1}`, a range ending at `j` sums to `k` exactly when some earlier prefix equalled `run_j - k`. Look that up, add its count. This handles **negative numbers**, where [[Sliding Window]] fails: a window relies on the sum growing monotonically as it expands, but negatives can make a longer window valid again, so there is no shrink rule — the hash map sidesteps monotonicity entirely by matching exact prefix values.

Complexity: 1D build `O(n)` time and space, query `O(1)`. 2D build `O(nm)`, query `O(1)`. Difference array: `O(1)` per update, `O(n)` to materialise. Subarray-count: `O(n)` time, `O(n)` space for the map.

## Example

```csharp
// Build once, then answer any range sum in O(1).
public static long[] BuildPrefix(int[] a)
{
    var pre = new long[a.Length + 1];              // pre[0] = 0, length n+1
    for (int i = 0; i < a.Length; i++)
        pre[i + 1] = pre[i] + a[i];                // long avoids overflow on big sums
    return pre;
}

// Sum of a[l..r] inclusive.
public static long RangeSum(long[] pre, int l, int r) => pre[r + 1] - pre[l];

// Count sub-arrays summing to k — correct even with negative values.
public static int SubarraysWithSum(int[] a, int k)
{
    var seen = new Dictionary<long, int> { [0] = 1 }; // one empty prefix, sum 0
    long run = 0;
    int count = 0;
    foreach (int x in a)
    {
        run += x;
        if (seen.TryGetValue(run - k, out int c)) count += c; // ranges ending here
        seen[run] = seen.GetValueOrDefault(run) + 1;
    }
    return count;
}
```

## Pitfalls

- **Overflow on long arrays** — cumulative sums grow much faster than individual elements. A million `int` values near `2^31` overflow an `int` prefix silently, wrapping to a wrong (often negative) total. Accumulate in a 64-bit type (`long`), and for adversarial sizes consider `checked` arithmetic or a big-integer fallback.
- **Prefix sums are for static data** — every element change invalidates all prefixes at or after that index, forcing an `O(n)` rebuild. Interleaving updates and queries makes the approach `O(nq)`; that workload wants a Fenwick tree or segment tree (`O(log n)` per operation).
- **Off-by-one on the `+1` convention** — mixing inclusive/exclusive endpoints or forgetting the leading `pre[0] = 0` produces answers off by exactly one element. Fix the convention (`pre[r+1] - pre[l]` for inclusive `[l, r]`) and test the full-array and single-element ranges.

## Tradeoffs

| Choice | Prefix sum | Alternative | Decision criteria |
| --- | --- | --- | --- |
| Static range-sum queries | `O(n)` build, `O(1)` query | Recompute each query `O(n)` | Prefix sum wins the moment you have two or more queries; a single query never justifies the build. |
| Data changes between queries | `O(n)` rebuild per update | Fenwick / segment tree `O(log n)` update and query | Any interleaving of writes and reads: use a Fenwick tree; prefix sums only for read-only data. |
| Many range *updates*, one final read | Difference array `O(1)` per update | Segment tree with lazy propagation | Difference array if all updates precede all reads; lazy segment tree if updates and reads interleave. |

## Questions

> [!QUESTION]- Why can prefix sums plus a hash map count sub-arrays summing to k when a sliding window cannot?
> - A range sum is `run_j - run_{i-1}`, so a range ending at `j` hits `k` whenever an earlier prefix equalled `run_j - k` — a hash-map lookup, no ordering assumed.
> - A sliding window instead grows and shrinks a contiguous range, which only works if the sum moves monotonically as the window expands.
> - Negative numbers break that monotonicity: a longer window can become valid again, so there is no correct shrink rule.
> - When the array can contain negatives, or you must *count* all qualifying ranges rather than find one, prefix + hash map is the correct tool and the window is simply wrong, not just slower.

> [!QUESTION]- How does a 2D prefix sum answer a rectangle query in O(1), and why the four terms?
> - Precompute `P[i][j]` as the sum of everything from the origin to `(i-1, j-1)`.
> - A rectangle sum is `P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]`.
> - The two subtractions strip off the region above and the region to the left of the target rectangle; those overlap in the top-left corner, so it gets removed twice and the final term adds it back.
> - This inclusion–exclusion is what lets integral images (Viola–Jones face detection) evaluate box features in constant time regardless of box size.

> [!QUESTION]- When should you abandon prefix sums for a Fenwick or segment tree?
> - Prefix sums assume the array is static; any element update invalidates every prefix from that index onward.
> - Rebuilding is `O(n)`, so interleaving `q` updates with queries degrades to `O(nq)`.
> - A Fenwick tree supports point update and prefix query both in `O(log n)`, and a segment tree extends that to range updates and arbitrary associative range queries.
> - The deciding question is mutability: read-only data keeps prefix sums (unbeatable `O(1)` queries); any writes between queries mean the log-factor structure is the correct trade.

## References

- [Prefix sum (Wikipedia)](https://en.wikipedia.org/wiki/Prefix_sum) — definition, parallel scan, and the difference-array duality.
- [Summed-area table (Wikipedia)](https://en.wikipedia.org/wiki/Summed-area_table) — the 2D extension and its use in image processing.
- [Subarray Sum Equals K (LeetCode #560)](https://leetcode.com/problems/subarray-sum-equals-k/) — the canonical prefix-sum + hash-map counting problem.
- [Fenwick (Binary Indexed) Tree (cp-algorithms)](https://cp-algorithms.com/data_structures/fenwick.html) — what to switch to when the data mutates.
