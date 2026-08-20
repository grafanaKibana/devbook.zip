---
publish: true
created: 2026-08-20T20:41:15.602Z
modified: 2026-08-20T20:41:15.602Z
published: 2026-08-20T20:41:15.602Z
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: A LIFO collection where the most recently pushed element is popped first, used for backtracking, undo, and DFS.
level:
  - "4"
priority: Medium
status: Done
---

Nested work often resumes in reverse order. A bracket matcher suspends the outer expression while it processes an inner pair. Depth-first traversal does the same with unexplored branches. The most recently suspended item must resume first, and a general list does not enforce that rule.

A stack fixes every mutation at one end, the top. `push` adds an item, `pop` removes it, and `peek` reads it in place. The last item pushed is therefore the first one popped (LIFO). Direct indexing and interior removal stay outside the contract.

**Core shape:** elements → one open end (the top) → last pushed is first popped

The visualization shows push and pop operations growing the stack upward while access remains fixed to the top cell.

````tabsdown
tab: Visualization

```steptrace
{"algorithm":"stack","capacity":6,"values":["A","B","C"]}
```

#### Representation and Invariants

A stack is an interface — push/pop/peek at one end — that admits two common backings.

- **[[Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic Array]] backing.** A contiguous array plus a `_size` counter. The top is the last used slot, index `_size - 1`. `Push` writes at `_size` and increments it, doubling the array when full; `Pop` decrements `_size` and returns that slot; `Peek` reads `_size - 1`. Nothing is ever shifted, so all three operations stay at the tail. This is what `Stack<T>` uses in .NET.
- **Singly-[[Computer Science/Data Structures/Linear Structures/LinkedList|linked list]] backing.** The head node is the top. `Push` prepends a new node; `Pop` unlinks the head; `Peek` reads it. Every push allocates one node. A pop detaches one, which becomes collectible once no references reach it; no bulk copy happens.

Two invariants define a valid state regardless of backing:

1. Only the top supports direct read or removal.
2. `push` and `pop` are inverses at the same end: after `push(x); pop()`, both the contents and the top pointer are exactly what they were before.

The stack API deliberately withholds random access and direct interior removal even when an array backing could provide them. That restriction enforces LIFO; the operation costs come from the backing implementation — a tail index for the array or a head pointer for the linked list. A workload that repeatedly needs buried elements belongs on a different structure.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Stack complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of elements currently stored in the stack"
    }
  },
  "resources": {
    "time": {
      "mode": "comparison",
      "entries": [
        {
          "kind": "approach",
          "label": "Push (linked / array amortized)",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Push (array resize worst case)",
          "formula": "O(n)",
          "curveId": "linear"
        },
        {
          "kind": "approach",
          "label": "Pop",
          "formula": "O(1)",
          "curveId": "constant"
        },
        {
          "kind": "approach",
          "label": "Peek",
          "formula": "O(1)",
          "curveId": "constant"
        }
      ]
    },
    "space": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Stored elements",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent structure",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Ordinary operation",
          "bounds": [
            {
              "kind": "curve",
              "role": "Auxiliary",
              "formula": "O(1)",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Array resize",
          "bounds": [
            {
              "kind": "curve",
              "role": "Temporary spike",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        }
      ]
    }
  }
}
```

Array-backed push is `O(1)` amortized but `O(n)` on the resizing push that doubles a full backing array.
````

# Where the Discipline Bites

The limits follow from fixing access to one end.

Repeated access to interior elements calls for an array, not a stack.

An array-backed stack can still stall on the push that doubles its [[Computer Science/Data Structures/Linear Structures/Dynamic Array|Dynamic Array]]. `new Stack<T>(capacity)` pre-sizes the storage and removes those growth spikes when maximum depth is predictable.

**Underflow on an empty stack.** `Pop` and `Peek` have nothing to return when the stack is empty, so .NET throws `InvalidOperationException`. Code that can reach an empty state uses `Count > 0`, `TryPop`, or `TryPeek`.

**The hardware call stack follows the same discipline.** Each function call pushes a frame, and each return pops it from a fixed-size region. Deep or unbounded recursion raises an uncatchable `StackOverflowException`. Converting to an explicit `Stack<T>` moves pending work to the heap, where available memory sets the limit. The translation may still need continuation state, and tree traversals often push children in reverse order to preserve visit order.

# Diagram and C# Implementation

> [!ABSTRACT]- Top-of-stack view
>
> ```mermaid
> graph TD
>   T[top] --> C[item c]
>   C --> B[item b]
>   B --> A[item a]
>   A --> Z[bottom]
> ```

> [!EXAMPLE]- C# usage of `Stack<T>`
>
> ```csharp
> var stack = new Stack<string>();
> stack.Push("A");
> stack.Push("B");
>
> stack.Peek();          // "B" — reads the top, leaves it in place
> stack.Pop();           // "B" — removes and returns the top
> stack.Pop();           // "A"
>
> if (stack.TryPop(out var value))   // false; guards against underflow
> {
>     // not reached — the stack is now empty
> }
> ```
>
> `Pop`/`Peek` throw `InvalidOperationException` on an empty stack. `TryPop`/`TryPeek` return `false` instead. `new Stack<T>(capacity)` pre-sizes the backing array to avoid resize spikes when the depth is known.

# References

- [`Stack<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.stack-1)
