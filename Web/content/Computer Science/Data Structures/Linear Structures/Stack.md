---
publish: true
created: 2026-07-12T14:27:20.421Z
modified: 2026-07-12T14:27:20.422Z
published: 2026-07-12T14:27:20.422Z
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

# Intro

A bracket matcher, an expression evaluator, and a depth-first traversal share one requirement: each time the work descends into a nested item, the item currently in progress has to be set aside and resumed later, and the one resumed first is always the most recently suspended. A general list can hold those pending items, but locating "the most recent one" and removing it is a discipline the list does not enforce.

A stack enforces it structurally. All access is fixed to a single end called the top: `push` adds an element there, `pop` removes and returns it, `peek` reads it without removing. Because every operation touches only that one end, the last element pushed is the first popped (LIFO), and all three operations are constant-time. The cost is that nothing else is reachable — no index, no bottom, no search. Reaching a buried element means popping everything above it.

**Core shape:** elements → one open end (the top) → last pushed is first popped → `O(1)` push/pop/peek → `O(n)` storage.

> [!NOTE] Visualization pending
> Planned StepTrace: a linear-container card showing push then pop acting only at the top — several pushes grow the top end, then pops return them in reverse (LIFO), with the interior never touched. No matching renderer exists in `engine.js` yet.

## Representation and invariants

A stack is an interface — push/pop/peek at one end — that admits two common backings.

- **[[Dynamic Array]] backing.** A contiguous array plus a `_size` counter. The top is the last used slot, index `_size - 1`. `Push` writes at `_size` and increments it, doubling the array when full; `Pop` decrements `_size` and returns that slot; `Peek` reads `_size - 1`. Nothing is ever shifted, so all three operations stay at the tail. This is what `Stack<T>` uses in .NET.
- **Singly-[[LinkedList|linked list]] backing.** The head node is the top. `Push` prepends a new node; `Pop` unlinks the head; `Peek` reads it. Every push allocates one node and every pop frees one, but no bulk copy ever happens.

Two invariants define a valid state regardless of backing:

1. Only the top is addressable. There is no operation to read or remove an interior or bottom element without removing everything above it first.
2. `push` and `pop` are inverses at the same end: after `push(x); pop()`, both the contents and the top pointer are exactly what they were before.

The structure deliberately discards random access, bottom access, and search — the same information a plain array keeps. That discard is what buys the constant-time top operations; a query that needs any of it belongs on a different structure.

## Complexity

| Operation | Array backing | Linked backing | Cause |
| --- | --- | --- | --- |
| `Push` | `O(1)` amortized, `O(n)` worst single | `O(1)` | Array append is a slot write plus counter bump; a full array first doubles and copies all `n` elements. A list allocates exactly one node. |
| `Pop` | `O(1)` | `O(1)` | Decrement the counter / unlink the head. No traversal, no shift. |
| `Peek` | `O(1)` | `O(1)` | Read the top slot or head node; no mutation. |

Structure space is `O(n)` for both backings. Auxiliary space per operation is `O(1)`, with one exception: an array-backed `Push` that triggers a resize momentarily holds both the old and doubled arrays, an `O(n)` spike on that single call. The `O(1)` on array push is therefore amortized, not worst-case — doubling makes any sequence of `n` pushes cost `O(n)` total, so the per-push average is constant even though an individual resize is linear. The linked backing gives a true per-call `O(1)` but pays a heap allocation and pointer-chasing cache cost on every push.

## Where the discipline bites

Each of these follows directly from fixing access to one end.

**Buried elements are unreachable.** Because only the top is addressable, finding or removing an element below it means popping every element above it into temporary storage and pushing them back — `O(n)` and destructive to the order. A workload that queries interior elements wants an array, not a stack.

**Array-backed push carries the resize spike.** The amortized `O(1)` hides an occasional `O(n)` copy. On a latency-sensitive path this shows up as an intermittent stall exactly on the push that doubles the [[Dynamic Array]]. Constructing with a known capacity (`new Stack<T>(capacity)`) pre-sizes the array and removes those spikes when the maximum depth is predictable.

**Underflow on an empty stack.** `Pop`/`Peek` with no elements has nothing to return; in .NET both throw `InvalidOperationException`. Guarding with `Count > 0` or using `TryPop`/`TryPeek` is required whenever emptiness is reachable — recursion base cases and drain loops both hit it.

**The hardware call stack is a stack too.** Each function call pushes a frame (locals, return address) and each return pops it, following the same LIFO discipline on a fixed-size region. Deep or unbounded recursion overflows it — `StackOverflowException`, uncatchable. Converting the recursion to an explicit `Stack<T>` moves those frames to the heap, where depth is bounded by available memory rather than the fixed call-stack size; the traversal logic is unchanged (push instead of recurse, pop instead of return).

## Reference drawer

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
> `Pop`/`Peek` throw `InvalidOperationException` on an empty stack; `TryPop`/`TryPeek` return `false` instead. `new Stack<T>(capacity)` pre-sizes the backing array to avoid resize spikes when the depth is known.

## Questions

> [!QUESTION]- Why is only the top of a stack reachable, and what does that buy?
> Every operation is fixed to a single end, so there is no addressing scheme for interior or bottom elements. That restriction is what keeps push, pop, and peek at `O(1)` — no shifting, no search, no index arithmetic. Reaching a buried element requires popping everything above it, which is the information the stack trades away.

> [!QUESTION]- Why is array-backed `Push` amortized `O(1)` rather than worst-case constant?
> Most pushes write one slot and bump a counter. When the backing array is full, that push allocates a doubled array and copies all `n` elements — an `O(n)` single call. Doubling makes any run of `n` pushes cost `O(n)` in total, so the per-push average stays constant, but a specific push can spike.

> [!QUESTION]- Why convert deep recursion into an explicit stack?
> The call stack is itself a LIFO stack on a fixed-size memory region; deep enough recursion overflows it with an uncatchable `StackOverflowException`. An explicit `Stack<T>` holds the same pending frames on the heap, where depth is bounded by available memory instead. The logic maps directly: push where the recursion would call, pop where it would return.

## References

- [`Stack<T>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.stack-1) — the .NET LIFO contract: `Push`, `Pop`, `Peek`, `TryPop`/`TryPeek`, and enumeration from top to bottom.
- [`Stack<T>` source in dotnet/runtime](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Collections/Generic/Stack.cs) — the array-plus-`_size` backing and the doubling resize logic behind amortized push.
- [Selecting a collection class](https://learn.microsoft.com/en-us/dotnet/standard/collections/selecting-a-collection-class) — Microsoft's guidance on choosing between `Stack<T>`, `Queue<T>`, and the other collections by access discipline.
