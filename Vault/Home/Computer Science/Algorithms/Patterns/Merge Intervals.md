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

> [!NOTE] Visualization pending
> Planned StepTrace: an intervals card showing intervals sorted by start and swept left to right, each interval either extending the current accumulated block when it overlaps or opening a new block when a gap appears. No matching renderer exists in `engine.js` yet.

# Why sorting makes overlap local

The sweep carries one piece of state: `current`, the interval being accumulated, initialised to the first interval after sorting. For each following `next`:

- `next.start <= current.end` means the two overlap, so `current.end = max(current.end, next.end)`. The `max` matters because `next` can be fully contained inside `current` — merging `[1,10]` with `[2,3]` must stay `[1,10]`, not shrink to `[1,3]`.
- Otherwise a gap separates them: `current` can never grow again, so it is emitted and `current` becomes `next`.

The reason one comparison suffices is the sort. After ascending starts, every interval later in the list starts at or after `next.start`. If `next` does not reach `current.end`, no interval after it can reach back either, so `current` is final the moment a gap appears. The invariant that survives each step is that `current.end` holds the furthest right edge of every interval merged into the current block, which is exactly the value the next overlap test needs.

# Variants that reuse the sweep

The same sort-then-sweep skeleton answers the rest of the interval family, each specialising the emit/extend step:

- **Insert one interval into a sorted list** — the list is already ordered, so the sweep copies intervals ending before the new one, merges the run that overlaps it by taking `max` of the ends, then copies the rest. No re-sort is needed.
- **Intersect two sorted lists** — a [[Two Pointers]] sweep advances the pointer whose interval ends first and emits `[max(starts), min(ends)]` whenever the current pair overlaps. Ordering on both sides is what keeps it linear.
- **Minimum meeting rooms** — the goal is peak concurrency rather than merged ranges, so instead of one `current` the sweep keeps a min-heap of the end times of active meetings. Each meeting in start order pops every end `<= its start` (rooms freed) and pushes its own end; the largest heap size reached is the room count. The sort still supplies the order; the heap replaces the single accumulator because several intervals can be active at once.

# Complexity

The table describes the `Array.Sort`-based implementation in the drawer, a comparison sort.

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Best | `O(n log n)` | `O(n)` | The comparison sort runs even when the input is already ordered; the sweep is `O(n)`. |
| Average | `O(n log n)` | `O(n)` | The sort dominates; one linear sweep with a single comparison per interval merges the rest. |
| Worst | `O(n log n)` | `O(n)` | Same sort floor; when no intervals overlap the output holds all `n` of them. |

Every case is `O(n log n)` because the comparison sort is the floor and the sweep never exceeds it. The number of overlaps changes only the size of the output — from a single merged block to all `n` intervals — not the asymptotic time. Auxiliary space is `O(1)` beyond the sort's own working memory and the output list; the sweep itself stores only `current` (or the room heap, which is `O(n)` in the worst case).

Replacing the comparison sort with a counting or radix sort drops the whole algorithm to `O(n)`, but only when the coordinates are integers drawn from a range polynomial in `n`; on unbounded or non-integer starts the `O(n log n)` comparison sort remains the floor.

# When the convention or order breaks

**The overlap definition is a decision, not a default.** Whether `[1,2]` and `[2,3]` merge depends on closed versus half-open semantics. Closed intervals share the point `2` and merge into `[1,3]`; half-open `[1,2)` and `[2,3)` touch nothing and stay separate. The choice maps straight onto the comparison operator — `<=` for closed, `<` for half-open — and getting it wrong produces off-by-one merges that pass small tests and fail exactly on boundary-touching inputs. Meeting-room problems almost always want half-open so a meeting ending at `2` and one starting at `2` share the room.

**Unsorted input silently produces wrong merges.** The "overlap is local" guarantee is the sort's, not the sweep's. On `[[1,3],[6,8],[2,5]]` an unsorted sweep sees `[1,3]` then `[6,8]`, finds a gap, emits `[1,3]`, and never reconsiders it — so the overlapping `[2,5]` merges against the wrong block or opens a spurious one, and `[1,5]` is never formed. Nothing crashes; the output is simply incorrect. Sorting by end rather than start breaks the same guarantee for the same reason.

# Reference drawer

