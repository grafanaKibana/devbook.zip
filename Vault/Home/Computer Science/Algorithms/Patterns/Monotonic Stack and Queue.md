---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "A stack or deque kept sorted by popping dominated elements, answering next-greater and window-extremum queries in linear time."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

An array of daily temperatures needs, for every day, the number of days until a warmer one. Comparing each day against all later days is `O(n^2)`: most of that work re-scans stretches already known to be colder. The redundancy has structure. Once a warmer day arrives, every earlier colder day pending an answer is resolved at once and never consulted again.

A monotonic stack captures exactly that. It holds indices whose values stay sorted — increasing or decreasing — by popping any element that can no longer be an answer before the next element is pushed. Scanning left to right for the next *greater* value, the stack keeps values decreasing from bottom to top; the arriving element pops every smaller index below it, and it *is* their next greater element. Each index is pushed once and popped once, so the nested-looking "pop while" is linear in total.

A monotonic deque generalises this to a moving window. It stores window candidates in sorted order at the back and evicts from the front when the window slides past an index, which is why indices — not values — must be stored: eviction is keyed on position. This recovers `O(n)` sliding-window maximum, the query a plain [[Sliding Window]] cannot answer because a maximum has no inverse to subtract on removal.

**Core shape:** ordered scan → pop violators before each push → each element enters and leaves once → `O(n)` nearest-greater/smaller spans and window extrema.

> [!NOTE] Visualization pending
> Planned StepTrace: a monotonic-stack card showing a stack kept monotonic — before pushing an element, all elements that violate the order are popped, so each element enters and leaves once. No matching renderer exists in `engine.js` yet.

## Why the pops are free

The stack answers "next greater element" for every index in one pass. Scanning left to right it holds indices whose values *decrease* from bottom to top. Before pushing index `i`, every index whose value is less than `a[i]` is popped, because `a[i]` is the next greater element each of them was waiting for. Index `i` is then pushed. Indices still on the stack when the scan ends have no greater element to their right.

The invariant is that the stack, read bottom to top, is a decreasing sequence of values whose positions increase — the still-unanswered candidates in the order they must be resolved. A popped index is settled forever: the element that popped it is strictly closer and strictly greater than anything further right could offer as a *next* neighbour. This is what makes the same scan solve the descendants — largest rectangle in a histogram (previous-smaller and next-smaller boundaries), trapping rain water (a basin closed when a taller bar pops the stack) — without re-examining settled indices.

The deque keeps the same monotone contents but adds a second exit. Values decrease from front to back; the front is always the current window maximum. Each new index `i` drops the front if it has slid out of the window, pops from the back every index with value `<= a[i]` (they can never again be the max while a newer, larger `a[i]` is present), then pushes `i`. Storing indices is what makes the front eviction possible — the deque must know *when* a candidate leaves the window, which only its position records.

The cost argument is a charging scheme. Each index is pushed exactly once and popped at most once across the entire scan, so the inner "pop while" runs at most `n` times *in total*, not per outer step. Charging each pop to the unique element that performed it bounds the whole run at `O(n)` — the same amortised accounting behind [[Union-Find]] and dynamic-array growth.

## Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| Any input, monotonic stack | `O(n)` amortized | `O(n)` | Each index is pushed once and popped at most once; total pops `<= n`, so the inner loop is `O(n)` summed over the whole scan, not per step. |
| Any input, monotonic deque | `O(n)` amortized | `O(k)` | Same push-once/pop-once accounting; the front eviction (`dq.First <= i - k`) keeps every stored index inside `(i - k, i]`, so the deque holds at most `k` elements regardless of input. |
| Brute-force next-greater | `O(n^2)` | `O(1)` | For each index, a fresh forward scan re-reads stretches already known to be smaller; no state carries between indices. |

The `O(n)` bound is amortized, not per-operation: a single push can trigger a run of pops, but those pops are elements charged only once each. Stack space is the peak occupancy — a decreasing input for a decreasing stack, e.g. `[5, 4, 3, 2, 1]`, satisfies the pop condition on no push (no element has a next-greater to its right), so every index stays resident and gives the `O(n)` worst case. The deque is capped at `k` by front eviction and never reaches `O(n)`.

## When the invariant is set wrong

The monotone direction must match the query. A *decreasing* stack yields the next *greater* element; flip the pop comparison and it yields the next *smaller*. Choosing the direction backwards produces a plausible, fully populated result array that answers the opposite question — nothing crashes, and no-duplicate test inputs may even look right.

Strict versus non-strict comparison decides ties. `<` and `<=` in the pop condition differ only when equal values meet: one treats a duplicate as still a live candidate, the other as superseded. On histogram widths or first-versus-last-occurrence problems this flips the answer, and because both variants pass inputs without adjacent duplicates, the discrepancy stays hidden until equal neighbours appear.

The deque must store indices, not values. A window maximum is a *distance*-aware query: the front is evicted precisely when its stored index falls out of range. A deque of raw values has discarded the positions, so it cannot tell when a candidate has left the window and returns a stale maximum from a slot no longer in scope.

Sliding-window maximum is the exact case a scalar [[Sliding Window]] aggregate fails. A running sum is reversible — subtract the departing element and the invariant holds in `O(1)`. A maximum has no inverse: when the current max leaves the window, the next-largest is unknown without rescanning. The monotonic deque restores `O(n)` by keeping every "still possibly maximal" index instead of a single collapsed scalar, so the answer survives a removal.

