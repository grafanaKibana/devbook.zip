---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A prefix tree that stores strings as character paths for exact and prefix queries."
level:
  - "4"
priority: Medium
status: Ready to Repeat
publish: true
---

# Intro

An autocomplete box holds a set of strings and must answer a different question than "is this exact word present?": given the typed fragment `lap`, which stored keys begin with it? A [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash map]] hashes the whole key, so it can confirm exact membership but has no notion of a shared prefix — answering the fragment query means scanning all `n` keys. A trie (prefix tree) keys the set on the *sequence* of characters instead of a hash of the whole string, so the prefix becomes a location in the structure rather than a filter over every entry.

Each edge is labelled with a single character. The path from the root to a node spells a prefix, which means keys are represented by paths, not stored explicitly at the nodes. Every node carries a child map (or a fixed array with one slot per alphabet symbol) and an end-of-word flag marking where a complete key terminates. Words that share a prefix share the same path until they diverge: `car`, `card`, and `care` all reuse the `c → a → r` route and only branch at the fourth character.

What the structure gives up is compactness. Every distinct prefix becomes a node: a sparse child map stores only actual branches but pays for a map and node object at each prefix, while a fixed child array avoids hashing by reserving `σ` slots per node. Recovering a full key from a node requires retaining its traversal path or storing parent links, because the node itself holds only outgoing branches and an end marker.

**Core shape:** strings → character-labelled edges from one root → a path spells a prefix → an end-of-word flag marks a complete key

~~~~~tabsdown
tab: Visualization

```steptrace
{"algorithm":"trie","operations":[["insert","car"],["insert","card"],["insert","care"],["insert","cat"],["insert","dog"],["prefix","ca"],["search","car"]]}
```

#### Representation and Invariants

A node holds two pieces of state and nothing else:

- A mapping from the next character to a child node — a `Dictionary<char, Node>` when the alphabet is open or sparse, or a fixed `Node[σ]` array indexed by symbol when the alphabet is small and known (`children[c - 'a']`).
- A boolean `IsEnd` flag that is true exactly when the path from the root to this node is a stored key.

The key itself is never stored. `card` exists in the trie when the edges `c`, `a`, `r`, `d` can all be followed from the root *and* the node reached at `d` has `IsEnd` set. The same walk without the final flag check answers a prefix query: reaching the node is enough, because it certifies that at least one stored key starts with the fragment.

Three invariants hold in a valid trie:

1. The path from the root to any node spells the prefix that every key beneath that node shares. A node is reachable by exactly one character sequence.
2. `IsEnd` on a node is independent of whether that node has children. `car` and `card` coexist: the `r` node is both an end-of-word and an interior node on the way to `d`.
3. Insertion only ever adds nodes or sets a flag; it never relabels an existing edge, so previously inserted keys stay reachable.

