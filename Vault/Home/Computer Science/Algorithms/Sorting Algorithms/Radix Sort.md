---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Sorts bounded-width keys one digit at a time with stable distribution-and-gather passes."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

[[Home/Computer Science/Algorithms/Sorting Algorithms/Quick Sort|Quick Sort]] and [[Home/Computer Science/Algorithms/Sorting Algorithms/Merge Sort|Merge Sort]] discover order by comparing keys. Radix Sort takes a different route. It treats each key as a sequence of digits in radix `b`, then distributes the keys by one digit at a time. Its cost follows key width rather than the number of comparisons needed to establish order.

This works only when every key can be decomposed into a bounded number of digits `d`. A 32-bit integer has four base-256 digits. A fixed five-byte ASCII key has five. One stable distribution-and-gather pass handles each position.

**Operating condition:** the keys expose bounded-width digits, and every pass preserves the order established by earlier passes.

~~~~~tabsdown
tab: Visualization



```steptrace
{ "algorithm": "radix-sort", "array": [170, 45, 75, 90, 802, 24, 2, 66], "radix": 10, "mode": "LSD" }
```



The trace runs LSD radix sort on `[170, 45, 75, 90, 802, 24, 2, 66]`, making three base-10 passes from the ones digit upward. Each pass selects one digit position, distributes the keys into digit buckets without disturbing ties, then gathers the buckets into the input order for the next position.

#### Why the Passes Compose

LSD (least-significant-digit) radix sort runs one pass per digit position, from the rightmost digit up to the leftmost. Each pass performs a **stable** distribution keyed on that one digit — no other part of the key is examined. A stable [[Home/Computer Science/Algorithms/Sorting Algorithms/Counting Sort|Counting Sort]] is one way to implement that distribution; the trace shows the equivalent FIFO bucket view. After the pass over the most significant digit, the array is fully ordered, and no two keys were ever ranked against each other.

Stability is the correctness argument, not a performance tweak. When a pass sorts on digit position `p`, keys that share the same digit at `p` must retain the relative order that the earlier passes over positions `p-1 … 0` already established. A stable counting sort preserves that order exactly; an unstable one would reorder those ties and silently discard the work of every prior pass. The output would look sorted on the last digit and be wrong everywhere else.

The three base-10 passes over the sample input show the composition:

```text
Input:       170  45  75  90  802  24   2  66
ones  →      170  90  802   2   24  45  75  66     sorted by last digit: 0,0,2,2,4,5,5,6
tens  →      802   2   24  45  66  170  75  90     ties on the tens digit keep the ones order
hundreds →     2  24  45  66  75   90  170  802    fully ordered
```

`170` and `75` both carry `7` in the tens place. The tens pass reads only that digit, so it leaves them in the order the ones pass produced — `170` before `75`. The hundreds pass then places them by hundreds digits `1` and `0`, moving `75` ahead of `170` without re-examining the lower digits. Every tie survives to the next pass because every pass is stable.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Radix Sort complexity",
  "variables": {
    "branchingFactor": {
      "symbol": "b",
      "description": "radix base and number of digit buckets"
    },
    "inputSize": {
      "symbol": "n",
      "description": "number of input keys"
    },
    "parameterD": {
      "symbol": "d",
      "description": "number of digits processed per key"
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
              "kind": "text",
              "role": "Time",
              "formula": "Θ(d · (n + b))"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Average",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(d · (n + b))"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Worst",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(d · (n + b))"
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
              "formula": "Θ(n + b)",
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
              "formula": "Θ(n + b)",
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
              "formula": "Θ(n + b)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

**The `d` factor.** `Θ(d · (n + b))` hides a real `d`. Eight-byte keys at `b = 256` mean eight full passes, each a cache-unfriendly scatter over the whole array. More digit passes can erase Radix Sort's advantage, but there is no universal crossover at `d ≈ log₂ n`. Wall-clock performance depends on digit-extraction cost, comparison cost, key width and common prefixes, radix and cache behavior, implementation constants, and measurements on the target data and machine.

**Choosing `b`.** The radix sets both the pass count — `d = 1` when `maxKey = 0`, otherwise `d = ⌊log_b(maxKey)⌋ + 1` — and the per-pass count-array size `Θ(b)`. A large `b` cuts passes but grows a count array that can fall out of cache; a small `b` keeps the array tiny but multiplies passes over the data. `b = 256` (one byte per pass, four passes for 32-bit keys) is the usual balance for integer keys; `b = 2^16` sorts 32-bit keys in two passes but needs a 65,536-entry count array each pass.

~~~~~

Variable-length lexicographic strings cannot simply be aligned from the right. They need a common width with an explicit missing-character sentinel, or an MSD radix sort that works left to right. Keys exposed only through a comparator have no positional digit structure, so radix sorting does not apply.

Raw two's-complement negatives and IEEE-754 bit patterns do not follow numeric order when read as unsigned digits. A monotonic bit transform must be applied before sorting and reversed afterward.

# Diagram and C# Implementation

> [!ABSTRACT]- Per-digit pass loop
>
> ```mermaid
> flowchart TD
>   A[Keys with at most d digits in base b] --> B[Start at the least significant digit]
>   B --> C[Stable counting sort on the current digit]
>   C --> D{All d digits processed}
>   D -->|No| E[Advance to the next more significant digit]
>   E --> C
>   D -->|Yes| F[Array fully sorted]
> ```

> [!EXAMPLE]- C# implementation (LSD, non-negative integer keys)
>
> ```csharp
> public static void RadixSortLsd(int[] keys, int radix = 256)
> {
>     if (radix < 2)
>     {
>         throw new ArgumentOutOfRangeException(nameof(radix), "Radix must be at least 2.");
>     }
>
>     if (keys.Length == 0)
>     {
>         return;
>     }
>
>     var max = keys.Max();
>     var output = new int[keys.Length];
>
>     for (long place = 1; max / place > 0; place *= radix)
>     {
>         var count = new int[radix];
>
>         // Tally how many keys fall in each bucket for this digit.
>         foreach (var key in keys)
>         {
>             count[(key / place) % radix]++;
>         }
>
>         // Prefix sums turn counts into end-exclusive bucket boundaries.
>         for (var d = 1; d < radix; d++)
>         {
>             count[d] += count[d - 1];
>         }
>
>         // Iterating backward keeps equal digits in their prior order — this is the stability the passes rely on.
>         for (var i = keys.Length - 1; i >= 0; i--)
>         {
>             var digit = (int)((keys[i] / place) % radix);
>             output[--count[digit]] = keys[i];
>         }
>
>         Array.Copy(output, keys, keys.Length);
>     }
> }
> ```
> The backward loop preserves equal-digit order. Iterating forward would make the inner sort unstable and invalidate the earlier passes. Signed integers and floating-point values also need the transform described above.

# References

- [Radix sorts (Princeton Algorithms)](https://algs4.cs.princeton.edu/51radix/)
- [Radix Tricks (Michael Herf)](http://stereopsis.com/radix.html)
