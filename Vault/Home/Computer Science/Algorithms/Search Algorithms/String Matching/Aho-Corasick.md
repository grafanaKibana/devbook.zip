---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finds all occurrences of many patterns in one text pass using a trie with failure links."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

A signature engine may scan one byte stream against thousands of fixed, non-empty patterns. Running a separate matcher for each pattern repeats the same prefix work.

Aho-Corasick compiles the dictionary into one trie augmented with **failure links** and **output links**. Each text character advances a single automaton state. Shared trie paths reuse common prefixes, failure links recover the longest viable suffix after a miss, and output links enumerate every pattern ending at the current position. The scan never rewinds the text.



~~~~~tabsdown
tab: Visualization


```steptrace
{"algorithm":"aho-corasick","patterns":["he","she","his","hers"],"text":"ushers"}
```





The automaton is a trie of the pattern set plus two kinds of back-edge.

**Goto (the trie).** Every pattern is inserted into a trie; each node is a prefix shared by one or more patterns, and a node that completes a pattern is marked with the pattern ids ending there. From a node, a text character either follows a child edge or has none — a miss.

**Failure links.** For the node representing string `s`, the failure link points to the node for the longest proper suffix of `s` that is itself a node in the trie — equivalently, a prefix of some pattern. This is KMP's longest-prefix-suffix table generalized from one string onto the whole tree. On a miss, following failure links shortens the matched suffix until a child on the current character exists or the root is reached. The root is the empty suffix and always exists, so the fallback terminates.

**Output links.** A single state can complete several patterns at once, because a shorter pattern may be a suffix of a longer one — `he` is a suffix of the state reached by `she`. Each state's output link points to the nearest failure-reachable state that ends a pattern; walking that chain at every visited state emits all patterns ending there. The link is set by the same suffix rule as the failure link: a state's output is its failure target if that target ends a pattern, otherwise the failure target's own output.

**Construction.** Failure and output links are filled by one breadth-first pass from the root. A node's failure target always sits at strictly smaller depth, so it is finalized before the node needs it; a depth-first order would read unfinished links. The root's direct children fail to the root.



The dictionary `{ he, she, his, hers }` compiles to a trie with a handful of failure and output links. Two are decisive: the state for `she` fails to the state for `he` — its longest proper suffix that is also a prefix in the trie — and because `he` ends a pattern, `she`'s output link points there.

Reading `ushers` left to right, the automaton stays at the root through `u`, then walks `s → sh → she` on the next three characters. Arriving at `she` after the `e`, the state itself ends a pattern, so `she` is reported at `[1..3]`. Its output link then leads to `he`, which also ends here, reported at `[2..3]` — a nested match that shares the same end position and is invisible without the output walk. On the next character `r`, the state `she` has no child, so the automaton follows the failure link to `he` and takes `he → her` on `r`; the final `s` reaches `hers`, reported at `[2..5]`.

The invariant makes each of those steps legal: after reading `i` characters the automaton is always at the state whose string is the longest suffix of the first `i` characters that is still a prefix of some pattern. Every pattern occurrence ending at position `i` is a suffix of that state's string, and the output chain lists exactly those. That is why a single left-to-right pass, with no rewinding of the text, sees every match.

tab: Complexity

```complexity
{
  "version": 2,
  "label": "Aho-Corasick complexity",
  "variables": {
    "alphabetSigma": {
      "symbol": "σ",
      "description": "alphabet size"
    },
    "inputSize": {
      "symbol": "n",
      "description": "length of the searched text"
    },
    "lengthL": {
      "symbol": "l",
      "description": "maximum pattern length and failure-chain depth"
    },
    "matchCount": {
      "symbol": "z",
      "description": "number of reported matches"
    },
    "totalPatternLength": {
      "symbol": "m",
      "description": "total length of all patterns"
    }
  },
  "resources": {
    "time": {
      "mode": "operations",
      "entries": [
        {
          "kind": "operation",
          "operation": "Build automaton",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "O(m·l) sparse, Θ(m·σ) dense"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Time",
              "formula": "Θ(n + z)",
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
          "operation": "Build automaton",
          "bounds": [
            {
              "kind": "text",
              "role": "Space",
              "formula": "Θ(m) sparse, Θ(m·σ) dense"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search",
          "bounds": [
            {
              "kind": "curve",
              "role": "Space",
              "formula": "O(1) beyond the automaton",
              "curveId": "constant"
            }
          ]
        }
      ]
    }
  }
}
```

The build rows distinguish a sparse transition map from a dense alphabet-wide table. The automaton is reusable structure space; a search adds only the current state and output cursor beyond it.
~~~~~

