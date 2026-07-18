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

A [[Trie]] answers prefix queries in `O(L)`, but pays for it in memory: an array-backed node reserves one child slot per alphabet symbol `σ`, so a table keyed on Unicode allocates thousands of mostly-empty pointers at every node. Swapping the array for a `Dictionary<char, Node>` fixes the waste but hashes a character on every step and throws away the sorted order the array gave for free. A ternary search tree (TST) keeps the trie's shape while storing each node's children as a small **binary search tree keyed on the next character** — three pointers per node instead of `σ`, and the ordering survives.

Each node carries one split character and three links: `lo` for keys whose current character is smaller, `hi` for larger, and `eq` for equal — and *only* the `eq` link advances to the next character of the key. Walking a key alternates two motions: descend the per-position BST via `lo`/`hi` until the split character matches, then step forward one character down `eq`. The path that spells a key is still there, threaded through the `eq` links; the `lo`/`hi` links are the trie's "which child" decision turned into a comparison tree rather than an array index.

What it buys over a plain trie is memory proportional to the characters actually stored — no per-symbol reservation — while keeping lexicographic order and cheap prefix and near-neighbour queries. What it gives up is the trie's flat `O(L)`: each character now costs a short BST descent, so lookup is `O(L + log n)` rather than `O(L)`, and a bad insertion order can unbalance those per-position BSTs.

**Core shape:** trie positions linked by `eq`; at each position the alternatives form a BST split on the character via `lo`/`hi` → three pointers per node, not `σ` → `O(L + log n)` lookup that preserves order.

> [!NOTE] Visualization pending
> Planned StepTrace: a card that spells a key by alternating two moves — a `lo`/`hi` descent through the BST of alternatives at one string position, then an `eq` step that advances to the next character — and lights an end-of-key flag when the final `eq` node is reached. No matching renderer exists in `engine.js` yet.

# Representation and invariants

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

# Complexity

Bounds are in the key length `L`, the number of stored keys `n`, and the alphabet size `σ`. The per-position BST is what adds a logarithmic term the plain trie does not have.

| Operation | Time | Space | Cause |
| --- | --- | --- | --- |
| Search hit (key length `L`) | `O(L + log n)` avg, `O(L + n)` worst | `O(1)` | `L` matched `eq` steps plus a BST descent at each position; balanced BSTs give `log`, a sorted-order insertion degrades one to a chain. |
| Search miss | `O(log n)` avg | `O(1)` | A miss usually fails inside the first BST it descends, before spending the full `L`. |
| Insert | `O(L + log n)` avg | `O(L)` new nodes | One new node per previously-unseen character along the `eq` path; `lo`/`hi` position it in its BST. |
| Prefix collection | `O(L + m)` | `O(m)` output | Reach the prefix node, then in-order traverse its `eq` subtree to emit `m` completions in sorted order. |
| Whole structure | — | `O(total characters)` | Three pointers per node, one node per stored character — no `σ`-wide reservation. |

The memory column is the reason to choose a TST over an array-backed trie: it scales with the characters present, not with `σ × nodes`. The `O(L + log n)` lookup is the price — slightly slower per character than a trie's array indexing, but with none of the empty-slot overhead and with sorted order retained. Insertion order still matters: keys inserted in sorted order build a degenerate per-position BST, so shuffling the input (or balancing) keeps the `log` term honest.

# Where the three-way split earns its place

The `lo`/`eq`/`hi` structure is not just a memory trick — it makes queries that a hash-map trie cannot answer cheaply fall out naturally.

- **Sorted output for free.** An in-order traversal — recurse `lo`, visit the `eq` subtree with `Split` appended, recurse `hi` — emits every key in lexicographic order without a separate sort. A `Dictionary`-backed trie has to collect and sort its children at each node to do the same.
- **Near-neighbour and wildcard search.** Because each position is a comparison tree, a query can afford to explore `lo` *and* `hi` in addition to `eq`, which is exactly how partial-match (`.a.`-style wildcards) and edit-distance-one spell-check queries are implemented: at a wildcard or an allowed-mismatch position, descend all three links; elsewhere, follow only the matching branch.
- **Bounded fan-out.** Three pointers per node means a TST is often smaller than a `Dictionary<char, Node>` trie once you count the hash table's own overhead per node, while avoiding the array trie's `σ` reservation entirely.

