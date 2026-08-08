---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Sorts ranges by start, then sweeps once to merge overlapping intervals."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A calendar holds a list of `[start, end]` ranges in arbitrary order, some of them overlapping, and the task is to collapse the overlaps into a minimal set of blocks. Sorting the intervals by start coordinate removes that scatter: once the starts ascend, any interval that overlaps a given block must be the next one in the order, so a single left-to-right sweep with one comparison per interval resolves the whole list.



~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"merge-intervals"}
```

The contained interval `[3,5]` leaves `[1,6]` unchanged, which makes the `max(current.end, next.end)` rule visible. The gaps before `[8,10]` and `[13,16]` finalize the earlier blocks, while the closed intervals `[13,16]` and `[16,20]` merge at their shared endpoint.



The sweep carries one piece of state: `current`, the interval being accumulated, initialised to the first interval after sorting. For each following `next`:

- `next.start <= current.end` means the two overlap, so `current.end = max(current.end, next.end)`. The `max` matters because `next` can be fully contained inside `current` — merging `[1,10]` with `[2,3]` must stay `[1,10]`, not shrink to `[1,3]`.
- Otherwise a gap separates them: `current` can never grow again, so it is emitted and `current` becomes `next`.

The reason one comparison suffices is the sort. After ascending starts, every interval later in the list starts at or after `next.start`. If `next` does not reach `current.end`, no interval after it can reach back either, so `current` is final the moment a gap appears. The invariant that survives each step is that `current.end` holds the furthest right edge of every interval merged into the current block, which is exactly the value the next overlap test needs.



The same sort-then-sweep skeleton answers the rest of the interval family, each specialising the emit/extend step:

- **Insert one interval into a sorted, pairwise-disjoint list** — the sweep copies intervals ending before the new one, merges the run that overlaps it by taking `max` of the ends, then copies the rest. No re-sort is needed. If the existing list overlaps itself, normalize it first.
- **Intersect two sorted, pairwise-disjoint lists** — a [[Home/Computer Science/Algorithms/Patterns/Two Pointers|Two Pointers]] sweep advances the pointer whose interval ends first and emits `[max(starts), min(ends)]` whenever the current pair overlaps. Ordering and internal non-overlap on both sides keep the scan to one pass; otherwise each list needs normalization first.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Merge Intervals complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of input intervals"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (compare every pair)",
          "formula": "O(n^2)",
          "curveId": "quadratic"
        },
        {
          "kind": "approach",
          "label": "Merge intervals (sort, then sweep)",
          "formula": "O(n log n)",
          "curveId": "n-log-n"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (compare every pair)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Merge intervals (sort, then sweep)",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    }
  }
}
```

~~~~~

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

| Strategy | Precondition | Best fit |
| --- | --- | --- |
| Sort then merge | None | Collapse one static set |
| Brute-force pairwise | None | Tiny inputs where simplicity dominates |
| Insert into a merged list | Sorted, pairwise-disjoint input | Add one interval to an already-normalized list |
| Intersect two merged lists | Both inputs sorted and pairwise-disjoint | Produce only shared coverage |

Sort-then-merge is the default when an arbitrary static set must become a minimal disjoint list. Insert and intersection variants rely on a prior operation already having established sorted, pairwise-disjoint input.

# Questions

> [!QUESTION]- Why does sorting by start reduce merging to a single sweep?
> After ascending starts, every interval later in the list starts at or after the current one. If `next.start > current.end`, no later interval can reach back to `current` either, so `current` is final and can be emitted.

> [!QUESTION]- Why take `max(current.end, next.end)` when extending rather than `next.end`?
> `next` can be entirely nested inside `current` — merging `[1,10]` with `[2,3]` should stay `[1,10]`. Assigning `current.end = next.end` would shrink the block to `[1,3]` and lose coverage. The `max` keeps `current.end` at the furthest right edge merged so far, which is the value the next overlap test depends on.

> [!QUESTION]- How does the interval convention change the result, and where does it show up in code?
> Closed intervals count touching endpoints as overlap (`[1,2]` and `[2,3]` merge); half-open intervals do not. The convention is the difference between `<=` and `<` in the overlap test. Choosing wrong yields off-by-one merges that only fail on boundary-touching inputs. Meeting-room problems usually want half-open so back-to-back bookings share a room.

# References

- [Merge Intervals (LeetCode #56)](https://leetcode.com/problems/merge-intervals/) — the canonical sort-and-sweep merge problem.
- [Insert Interval (LeetCode #57)](https://leetcode.com/problems/insert-interval/) — inserting into an already-sorted list without a full re-sort.
- [`Array.Sort<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.array.sort) — documents the .NET sorting API; the example applies it to a cloned array to preserve caller-owned ranges.
