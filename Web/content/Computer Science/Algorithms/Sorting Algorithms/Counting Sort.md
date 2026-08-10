---
publish: true
created: 2026-08-10T06:36:38.090Z
modified: 2026-08-10T06:36:38.090Z
published: 2026-08-10T06:36:38.090Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Tallies integer keys in a small range and places them directly without comparisons.
level:
  - "4"
priority: Medium
status: Creation
---

Ten million exam scores all fall in the range 0–100. The score domain supplies more information than pairwise comparison: a score of 73 is also an address. Counting Sort tallies how many keys hold each value across `[0, k]`, turns those tallies into end positions with a running sum, then writes each element straight into the slot its value names. The price is a hard domain assumption: keys must be integers, or map to them, over a range small enough that `k + 1` counters are affordable.

**Core condition:** integer keys over a known range `[0, k]` → index by value instead of comparing → prefix sums identify final positions → tail-first placement preserves stability.

````tabsdown
tab: Visualization



```steptrace
{ "algorithm": "counting-sort", "array": [2, 5, 3, 0, 2, 3, 0, 3] }
```



#### Why the Value is an Address

Three passes, none of them a comparison:

1. **Tally.** One scan fills `count[0..k]`, where `count[v]` is the number of elements whose key equals `v`. For `[2, 5, 3, 0, 2, 3, 0, 3]` with `k = 5` the tally is `[2, 0, 2, 3, 0, 1]`.
2. **Prefix sum.** Replacing `count` with its running total makes `count[v]` the number of keys `≤ v`, which is exactly the index one past the last slot value `v` may occupy. The tally becomes `[2, 2, 4, 7, 7, 8]`.
3. **Place.** Walking the input from last element to first, each element decrements `count[key]` and is written at that index. The result is `[0, 0, 2, 2, 3, 3, 3, 5]`.

The invariant the prefix sum establishes is that `count[v]` marks the end of the contiguous block reserved for value `v`. Decrementing before every write fills that block from its top slot downward.

Stability falls out of the placement direction. Equal keys share one block, and because the input is consumed tail-first, the element appearing last among equal keys lands in the block's highest slot while earlier ones fill beneath it — original relative order survives. Reverse the loop and the same decrement scheme emits equal keys backwards. Stability is discretionary for a standalone sort but a correctness requirement when Counting Sort is the per-digit pass inside [[Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]], which produces wrong output the moment a digit pass reorders equal keys.

Input order does not alter the sequence: tally every key, scan the counters, then place every key. Failure is therefore a property of the key range, not whether the input arrives sorted, reversed, or random.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Counting Sort complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of integers to sort"
    },
    "keyRange": {
      "symbol": "k",
      "description": "maximum key in the integer range [0, k]"
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
              "formula": "Θ(n + k)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + k)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + k)",
              "curveId": "linear"
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
              "formula": "Θ(n + k)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(n + k)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "Θ(n + k)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

**`k ≫ n` inverts the economics.** Eight unsigned 64-bit keys spanning from `0` to `2^64 - 1` require a `2^64`-cell count array. Even with offset indexing, value-as-address needs one counter for every integer in the observed span `[min, max]`, not one per element present. The range term becomes the entire cost, and the allocation fails long before the eight elements are placed. [[Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]] exists for exactly this case: it sorts wide keys through several Counting Sort passes over a fixed small digit base, holding each pass's range down.
````

Non-integer or unbounded keys cannot name a finite cell in `count`; use a comparison sort or, for smoothly distributed numeric keys, [[Computer Science/Algorithms/Sorting Algorithms/Bucket Sort|Bucket Sort]]. Negative keys need an offset: size `count` to `max - min + 1` and index it with `key - min`.

# Reference Drawer

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
> // Sorts keys in [0, k] while preserving equal-key order.
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

# Questions

> [!QUESTION]- What makes the placement pass stable, and when does that matter?
> After the prefix sum, `count[v]` is one past the last slot for value `v`. Consuming the input tail-first and decrementing before each write puts the last-seen equal key in the highest slot of its block and earlier ones beneath it, preserving input order. A forward pass reverses equal keys. Stability is optional standalone but required when Counting Sort is the digit pass inside LSD [[Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]].

> [!QUESTION]- When does a small `n` still make Counting Sort the wrong choice?
> When the observed key span is much larger than `n`. The count array holds one cell per integer in `[min, max]`, not per element, so eight unsigned 64-bit keys spanning `0` through `2^64 - 1` need a `2^64`-cell array. The range term dominates and the allocation fails. Radix Sort keeps each digit pass's range small; a comparison sort removes the range dependence altogether.

# References

- [Counting sort (Wikipedia)](https://en.wikipedia.org/wiki/Counting_sort) — the prefix-sum construction, the stability argument for tail-first placement, and its role as a radix sort subroutine.
- [Harold H. Seward, _Information Sorting in the Application of Electronic Digital Computers to Business Operations_ (MIT DCL R-232, 1954)](https://www.cs.cornell.edu/courses/JavaAndDS/files/R-232_Info_Sorting_in_the_Applic_Electronic_Computers_Busin_Ops_May54.pdf) — the original report that introduced the technique behind modern key-indexed counting and its radix-sort application.
- [Radix and counting sort (Princeton Algorithms)](https://algs4.cs.princeton.edu/51radix/) — key-indexed counting presented as the stable building block of LSD and MSD radix sorts.
- [Sorting lower bounds (MIT 6.006)](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/) — the decision-tree comparison lower bound and how counting sort circumvents it.
