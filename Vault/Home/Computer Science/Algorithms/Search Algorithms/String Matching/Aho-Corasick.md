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

A signature engine scans a byte stream — packets, log lines, a file — against a fixed dictionary of `k` non-empty patterns and must report every occurrence of every pattern.

The patterns share structure. Any two that begin `sh…` walk the same first edges, and a shorter pattern can be a suffix of the state a longer one reaches. Aho-Corasick compiles the whole dictionary once into a single finite automaton — a trie of all patterns carrying **failure links** and **output links** — then drives the text through it one character at a time without ever rewinding. Shared transitions avoid running one matcher per pattern; reporting still visits every occurrence emitted through the output chain.



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
      "description": "number of input elements or states"
    },
    "lengthL": {
      "symbol": "L",
      "description": "key, string, path, or sequence length"
    },
    "matchCount": {
      "symbol": "z",
      "description": "number of reported matches"
    },
    "totalPatternLength": {
      "symbol": "M",
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
              "formula": "O(M·L) sparse, Θ(M·σ) dense"
            }
          ]
        },
        {
          "kind": "operation",
          "operation": "Search",
          "bounds": [
            {
              "kind": "text",
              "role": "Time",
              "formula": "Θ(n + z)"
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
              "formula": "Θ(M) sparse, Θ(M·σ) dense"
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



**Overlapping and nested matches.** The automaton reports every occurrence of every pattern, including matches that overlap (`aa` in `aaa` at offsets 0 and 1) and matches nested inside a longer one (`he` ending inside `she`). Those extra matches surface only through the output-link walk. Reporting a pattern only when the current node itself ends one leaves the scan correctly positioned but silently drops the nested cases: on `{ he, she, hers }` over `ushers` it reports `she` and `hers` and loses `he`. The defect is invisible on any dictionary where no pattern is a suffix of another, which is what makes it easy to ship.

**A fixed dictionary.** Failure and output links are global properties of the whole pattern set, resolved by the single construction BFS. Adding a pattern changes suffix relationships throughout the trie, so the links must be recomputed — an insertion after construction means rebuilding the automaton, or maintaining a more complex dynamic variant.

# Reference Drawer

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
> `Build` runs once after the final `Add`. `Search` yields `(endIndex, patternId)` for every occurrence; the inner `for` walks the output chain, so overlapping and nested matches are all emitted. A dense `char`-indexed array could replace `Dictionary<char, int>` to trade memory for a faster transition.

# Questions

> [!QUESTION]- How does the shared trie avoid scanning every pattern separately?
> Common prefixes collapse into shared paths, so each text character drives one automaton transition rather than one comparison per pattern. Output links then enumerate every pattern ending at the reached state.

> [!QUESTION]- What does a failure link point to, and what invariant holds after reading `i` characters?
> A state's failure link points to the state for the longest proper suffix of its string that is still a prefix of some pattern — KMP's longest-prefix-suffix relation lifted onto the trie. That link maintains the invariant that after `i` characters the automaton sits at the state whose string is the longest suffix of the first `i` characters that is a prefix of some pattern, which is precisely the state from which every match ending at `i` can be read.

> [!QUESTION]- What do output links add, and what fails silently without them?
> A single state can complete several patterns when a shorter one is a suffix of a longer one, such as `he` ending inside `she`. Output links chain each state to the nearest shorter pattern that also ends there, and walking the chain enumerates every simultaneous match. Without them the scan is still correctly positioned but reports only the pattern the current node ends, silently dropping the nested ones — the classic loss of `he` when matching `{ he, she, hers }` in `ushers`.

> [!QUESTION]- Why does adding a pattern after construction force a rebuild?
> Failure and output links encode suffix relationships across the entire pattern set and are resolved together by the single construction BFS. A new pattern can change the longest-suffix target of many existing states, so the links are no longer valid and must be recomputed. That is why the automaton fits a dictionary built once and reused across texts rather than one that changes per query. Empty patterns are rejected here: otherwise they match at every boundary and need a separately defined `n + 1`-position result contract.

# References

- [Aho and Corasick, "Efficient String Matching: An Aid to Bibliographic Search" (1975)](https://dl.acm.org/doi/10.1145/360825.360855) — the original paper introducing the goto, failure, and output functions.
- [Aho-Corasick algorithm (cp-algorithms)](https://cp-algorithms.com/string/aho_corasick.html) — trie plus suffix (failure) links, the BFS construction, the dictionary-link walk, and a reference implementation with complexity discussion.
- [Aho–Corasick algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Aho%E2%80%93Corasick_algorithm) — worked automaton example, the relationship to KMP, and applications in intrusion detection and `fgrep`.
