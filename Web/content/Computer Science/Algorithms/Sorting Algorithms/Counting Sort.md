---
publish: true
created: 2026-07-10T18:56:56.459Z
modified: 2026-07-10T18:56:56.459Z
published: 2026-07-10T18:56:56.459Z
topic:
  - Computer Science
subtopic:
  - Algorithms
level:
  - "4"
priority: Medium
status: Creation
---

# Intro

Ten million exam scores all fall in the range 0–100. A comparison sort orders them in `Θ(n log n)` because comparing two keys is its only source of information, and distinguishing the `n!` possible orderings takes `log₂(n!) ≈ n log n` yes/no answers. Counting Sort throws comparison out: a score of 73 is never ranked against its neighbours — its value _is_ an address. The algorithm tallies how many keys hold each value across `[0, k]`, turns those tallies into end positions with a running sum, then writes each element straight into the slot its value names. Indexing by value sidesteps the `Ω(n log n)` lower bound — that bound governs only sorts whose sole move is comparing pairs — and drops the cost to `Θ(n + k)`. The price is a hard domain assumption: keys must be integers, or map to them, over a range `k` small enough that an array of `k` counters is affordable.

A trace of Counting Sort would run over `[2, 5, 3, 0, 2, 3, 0, 3]` with `k = 5`.

> [!NOTE] Visualization pending
> Planned StepTrace: a histogram/counts card showing the count array filling, the prefix-sum pass, then stable placement into the output. No matching renderer exists in `engine.js` yet.

**Core condition:** integer keys over a known range `[0, k]` → index by value instead of comparing → `Θ(n + k)` time and `Θ(n + k)` auxiliary space, stable.

## Why the value is an address

Three linear passes, none of them a comparison:

1. **Tally.** One scan fills `count[0..k]`, where `count[v]` is the number of elements whose key equals `v`. For `[2, 5, 3, 0, 2, 3, 0, 3]` with `k = 5` the tally is `[2, 0, 2, 3, 0, 1]`.
2. **Prefix sum.** Replacing `count` with its running total makes `count[v]` the number of keys `≤ v`, which is exactly the index one past the last slot value `v` may occupy. The tally becomes `[2, 2, 4, 7, 7, 8]`.
3. **Place.** Walking the input from last element to first, each element decrements `count[key]` and is written at that index. The result is `[0, 0, 2, 2, 3, 3, 3, 5]`.

The invariant the prefix sum establishes is that `count[v]` marks the end of the contiguous block reserved for value `v`. Decrementing before every write fills that block from its top slot downward.

Stability falls out of the placement direction. Equal keys share one block, and because the input is consumed tail-first, the element appearing last among equal keys lands in the block's highest slot while earlier ones fill beneath it — original relative order survives. Reverse the loop and the same decrement scheme emits equal keys backwards. Stability is discretionary for a standalone sort but a correctness requirement when Counting Sort is the per-digit pass inside [[Radix Sort]], which produces wrong output the moment a digit pass reorders equal keys.

No arrangement of the input alters this. The two `Θ(n)` scans and the `Θ(k)` prefix sum run identically whether the data arrives sorted, reversed, or random; the work is fixed by `n` and `k` alone. Whatever can go wrong is therefore a property of `k`, not of the data's order.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `Θ(n + k)` | `Θ(n + k)` | Two input scans plus one sweep of the `k`-cell counter, independent of order. |
| Average | `Θ(n + k)` | `Θ(n + k)` | The same three passes; no input distribution changes the pass count. |
| Worst | `Θ(n + k)` | `Θ(n + k)` | No adversarial ordering exists — cost is set by `n` and `k`, never arrangement. |

The bound is tight in every case, so `Θ` rather than `O` is the honest notation. Auxiliary space splits into the `k`-cell count array and the `n`-cell output buffer, so Counting Sort is **not in-place**: placement reads the original keys while writing a separate array. Done as above — prefix sum followed by tail-first placement — it is **stable**.

## When indexing by value breaks

Every failure traces to the same assumption: the key can serve as an array index.

**`k ≫ n` inverts the economics.** Sorting eight 64-bit integers by their raw value asks for a `2^64`-cell count array — value-as-address needs one counter per _representable_ key, not one per element present. The `+ k` term, invisible when `k = O(n)`, becomes the entire cost, and the allocation fails long before the eight elements are placed. [[Radix Sort]] exists for exactly this case: it sorts wide keys through several Counting Sort passes over a fixed small digit base, holding each pass's `k` down.

**Non-integer or unbounded keys have no index.** A floating-point value, a string, or an arbitrary comparable object cannot name a cell in `count`, because there is no finite integer range to allocate over. Such keys stay with a comparison sort, or — when they distribute smoothly across a range — with [[Bucket Sort]].

