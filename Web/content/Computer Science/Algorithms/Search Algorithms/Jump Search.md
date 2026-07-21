---
publish: true
created: 2026-07-21T14:46:57.605Z
modified: 2026-07-21T14:47:01.510Z
published: 2026-07-21T14:47:01.510Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Steps a sorted array in fixed blocks of size root n, then scans back one block.
level:
  - "4"
priority: Medium
status: Creation
---

A sorted sequential file links every `m`-th checkpoint so following one jump is a single operation, while arbitrary index lookup is unavailable. Binary Search cannot probe offsets `n/2`, `n/4`, then `3n/4` without that random-access capability. Linear Search follows every record. Jump Search follows the checkpoint links — block ends `a[m−1], a[2m−1], a[3m−1], …` — until one reaches or passes the target, retains the previous checkpoint, then traverses ordinary next-links through the one candidate block.

Two properties justify skipping `m − 1` records per stride. Ordering lets `a[block] < target` prove the target lies further ahead, so the skipped records cannot match. A direct checkpoint link makes that proof cost one record probe rather than `m` sequential traversals. Keeping the previous checkpoint makes the final block available without rewinding the source.

**Core condition:** sorted records with unit-cost access to every `m`-th checkpoint and sequential access inside a block → `n/m` jumps plus an `m`-record scan → minimized at `m = √n` for `O(√n)` probes and `O(1)` search-state space once the checkpoint links exist.

The move that defines the algorithm is the overshoot: the first block end that crosses the target, collapsing the search to a single block.

# Trace

With block size `3`, the trace probes block ends at indices `2`, `5`, and `8`. The first two values remain below target `13`; the third overshoots it, reducing the candidate range to indices `6 … 8`. A forward scan of that block finds `13` at index `6`.

```steptrace
{"algorithm":"jump-search","array":[1,3,5,7,9,11,13,15,17],"target":13,"blockSize":3}
```

# Why √n blocks work

Each jump is a proof, not a guess. Block `k` spans indices `[(k−1)m, k·m − 1]`, so its end value is `a[k·m − 1]`. Because the records are sorted, `a[k·m − 1] < target` guarantees every record in the first `k` blocks is below the target — none can match, and the checkpoint link skips their individual probes. The search stops at the first block whose end satisfies `a[k·m − 1] >= target`; the previous block ended below the target, so monotonic order forces the target, if present, into this single block. The retained previous checkpoint is then traversed forward through at most `m` records.

The stride size sets the balance between the two phases. Reaching a late target takes up to `n/m` jumps, and scanning the final block takes up to `m` steps, so total work is `f(m) = n/m + m`. The jump count falls as `m` grows while the scan lengthens, and `f'(m) = −n/m² + 1` is zero at `m = √n`, where the two phases are equal and the total is `2√n`. The bound depends on tying `m` to `n`: a fixed `m = 100` holds the jump phase at `n/100`, still linear in `n`, so large input degrades to `O(n)`.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(1)` | `O(1)` | The target sits at index 0 — the first scanned position — so the scan matches on its first step. |
| Average | `O(√n)` | `O(1)` | A few jumps locate the block, then a partial scan finds the target; both phases contribute `√n`. |
| Worst | `O(√n)` | `O(1)` | The target lies in the last block or is absent — all `n/m` jumps run, then a full `m`-element scan. |

The bounds hold only at the optimal block size `m = √n` and under the unit-cost checkpoint model. If taking a jump means walking all `m` ordinary next-links, the `n/m` jumps already traverse `Θ(n)` records. The search itself retains only the current and previous checkpoints, but a linked representation must store the jump links that make each stride one operation.

# Reference drawer

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
>         step += block;
>         if (prev >= n)
>         {
>             return -1;   // ran off the end without reaching the target
>         }
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
>
> Every block-end read clamps with `Math.Min(step, n) - 1`; the final block is usually shorter than `block`, so an unclamped probe would index past the array.

# When the assumptions stop holding

On an ordinary array, indexing is already `O(1)`, so Binary Search's `O(log n)` strictly dominates Jump Search's `O(√n)`. On an ordinary singly linked list, walking `m` nodes for each jump makes the total `Θ(n)`; on a forward-only stream, overshooting also loses the candidate block unless it was buffered. The niche is a sequential-file or linked-record representation with explicit skip links or block-end access plus a retained route into the final block. Outside that model Jump Search is either a slower array search or a linear traversal with different bookkeeping.

Unsorted input breaks the jump proof. On `[2, 40, 9, 55, 13, 91, 7]` a search for `9` reads block ends that are not monotonic; a stride can land on `55`, satisfy `a[block] >= target`, and hand the scan a block that never held the value, while `9` sits in a block that was already skipped. Nothing crashes — the result is a silent false negative. Sorting first costs `O(n log n)`, which only pays back across repeated searches.

The final block is usually shorter than `m`, so the block-end index `k·m − 1` can fall past the array. Each block-end access clamps to `Math.Min(step, n) - 1`, and the jump loop halts once `prev` passes `n`; dropping either guard reads out of bounds on the last stride.

# Questions

> [!QUESTION]- Why is `m = √n` the block size that minimizes total work?
> The cost is `n/m` jumps to reach the target's block plus up to `m` steps to scan it, so `f(m) = n/m + m`. Its derivative `−n/m² + 1` is zero at `m = √n`, where the two phases are equal and the total is `2√n`. Larger blocks lengthen the scan; smaller blocks multiply the jumps. A constant block size leaves the jump phase linear in `n`, so the bound degrades to `O(n)`.

> [!QUESTION]- What breaks when Jump Search runs on unsorted input?
> The jump phase assumes `a[block] < target` proves the target lies further ahead, which requires monotonic order. On unsorted data a block end can exceed the target while the matching value sits in an earlier, already-skipped block, so the scan examines the wrong block. The failure is a silent false negative rather than a crash.

# References

- [Ben Shneiderman, “Jump Searching: A Fast Sequential Search Technique” (CACM, 1978)](https://doi.org/10.1145/359619.359623) — the primary treatment of square-root jumps, variable and multi-level variants, and the sequential-file applications where binary search is unavailable.
- [Jump search (Wikipedia)](https://en.wikipedia.org/wiki/Jump_search) — the block-step scheme and the `√n` optimality derivation.
- [Jump Search (GeeksforGeeks)](https://www.geeksforgeeks.org/jump-search/) — worked example, block-size analysis, and the comparison with binary search.
