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

An arbitrary set of calendar ranges may contain overlaps and nested intervals. Sorting by start time makes those relationships local. A left-to-right sweep then carries one current block: extend it when the next interval overlaps, or emit it when a gap appears.



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

- **Insert one interval into a sorted, pairwise-disjoint list** — the sweep copies intervals ending before the new one, then expands the pending interval to `[min(starts), max(ends)]` for every overlap under the chosen closed or half-open endpoint convention. It copies the remaining intervals after that run. No re-sort is needed. If the existing list overlaps itself, normalize it first.
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

The overlap rule comes from the interval convention. Closed intervals `[1,2]` and `[2,3]` share the point `2`, so they merge. Half-open ranges `[1,2)` and `[2,3)` do not overlap. The code expresses that choice as `<=` for closed intervals or `<` for half-open ones. Scheduling usually uses half-open ranges so one meeting may start when another ends.

The sweep is correct only after sorting by start. On `[[1,3],[6,8],[2,5]]`, an unsorted pass emits `[1,3]` when it sees the gap before `[6,8]`, then encounters `[2,5]` too late to form `[1,5]`. Sorting by end does not restore the needed invariant: later intervals must have starts no earlier than the one currently being processed.

# Diagram and C# Implementation

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

Sort then merge is the reliable default for an arbitrary static set. Insert and intersection variants earn their single pass only when their inputs are already sorted and pairwise disjoint.

# References

- [Merge Intervals (LeetCode #56)](https://leetcode.com/problems/merge-intervals/)
- [`Array.Sort<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.array.sort)
