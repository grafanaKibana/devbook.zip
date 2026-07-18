---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Floyd's tortoise-and-hare: two pointers moving at different speeds detect cycles, midpoints, or duplicates in O(1) space."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A linked list is handed over with no length and no guarantee it terminates: some tail node may point back into the middle, forming a cycle that turns any naive traversal into an infinite loop. Recording every visited node in a hash set answers "does it loop?" in one pass but pays `O(n)` memory for the bookkeeping. Fast and slow pointers — Floyd's tortoise-and-hare — replace that memory with a speed differential. Two pointers walk the same `next` chain, one advancing a single node per step and the other advancing two. The fast pointer gains exactly one node on the slow pointer every step, so if the chain ever loops, the gap between them shrinks by one each step until it hits zero and they land on the same node; if the fast pointer instead reaches `null`, the chain is acyclic. No extra structure is allocated.

The technique needs only one property of the input: each element has exactly one successor to follow — `node.next` for a list, or `i → nums[i]` for an integer sequence read as a functional graph.

**Core condition:** a single-successor structure → one pointer moving twice as fast closes the gap by one per step → cycle detection in `O(n)` time and `O(1)` auxiliary space.

> [!NOTE] Visualization pending
> Planned StepTrace: a two-pointer-on-a-linked-cycle card showing the hare gaining one node per step and lapping the tortoise inside the loop until both occupy the same node, then the phase-two reset from the head converging on the cycle entry. No matching renderer exists in `engine.js` yet.

# Why the pointers meet, and where

Detection is the first phase. Both pointers start at the head. Each step advances `slow` by one node and `fast` by two. Once both pointers are inside a cycle of length `λ`, the fast pointer's lead over the slow pointer increases by one node per step; measured modulo `λ` that lead cycles through `0`, so within at most `λ` steps the lead is a multiple of `λ` and the two references coincide. If the chain is acyclic the fast pointer reaches `null` first and the loop ends with no meeting. The meeting therefore proves a cycle and running off the end proves acyclicity — a biconditional with no false result either way.

The meeting node is *not* the start of the cycle. Locating the entry is a separate second phase: reset one pointer to the head, leave the other at the meeting node, and advance **both** by one node per step. They meet exactly at the entry.

The distance argument is what makes phase two exact rather than a memorised recipe. Let `μ` be the number of nodes from the head to the cycle entry and `λ` the cycle length. When the pointers first meet, `slow` has travelled some distance `d` and `fast` has travelled `2d`; since the two are at the same node, the fast pointer's extra `2d − d = d` steps must be a whole number of laps, so `d = k·λ` for some integer `k`. Working out where that leaves the meeting node inside the cycle, it sits `μ mod λ` steps *before* the entry — equivalently `λ − (μ mod λ)` steps past it. A pointer restarted at the head reaches the entry after exactly `μ` steps; the pointer left at the meeting node, stepped those same `μ` times, covers the remaining `μ mod λ` steps to the entry and then completes whole laps, so it too lands on the entry. They arrive together.

Cycle length falls out for free once a meeting exists: hold one pointer fixed and walk the other around until it returns; the number of steps is `λ`.

The same two-phase mechanism handles two other single-successor problems. The **middle of a list** is where the slow pointer stands when the fast pointer reaches the end — the fast pointer covers `2×` the distance, so the slow pointer is at the halfway node in one pass. The **nth node from the end** uses a fixed gap instead of a speed difference: advance one pointer `n` nodes ahead, then move both at speed one until the leader hits the end, leaving the follower on the target.

# Complexity

| Case | Time | Auxiliary space | Cause |
| --- | --- | --- | --- |
| No cycle | `O(n)` | `O(1)` | The fast pointer reaches `null` after about `n/2` double-steps; nothing is stored. |
| Cycle, detection only | `O(n)` | `O(1)` | Both pointers enter the cycle within `μ ≤ n` steps, then meet within a further `λ ≤ n` steps. |
| Cycle, entry located | `O(n)` | `O(1)` | Phase two walks at most `μ < n` more nodes at speed one. |

Every case is linear in the node count and holds two pointers regardless of input size. The contrast is with the hash-set-of-visited-nodes detector, which matches the `O(n)` time but stores one entry per visited node for `O(n)` auxiliary space; Floyd's method trades that table for the second, slower pointer.

# Boundaries

The method needs a *traversable* successor: a `next` pointer, an index-to-index map, or any deterministic "given x, the one next x." It does not apply to a general graph where a node has several outgoing edges, because "advance twice" is undefined when the successor is ambiguous. Functional graphs — where every node has exactly one out-edge — and integer sequences qualify. This is why the same code detects a repeat in the **happy-number** sequence `n → sum of squares of digits`, and why **Find the Duplicate Number** (LeetCode 287) reads an array of `n + 1` values in `[1..n]` as edges `i → nums[i]`: two indices sharing a value create two edges into one node, forcing a cycle whose *entry* is the duplicate.

Returning the phase-one meeting node as the cycle start is the standard bug. The meeting node lies somewhere inside the loop, `μ mod λ` steps before the entry; only when `μ = 0` (the head itself is on the cycle) do the two coincide. Skipping phase two returns a plausible-looking but wrong node, and the code still terminates, so the error is silent.

