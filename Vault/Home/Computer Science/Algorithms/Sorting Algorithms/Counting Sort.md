---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Tallies integer keys in a small range and places them directly without comparisons."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

Ten million exam scores still use only 101 possible keys. That small domain turns each score into an array index, so a score of 73 is also an address. Counting Sort tallies the keys in `[0, k]`, converts those counts into end positions with a running sum, and writes each element into the block reserved for its value. The constraint is strict: the keys must be integers, or map to integers, over a range small enough to allocate `k + 1` counters.

~~~~~tabsdown
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

Stability falls out of the placement direction. Equal keys share one block, and because the input is consumed tail-first, the element appearing last among equal keys lands in the block's highest slot while earlier ones fill beneath it — original relative order survives. Reverse the loop and the same decrement scheme emits equal keys backwards. Stability is discretionary for a standalone sort but a correctness requirement when Counting Sort is the per-digit pass inside [[Home/Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]], which produces wrong output the moment a digit pass reorders equal keys.

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

**`k ≫ n` inverts the economics.** Eight unsigned 64-bit keys spanning from `0` to `2^64 - 1` require a `2^64`-cell count array. Even with offset indexing, value-as-address needs one counter for every integer in the observed span `[min, max]`, not one per element present. The range term becomes the entire cost, and the allocation fails long before the eight elements are placed. [[Home/Computer Science/Algorithms/Sorting Algorithms/Radix Sort|Radix Sort]] exists for exactly this case: it sorts wide keys through several Counting Sort passes over a fixed small digit base, holding each pass's range down.
~~~~~

Non-integer or unbounded keys cannot name a finite cell in `count`. They need a comparison sort, or [[Home/Computer Science/Algorithms/Sorting Algorithms/Bucket Sort|Bucket Sort]] when numeric values follow a suitable distribution. Negative keys only need an offset: allocate `max - min + 1` counters and index with `key - min`.

# Diagram and C# Implementation

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
>     ArgumentNullException.ThrowIfNull(values);
>     ArgumentOutOfRangeException.ThrowIfNegative(k);
>     if ((long)k + 1 > Array.MaxLength)
>         throw new ArgumentOutOfRangeException(nameof(k), "The counter array would exceed the runtime array limit.");
>     if (values.Any(x => x < 0 || x > k))
>         throw new ArgumentException("Every key must be in [0, k].", nameof(values));
>
>     var count = new int[checked(k + 1)];
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
> The `k + 1` size includes the endpoint `k`. The guards reject keys outside `[0, k]` and ranges that cannot be allocated before indexing the counter array. A practical caller should usually impose a much smaller memory budget. With a nonzero minimum, subtract `min` from each key and allocate `max - min + 1` counters after checking that span in a wider integer type.

# References

- [Harold H. Seward, *Information Sorting in the Application of Electronic Digital Computers to Business Operations* (MIT DCL R-232, 1954)](https://www.cs.cornell.edu/courses/JavaAndDS/files/R-232_Info_Sorting_in_the_Applic_Electronic_Computers_Busin_Ops_May54.pdf)
