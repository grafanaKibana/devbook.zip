---
publish: true
created: 2026-07-11T21:42:38.144Z
modified: 2026-07-11T21:42:38.145Z
published: 2026-07-11T21:42:38.145Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Tallies integer keys in a small range and places each in O(n + k) without comparisons.
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

Counting Sort orders elements whose keys are integers in a small range `[0, k)` without ever comparing two elements to each other. It tallies how many times each key occurs, turns those tallies into starting positions with a prefix sum, then drops every element straight into its final slot. That is why it runs in `O(n + k)` time and sidesteps the `Ω(n log n)` lower bound that binds [[Merge Sort]], [[Quick Sort]], and [[Heap Sort]]: that bound only applies to sorts whose sole primitive is _comparing two elements_. Counting Sort reads the structure of the keys instead — a key of value `v` tells you directly where it belongs — and pays for that speed with a hard assumption about the key domain: the keys must be integers (or map to integers) over a range small enough that allocating `k` counters is affordable.

Reach for it when keys are dense small integers: ages, byte values, exam scores, histogram bins. Do not use it when keys are sparse over a huge range (see Pitfalls) or when they are not integers at all — a general comparison sort is the fallback there. Its real importance is as the stable inner loop of [[Radix Sort]], which is how it escapes the small-`k` restriction.

## How It Works

1. **Tally** — scan the input once and count occurrences of each key into `count[0..k)`.
2. **Prefix-sum** — replace `count` with its running total, so `count[v]` becomes the number of keys `≤ v`. That value is exactly the index one past the last slot where key `v` belongs.
3. **Place, iterating the input backwards** — for each element from last to first, decrement `count[key]` and write the element at that index in the output array.

Iterating **backwards** in step 3 is the single subtlety, and it is what makes the sort **stable** (equal keys keep their input order). Because `count[key]` points one past the block reserved for that key and we decrement _before_ writing, the element encountered _last_ among equal keys lands in the _highest_ slot of its block, and earlier ones fill downward — preserving the original relative order. Iterate forward with the same decrement scheme and equal keys come out reversed. Stability is optional for a standalone sort but load-bearing when Counting Sort is used as a digit pass inside [[Radix Sort]].

Complexity: `O(n + k)` time and `O(n + k)` space (`k` for the counters, `n` for the output buffer). There is no worst case that degrades this — the cost is fixed by `n` and `k`, not by the arrangement of the data. The catch lives entirely in `k`.

## Example

```csharp
// Sorts keys in the range [0, k). Stable: equal keys keep input order.
public static int[] CountingSort(int[] a, int k)
{
    int[] count = new int[k];
    foreach (int x in a)
        count[x]++;                          // 1. tally occurrences

    for (int v = 1; v < k; v++)
        count[v] += count[v - 1];            // 2. prefix sum: count[v] == number of keys <= v

    int[] output = new int[a.Length];
    for (int i = a.Length - 1; i >= 0; i--)  // 3. iterate BACKWARDS for stability
    {
        int key = a[i];
        output[--count[key]] = a[i];         // decrement first, then place
    }
    return output;
}
```

For `a = [2, 5, 3, 0, 2, 3, 0, 3]` with `k = 6`: the tally is `[2, 0, 2, 3, 0, 1]`; the prefix sum is `[2, 2, 4, 7, 7, 8]`; the backward placement pass produces `[0, 0, 2, 2, 3, 3, 3, 5]`, with the two `0`s, two `2`s, and three `3`s each retaining their original order.

## Pitfalls

### `k` Dominating `n`

- **What goes wrong**: sorting 10 values whose keys range up to `10^9` allocates a billion-entry counter array — gigabytes of memory and a full sweep over it — to sort ten numbers.
- **Why it happens**: the `+ k` term in `O(n + k)` is not a footnote. When the key range dwarfs the element count, `k` is the whole cost.
- **How to avoid it**: only use Counting Sort when `k = O(n)`. For large or unknown key ranges, switch to [[Radix Sort]] (which breaks the key into fixed-width digits, keeping each pass's `k` small) or a comparison sort.

### Forgetting to Iterate Backwards

- **What goes wrong**: placing elements in a forward pass still sorts correctly by value, but silently reverses the relative order of equal keys — destroying stability.
- **Why it happens**: the prefix-sum layout only yields stable output when consumed from the tail of the input; the direction is not cosmetic.
- **How to avoid it**: always run the placement loop from `n - 1` down to `0`. This matters most when Counting Sort is the inner loop of an LSD [[Radix Sort]], which produces wrong results entirely if the digit pass is not stable.

### Negative or Non-Integer Keys

- **What goes wrong**: a negative key indexes `count[-3]` and throws; a floating-point or string key has no natural counter slot at all.
- **Why it happens**: the algorithm indexes an array _by the key itself_, which only works for non-negative integers.
- **How to avoid it**: offset keys by subtracting the minimum (`count[key - min]`) so the range starts at zero. For genuinely non-integer keys, use [[Bucket Sort]] (range partitioning) or a comparison sort instead.

## Questions

> [!QUESTION]- Why does Counting Sort beat the `O(n log n)` comparison lower bound?
>
> - The `Ω(n log n)` bound applies only to sorts whose only operation is comparing two elements — there are `n!` possible orderings and each comparison yields one bit.
> - Counting Sort never compares elements; it uses each key's value directly as an array index, reading the key's structure instead of ranking pairs.
> - That is why it achieves `O(n + k)` linear time.
> - The escape is not free: it only works when keys are integers over a bounded range, so the speedup is a trade of generality for a domain assumption — always check `k = O(n)` before assuming the win holds.

> [!QUESTION]- Why must the placement pass iterate the input backwards?
>
> - After the prefix sum, `count[v]` holds the index one past the last slot reserved for key `v`.
> - Decrementing before each write and consuming the input from the tail places the last equal element in the highest slot and earlier ones below it, preserving input order.
> - A forward pass with the same scheme reverses equal keys, breaking stability.
> - Stability is optional standalone but mandatory when Counting Sort is the digit pass inside LSD [[Radix Sort]], which is wrong without it — so the loop direction is a correctness requirement, not a style choice.

> [!QUESTION]- When does Counting Sort's memory cost make it the wrong choice?
>
> - Space and time are both `O(n + k)`, so the counter array scales with the key range, not the number of elements.
> - Sorting a handful of values with keys up to `10^9` allocates a billion counters — gigabytes to sort ten numbers.
> - The rule of thumb is to require `k = O(n)`; beyond that, [[Radix Sort]] keeps each pass's range small, or a comparison sort avoids the range dependence entirely.
> - Recognizing the `k`-dominates-`n` failure is what separates a linear-time win from an accidental out-of-memory crash in production.

## References

- [Counting sort (Wikipedia)](https://en.wikipedia.org/wiki/Counting_sort) — stability argument, prefix-sum construction, and use as a radix sort subroutine.
- [Radix and counting sort (Princeton Algorithms)](https://algs4.cs.princeton.edu/51radix/) — key-indexed counting presented as the building block of LSD/MSD radix sorts.
- [Sorting in linear time (CLRS chapter overview, MIT OCW)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — the comparison lower bound and how counting sort circumvents it.
