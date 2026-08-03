---
topic:
  - Computer Science
subtopic:
  - Data Structures
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

Swapping the array for a `Dictionary<char, Node>` fixes the waste but hashes a character on every step and throws away the sorted order the array gave for free. A ternary search tree (TST) keeps the trie's shape while storing each node's children as a small **binary search tree keyed on the next character** — three pointers per node instead of `σ`, and the ordering survives.

Each node carries one split character and three links: `lo` for keys whose current character is smaller, `hi` for larger, and `eq` for equal — and *only* the `eq` link advances to the next character of the key. Walking a key alternates two motions: descend the per-position BST via `lo`/`hi` until the split character matches, then step forward one character down `eq`. The path that spells a key is still there, threaded through the `eq` links; the `lo`/`hi` links are the trie's "which child" decision turned into a comparison tree rather than an array index.

What it buys over a plain trie is memory proportional to the characters actually stored — no per-symbol reservation — while keeping lexicographic order and cheap prefix and near-neighbour queries.

**Core shape:** trie positions linked by `eq`; at each position the alternatives form a BST split on the character via `lo`/`hi` → three pointers per node, not `σ`

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"ternary-search-tree","operations":[["insert","cat"],["insert","car"],["insert","cup"],["insert","bat"],["search","car"]]}
```

#### Representation and Invariants

A node holds a split character, an end-of-key flag, and three child links:

- `Split` — the character this node discriminates on.
- `Lo` / `Hi` — subtrees for keys whose character at *this same position* sorts before / after `Split`. Following them does **not** consume a character.
- `Eq` — the subtree for the *next* position, taken only after the current character equals `Split`. Following it consumes one character.
- `IsEnd` — true when the `eq`-chain from the root to this node spells a complete stored key.

The key is never stored. `cat` is present when, starting at the root, three matched-then-`eq` steps land on a node whose `Split` is `t` and whose `IsEnd` is set. A single trie level — "which character comes next here?" — is exactly one BST reachable through `lo`/`hi` links, and the answer to that question is the `eq` link out of the matching node.

Three invariants hold:

1. **BST order within a position.** For any node, every `Split` in its `Lo` subtree is smaller and every `Split` in its `Hi` subtree is larger, both compared at the same string position. This is what makes an in-order walk of `lo`/`eq`/`hi` emit keys in sorted order.
2. **`Eq` is the only depth-advancing link.** The number of `eq` links from the root to a node equals that node's character position. `Lo` and `Hi` stay at the current position; `Eq` moves forward exactly one.
3. **`IsEnd` is independent of children.** `car` and `cart` coexist: the node spelling `car` is flagged and still has an `eq` subtree carrying on to `t`.

The whole contract lives in the difference between "matched the split and there is more key" (follow `eq`) and "the character is smaller or larger" (follow `lo`/`hi` without advancing).

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Ternary Search Tree complexity",
  "variables": {
    "inputSize": {
      "symbol": "n",
      "description": "number of keys stored in the tree"
    },
    "lengthL": {
      "symbol": "L",
      "description": "length of the inserted or queried key"
    },
    "sizeS": {
      "symbol": "S",
      "description": "total characters emitted by prefix collection"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Search hit (key length L)",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(L + log n) avg, O(L + n) worst"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search miss",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(L + log n) avg, O(L + n) worst"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(L + log n) avg, O(L + n) worst"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prefix collection",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(L + log n + S) avg, O(L + n + S) worst"
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
          "operation": "Search hit (key length L)",
          "bounds": [
            {
              "kind": "text",
              "role": "Recursive stack",
              "formula": "O(L + log n) avg, O(L + n) worst"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search miss",
          "bounds": [
            {
              "kind": "text",
              "role": "Recursive stack",
              "formula": "O(L + log n) avg, O(L + n) worst"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Insert",
          "bounds": [
            {
              "kind": "text",
              "role": "New nodes and recursive stack",
              "formula": "O(L) new nodes plus O(L + log n) avg / O(L + n) worst stack"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prefix collection",
          "bounds": [
            {
              "kind": "text",
              "role": "Traversal and output",
              "formula": "O(L + log n) avg / O(L + n) worst stack plus O(S) output"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Whole structure",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(total input characters)"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# Where the Three-way Split Earns Its Place

The `lo`/`eq`/`hi` structure is not just a memory trick: it preserves character order while keeping fan-out fixed at three pointers per node.

- **Sorted output for free.** An in-order traversal — recurse `lo`, visit the `eq` subtree with `Split` appended, recurse `hi` — emits every key in lexicographic order without a separate sort. A `Dictionary`-backed trie has to collect and sort its children at each node to do the same.
- **Near-neighbour and wildcard search.** The comparison layout supports partial-match (`.a.`-style wildcards) and one-substitution spell-check queries: at a wildcard or an allowed-mismatch position, explore the alternative branches; elsewhere, follow only the matching branch. A hash-map trie can perform the same search by iterating its actual children, so this is not an asymptotic TST advantage. Insertion and deletion edits need extra query-index state in either structure because they change which character positions align.
- **Bounded fan-out.** Three pointers per node means a TST is often smaller than a `Dictionary<char, Node>` trie once you count the hash table's own overhead per node, while avoiding the array trie's `σ` reservation entirely.

Where it breaks is balance. Randomising insertion order, or rebuilding the BSTs balanced, restores the `log` factor. And like any prefix structure, a TST only pays off when keys share prefixes and have a meaningful character sequence; opaque integer or float keys gain nothing from it.

# Reference Drawer

> [!ABSTRACT]- TST holding `cat`, `car`, `cup`, `bat`
>
> ```mermaid
> graph TD
>   C["c"] -->|lo| B["b"]
>   C -->|eq| A1["a"]
>   A1 -->|eq| T1["t ✓ cat"]
>   A1 -->|hi| U["u"]
>   T1 -->|lo| R["r ✓ car"]
>   U -->|eq| P["p ✓ cup"]
>   B -->|eq| A2["a"]
>   A2 -->|eq| T2["t ✓ bat"]
> ```
> `eq` links (vertical) advance one character; `lo`/`hi` links stay at the same position and order the alternatives. `car` sits in the `lo` subtree of the `t` node because `r < t` at position 2; `cup` branches to `hi` at position 1 because `u > a`.

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class TernarySearchTree
> {
>     private sealed class Node
>     {
>         public char Split;
>         public Node? Lo, Eq, Hi;
>         public bool IsEnd;
>     }
>
>     private Node? _root;
>
>     public void Insert(string key)
>     {
>         if (!string.IsNullOrEmpty(key)) _root = Insert(_root, key, 0);
>     }
>
>     private static Node Insert(Node? node, string key, int d)
>     {
>         var c = key[d];
>         node ??= new Node { Split = c };
>
>         if (c < node.Split)          node.Lo = Insert(node.Lo, key, d);
>         else if (c > node.Split)     node.Hi = Insert(node.Hi, key, d);
>         else if (d < key.Length - 1) node.Eq = Insert(node.Eq, key, d + 1);
>         else                         node.IsEnd = true;
>
>         return node;
>     }
>
>     // Empty is never a stored key (Insert rejects it); the empty prefix matches everything.
>     public bool Contains(string key) =>
>         !string.IsNullOrEmpty(key) && Get(_root, key, 0) is { IsEnd: true };
>
>     public bool StartsWith(string prefix) =>
>         string.IsNullOrEmpty(prefix) || Get(_root, prefix, 0) is not null;
>
>     private static Node? Get(Node? node, string key, int d)
>     {
>         if (node is null) return null;
>         var c = key[d];
>         if (c < node.Split)          return Get(node.Lo, key, d);
>         if (c > node.Split)          return Get(node.Hi, key, d);
>         if (d < key.Length - 1)      return Get(node.Eq, key, d + 1);
>         return node;
>     }
> }
> ```
> Only the `else` branch — a matched character with more key remaining — recurses on `Eq` and advances `d`. `Contains` and `StartsWith` share the same walk; `Contains` additionally demands the terminal node's `IsEnd` flag.

