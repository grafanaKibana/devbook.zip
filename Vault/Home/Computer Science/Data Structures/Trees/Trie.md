---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A prefix tree storing strings as character paths, giving O(k) lookup and prefix queries."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

An autocomplete box holds a set of strings and must answer a different question than "is this exact word present?": given the typed fragment `lap`, which stored keys begin with it? A [[HashMap]] hashes the whole key, so it can confirm exact membership but has no notion of a shared prefix — answering the fragment query means scanning all `n` keys. A trie (prefix tree) keys the set on the *sequence* of characters instead of a hash of the whole string, so the prefix becomes a location in the structure rather than a filter over every entry.

Each edge is labelled with a single character. The path from the root to a node spells a prefix, which means keys are represented by paths, not stored explicitly at the nodes. Every node carries a child map (or a fixed array with one slot per alphabet symbol) and an end-of-word flag marking where a complete key terminates. Words that share a prefix share the same path until they diverge: `car`, `card`, and `care` all reuse the `c → a → r` route and only branch at the fourth character.

What the structure gives up is compactness. Because every node reserves room for a child per alphabet symbol, the same keys occupy far more memory than a hash set, and nothing about a node identifies which full key it belongs to without walking back to the root.

**Core shape:** strings → character-labelled edges from one root → a path spells a prefix → an end-of-word flag marks a complete key → `O(L)` per operation in the key length `L`, independent of how many keys are stored.

> [!NOTE] Visualization pending
> Planned StepTrace: a prefix-tree card spelling characters along the edges from the root, showing two words sharing a prefix follow the same path until they diverge, and an end-of-word flag lighting up as each complete key is inserted. No matching renderer exists in `engine.js` yet.

## Representation and invariants

A node holds two pieces of state and nothing else:

- A mapping from the next character to a child node — a `Dictionary<char, Node>` when the alphabet is open or sparse, or a fixed `Node[σ]` array indexed by symbol when the alphabet is small and known (`children[c - 'a']`).
- A boolean `IsEnd` flag that is true exactly when the path from the root to this node is a stored key.

The key itself is never stored. `card` exists in the trie when the edges `c`, `a`, `r`, `d` can all be followed from the root *and* the node reached at `d` has `IsEnd` set. The same walk without the final flag check answers a prefix query: reaching the node is enough, because it certifies that at least one stored key starts with the fragment.

Three invariants hold in a valid trie:

1. The path from the root to any node spells the prefix that every key beneath that node shares. A node is reachable by exactly one character sequence.
2. `IsEnd` on a node is independent of whether that node has children. `car` and `card` coexist: the `r` node is both an end-of-word and an interior node on the way to `d`.
3. Insertion only ever adds nodes or sets a flag; it never relabels an existing edge, so previously inserted keys stay reachable.

The distinction between reaching a node and reaching a *flagged* node is the whole contract: exact search checks the flag, prefix search does not.

## Complexity

Every bound is stated in the key length `L` and, for the collection variant, the number of matching descendants `m`. The stored-key count `n` does not appear in any per-operation time bound.

| Operation | Time | Space | Cause |
| --- | --- | --- | --- |
| Insert (key length `L`) | `O(L)` | `O(L · σ)` new node slots, worst case | One node created per previously-unseen character; the walk depends on `L`, not on the `n` keys already present. |
| Search / `StartsWith` | `O(L)` | `O(1)` | Follow one labelled edge per character. A balanced [[Binary Search Tree]] instead needs `O(log n · L)`: it descends `O(log n)` nodes and each comparison reads up to `L` characters. |
| Delete | `O(L)` | `O(L)` stack | Walk down to clear `IsEnd`, then prune now-childless nodes back up the path. |
| Prefix collection | `O(L + m)` | `O(m)` output | Reach the prefix node in `O(L)`, then traverse the matching subtree of `m` nodes to emit completions. |
| Whole structure | — | `O(total characters × σ)` | Every node reserves a child slot per alphabet symbol `σ`, whether or not those branches exist. |

The length-not-count property is the reason a trie is chosen: adding millions more keys never lengthens the walk for an existing query, because the path is fixed by the query string alone. The cost is paid in the space column — the `σ`-wide child slot at every node makes the structure memory-heavy in exchange for that flat lookup.

## When the per-symbol layout hurts

The wasted memory is structural, not incidental. An array-backed node reserves `σ` child slots even when a node has one child, so a long chain of single-character branches — the tail of a rare word — allocates a nearly empty array at every step. A **radix (PATRICIA) trie** collapses each such single-child chain into one edge labelled with the whole substring, cutting node count sharply on sparse, long keys while preserving the same `O(L)` walk.

The same layout fixes the alphabet at construction. An array-indexed trie using `children[c - 'a']` silently breaks on uppercase, digits, Unicode, or emoji: the index lands outside the 26-slot array or aliases the wrong slot. The character domain has to be decided up front, and input normalized (for example, lower-cased) identically on insert and query, or the two operations walk different paths for the same word.

A trie also only applies to keys with a meaningful sequence — strings, byte sequences, IP prefixes. Arbitrary comparable keys with no shared-prefix structure (say, opaque integers or floating-point values) gain nothing: there is no prefix to share, so every key occupies its own full-depth path and the structure degenerates to a wasteful list. For those, a hash map or a comparison tree fits.

Deletion is the operation that exposes the shared-path invariant. Removing `car` when `card` is also present must clear the `r` node's `IsEnd` flag but leave the node itself, because `d` still hangs off it. Pruning may only remove nodes that have become both unflagged and childless, walking back up until that condition fails. Implementations that skip the prune and merely tombstone the flag leak nodes under churn.