The distinction between reaching a node and reaching a *flagged* node is the whole contract: exact search checks the flag, prefix search does not.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Trie complexity",
  "variables": {
    "alphabetSigma": {
      "symbol": "σ",
      "description": "alphabet size"
    },
    "capacity": {
      "symbol": "C",
      "description": "capacity, configured bound, or output count"
    },
    "lengthL": {
      "symbol": "L",
      "description": "key, string, path, or sequence length"
    },
    "parameterHUpper": {
      "symbol": "H",
      "description": "maximum height or remaining suffix length"
    },
    "universeSize": {
      "symbol": "U",
      "description": "size of the represented universe"
    },
    "vertexCount": {
      "symbol": "V",
      "description": "number of vertices"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Insert (key length L)",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(L)",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search / StartsWith",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "O(L)",
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
              "role": "Time",
              "formula": "O(L)",
              "curveId": "linear"
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
              "formula": "O(L + V + C)"
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
          "operation": "Insert (key length L)",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(L) new sparse-map nodes; O(L · σ) child slots with fixed arrays"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search / StartsWith",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1)",
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
              "role": "Space",
              "formula": "O(L) stack",
              "curveId": "linear"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Prefix collection",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "O(H + C) traversal stack and output"
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
              "formula": "O(U) nodes and child entries with sparse maps; O(U · σ) child slots with fixed arrays"
            }
          ]
        }
      ]
    }
  }
}
```
~~~~~

# When Fixed Child Arrays Hurt

The wasted memory is structural, not incidental. An array-backed node reserves `σ` child slots even when a node has one child, so a long chain of single-character branches — the tail of a rare word — allocates a nearly empty array at every step.

The same layout fixes the alphabet at construction. An array-indexed trie using `children[c - 'a']` silently breaks on uppercase, digits, Unicode, or emoji: the index lands outside the 26-slot array or aliases the wrong slot. The character domain has to be decided up front, and input normalized (for example, lower-cased) identically on insert and query, or the two operations walk different paths for the same word.

A trie pays off when the key has a useful symbol sequence and the workload queries that sequence — strings, byte sequences, IP prefixes, or integers treated as bit strings for longest-prefix matching. Opaque IDs queried only by exact equality gain nothing from the prefix structure; for that workload, a hash map fits.

Deletion is the operation that exposes the shared-path invariant. Removing `car` when `card` is also present must clear the `r` node's `IsEnd` flag but leave the node itself, because `d` still hangs off it. Pruning may only remove nodes that have become both unflagged and childless, walking back up until that condition fails. Implementations that skip the prune and merely tombstone the flag leak nodes under churn.

# Reference Drawer

> [!ABSTRACT]- Shared-prefix paths for `car`, `card`, `care`
>
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
>
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

# Comparison

Every structure below stores a set of keys; they differ in whether prefixes and ordering survive, and in memory.

| Structure |
| --- |
| Trie |
| [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap | Membership only |
| Radix / PATRICIA trie |
| [[Home/Computer Science/Algorithms/Search Algorithms/String Matching/Aho-Corasick | All patterns plus fallback transitions |

A [[Home/Computer Science/Data Structures/Hash-based Structures/HashMap|hash map]] wins when only exact membership matters and memory is tight: it drops prefix and ordering entirely and avoids a node per distinct prefix. A radix tree is the trie to pick when the plain trie's node count is the problem — it compresses single-child chains without changing the query semantics. [[Home/Computer Science/Algorithms/Search Algorithms/String Matching/Aho-Corasick|Aho-Corasick]] extends the trie with failure links to scan one text against many patterns at once, a different workload from single-key lookup.

# Questions

> [!QUESTION]- How does the same walk serve both exact search and a prefix query?
> Both follow the query's characters edge by edge from the root. Exact search additionally requires the terminal node's end-of-word flag, proving the path is a complete stored key. A prefix query stops at "did the path exist", since reaching the node already certifies that at least one stored key starts with the fragment.

> [!QUESTION]- Why can deleting one key not simply remove the nodes along its path?
> Nodes are shared. `car` and `card` share the `c → a → r` path, so deleting `car` must clear the `r` node's end-of-word flag but keep the node, because `d` still descends from it. Only nodes that become both unflagged and childless may be pruned, walking up until that condition stops holding.

# References

- [Trie (Wikipedia)](https://en.wikipedia.org/wiki/Trie) — formal definition, the array-versus-map node layout, and the radix/PATRICIA compression variant.
- [PATRICIA — Practical Algorithm To Retrieve Information Coded In Alphanumeric](https://dl.acm.org/doi/10.1145/321479.321481) — Donald Morrison's original path-compressed trie, the basis of the radix tree.
- [Aho-Corasick algorithm](https://cp-algorithms.com/string/aho_corasick.html) — building a trie of patterns and adding failure links to turn it into a multi-pattern matching automaton.
- [Ternary search trees](https://www.cs.princeton.edu/~rs/strings/) — Bentley and Sedgewick's alternative node layout that trades the `σ`-wide array for a small BST per node to cut trie memory.