# Where it Stops Fitting



**Overlapping and nested matches.** The automaton reports every occurrence, including `aa` at offsets 0 and 1 in `aaa`, and `he` ending inside `she`. Nested matches surface through the output chain. Emitting only the pattern attached to the current trie node leaves the scan correctly positioned but loses suffix matches: `{ he, she, hers }` over `ushers` would report `she` and `hers`, but not `he`. Dictionaries without suffix-related patterns hide this defect.

**A fixed dictionary.** Failure and output links depend on the complete pattern set. Adding a pattern can change suffix relationships across the trie, so a conventional implementation rebuilds the links. Frequently changing dictionaries need a dynamic variant or a different design.

# Diagram and C# Implementation

> [!ABSTRACT]- Construction and search control flow
>
> ```mermaid
> flowchart TD
>   A[Insert every pattern into a trie] --> B[BFS from root sets each failure link]
>   B --> C[Set each output link along the failure chain]
>   C --> D[Start at root and read text left to right]
>   D --> E{current state has a child for the text char}
>   E -->|Yes| F[Follow the child edge]
>   E -->|No| G{at root}
>   G -->|Yes| H[Stay at root]
>   G -->|No| I[Follow the failure link and retry the char]
>   I --> E
>   F --> J[Walk the output chain and emit every pattern ending here]
>   H --> K[Advance to the next text char]
>   J --> K
>   K --> D
> ```

> [!EXAMPLE]- C# implementation
>
> ```csharp
> public sealed class AhoCorasick
> {
>     private sealed class Node
>     {
>         public readonly Dictionary<char, int> Next = new();
>         public int Fail;               // failure link (node index)
>         public int Output = -1;        // nearest failure-reachable pattern end
>         public readonly List<int> Ends = new(); // pattern ids ending exactly here
>     }
>
>     private readonly List<Node> _nodes = new() { new Node() }; // index 0 = root
>
>     public void Add(string pattern, int id)
>     {
>         if (pattern.Length == 0)
>         {
>             throw new ArgumentException("Patterns must not be empty.", nameof(pattern));
>         }
>
>         var node = 0;
>         foreach (var c in pattern)
>         {
>             if (!_nodes[node].Next.TryGetValue(c, out var next))
>             {
>                 next = _nodes.Count;
>                 _nodes.Add(new Node());
>                 _nodes[node].Next[c] = next;
>             }
>
>             node = next;
>         }
>
>         _nodes[node].Ends.Add(id);
>     }
>
>     public void Build()
>     {
>         var queue = new Queue<int>();
>         foreach (var child in _nodes[0].Next.Values)
>         {
>             _nodes[child].Fail = 0;
>             queue.Enqueue(child);
>         }
>
>         while (queue.Count > 0)
>         {
>             var u = queue.Dequeue();
>             foreach (var (c, v) in _nodes[u].Next)
>             {
>                 var f = _nodes[u].Fail;
>                 while (f != 0 && !_nodes[f].Next.ContainsKey(c))
>                 {
>                     f = _nodes[f].Fail;
>                 }
>
>                 _nodes[v].Fail = _nodes[f].Next.TryGetValue(c, out var t) ? t : 0;
>                 var fail = _nodes[v].Fail;
>                 _nodes[v].Output = _nodes[fail].Ends.Count > 0 ? fail : _nodes[fail].Output;
>                 queue.Enqueue(v);
>             }
>         }
>     }
>
>     public IEnumerable<(int End, int PatternId)> Search(string text)
>     {
>         var node = 0;
>         for (var i = 0; i < text.Length; i++)
>         {
>             var c = text[i];
>             while (node != 0 && !_nodes[node].Next.ContainsKey(c))
>             {
>                 node = _nodes[node].Fail;
>             }
>
>             _nodes[node].Next.TryGetValue(c, out node); // stays at root (0) when no edge exists
>
>             for (var o = node; o != -1; o = _nodes[o].Output)
>             {
>                 foreach (var id in _nodes[o].Ends)
>                 {
>                     yield return (i, id);
>                 }
>             }
>         }
>     }
> }
> ```
> `Build` runs once after the final `Add`. `Search` yields `(endIndex, patternId)` for every occurrence. The inner `for` walks the output chain, so overlapping and nested matches are all emitted. A dense `char`-indexed array could replace `Dictionary<char, int>` to trade memory for a faster transition.

# References

- [Aho and Corasick, "Efficient String Matching: An Aid to Bibliographic Search" (1975)](https://dl.acm.org/doi/10.1145/360825.360855)
- [Aho-Corasick algorithm (cp-algorithms)](https://cp-algorithms.com/string/aho_corasick.html)