# Comparison

Every structure below stores a set of string keys; they differ in the per-node child representation and what that costs.

| Structure | Character routing | Prefix / ordered support | Storage shape | Stronger case |
| --- | --- | --- | --- | --- |
| Ternary search tree | Compares the next character through `lo`/`eq`/`hi` | Native prefix walk; in-order traversal is sorted | One character and three child pointers per node | Large or unknown alphabets with ordered output |
| Array-backed [[Home/Computer Science/Data Structures/Trees/Trie\|Trie]] | Indexes a fixed child slot | Native prefix walk; symbol-order traversal is sorted | Reserves one child array at every node | Small fixed alphabets where direct indexing matters |
| Hash-map [[Home/Computer Science/Data Structures/Trees/Trie\|Trie]] | Hashes the next character | Native prefix walk; sorting requires ordered child keys | Allocates only present children plus map overhead | Sparse large alphabets without TST shape sensitivity |
| Radix / PATRICIA trie | Compares substring-labelled edges | Native prefix walk; sorted output requires symbol-ordered edges | Compresses single-child runs and stores edge labels | Long keys with many non-branching runs |
| Balanced [[Home/Computer Science/Data Structures/Trees/Binary Search Tree\|Binary Search Tree]] | Compares complete keys | Ordered and range scans; prefix search needs bounded key ranges | Stores one complete key per node | Total order over complete keys without shared-prefix structure |

A radix trie wins when node count is the constraint and keys are long and sparse. A balanced BST keyed on whole strings is the choice when there are no shared prefixes to exploit and total order over complete keys is all that's needed.

# Questions

> [!QUESTION]- Why does only the `eq` link advance to the next character?
> `Lo` and `Hi` answer "is the current character smaller or larger than this node's split?" — they move sideways within the BST of alternatives *at the same string position*. `Eq` fires only when the character matches the split, meaning that position is resolved, so it is the one link that steps forward to the next character. Counting `eq` links from the root gives a node's character position exactly.

> [!QUESTION]- What does a TST provide over a `Dictionary`-backed trie?
> Its in-order `lo`/`eq`/`hi` traversal emits keys in sorted order without sorting hash-map children, and every node has exactly three link slots instead of a hash-table allocation. Both structures can run wildcard or one-substitution searches by exploring alternative children; the TST's advantage is ordered layout and bounded fan-out, not a better asymptotic search bound.

# References

- [Fast Algorithms for Sorting and Searching Strings](https://www.cs.princeton.edu/~rs/strings/) — Bentley and Sedgewick's paper introducing the ternary search tree, its `lo`/`eq`/`hi` node layout, and the partial-match and near-neighbour search algorithms.
- [Ternary search tree (Wikipedia)](https://en.wikipedia.org/wiki/Ternary_search_tree) — three-link representation and comparison with tries and hash tables.
- [TST.java (Princeton Algorithms)](https://algs4.cs.princeton.edu/52trie/TST.java.html) — a complete reference implementation with `keysWithPrefix` and longest-prefix-of operations built on the same recursion.
