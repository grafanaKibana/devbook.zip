---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A self-balancing BST using node colors for good-enough balance with cheap repairs, the default ordered map."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

An order book holds 100K price levels and an exchange feed inserts and removes thousands of entries per second, all while ordered iteration and min/max must stay fast. A plain [[Binary Search Tree]] keeps the order but degrades to `O(n)` height on adversarial or already-sorted insertion — exactly the pattern a live feed produces. An [[AVL Tree]] fixes that with a strict ±1 height balance, but pays for it with more rotations on every write. A red-black tree keeps the sorted structure balanced enough for logarithmic queries while capping the structural work per write to a small constant.

The state it persists is a [[Binary Search Tree]] plus one color bit per node — red or black — governed by a set of color rules rather than measured heights. The rules are looser than AVL's, so the tree can grow to twice its minimum height, but that slack is what lets an insert repair a violation with at most two rotations and a delete with at most three. The order and the key set are retained; the coloring itself is an internal artifact with no domain meaning, and it cannot be reconstructed from the keys alone once the mutation history is gone.

**Core shape:** ordered nodes + one color bit each → four color invariants bound height ≤ 2·log₂(n+1) → guaranteed `O(log n)` search/insert/delete with `O(1)` structural repair.

> [!NOTE] Visualization pending
> Planned StepTrace: a tree card showing an insert colored red, a red-red violation fixed by a recolor, and a case where recoloring is not enough so a rotation restores the black-height invariant. No matching renderer exists in `engine.js` yet.

## Representation and invariants

Each node stores its key, left/right/parent pointers, and a single color bit. `nil` leaves are treated as black sentinels, which lets every real node have two children and removes the null-check special cases from the fixup logic — this also folds in the classic fifth property (every `nil` leaf is black) as a property of the sentinel rather than a separate rule. Four invariants then define a valid state:

1. Every node is red or black.
2. The root is black.
3. A red node has two black children — no two reds appear consecutively on any path.
4. Every root-to-`nil` path crosses the same number of black nodes — the tree's *black-height*.

Invariant 4 makes the all-black skeleton perfectly balanced. Invariant 3 means the only way to lengthen a path beyond that skeleton is to interleave reds between blacks, which can at most double it. The shortest possible path is all black; the longest alternates black and red. So no path exceeds twice the black-height, giving height ≤ 2·log₂(n+1) and bounding every ordered query at `O(log n)`.