## Reference drawer

> [!ABSTRACT]- Shared-prefix paths for `car`, `card`, `care`
> ```mermaid
> graph TD
>   R((root)) -->|c| C[c]
>   C -->|a| A[a]
>   A -->|r| RR["r ✓"]
>   RR -->|d| D["d ✓"]
>   RR -->|e| E["e ✓"]
> ```
> A check mark marks an end-of-word node. The `r` node is flagged (the key `car`) and also an interior node on the way to `card` and `care`.

> [!EXAMPLE]- C# implementation
> ```csharp
> public sealed class Trie
> {
>     private sealed class Node
>     {
>         public readonly Dictionary<char, Node> Children = new();
>         public bool IsEnd;
>     }
>
>     private readonly Node _root = new();
>
>     public void Insert(string word)
>     {
>         var node = _root;
>         foreach (var c in word)
>         {
>             if (!node.Children.TryGetValue(c, out var next))
>             {
>                 node.Children[c] = next = new Node();
>             }
>
>             node = next;
>         }
>
>         node.IsEnd = true;
>     }
>
>     public bool Search(string word) => Walk(word) is { IsEnd: true };
>
>     public bool StartsWith(string prefix) => Walk(prefix) is not null;
>
>     private Node? Walk(string s)
>     {
>         var node = _root;
>         foreach (var c in s)
>         {
>             if (!node.Children.TryGetValue(c, out var next))
>             {
>                 return null;
>             }
>
>             node = next;
>         }
>
>         return node;
>     }
> }
> ```
> `Search` and `StartsWith` share the same walk; the only difference is that `Search` requires the terminal node's `IsEnd` flag while `StartsWith` accepts any reached node. A `Dictionary` child map keeps memory proportional to actual branches; a `Node[26]` array is faster per step but reserves all slots.

## Comparison

Every structure below stores a set of keys; they differ in whether prefixes and ordering survive, and in memory.

| Structure | Exact lookup | Prefix / ordered query | Space | Information retained |
| --- | --- | --- | --- | --- |
| Trie | `O(L)` | Prefix in `O(L + m)`; a DFS visiting children in symbol order yields sorted keys | `O(total chars × σ)` | Shared-prefix structure, lexicographic order |
| [[HashMap]] | `O(1)` expected, `O(L)` to hash the key | None — no prefix or ordered scan | `O(n)`, far smaller | Membership only |
| Radix / PATRICIA trie | `O(L)` | Prefix in `O(L + m)`; sorted | `O(n)`, fewer nodes than a plain trie | Same as trie, path-compressed |
| [[Aho-Corasick]] | `O(L)` per pattern | Multi-pattern text scan via failure links | Trie space + failure links | All patterns plus fallback transitions |

A trie is the structure when prefixes are the query — autocomplete, longest-prefix routing, shared-prefix key sets — because its `O(L)` lookup stays flat as `n` grows and the tree already enumerates completions and sorted order for free. A [[HashMap]] wins when only exact membership matters and memory is tight: it drops prefix and ordering entirely but costs a fraction of the space. A radix tree is the trie to pick when the plain trie's node count is the problem — it compresses single-child chains without changing the query semantics. [[Aho-Corasick]] extends the trie with failure links to scan one text against many patterns at once, a different workload from single-key lookup.

## Questions

> [!QUESTION]- Why is a trie lookup `O(L)` and not affected by the number of stored keys?
> The walk follows one labelled edge per character of the query, so the work equals the key length `L`. The path a query traces is fixed by the query string; adding more keys creates other branches but never lengthens that path. A comparison tree, by contrast, reads the key `O(log n)` times as `n` grows.

> [!QUESTION]- How does the same walk serve both exact search and a prefix query?
> Both follow the query's characters edge by edge from the root. Exact search additionally requires the terminal node's end-of-word flag, proving the path is a complete stored key. A prefix query stops at "did the path exist", since reaching the node already certifies that at least one stored key starts with the fragment.

> [!QUESTION]- Why can deleting one key not simply remove the nodes along its path?
> Nodes are shared. `car` and `card` share the `c → a → r` path, so deleting `car` must clear the `r` node's end-of-word flag but keep the node, because `d` still descends from it. Only nodes that become both unflagged and childless may be pruned, walking up until that condition stops holding.

> [!QUESTION]- What does a radix (PATRICIA) trie change about the representation, and why?
> It collapses each chain of single-child nodes into one edge labelled with the whole substring. The plain trie reserves a `σ`-wide child slot at every node, so long sparse keys waste memory on near-empty arrays; compressing the chains cuts node count while keeping the `O(L)` walk and the same prefix and ordering queries.

## References

- [Trie (Wikipedia)](https://en.wikipedia.org/wiki/Trie) — formal definition, the array-versus-map node layout, and the radix/PATRICIA compression variant.
- [PATRICIA — Practical Algorithm To Retrieve Information Coded In Alphanumeric](https://dl.acm.org/doi/10.1145/321479.321481) — Donald Morrison's original path-compressed trie, the basis of the radix tree.
- [Aho-Corasick algorithm](https://cp-algorithms.com/string/aho_corasick.html) — building a trie of patterns and adding failure links to turn it into a multi-pattern matching automaton.
- [Ternary search trees](https://www.cs.princeton.edu/~rs/strings/) — Bentley and Sedgewick's alternative node layout that trades the `σ`-wide array for a small BST per node to cut trie memory.