Dereferencing the fast pointer without guarding both hops is the other failure. `fast.next.next` throws on an acyclic list of even length, because `fast.next` becomes `null` immediately before the second hop; every iteration must test `fast != null && fast.next != null` first. Relatedly, cycle detection compares node *identity* (`slow == fast`), not values — two distinct nodes holding equal payloads are not a cycle. Only in the array framing, where indices stand in for identity, does the comparison become a value comparison.

This same-direction, different-speed configuration is distinct from [[LinkedList|linked-list]] traversal patterns and from [[Two Pointers]], where two pointers start at opposite ends of a *sorted array* and converge toward the middle. That pattern exploits sorted order to decide which end to move; this one exploits a speed differential to close a gap inside a loop. They share the name "two pointers" and nothing of the mechanism.

# Reference drawer

> [!ABSTRACT]- Cycle shape and the two meeting points
> ```mermaid
> flowchart LR
>   H[Head] --> T[Tail into cycle]
>   T --> E[Cycle entry, mu from head]
>   E --> B[Cycle body]
>   B --> M[Phase-1 meeting node]
>   M --> L[Rest of cycle]
>   L --> E
> ```

> [!EXAMPLE]- C# implementation
> ```csharp
> public class ListNode { public int val; public ListNode next; }
>
> // Returns the node where the cycle begins, or null if the list is acyclic.
> public static ListNode DetectCycle(ListNode head)
> {
>     ListNode slow = head, fast = head;
>     while (fast != null && fast.next != null)   // guard both hops before the double advance
>     {
>         slow = slow.next;                       // speed 1
>         fast = fast.next.next;                  // speed 2
>         if (slow == fast)                       // reference equality: met inside the cycle
>         {
>             ListNode p = head;                  // phase 2: one pointer back to the head
>             while (p != slow) { p = p.next; slow = slow.next; }
>             return p;                           // both converge on the cycle entry
>         }
>     }
>     return null;                                // fast fell off the end: no cycle
> }
> ```
> The loop guard is the invariant that keeps the double hop safe; the phase-two walk is the distance argument (`μ` from the head equals the remaining distance from the meeting node) turned into code.

# Comparison

| Approach | Time | Auxiliary space | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- | --- | --- |
| Fast/slow (Floyd) | `O(n)` | `O(1)` | A single-successor structure | Read-only or memory-tight cycle detection; sequences with no node objects | Needs a second phase to locate the entry |
| Hash set of visited nodes | `O(n)` | `O(n)` | Hashable/identifiable nodes | The visited set or first repeat is wanted directly | Memory cost scales with the structure |
| Brent's algorithm | `O(n)` | `O(1)` | A single-successor structure | Fewer iterations and no double-speed pointer; reports `λ` directly | More intricate; less familiar |

Floyd's fast/slow is the `O(1)`-space cycle detector for linked structures and functional sequences: it pays a second pass to name the entry but never allocates. A visited set is the simpler code and hands back the entry as the first repeat, at the cost of `O(n)` memory and hashable identity — the fit when that set is needed anyway. Brent's algorithm keeps the same `O(1)` space while cutting the constant factor and yielding the cycle length as a by-product, so it wins in hot loops where the extra implementation complexity is justified.

# Questions

> [!QUESTION]- Why is a meeting between the pointers equivalent to the existence of a cycle?
> Once both pointers are inside a loop, the fast pointer gains one node per step, so their separation modulo the cycle length runs through zero and they must coincide. With no loop the fast pointer reaches `null` and the walk ends with no meeting. Neither direction admits a false result, so a meeting is exactly a cycle.

> [!QUESTION]- After the first meeting, why does resetting one pointer to the head locate the cycle entry?
> At the meeting the slow pointer has gone `d` steps and the fast `2d`; the surplus `d` must be a whole number of laps, `k·λ`. That places the meeting node `μ mod λ` steps before the entry. A pointer restarted at the head reaches the entry in `μ` steps; the other, stepped `μ` times from the meeting node, covers the remaining distance plus whole laps and lands on the entry at the same time.

> [!QUESTION]- Why does this pattern extend to `Find the Duplicate Number`, and what plays the role of `next`?
> The array of `n + 1` values in `[1..n]` is read as edges `i → nums[i]`. Because some value repeats, two indices point to the same node, which forces a cycle; the cycle's entry is the duplicated value. The successor function `next(i) = nums[i]` replaces the list's `next` pointer, so the same detection and entry-finding phases apply in `O(1)` space without mutating the array.

> [!QUESTION]- When is a hash set of visited nodes the better choice than fast/slow?
> Both detect a cycle in `O(n)` time; the set costs `O(n)` space and Floyd costs `O(1)`. The set returns the entry as the first repeated node with no second phase and gives the full set of visited nodes for free. It wins when that memory is affordable and the visited set or immediate entry is wanted; Floyd wins when memory is tight or the structure is read-only.

# References

- [Cycle detection (Wikipedia)](https://en.wikipedia.org/wiki/Cycle_detection) — Floyd's and Brent's algorithms with correctness proofs and the entry-point derivation.
- [Floyd's tortoise and hare (cp-algorithms)](https://cp-algorithms.com/others/tortoise_and_hare.html) — the cycle-finding method and its length and entry extensions.
- [Linked List Cycle II (LeetCode #142)](https://leetcode.com/problems/linked-list-cycle-ii/) — return the cycle-entry node, the canonical phase-two problem.
- [Find the Duplicate Number (LeetCode #287)](https://leetcode.com/problems/find-the-duplicate-number/) — the functional-graph application in `O(1)` space without mutating the input.
