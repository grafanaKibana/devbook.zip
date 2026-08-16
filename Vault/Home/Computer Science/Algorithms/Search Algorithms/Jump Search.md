---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Steps a sorted array in fixed blocks of size root n, then scans back one block."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A sorted sequential file may link every `m`-th record as a checkpoint while offering no arbitrary index lookup. Binary Search cannot jump to midpoints on that structure, and Linear Search follows every record. Jump Search follows block ends `a[m−1], a[2m−1], a[3m−1], …` until one reaches or passes the target. It then scans forward from the previous checkpoint through the single candidate block.

Ordering proves that a block ending below the target contains no match. A direct checkpoint link makes that proof cost one probe instead of `m` traversals, while the retained previous checkpoint avoids any need to rewind.



The first block end at or above the target narrows the search to one block. That overshoot is the defining move.

~~~~~tabsdown
tab: Visualization



```steptrace
{"algorithm":"jump-search","array":[1,3,5,7,9,11,13,15,17],"target":13,"blockSize":3}
```



With block size `3`, the trace probes block ends at indices `2`, `5`, and `8`. The first two values remain below target `13`; the third overshoots it, reducing the candidate range to indices `6 … 8`. A forward scan of that block finds `13` at index `6`.



Each jump is a proof, not a guess. Block `k` spans indices `[(k−1)m, k·m − 1]`, so its end value is `a[k·m − 1]`. Because the records are sorted, `a[k·m − 1] < target` guarantees every record in the first `k` blocks is below the target — none can match, and the checkpoint link skips their individual probes. The search stops at the first block whose end satisfies `a[k·m − 1] >= target`; the previous block ended below the target, so monotonic order forces the target, if present, into this single block. The retained previous checkpoint is then traversed forward through at most `m` records.

The stride size balances the checkpoint phase against the final scan. Larger strides use fewer checkpoints but leave a longer candidate block; smaller strides do the reverse. The chart captures the chosen square-root balance.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Jump Search complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of records in the sorted sequential input"
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
              "formula": "O(1)",
              "curveId": "constant"
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
              "formula": "O(√n)"
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
              "formula": "O(√n)"
            }
          ]
        }
      ]
    },
    "space": {
      "mode": "cases",
      "entries": [
        {
          "kind": "case",
          "role": "Best",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Average",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "case",
          "role": "Worst",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```

The chart assumes the block size is chosen near the square root of the input length, balancing the jump phase against the final scan.
~~~~~

# Diagram and C# Implementation

> [!ABSTRACT]- Control flow
>
> ```mermaid
> flowchart TD
>   A[Sorted input and target] --> B[Set block size to floor of square root of n]
>   B --> C{value at block end below target}
>   C -->|Yes| D[Advance block forward by one stride]
>   D --> E{block start past array end}
>   E -->|Yes| Z[Target is absent]
>   E -->|No| C
>   C -->|No| F[Scan the identified block from its start]
>   F --> Y[Return the matching index or absent]
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public static int JumpSearch(int[] values, int target)
> {
>     var n = values.Length;
>     if (n == 0)
>     {
>         return -1;
>     }
>
>     var block = (int)Math.Floor(Math.Sqrt(n));
>     var prev = 0;
>     var step = block;
>
>     // Jump forward until a block end reaches or passes the target.
>     while (values[Math.Min(step, n) - 1] < target)
>     {
>         prev = step;
>         if (prev >= n)
>         {
>             return -1;   // ran off the end without reaching the target
>         }
>         step = step > n - block ? n : step + block;
>     }
>
>     // Scan the single block that can contain the target.
>     for (var i = prev; i < Math.Min(step, n); i++)
>     {
>         if (values[i] == target)
>         {
>             return i;
>         }
>     }
>
>     return -1;
> }
> ```
> Every block-end read clamps with `Math.Min(step, n) - 1`. The final block is usually shorter than `block`, so an unclamped probe would index past the array. Capping `step` before addition also prevents an `int` overflow near the end of a very large array.

# When the Assumptions Stop Holding

Jump Search fits a sequential file or linked representation with explicit skip links and a retained route into the final block. On an ordinary array it loses to Binary Search. On a plain linked list with no skips, each apparent jump still walks the intervening nodes and the work remains linear.

Unsorted input breaks the jump proof. For `[2, 40, 9, 55, 13, 91, 7]`, the block size is `floor(√7) = 2`. A search for `9` first probes index `1`, sees `40 >= 9`, and scans only indices `0` and `1`. The match at index `2` is missed, producing a silent false negative.

The final block is often shorter than `m`, so `k·m − 1` may exceed the last index. Each block-end access clamps to `Math.Min(step, n) - 1`, and the loop stops once `prev` reaches `n`. Either missing guard can produce an out-of-range read on the last stride.

# References

- [Ben Shneiderman, “Jump Searching: A Fast Sequential Search Technique” (CACM, 1978)](https://doi.org/10.1145/359619.359623)