Where it breaks is balance. Inserting keys in sorted order turns a per-position BST into a linked list, so a search that collides there degrades to `O(L + n)` — the same failure a plain [[Binary Search Tree]] has, now inside one string position. Randomising insertion order, or rebuilding the BSTs balanced, restores the `log` factor. And like any prefix structure, a TST only pays off when keys share prefixes and have a meaningful character sequence; opaque integer or float keys gain nothing from it.

# Reference drawer

> [!ABSTRACT]- TST holding `cat`, `car`, `cup`, `bat`
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

| Structure | Lookup | Prefix / ordered | Space | Child representation |
| --- | --- | --- | --- | --- |
| Ternary search tree | `O(L + log n)` | Prefix `O(L + m)`; in-order walk is sorted | `O(total chars)`, 3 pointers/node | BST split on the next character |
| Array-backed [[Trie]] | `O(L)` | Prefix `O(L + m)`; sorted by symbol order | `O(total chars × σ)` | Fixed `Node[σ]` array |
| Hash-map [[Trie]] | `O(L)` expected | Prefix `O(L + m)`; needs a sort for order | `O(total chars)` plus hash overhead | `Dictionary<char, Node>` |
| Radix / PATRICIA trie | `O(L)` | Prefix `O(L + m)`; sorted | `O(n)`, path-compressed | Substring-labelled edges |
| Balanced [[Binary Search Tree]] | `O(log n · L)` | Range and ordered scan; no cheap prefix set | `O(n)` | One key per node, full-key compares |

A TST is the trie to reach for when the alphabet is large or unknown (Unicode, arbitrary bytes) so the array trie's `σ`-wide slots are unaffordable, and you still want sorted output and near-neighbour queries that a hash-map trie can't do cheaply — it accepts an `O(L + log n)` lookup and a sensitivity to insertion order in exchange. An array-backed trie wins on a small fixed alphabet where flat `O(L)` and cache-friendly array indexing beat the pointer chasing. A radix trie wins when node count is the constraint and keys are long and sparse. A balanced BST keyed on whole strings is the choice when there are no shared prefixes to exploit and total order over complete keys is all that's needed.

# Questions

> [!QUESTION]- Why does only the `eq` link advance to the next character?
> `Lo` and `Hi` answer "is the current character smaller or larger than this node's split?" — they move sideways within the BST of alternatives *at the same string position*. `Eq` fires only when the character matches the split, meaning that position is resolved, so it is the one link that steps forward to the next character. Counting `eq` links from the root gives a node's character position exactly.

> [!QUESTION]- Why is a TST lookup `O(L + log n)` rather than the trie's `O(L)`?
> A plain trie resolves "which child" with a single array index or hash, `O(1)` per character, giving `O(L)`. A TST resolves it by descending a BST of the alternatives at that position, which costs `O(log n)` when balanced. Summed over the `L` matched positions the descents amortise, and the standard result is roughly `L + log n` character comparisons for a hit.

> [!QUESTION]- How does inserting keys in sorted order hurt a TST?
> Each string position is a BST built by insertion. Feeding characters in ascending order at some position makes that BST a right-leaning chain, so the `O(log n)` descent degrades to `O(n)` and lookups approach `O(L · n)`. Randomising the insertion order, or balancing the per-position BSTs, keeps the logarithmic factor — the same fix a degenerate [[Binary Search Tree]] needs.

> [!QUESTION]- What can a TST do that a `Dictionary`-backed trie cannot do cheaply?
> Emit keys in sorted order without a separate sort (in-order `lo`/`eq`/`hi` traversal), and run near-neighbour queries — partial-match wildcards and edit-distance-one spell-check — by descending `lo`, `eq`, and `hi` together at a mismatch position. A hash-map trie has no ordering among children, so both require extra work it doesn't natively support.

# References

- [Fast Algorithms for Sorting and Searching Strings](https://www.cs.princeton.edu/~rs/strings/) — Bentley and Sedgewick's paper introducing the ternary search tree, its `lo`/`eq`/`hi` node layout, and the partial-match and near-neighbour search algorithms.
- [Ternary search tree (Wikipedia)](https://en.wikipedia.org/wiki/Ternary_search_tree) — the three-link representation, the `O(L + log n)` analysis, and comparison against tries and hash tables.
- [TST.java (Princeton Algorithms)](https://algs4.cs.princeton.edu/52trie/TST.java.html) — a complete reference implementation with `keysWithPrefix` and longest-prefix-of operations built on the same recursion.
