---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Floyd's tortoise-and-hare detects cycles and functional-graph duplicates. Related fast/slow traversal finds linked-list midpoints."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A linked list may have no known length and no terminating node. If a tail points back into the list, a plain traversal loops forever. Floyd's tortoise-and-hare detects that cycle without a visited set: two pointers follow the same `next` chain, one moving one node per step and the other moving two. Once both are inside the cycle, their separation changes by one modulo the cycle length, so they must meet. If the faster pointer reaches `null`, the chain is acyclic.

The technique needs one property from the input: every element has exactly one successor. That successor may be `node.next` in a list or `i → nums[i]` when an integer array is read as a functional graph.



~~~~~tabsdown
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
      "description": "number of nodes reachable along the successor chain"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (hash set of visited nodes)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Fast and slow pointers",
          "formula": "O(n)",
          "curveId": "linear"
        }
      ]
    },
    "space": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Naive (hash set of visited nodes)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Fast and slow pointers",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    }
  }
}
```
~~~~~

# Why the Pointers Meet, and where

Both pointers start at the head. `slow` moves one node per step and `fast` moves two. Once both enter a cycle of length `λ`, the faster pointer gains one position per step modulo `λ`. Within at most `λ` steps, their positions coincide. On an acyclic chain, `fast` reaches `null` instead. A meeting proves a cycle, while reaching the end proves there is none.

The first meeting may occur anywhere in the loop. To find the entry, reset one pointer to the head, leave the other at the meeting node, and move both one node per step. Their next meeting is the cycle entry.

The distance argument explains why phase two works. Let `μ` be the distance from the head to the cycle entry and `λ` the cycle length. At the first meeting, `slow` has travelled `d` steps and `fast` has travelled `2d`. Their difference, `d`, must be a whole number of laps, so `d = k·λ`. This places the meeting node `μ mod λ` steps before the entry. A pointer restarted at the head reaches the entry after `μ` steps. Moving the other pointer `μ` steps from the meeting node covers that remaining distance and any complete laps. Both arrive at the entry together.

Once a meeting exists, the cycle length is found by holding one pointer still and counting one lap with the other.

Midpoint and nth-from-end traversal belong to the broader two-pointer family, though neither uses Floyd's cycle-entry phase. For a list midpoint, slow advances once while fast advances twice. The guard `fast != null && fast.next != null` returns the second middle node when the length is even. `fast.next != null && fast.next.next != null` returns the first middle for a non-empty list. The nth node from the end uses a fixed gap: move one pointer `n` nodes ahead, then advance both until the leader reaches the end.

# Boundaries

The method requires a deterministic successor. It works for a `next` pointer, an index-to-index map, or any function that returns exactly one next state. A general graph with several outgoing edges has no unambiguous meaning for “advance twice.” Functional graphs and generated sequences do qualify. The same mechanism finds loops in the happy-number sequence and treats **Find the Duplicate Number** as edges `i → nums[i]`, where the repeated value becomes the cycle entry.

Returning the first meeting node as the cycle entry is wrong in general. It lies `μ mod λ` steps before the entry and coincides with it only when `μ mod λ = 0`. Because that condition is unknown, phase two is required.

The double hop must guard both references. `fast.next.next` throws when `fast` exists but `fast.next` does not, so each iteration checks `fast != null && fast.next != null`. Cycle detection also compares node *identity*, not payload values. Two different nodes may hold the same value without forming a cycle.

Floyd's algorithm follows one [[Home/Computer Science/Data Structures/Linear Structures/LinkedList|linked-list]] successor chain at two speeds. That differs from opposite-end [[Home/Computer Science/Algorithms/Patterns/Two Pointers|two pointers]] over a sorted array, where order decides which end moves.

# Diagram and C# Implementation

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
> The loop guard is the invariant that keeps the double hop safe. The phase-two walk is the distance argument (`μ` from the head equals the remaining distance from the meeting node) turned into code.

# Comparison

| Approach | Requires | Stronger case | Weaker case |
| --- | --- | --- | --- |
| Fast/slow (Floyd) | A single-successor structure | Read-only or memory-tight cycle detection. Sequences with no node objects | Needs a second phase to locate the entry |
| Hash set of visited nodes | Hashable/identifiable nodes | The visited set or first repeat is wanted directly | Memory cost scales with the structure |
| Brent's algorithm | A single-successor structure | Fewer successor-function evaluations on average. Reports `λ` directly | More intricate. Less familiar |

# References

- [Richard P. Brent, "An Improved Monte Carlo Factorization Algorithm" (1980)](https://doi.org/10.1007/BF01933190)
- [Floyd's tortoise and hare (cp-algorithms)](https://cp-algorithms.com/others/tortoise_and_hare.html)
