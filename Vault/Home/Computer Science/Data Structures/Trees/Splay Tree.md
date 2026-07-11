---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Creation
publish: false
---

# Intro

An ordered dictionary may receive a strongly uneven access stream: a small working set is touched repeatedly while most keys stay cold. A balanced [[Binary Search Tree]] gives every access the same `O(log n)` height guarantee, but it does not adapt when key `42` is requested a thousand times in a row.

A splay tree is a binary search tree that moves the last accessed node to the root. Search first follows the ordinary BST ordering; then **splaying** rotates the accessed node upward. The tree stores no height, color, or balance factor. Its shape is allowed to become temporarily skewed, so one operation can cost `O(n)`. Starting from an empty tree, a sequence of `m` operations while the tree contains at most `n` keys costs `O(m log n)`; an arbitrary initial tree adds its initial structural potential to that sequence bound.

The structure retains key order and parent-child topology, but not a fixed balance bound. Recent and repeated accesses reshape that topology so frequently used keys tend to remain near the root.

> [!NOTE] Visualization pending
> Planned StepTrace: search for a deep key, then show the `zig`, `zig-zig`, and `zig-zag` rotations that move it to the root while preserving in-order key order.

## State after an access

Suppose the search path is `100 → 50 → 75 → 60`. Accessing `60` does not stop after finding it. Because `60` is the left child of `75` and `75` is the right child of `50`, the path forms a zig-zag. A right rotation around `75`, followed by a left rotation around `50`, lifts `60` two levels. The remaining zig rotation around `100` makes `60` the root.

Every rotation preserves the BST invariant: all keys in a node's left subtree remain smaller, and all keys in its right subtree remain larger. Splaying changes only topology, not sorted order.

The three cases are determined by the accessed node `x`, its parent `p`, and grandparent `g`:

| Shape | Rotations | Effect |
| --- | --- | --- |
| Zig | one rotation between `x` and the root | finishes when `p` is already the root |
| Zig-zig | rotate `p` over `g`, then `x` over `p` | shortens a same-direction path |
| Zig-zag | rotate `x` over `p`, then `x` over `g` | straightens and removes an alternating path |

Insert places a key as in a plain BST and splays the new node. Delete splays the target to the root, removes it, then joins the remaining left and right trees by splaying the maximum key of the left tree and attaching the right tree.

## Complexity

| Operation | Best time | Amortized time | Worst time | Persistent space | Auxiliary space |
| --- | --- | --- | --- | --- | --- |
| Search | `O(1)` | `O(log n)` | `O(n)` | `O(n)` total | `O(1)` iterative |
| Insert | `O(1)` | `O(log n)` | `O(n)` | one node per key | `O(1)` iterative |
| Delete | `O(1)` | `O(log n)` | `O(n)` | removes one node | `O(1)` iterative |
| Split / join | `O(1)` | `O(log n)` | `O(n)` | reuses existing nodes | `O(1)` iterative |

The amortized bound applies to a sequence, not to each operation independently. A chain-shaped tree can still force a full linear walk, but the rotations pay down structural potential so too many expensive operations cannot occur without many cheap ones around them.

## Where adaptation costs

Read operations mutate the tree. A lookup cannot safely run under a shared read lock because it rewrites parent and child pointers on the search path. Iterators also become invalid when another access splays a node, even if no key was inserted or removed.

The missing height guarantee matters for latency-sensitive code. An [[AVL Tree]] bounds every lookup by `O(log n)`; a splay tree only bounds the average cost across a sequence. This makes the splay tree a poor fit when one `O(n)` request is unacceptable, but a strong fit when locality and total sequence cost matter more than individual latency.

## Comparison

| Structure | Per-operation guarantee | Stored metadata | Adapts to locality | Read mutates state |
| --- | --- | --- | --- | --- |
| Splay tree | `O(log n)` amortized, `O(n)` worst | none beyond links | yes | yes |
| [[AVL Tree]] | `O(log n)` worst | height or balance factor | no | no |
| [[Red-Black Tree]] | `O(log n)` worst | color bit | no | no |
| [[HashMap]] | `O(1)` average exact lookup | buckets and hashes | no ordering | usually no |

Splay trees fit ordered workloads with temporal locality and sequence-level performance goals. AVL and red-black trees pay metadata and balancing work for predictable single-operation latency; hash tables become stronger when exact lookup matters and ordered operations do not.

## References

- [Self-Adjusting Binary Search Trees](https://www.cs.cmu.edu/~sleator/papers/self-adjusting.pdf) — Sleator and Tarjan's original paper, including splaying cases, the access lemma, and amortized bounds.
- [Self-Adjusting Binary Search Trees: What Makes Them Tick?](https://arxiv.org/abs/1503.03105) — a later analysis of the structural properties behind the access lemma.
