---
publish: true
created: 2026-08-02T10:34:10.302Z
modified: 2026-08-02T10:44:22.775Z
published: 2026-08-02T10:44:22.775Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Floyd's tortoise-and-hare detects cycles and functional-graph duplicates; related fast/slow traversal finds linked-list midpoints.
level:
  - "4"
priority: Medium
status: Creation
---

A linked list is handed over with no length and no guarantee it terminates: some tail node may point back into the middle, forming a cycle that turns any naive traversal into an infinite loop. Fast and slow pointers — Floyd's tortoise-and-hare — replace that memory with a speed differential. Two pointers walk the same `next` chain, one advancing a single node per step and the other advancing two. The fast pointer gains exactly one node on the slow pointer every step, so if the chain ever loops, the gap between them shrinks by one each step until it hits zero and they land on the same node; if the fast pointer instead reaches `null`, the chain is acyclic. No extra structure is allocated.

The technique needs only one property of the input: each element has exactly one successor to follow — `node.next` for a list, or `i → nums[i]` for an integer sequence read as a functional graph.

````tabsdown
tab: Visualization


```steptrace
{"algorithm":"fast-and-slow-pointers"}
```

The trace uses `A → B → C → D → E → F → G → H → C`, with the six-node cycle `C → D → E → F → G → H → C`. Every hop is shown separately: slow moves once, fast moves twice, and they first collide at `G` after six slow iterations. Phase two resets the fast pointer to `A`; both then move one hop at a time and converge at the cycle entry `C` after two iterations.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Fast and Slow Pointers complexity",
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
          "operation": "No cycle",
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
          "operation": "Cycle, detection only",
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
          "operation": "Cycle, entry located",
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
          "operation": "No cycle",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Cycle, detection only",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Cycle, entry located",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
````

# Why the Pointers Meet, and where

Detection is the first phase. Both pointers start at the head. Each step advances `slow` by one node and `fast` by two. Once both pointers are inside a cycle of length `λ`, the fast pointer's lead over the slow pointer increases by one node per step; measured modulo `λ` that lead cycles through `0`, so within at most `λ` steps the lead is a multiple of `λ` and the two references coincide. If the chain is acyclic the fast pointer reaches `null` first and the loop ends with no meeting. The meeting therefore proves a cycle and running off the end proves acyclicity — a biconditional with no false result either way.

The meeting node need not be the start of the cycle. Locating the entry is a separate second phase: reset one pointer to the head, leave the other at the meeting node, and advance **both** by one node per step. They meet exactly at the entry.

The distance argument is what makes phase two exact rather than a memorised recipe. Let `μ` be the number of nodes from the head to the cycle entry and `λ` the cycle length. When the pointers first meet, `slow` has travelled some distance `d` and `fast` has travelled `2d`; since the two are at the same node, the fast pointer's extra `2d − d = d` steps must be a whole number of laps, so `d = k·λ` for some integer `k`. Working out where that leaves the meeting node inside the cycle, it sits `μ mod λ` steps _before_ the entry — equivalently `λ − (μ mod λ)` steps past it. A pointer restarted at the head reaches the entry after exactly `μ` steps; the pointer left at the meeting node, stepped those same `μ` times, covers the remaining `μ mod λ` steps to the entry and then completes whole laps, so it too lands on the entry. They arrive together.

Cycle length falls out for free once a meeting exists: hold one pointer fixed and walk the other around until it returns; the number of steps is `λ`.

Midpoint and nth-from-end traversal belong to the broader two-pointer family, but neither uses Floyd's two-phase cycle-entry mechanism. For the **middle of a list**, slow advances one node while fast advances two: `while (fast != null && fast.next != null)` returns the second middle node for an even-length list, while `while (fast.next != null && fast.next.next != null)` returns the first when the list is non-empty. The **nth node from the end** uses a fixed gap rather than different speeds: advance one pointer `n` nodes ahead, then move both one node per step until the leader hits the end, leaving the follower on the target.

# Boundaries

The method needs a _traversable_ successor: a `next` pointer, an index-to-index map, or any deterministic "given x, the one next x." It does not apply to a general graph where a node has several outgoing edges, because "advance twice" is undefined when the successor is ambiguous. Functional graphs — where every node has exactly one out-edge — and integer sequences qualify. This is why the same code detects a repeat in the **happy-number** sequence `n → sum of squares of digits`, and why **Find the Duplicate Number** (LeetCode 287) reads an array of `n + 1` values in `[1..n]` as edges `i → nums[i]`: two indices sharing a value create two edges into one node, forcing a cycle whose _entry_ is the duplicate.

