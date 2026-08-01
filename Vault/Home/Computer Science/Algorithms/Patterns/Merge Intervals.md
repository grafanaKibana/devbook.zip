---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Sorts ranges by start then sweeps to merge overlapping intervals in O(n log n)."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A calendar holds a list of `[start, end]` ranges in arbitrary order, some of them overlapping, and the task is to collapse the overlaps into a minimal set of blocks. Comparing every interval against every other to decide which ones touch costs `O(n²)`, and the pairs that overlap can sit anywhere in the list. Sorting the intervals by start coordinate removes that scatter: once the starts ascend, any interval that overlaps a given block must be the next one in the order, so a single left-to-right sweep with one comparison per interval resolves the whole list. The sort sets the cost at `O(n log n)`; the sweep that follows is `O(n)`.

**Core condition:** intervals sorted by start → `next.start` compared against the current block's end decides overlap in one test → `O(n log n)` merge dominated by the sort.

~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"merge-intervals"}
```

The trace starts with calendar ranges in their original order. Sorting moves them into start order; the sweep then grows one current block and emits it only when a gap proves it final.

The contained interval `[3,5]` leaves `[1,6]` unchanged, which makes the `max(current.end, next.end)` rule visible. The gaps before `[8,10]` and `[13,16]` finalize the earlier blocks, while the closed intervals `[13,16]` and `[16,20]` merge at their shared endpoint.

# Why Sorting Makes Overlap Local

The sweep carries one piece of state: `current`, the interval being accumulated, initialised to the first interval after sorting. For each following `next`:

- `next.start <= current.end` means the two overlap, so `current.end = max(current.end, next.end)`. The `max` matters because `next` can be fully contained inside `current` — merging `[1,10]` with `[2,3]` must stay `[1,10]`, not shrink to `[1,3]`.
- Otherwise a gap separates them: `current` can never grow again, so it is emitted and `current` becomes `next`.

The reason one comparison suffices is the sort. After ascending starts, every interval later in the list starts at or after `next.start`. If `next` does not reach `current.end`, no interval after it can reach back either, so `current` is final the moment a gap appears. The invariant that survives each step is that `current.end` holds the furthest right edge of every interval merged into the current block, which is exactly the value the next overlap test needs.

# Variants that Reuse the Sweep

The same sort-then-sweep skeleton answers the rest of the interval family, each specialising the emit/extend step:

- **Insert one interval into a sorted, pairwise-disjoint list** — the sweep copies intervals ending before the new one, merges the run that overlaps it by taking `max` of the ends, then copies the rest. No re-sort is needed. If the existing list overlaps itself, normalize it first.
- **Intersect two sorted, pairwise-disjoint lists** — a [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]] sweep advances the pointer whose interval ends first and emits `[max(starts), min(ends)]` whenever the current pair overlaps. Ordering and internal non-overlap on both sides keep the scan linear; otherwise each list needs normalization first.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Merge Intervals complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input elements or states"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Clone",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Comparison sort",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n log n)",
              "curveId": "n-log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Sweep",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(n)",
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
          "operation": "Clone",
          "bounds": [
            {
              "kind": "curve",
              "role": "Extra working space",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Comparison sort",
          "bounds": [
            {
              "kind": "curve",
              "role": "Extra working space",
              "formula": "O(log n) stack",
              "curveId": "log-n"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Sweep",
          "bounds": [
            {
              "kind": "curve",
              "role": "Extra working space",
              "formula": "O(1) state",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Returned output",
          "bounds": [
            {
              "kind": "curve",
              "role": "Extra working space",
              "formula": "O(n) output",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Complexity

The implementation in the drawer clones the input before sorting so the caller's ranges are not reordered or extended in place.

| Phase | Time | Extra working space | Cause |
| --- | --- | --- | --- |
| Clone | `O(n)` | `O(n)` | Preserves the caller-owned outer array and each mutable inner range. |
| Comparison sort | `O(n log n)` | `O(log n)` stack | Orders the cloned ranges by start. |
| Sweep | `O(n)` | `O(1)` state | Carries one `current` block and one cursor. |
| Returned output | — | `O(n)` output | Holds one block when everything overlaps, or all `n` blocks when nothing does. |

Total time is `O(n log n)` and the implementation uses `O(n)` working space because it preserves the input with a clone. A mutating version can sort the caller's array in place and reduce the non-output space to the sort's `O(log n)` stack; the sweep itself still carries only `O(1)` state. The returned list is separate output space and reaches `O(n)` when no intervals overlap.

Bounded integer coordinates can change the sorting cost, but not automatically to `O(n)`. Counting sort costs `O(n + k)` for coordinate range size `k`, so it is linear only when `k = O(n)`. Radix sort costs `O(d(n + b))` for `d` digits and radix `b`; it is linear exactly when `d(n + b) = O(n)`, with constant `d` and `b = O(n)` as one common sufficient case. Arbitrary keys that can only be ordered through comparisons retain the `O(n log n)` sorting floor.

# When the Convention or Order Breaks

**The overlap definition is a decision, not a default.** Whether `[1,2]` and `[2,3]` merge depends on closed versus half-open semantics. Closed intervals share the point `2` and merge into `[1,3]`; half-open `[1,2)` and `[2,3)` touch nothing and stay separate. The choice maps straight onto the comparison operator — `<=` for closed, `<` for half-open — and getting it wrong produces off-by-one merges that pass small tests and fail exactly on boundary-touching inputs. Meeting-room problems almost always want half-open so a meeting ending at `2` and one starting at `2` share the room.

**Unsorted input silently produces wrong merges.** The "overlap is local" guarantee is the sort's, not the sweep's. On `[[1,3],[6,8],[2,5]]` an unsorted sweep sees `[1,3]` then `[6,8]`, finds a gap, emits `[1,3]`, and never reconsiders it — so the overlapping `[2,5]` merges against the wrong block or opens a spurious one, and `[1,5]` is never formed. Nothing crashes; the output is simply incorrect. Sorting by end rather than start breaks the same guarantee for the same reason.

# Reference Drawer

> [!ABSTRACT]- Sweep control flow
>
> ```mermaid
> flowchart TD
>   A[Sort intervals by start] --> B[current = first interval]
>   B --> C{More intervals?}
>   C -->|No| Z[Emit current, finish]
>   C -->|Yes| D[Take next]
>   D --> E{next.start <= current.end?}
>   E -->|Yes, overlap| F[current.end = max of both ends]
>   E -->|No, gap| G[Emit current, current = next]
>   F --> C
>   G --> C
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> // Merge a static list of intervals (closed intervals: <=).
> public static List<int[]> Merge(int[][] intervals)
> {
>     if (intervals.Length == 0)
>         return [];
>
>     int[][] sorted = Array.ConvertAll(
>         intervals,
>         interval => new[] { interval[0], interval[1] });
>     Array.Sort(sorted, (a, b) => a[0].CompareTo(b[0]));      // sort by start
>     var merged = new List<int[]>();
>     int[] current = sorted[0];
>     for (int i = 1; i < sorted.Length; i++)
>     {
>         if (sorted[i][0] <= current[1])                       // overlap
>             current[1] = Math.Max(current[1], sorted[i][1]);
>         else { merged.Add(current); current = sorted[i]; }    // gap: flush, restart
>     }
>     merged.Add(current);
>     return merged;
> }
> ```
> The clone makes `current` safe to extend without mutating a caller-owned inner array. The `max` guards against an interval nested inside the current block.

# Comparison

| Strategy | Time | Precondition | Best fit | Cost |
| --- | --- | --- | --- | --- |
| Sort then merge | `O(n log n)` | None | Collapse one static set | Reorders or copies the input before one sweep |
| Brute-force pairwise | `O(n²)` | None | Tiny inputs where simplicity dominates | Repeated rescans and awkward transitive merges |
| Insert into a merged list | `O(n)` | Sorted, pairwise-disjoint input | Add one interval to an already-normalized list | Repeating it for many inserts becomes `O(n²)` |
| Intersect two merged lists | `O(n + m)` | Both inputs sorted and pairwise-disjoint | Produce only shared coverage | Does not normalize overlapping input lists |

Sort-then-merge is the default when an arbitrary static set must become a minimal disjoint list. The two linear variants earn their lower cost only because a prior operation already established sorted, pairwise-disjoint input.

# Questions

> [!QUESTION]- Why does sorting by start reduce merging to a single linear sweep?
> After ascending starts, every interval later in the list starts at or after the current one. If `next.start > current.end`, no later interval can reach back to `current` either, so `current` is final and can be emitted. One comparison per interval decides overlap, turning an `O(n²)` all-pairs check into an `O(n)` pass on top of the `O(n log n)` sort.

> [!QUESTION]- Why take `max(current.end, next.end)` when extending rather than `next.end`?
> `next` can be entirely nested inside `current` — merging `[1,10]` with `[2,3]` should stay `[1,10]`. Assigning `current.end = next.end` would shrink the block to `[1,3]` and lose coverage. The `max` keeps `current.end` at the furthest right edge merged so far, which is the value the next overlap test depends on.

> [!QUESTION]- How does the interval convention change the result, and where does it show up in code?
> Closed intervals count touching endpoints as overlap (`[1,2]` and `[2,3]` merge); half-open intervals do not. The convention is the difference between `<=` and `<` in the overlap test. Choosing wrong yields off-by-one merges that only fail on boundary-touching inputs. Meeting-room problems usually want half-open so back-to-back bookings share a room.

# References

- [Merge Intervals (LeetCode #56)](https://leetcode.com/problems/merge-intervals/) — the canonical sort-and-sweep merge problem.
- [Insert Interval (LeetCode #57)](https://leetcode.com/problems/insert-interval/) — inserting into an already-sorted list without a full re-sort.
- [`Array.Sort<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.array.sort) — .NET's in-place introspective comparison sort used after cloning the caller-owned ranges.