An insert colors the new node red and attaches it as a normal BST leaf. Red can only break invariant 3 — a red child under a red parent — never invariant 4, because a red node adds no blacks to any path. The repair depends on the **uncle** (the parent's sibling):

- **Uncle red** — recolor parent and uncle black and the grandparent red, then re-examine the grandparent. Each step is three field writes and no pointer surgery; the violation moves up two levels and may bubble to the root, where a final recolor of the root to black ends it.
- **Uncle black** — one or two rotations around the grandparent (the zig-zig and zig-zag shapes that also drive AVL rebalancing) plus a recolor, after which the fixup **terminates**.

The unbounded part of the work — recoloring up the tree — touches only color bits. The bounded part — rotation, the pointer surgery that actually reshapes the tree — is capped at two. Delete is the harder direction: removing a black node drops a black from one path and violates invariant 4, producing the "double-black" cases resolved by up to three rotations plus recoloring, but the same asymmetry holds — structural change stays near-constant.

## Complexity

| Operation | Worst-case time | Rotations | Recolorings | Aux space | Cause |
| --- | --- | --- | --- | --- | --- |
| Search | `O(log n)` | 0 | 0 | `O(1)` | height bounded at 2·log₂(n+1) by invariants 3 and 4 |
| Insert | `O(log n)` | ≤ 2 | `O(log n)` | `O(1)` iter / `O(log n)` rec | BST descent to a leaf, then a red-red fixup that may recolor up to the root but rotates at most twice |
| Delete | `O(log n)` | ≤ 3 | `O(log n)` | `O(1)` iter / `O(log n)` rec | descent plus double-black propagation up the tree; the rotation cases are the terminating ones |

Structure space is `O(n)` for the nodes plus one color bit each — a single bit stolen from a pointer's alignment padding in most implementations, so the coloring is effectively free. The per-operation auxiliary space in the table is `O(1)` for an iterative implementation holding a few node references, rising to `O(log n)` when the fixup recurses and consumes call stack proportional to the tree height.

The rotation caps and the height bound both hold unconditionally — no averaging, no amortization over a sequence, and no dependence on insertion order. The `O(log n)` recolorings are single-field writes, so the expensive structural operation stays constant while the cheap one absorbs the height.

## Where the looser balance shows

The slack that makes repairs cheap has a cost on reads. A red-black tree can reach 2·log₂(n+1) height where an AVL tree stays under 1.44·log₂ n, so a lookup can visit up to ~40% more nodes. On a read-dominated, mutation-rare workload that difference is the whole trade — the color invariants deliberately allow a taller tree in exchange for fewer rotations that will never happen.

Delete is where the invariants turn hostile to the implementer. An insert only ever faces a red-red violation, which is local; a delete that removes a black node breaks the black-height invariant globally along one path, and restoring it requires reasoning about the sibling's color and the colors of the sibling's children across several mirrored cases. This double-black fixup is a well-known source of bugs, and getting it subtly wrong leaves a tree that still satisfies BST order — so lookups return correct answers — while silently violating invariant 4 and losing the height guarantee.

Every mutation must re-establish all four invariants before it returns. A partial fixup that repairs invariant 3 but leaves two paths with different black counts produces a structurally valid BST whose balance guarantee no longer holds, and the defect surfaces only later as an unexpectedly deep path.

## Reference drawer

> [!ABSTRACT]- A valid coloring and its paths
> ```mermaid
> graph TD
>   A(("13 B")) --> B(("8 R"))
>   A --> C(("17 R"))
>   B --> D(("1 B"))
>   B --> E(("11 B"))
>   C --> F(("15 B"))
>   C --> G(("25 B"))
> ```
> Every root-to-leaf path crosses exactly two black nodes (black-height 2), the root is black, and no red node has a red child.

> [!EXAMPLE]- Insert fixup (C# sketch)
> ```csharp
> // After a normal BST insert of `node` colored Red, restore the invariants.
> private void FixInsert(Node node)
> {
>     while (node.Parent is { Color: Red })
>     {
>         var grandparent = node.Parent.Parent;
>         var uncle = node.Parent == grandparent.Left ? grandparent.Right : grandparent.Left;
>
>         if (uncle is { Color: Red })
>         {
>             // Case 1: recolor only, then re-examine the grandparent.
>             node.Parent.Color = Black;
>             uncle.Color = Black;
>             grandparent.Color = Red;
>             node = grandparent;
>         }
>         else
>         {
>             // Cases 2/3: rotate into a line, then rotate the grandparent and recolor. Terminates.
>             if (node == node.Parent.Right && node.Parent == grandparent.Left)
>             {
>                 node = node.Parent;
>                 RotateLeft(node);
>             }
>             else if (node == node.Parent.Left && node.Parent == grandparent.Right)
>             {
>                 node = node.Parent;
>                 RotateRight(node);
>             }
>
>             node.Parent.Color = Black;
>             grandparent.Color = Red;
>             if (node == node.Parent.Left) RotateRight(grandparent);
>             else RotateLeft(grandparent);
>         }
>     }
>
>     _root.Color = Black; // Invariant 2, and the exit for the recolor-to-root case.
> }
> ```
> Delete follows the mirror shape but branches on a `nil`-or-black "double-black" node and its sibling's colors across four cases; production code (`std::map`, `TreeMap`, `SortedSet<T>`) implements it in full rather than the sketch above.

## Questions

> [!QUESTION]- Why is a red-black tree's height at most 2·log₂(n+1)?
> Equal black counts on every root-to-leaf path (invariant 4) make the all-black skeleton balanced, and "no red parent with a red child" (invariant 3) means reds can at most double a path by interleaving between blacks. The longest path is therefore at most twice the shortest, so height stays within 2·log₂(n+1).

> [!QUESTION]- Why are new nodes inserted red rather than black?
> A red node adds no black to any path, so it can only break the "no two reds" invariant, which is a local violation fixable near the insertion point. A black insert would add a black to one path only, breaking the equal-black-height invariant along an entire root-to-leaf path — a global violation that is far more expensive to repair.

> [!QUESTION]- How can the rotation count per insert be bounded when the recoloring is not?
> Recoloring only rewrites color bits and can propagate up to the root, but it never reshapes the tree. Once the fixup reaches a black uncle, one or two rotations resolve the violation and the loop terminates. So the structural work (rotations) is capped at two per insert while the unbounded work (recoloring) stays cheap.

> [!QUESTION]- What makes red-black delete more error-prone than insert?
> Insert only ever repairs a local red-red violation. Delete can remove a black node and break the black-height invariant along a whole path, producing "double-black" cases that branch on the sibling's color and its children's colors. A subtle mistake leaves BST order intact — so lookups still return correct results — while silently losing the height guarantee.

## References

- [Guibas & Sedgewick, "A dichromatic framework for balanced trees" (1978)](https://sedgewick.io/wp-content/themes/sedgewick/papers/1978Dichromatic.pdf) — the paper introducing the red-black formulation and its invariants; primary source.
- [Red-Black BSTs (Princeton Algorithms)](https://algs4.cs.princeton.edu/33balanced/) — Sedgewick's left-leaning variant with a clear walkthrough of insert fixup and the 2-3 tree correspondence.
- [`SortedSet<T>` source (dotnet/runtime)](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Collections/src/System/Collections/Generic/SortedSet.cs) — the red-black tree backing .NET's ordered set and, via key-value pairs, `SortedDictionary`.
- [`SortedDictionary<TKey,TValue>` class](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.sorteddictionary-2) — API reference documenting the `O(log n)` guarantees and the contrast with `SortedList`.