Returning the phase-one meeting node as the cycle start is the standard bug. The meeting node lies somewhere inside the loop, `μ mod λ` steps before the entry; the two coincide when `μ mod λ = 0`. Phase two is still required because that condition is unknown in advance. Skipping it can return a plausible-looking but wrong node, and the code still terminates, so the error is silent.

Dereferencing the fast pointer without guarding both hops is the other failure. `fast.next.next` throws whenever `fast != null` but `fast.next == null`, so every iteration must test both `fast != null` and `fast.next != null` first. Relatedly, cycle detection compares node _identity_ (`slow == fast`), not values — two distinct nodes holding equal payloads are not a cycle. Only in the array framing, where indices stand in for identity, does the comparison become a value comparison.

This same-direction, different-speed configuration is distinct from [[Computer Science/Data Structures/Linear Structures/LinkedList|linked-list]] traversal patterns and from [[Computer Science/Algorithms/Patterns/Two Pointers|two pointers]], where two pointers start at opposite ends of a _sorted array_ and converge toward the middle. That pattern exploits sorted order to decide which end to move; this one exploits a speed differential to close a gap inside a loop. They share the name "two pointers" and nothing of the mechanism.

# Reference Drawer

> [!ABSTRACT]- Cycle shape and the two meeting points
>
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
>
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
>
> The loop guard is the invariant that keeps the double hop safe; the phase-two walk is the distance argument (`μ` from the head equals the remaining distance from the meeting node) turned into code.

# Comparison

| Approach | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Fast/slow (Floyd) | A single-successor structure | Read-only or memory-tight cycle detection; sequences with no node objects | Needs a second phase to locate the entry |
| Hash set of visited nodes | Hashable/identifiable nodes | The visited set or first repeat is wanted directly | Memory cost scales with the structure |
| Brent's algorithm | A single-successor structure | Fewer successor-function evaluations on average; reports `λ` directly | More intricate; less familiar |

# Questions

> [!QUESTION]- Why is a meeting between the pointers equivalent to the existence of a cycle?
> Once both pointers are inside a loop, the fast pointer gains one node per step, so their separation modulo the cycle length runs through zero and they must coincide. With no loop the fast pointer reaches `null` and the walk ends with no meeting. Neither direction admits a false result, so a meeting is exactly a cycle.

> [!QUESTION]- After the first meeting, why does resetting one pointer to the head locate the cycle entry?
> At the meeting the slow pointer has gone `d` steps and the fast `2d`; the surplus `d` must be a whole number of laps, `k·λ`. That places the meeting node `μ mod λ` steps before the entry. A pointer restarted at the head reaches the entry in `μ` steps; the other, stepped `μ` times from the meeting node, covers the remaining distance plus whole laps and lands on the entry at the same time.

> [!QUESTION]- Why does this pattern extend to `Find the Duplicate Number`, and what plays the role of `next`?
> The array of `n + 1` values in `[1..n]` is read as edges `i → nums[i]`. Because some value repeats, two indices point to the same node, which forces a cycle; the cycle's entry is the duplicated value.

> [!QUESTION]- When is a hash set of visited nodes the better choice than fast/slow?
> The set returns the entry as the first repeated node with no second phase and gives the full set of visited nodes for free. It wins when that memory is affordable and the visited set or immediate entry is wanted; Floyd wins when memory is tight or the structure is read-only.

# References

- [Richard P. Brent, "An Improved Monte Carlo Factorization Algorithm" (1980)](https://doi.org/10.1007/BF01933190) — the primary presentation of Brent's cycle-detection variant.
- [Cycle detection (Wikipedia)](https://en.wikipedia.org/wiki/Cycle_detection) — Floyd's and Brent's algorithms with correctness proofs and the entry-point derivation.
- [Floyd's tortoise and hare (cp-algorithms)](https://cp-algorithms.com/others/tortoise_and_hare.html) — the cycle-finding method and its length and entry extensions.
- [Linked List Cycle II (LeetCode #142)](https://leetcode.com/problems/linked-list-cycle-ii/) — return the cycle-entry node, the canonical phase-two problem.
- [Find the Duplicate Number (LeetCode #287)](https://leetcode.com/problems/find-the-duplicate-number/)
