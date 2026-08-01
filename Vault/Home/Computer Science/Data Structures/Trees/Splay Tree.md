---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

An ordered dictionary may receive a strongly uneven access stream: a small working set is touched repeatedly while most keys stay cold. A balanced [[Home/Computer Science/Data Structures/Trees/Binary Search Tree|binary search tree]] gives every access the same `O(log n)` height guarantee, but it does not adapt when key `42` is requested a thousand times in a row.

A splay tree is a binary search tree that moves the last accessed node to the root. Search first follows the ordinary BST ordering; then **splaying** rotates the accessed node upward. The tree stores no height, color, or balance factor. Its shape is allowed to become temporarily skewed, so one operation can cost `O(n)`. Starting from an empty tree, a sequence of `m` operations while the tree contains at most `n` keys costs `O(m log n)`; an arbitrary initial tree adds its initial structural potential to that sequence bound.

The structure retains key order and parent-child topology, but not a fixed balance bound. Recent and repeated accesses reshape that topology so frequently used keys tend to remain near the root.

Press **Search** with the prefilled `60`: the path `100 → 50 → 75 → 60` performs zig-zag then zig and leaves `60` at the root.

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"splay-tree","values":[100,50,150,25,75,60],"value":60}
```

# State after an Access

Suppose the search path is `100 → 50 → 75 → 60`. Accessing `60` does not stop after finding it. Because `60` is the left child of `75` and `75` is the right child of `50`, the path forms a zig-zag. A right rotation around `75`, followed by a left rotation around `50`, lifts `60` two levels. The remaining zig rotation around `100` makes `60` the root.

Every rotation preserves the BST invariant: all keys in a node's left subtree remain smaller, and all keys in its right subtree remain larger. Splaying changes only topology, not sorted order.

An unsuccessful search splays the last non-null node visited. If the walk falls through a missing right child, that node is the missing key's predecessor boundary; if it falls through a missing left child, it is the successor boundary. Moving that boundary to the root makes a repeated miss cheap and shortens the starting path for nearby keys on the same side of the boundary.

The three cases are determined by the accessed node `x`, its parent `p`, and grandparent `g`:

| Shape | Rotations | Effect |
| --- | --- | --- |
| Zig | one rotation between `x` and the root | finishes when `p` is already the root |
| Zig-zig | rotate `p` over `g`, then `x` over `p` | shortens a same-direction path |
| Zig-zag | rotate `x` over `p`, then `x` over `g` | straightens and removes an alternating path |

Insert places a key as in a plain BST and splays the new node. Delete splays the target to the root, removes it, then joins the remaining left and right trees by splaying the maximum key of the left tree and attaching the right tree.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Splay Tree complexity",
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
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst time",
              "formula": "O(n)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Split / join",
          "bounds": [
            {
              "kind": "curve",
              "role": "Best time",
              "formula": "O(1)",
              "curveId": "constant"
            },
            {
              "kind": "curve",
              "role": "Amortized time",
              "formula": "O(log n)",
              "curveId": "log-n"
            },
            {
              "kind": "curve",
              "role": "Worst time",
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
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent space",
              "formula": "O(n) total",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1) iterative",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent space",
              "formula": "O(n) total (+1 node)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1) iterative",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Delete",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent space",
              "formula": "O(n) total (-1 node)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1) iterative",
              "curveId": "constant"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Split / join",
          "bounds": [
            {
              "kind": "curve",
              "role": "Persistent space",
              "formula": "O(n) total (nodes reused)",
              "curveId": "linear"
            },
            {
              "kind": "curve",
              "role": "Auxiliary space",
              "formula": "O(1) iterative",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Complexity

| Operation | Best time | Amortized time | Worst time | Persistent space | Auxiliary space |
| --- | --- | --- | --- | --- | --- |
| Search | `O(1)` | `O(log n)` | `O(n)` | `O(n)` total | `O(1)` iterative |
| Insert | `O(1)` | `O(log n)` | `O(n)` | `O(n)` total (+1 node) | `O(1)` iterative |
| Delete | `O(1)` | `O(log n)` | `O(n)` | `O(n)` total (-1 node) | `O(1)` iterative |
| Split / join | `O(1)` | `O(log n)` | `O(n)` | `O(n)` total (nodes reused) | `O(1)` iterative |

The amortized bound applies to a sequence, not to each operation independently. A chain-shaped tree can still force a full linear walk, but the rotations pay down structural potential so too many expensive operations cannot occur without many cheap ones around them.

# Where Adaptation Costs

Read operations mutate the tree. A lookup cannot safely run under a shared read lock because it rewrites parent and child pointers on the search path. Common iterators that retain an ancestor stack or cached path become stale after another access splays a node, and versioned enumerators may reject the mutation even though the key set did not change. An iterator anchored to stable node identities and advancing by live successor links is not inherently invalidated by splaying.

The missing height guarantee matters for latency-sensitive code. An [[Home/Computer Science/Data Structures/Trees/AVL Tree|AVL tree]] bounds every lookup by `O(log n)`; a splay tree only bounds the average cost across a sequence. This makes the splay tree a poor fit when one `O(n)` request is unacceptable, but a strong fit when locality and total sequence cost matter more than individual latency.

# References

- [Self-Adjusting Binary Search Trees](https://www.cs.cmu.edu/~sleator/papers/self-adjusting.pdf) — Sleator and Tarjan's original paper, including splaying cases, the access lemma, and amortized bounds.
- [Self-Adjusting Binary Search Trees: What Makes Them Tick?](https://arxiv.org/abs/1503.03105) — a later analysis of the structural properties behind the access lemma.