## Reference drawer

> [!ABSTRACT]- Next-greater control flow
> ```mermaid
> flowchart TD
>   A[Scan next index i] --> B{Stack non empty and top value less than a at i}
>   B -->|Yes| C[Pop the top and record a at i as its next greater]
>   C --> B
>   B -->|No| D[Push i onto the stack]
>   D --> E{More indices remain}
>   E -->|Yes| A
>   E -->|No| F[Indices left on the stack have no greater element]
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> // Next greater element to the right; result[i] = index of the next greater value, or -1.
> public static int[] NextGreater(int[] a)
> {
>     int n = a.Length;
>     var res = new int[n];
>     Array.Fill(res, -1);
>     var stack = new Stack<int>();                  // indices, values decreasing bottom to top
>     for (int i = 0; i < n; i++)
>     {
>         while (stack.Count > 0 && a[stack.Peek()] < a[i])
>             res[stack.Pop()] = i;                  // a[i] is the answer for each popped index
>         stack.Push(i);
>     }
>     return res;                                    // indices never popped keep -1
> }
>
> // Maximum of every window of size k, O(n) via a monotonic deque of indices.
> public static int[] MaxSlidingWindow(int[] a, int k)
> {
>     var dq = new LinkedList<int>();                // indices, values decreasing front to back
>     var res = new int[a.Length - k + 1];
>     for (int i = 0; i < a.Length; i++)
>     {
>         if (dq.Count > 0 && dq.First.Value <= i - k)
>             dq.RemoveFirst();                      // front slid out of the window
>         while (dq.Count > 0 && a[dq.Last.Value] <= a[i])
>             dq.RemoveLast();                       // smaller/equal values can never be the max now
>         dq.AddLast(i);
>         if (i >= k - 1) res[i - k + 1] = a[dq.First.Value]; // front is the window max
>     }
>     return res;
> }
> ```
> The pop comparison (`<` vs `<=`) sets tie handling; both examples store indices so distances and window eviction stay recoverable.

## Comparison

| Approach | Time | Space | Required input | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Monotonic stack | `O(n)` amortized | `O(n)` | Single left-to-right (or right-to-left) pass | Next/previous greater-or-smaller for every index; histogram, rain water | Queries that are not a nearest-neighbour comparison |
| Brute-force next-greater | `O(n^2)` | `O(1)` | None | Tiny `n`, one-off checks | Any input past a few hundred elements |
| Monotonic deque | `O(n)` amortized | `O(k)` | Fixed window size, indices stored | Sliding-window max/min over a stream | Order statistics beyond the extremum (median, `k`-th) |
| Heap over the window | `O(n log k)` | `O(k)` | Comparable keys | Window median or `k`-th order statistic alongside the max | Pure min/max, where the deque's `O(n)` wins |
| Sparse table / [[Segment Tree]] | `O(n log n)` build, `O(1)`/`O(log n)` query | `O(n log n)` / `O(n)` | Static array (sparse table); mutable range (segment tree) | Arbitrary range max on unchanging or updatable data | A single left-to-right pass where preprocessing never pays back |

A monotonic stack is the `O(n)` tool for next-greater and next-smaller spans, paying `O(n)` space to keep unanswered candidates live; brute force is preferable only when `n` is trivially small. A monotonic deque is the `O(n)` sliding-window max/min that beats a [[Heap]]'s `O(n log k)` — the heap earns its log factor only when the window needs an order statistic the deque cannot expose. A sparse table or [[Segment Tree]] answers *arbitrary* ranges rather than a moving window, and its `O(n log n)` build pays back only under repeated ad-hoc range queries.

## Questions

> [!QUESTION]- Why is a monotonic stack `O(n)` when the code reads as a nested loop?
> Every index is pushed exactly once and popped at most once, so the total number of pops across the whole scan is bounded by `n`. The inner "pop while" therefore does `O(n)` work summed over all outer iterations, not `O(n)` per iteration. Charging each pop to the unique element that performed it gives the amortized linear bound.

> [!QUESTION]- Why must a monotonic deque store indices rather than values?
> A window maximum is evicted precisely when its position falls out of range, so the front check compares stored indices against the window bound. A deque of raw values has discarded the positions and cannot tell when a candidate has left the window, returning a stale maximum from a slot no longer in scope.

> [!QUESTION]- How does the monotone direction relate to which query is answered?
> The direction of the stack fixes the query. A decreasing stack (values fall bottom to top) resolves each popped index against the arriving larger value, yielding the next *greater* element; reversing the pop comparison makes the stack increasing and yields the next *smaller* element. Choosing the direction backwards produces a fully populated result that answers the opposite question.

## References

- [Sliding Window Maximum (LeetCode #239)](https://leetcode.com/problems/sliding-window-maximum/) — the canonical monotonic-deque problem, with the index-based window-eviction requirement.
- [Largest Rectangle in Histogram (LeetCode #84)](https://leetcode.com/problems/largest-rectangle-in-histogram/) — the previous-smaller / next-smaller boundary application of a monotonic stack.
- [Amortized analysis](https://en.wikipedia.org/wiki/Amortized_analysis) — the charging/aggregate argument behind the push-once, pop-once `O(n)` bound.
- [Minimum stack / minimum queue](https://cp-algorithms.com/data_structures/stack_queue_modification.html) — deque-backed constant-time window minimum and the reversibility limitation that motivates it.