**Negative keys index before the array starts.** A key of `-3` addresses `count[-3]` and throws, or corrupts memory in a language that permits it. The fix is an offset: size `count` at `max - min + 1` and index `count[key - min]`, shifting the domain so its minimum maps to zero. Omitting the offset does not sort incorrectly — it faults on the first negative key.

## Reference drawer

> [!ABSTRACT]- Three passes
>
> ```mermaid
> flowchart LR
>   A[Input keys] --> B[Tally: count per value]
>   B --> C[Prefix sum: end position per value]
>   C --> D[Place tail-first: decrement, then write]
>   D --> E[Sorted, stable output]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Sorts keys in [0, k]. Stable; not in-place.
> public static int[] CountingSort(int[] values, int k)
> {
>     var count = new int[k + 1];
>     foreach (var x in values)
>     {
>         count[x]++;                                 // 1. tally occurrences
>     }
>
>     for (var v = 1; v <= k; v++)
>     {
>         count[v] += count[v - 1];                   // 2. prefix sum: count[v] == keys <= v
>     }
>
>     var output = new int[values.Length];
>     for (var i = values.Length - 1; i >= 0; i--)    // 3. tail-first for stability
>     {
>         var key = values[i];
>         output[--count[key]] = values[i];           // decrement, then place
>     }
>
>     return output;
> }
> ```
>
> The `k + 1` sizing includes the endpoint value `k`. For a nonzero minimum, subtract `min` on every index and size the array `max - min + 1`.

## Comparison

| Algorithm | Time | Auxiliary space | Key requirement | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Counting Sort | `Θ(n + k)` | `Θ(n + k)` | Integer keys over `[0, k]` | `k = O(n)`: small dense integer ranges | `k ≫ n`, or non-integer keys |
| [[Radix Sort]] | `Θ(d·(n + b))` | `Θ(n + b)` | Fixed-width integer/string keys | Wide keys with a bounded digit base `b` | Few elements, or variable-length keys |
| [[Bucket Sort]] | `Θ(n + b)` avg, `Θ(n²)` worst | `Θ(n + b)` | Keys spread over a known range | Near-uniform continuous keys | Clustered keys collapsing into one bucket |
| [[Quick Sort]] / [[Merge Sort]] | `Θ(n log n)` | `O(log n)` / `Θ(n)` | Any comparable key | Large or unbounded keys, no range assumption | Small integer ranges where `n + k` beats `n log n` |

Counting Sort wins when the key range is small relative to `n`: it turns each key into an address and pays only `Θ(n + k)`. [[Radix Sort]] generalizes it to wide keys by running Counting Sort once per digit, trading a single pass for `d` bounded ones. [[Bucket Sort]] is the continuous-domain cousin — it distributes into range buckets rather than exact-value counters and sorts within each bucket. A comparison sort assumes nothing about the keys and stays the baseline whenever they are large, unbounded, or not integers; that generality is what costs it the `Θ(n log n)` lower bound Counting Sort was built to dodge.

## Questions

> [!QUESTION]- Why does Counting Sort avoid the `Ω(n log n)` comparison lower bound?
> The bound counts the yes/no answers a comparison sort needs to separate `n!` orderings, and a pairwise comparison is its only source of information. Counting Sort never compares keys — it reads each key's value directly as an array index — so the argument does not apply to it. That indexing costs `Θ(n + k)` and only works for integer keys over a bounded range.

> [!QUESTION]- What makes the placement pass stable, and when does that matter?
> After the prefix sum, `count[v]` is one past the last slot for value `v`. Consuming the input tail-first and decrementing before each write puts the last-seen equal key in the highest slot of its block and earlier ones beneath it, preserving input order. A forward pass reverses equal keys. Stability is optional standalone but required when Counting Sort is the digit pass inside LSD [[Radix Sort]].

> [!QUESTION]- Why is the cost `Θ(n + k)` in every case rather than `O(n + k)`?
> The two input scans and the prefix-sum sweep run to completion regardless of input order, so no arrangement adds or removes work. Lower and upper bounds coincide, which makes the notation tight — `Θ`. The only lever on cost is `k`, the key range, not the data.

> [!QUESTION]- When does a small `n` still make Counting Sort the wrong choice?
> When `k ≫ n`. The count array holds one cell per representable key value, not per element, so sorting eight 64-bit integers by raw value needs a `2^64`-cell array. The `+ k` term dominates and the allocation fails. Radix Sort keeps each digit pass's range small; a comparison sort removes the range dependence altogether.

## References

- [Counting sort (Wikipedia)](https://en.wikipedia.org/wiki/Counting_sort) — the prefix-sum construction, the stability argument for tail-first placement, and its role as a radix sort subroutine.
- [Radix and counting sort (Princeton Algorithms)](https://algs4.cs.princeton.edu/51radix/) — key-indexed counting presented as the stable building block of LSD and MSD radix sorts.
- [Sorting lower bounds and linear-time sorting (MIT 6.006)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — the decision-tree comparison lower bound and how counting sort circumvents it.