> [!ABSTRACT]- Sweep control flow
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
> ```csharp
> // Merge a static list of intervals (closed intervals: <=).
> public static List<int[]> Merge(int[][] intervals)
> {
>     Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));   // sort by start
>     var merged = new List<int[]>();
>     int[] current = intervals[0];
>     for (int i = 1; i < intervals.Length; i++)
>     {
>         if (intervals[i][0] <= current[1])                    // overlap
>             current[1] = Math.Max(current[1], intervals[i][1]);
>         else { merged.Add(current); current = intervals[i]; } // gap: flush, restart
>     }
>     merged.Add(current);
>     return merged;
> }
>
> // Minimum meeting rooms via a min-heap of active end times (half-open [start, end)).
> public static int MinMeetingRooms(int[][] meetings)
> {
>     Array.Sort(meetings, (a, b) => a[0].CompareTo(b[0]));     // sort by start
>     var active = new PriorityQueue<int, int>();               // keyed on end time
>     int best = 0;
>     foreach (var m in meetings)
>     {
>         while (active.Count > 0 && active.Peek() <= m[0])
>             active.Dequeue();                                 // free rooms ended by now
>         active.Enqueue(m[1], m[1]);
>         best = Math.Max(best, active.Count);
>     }
>     return best;
> }
> ```
> `Merge` mutates `current[1]` in place; the `max` guards against an interval nested inside the block. `MinMeetingRooms` keeps `active.Count` equal to the number of concurrent meetings, so its peak is the room count.

# Comparison

| Strategy | Time | Preprocessing | Stronger case | Weaker case | Semantic property |
| --- | --- | --- | --- | --- | --- |
| Sort then merge | `O(n log n)` | Sort by start | Merging a static set of intervals once | Intervals inserted and queried repeatedly | Produces the merged ranges directly |
| Brute-force pairwise | `O(n²)` | None | A few dozen intervals, no sort available | Anything larger | Same result, no ordering assumption |
| Sweep-line over events | `O(n log n)` | Sort `2n` start/end events | Peak concurrency, max-overlap, meeting-room counts | Emitting merged ranges (needs reconstruction) | Running count of active intervals at every point |
| Interval tree | `O(log n)` per query, `O(n log n)` build | Balanced tree of intervals | Dynamic insert plus stabbing / overlap queries | A single static pass | Which intervals cover a point or range |

Sort-then-merge is the `O(n log n)` default when a fixed set of intervals is collapsed once and the merged ranges are the output. A sweep-line over separated start and end events pays the same asymptotic cost but tracks a concurrency count instead of ranges, which is what max-overlap and minimum-rooms questions need. An interval tree carries a higher build cost and more machinery, and earns it only when intervals are inserted and queried dynamically rather than processed in a single batch.

# Questions

> [!QUESTION]- Why does sorting by start reduce merging to a single linear sweep?
> After ascending starts, every interval later in the list starts at or after the current one. If `next.start > current.end`, no later interval can reach back to `current` either, so `current` is final and can be emitted. One comparison per interval decides overlap, turning an `O(n²)` all-pairs check into an `O(n)` pass on top of the `O(n log n)` sort.

> [!QUESTION]- Why take `max(current.end, next.end)` when extending rather than `next.end`?
> `next` can be entirely nested inside `current` — merging `[1,10]` with `[2,3]` should stay `[1,10]`. Assigning `current.end = next.end` would shrink the block to `[1,3]` and lose coverage. The `max` keeps `current.end` at the furthest right edge merged so far, which is the value the next overlap test depends on.

> [!QUESTION]- How does the interval convention change the result, and where does it show up in code?
> Closed intervals count touching endpoints as overlap (`[1,2]` and `[2,3]` merge); half-open intervals do not. The convention is the difference between `<=` and `<` in the overlap test. Choosing wrong yields off-by-one merges that only fail on boundary-touching inputs. Meeting-room problems usually want half-open so back-to-back bookings share a room.

> [!QUESTION]- When does a sweep-line over events or an interval tree replace sort-then-merge?
> A sweep-line over separated start/end events is needed when the answer is a concurrency count — maximum overlap or minimum rooms — rather than merged ranges. An interval tree replaces both when intervals are inserted and queried dynamically, trading an `O(n log n)` build for `O(log n)` overlap queries against a changing set.

# References

- [Merge Intervals (LeetCode #56)](https://leetcode.com/problems/merge-intervals/) — the canonical sort-and-sweep merge problem.
- [Insert Interval (LeetCode #57)](https://leetcode.com/problems/insert-interval/) — inserting into an already-sorted list without a full re-sort.
- [Interval scheduling](https://en.wikipedia.org/wiki/Interval_scheduling) — the greedy theory behind interval problems and the sweep-line method.
- [`PriorityQueue<TElement, TPriority>`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.priorityqueue-2) — .NET's min-heap used by the meeting-rooms variant.
