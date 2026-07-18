---
publish: true
created: 2026-07-18T14:02:43.991Z
modified: 2026-07-18T14:02:43.992Z
published: 2026-07-18T14:02:43.992Z
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: Finds all occurrences of many patterns in one text pass using a trie with failure links, in O(n + z).
level:
  - "4"
priority: Medium
status: Creation
---

A signature engine scans a byte stream — packets, log lines, a file — against a fixed dictionary of `k` patterns and must report every occurrence of every pattern. Running a single-pattern matcher such as [[KMP (Knuth-Morris-Pratt) Algorithm|KMP]] once per pattern reads the whole text `k` times, so the cost is `O(k·n)` and grows with the dictionary even though the text never changes.

The patterns share structure. Any two that begin `sh…` walk the same first edges, and a shorter pattern can be a suffix of the state a longer one reaches. Aho-Corasick compiles the whole dictionary once into a single finite automaton — a trie of all patterns carrying **failure links** and **output links** — then drives the text through it one character at a time without ever rewinding. One pass reports every match of every pattern, and its search cost stops depending on `k`.

**Core shape:** fixed pattern set → trie + failure links + output links → one non-backtracking pass over the text → `Θ(n + z)` search for `z` reported matches, from one automaton built over the whole dictionary.

A future trace would follow the automaton over one short text.

> [!NOTE] Visualization pending
> Planned StepTrace: a string-automaton card showing a trie of the pattern set with its failure links, consuming the text one character at a time as the automaton transitions on each character and emits every pattern that ends at the arrived state. No matching renderer exists in `engine.js` yet.

# Trie, failure links, output links

The automaton is a trie of the pattern set plus two kinds of back-edge.

**Goto (the trie).** Every pattern is inserted into a trie; each node is a prefix shared by one or more patterns, and a node that completes a pattern is marked with the pattern ids ending there. From a node, a text character either follows a child edge or has none — a miss.

**Failure links.** For the node representing string `s`, the failure link points to the node for the longest proper suffix of `s` that is itself a node in the trie — equivalently, a prefix of some pattern. This is KMP's longest-prefix-suffix table generalized from one string onto the whole tree. On a miss, following failure links shortens the matched suffix until a child on the current character exists or the root is reached. The root is the empty suffix and always exists, so the fallback terminates.

**Output links.** A single state can complete several patterns at once, because a shorter pattern may be a suffix of a longer one — `he` is a suffix of the state reached by `she`. Each state's output link points to the nearest failure-reachable state that ends a pattern; walking that chain at every visited state emits all patterns ending there. The link is set by the same suffix rule as the failure link: a state's output is its failure target if that target ends a pattern, otherwise the failure target's own output.

**Construction.** Failure and output links are filled by one breadth-first pass from the root. A node's failure target always sits at strictly smaller depth, so it is finalized before the node needs it; a depth-first order would read unfinished links. The root's direct children fail to the root.

# One pass over "ushers"

The dictionary `{ he, she, his, hers }` compiles to a trie with a handful of failure and output links. Two are decisive: the state for `she` fails to the state for `he` — its longest proper suffix that is also a prefix in the trie — and because `he` ends a pattern, `she`'s output link points there.

Reading `ushers` left to right, the automaton stays at the root through `u`, then walks `s → sh → she` on the next three characters. Arriving at `she` after the `e`, the state itself ends a pattern, so `she` is reported at `[1..3]`. Its output link then leads to `he`, which also ends here, reported at `[2..3]` — a nested match that shares the same end position and is invisible without the output walk. On the next character `r`, the state `she` has no child, so the automaton follows the failure link to `he` and takes `he → her` on `r`; the final `s` reaches `hers`, reported at `[2..5]`.

The invariant makes each of those steps legal: after reading `i` characters the automaton is always at the state whose string is the longest suffix of the first `i` characters that is still a prefix of some pattern. Every pattern occurrence ending at position `i` is a suffix of that state's string, and the output chain lists exactly those. That is why a single left-to-right pass, with no rewinding of the text, sees every match.

# Complexity

Let `M = Σmᵢ` be the total length of all patterns — an upper bound on the trie's node count — and `σ` the alphabet size.

| Phase | Time | Space | Cause |
| --- | --- | --- | --- |
| Build automaton | `Θ(M)` sparse, `Θ(M·σ)` dense | `Θ(M)` sparse, `Θ(M·σ)` dense | One insertion per pattern character builds the `≤ M+1` trie nodes; a single BFS assigns every failure and output link. A dense `σ`-wide transition row per node adds the `σ` factor; a hash map per node stores only real edges and drops it, at an `O(1)` expected lookup instead of an array index. |
| Search | `Θ(n + z)` | `O(1)` beyond the automaton | Each text character makes one forward move plus failure hops that amortize to `O(1)` over the scan (the KMP argument), and the output walk emits exactly the `z` matches. No term in `k`, the pattern count. |

The `Θ(M·σ)` (dense) or `Θ(M)` (sparse) figure is the automaton itself, allocated once and reused across every text. A search adds only a current-state index and an output-walk cursor, so its per-pass auxiliary space is `O(1)` — the automaton is structure space, not per-operation space. The dense-versus-sparse choice trades that automaton memory against a constant-factor transition cost, and is the main space decision on wide alphabets.

# Where it stops fitting

**Automaton memory on wide alphabets.** A dense `σ`-wide transition row per node makes each lookup a single array index but allocates `Θ(M·σ)` slots, most of them empty — for byte or Unicode alphabets over a large dictionary that is the dominant cost. A hash map per node (or a double-array trie) stores only the edges that exist, cutting space to `Θ(M)` at the price of a hashed lookup per transition. Both representations compute identical matches; only memory and constant factors differ.

**Overlapping and nested matches.** The automaton reports every occurrence of every pattern, including matches that overlap (`aa` in `aaa` at offsets 0 and 1) and matches nested inside a longer one (`he` ending inside `she`). Those extra matches surface only through the output-link walk. Reporting a pattern only when the current node itself ends one leaves the scan correctly positioned but silently drops the nested cases: on `{ he, she, hers }` over `ushers` it reports `she` and `hers` and loses `he`. The defect is invisible on any dictionary where no pattern is a suffix of another, which is what makes it easy to ship.

**A fixed dictionary.** Failure and output links are global properties of the whole pattern set, resolved by the single construction BFS. Adding a pattern changes suffix relationships throughout the trie, so the links must be recomputed — an insertion after construction means rebuilding the automaton, or maintaining a more complex dynamic variant. The algorithm therefore fits a dictionary compiled once and reused across many texts; a set that changes on every query pays the `Θ(M)` build repeatedly and loses its edge over rerunning a single-pattern matcher.

# Reference drawer

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
>
> `Build` runs once after the final `Add`. `Search` yields `(endIndex, patternId)` for every occurrence; the inner `for` walks the output chain, so overlapping and nested matches are all emitted. A dense `char`-indexed array could replace `Dictionary<char, int>` to trade memory for a faster transition.

# Questions

> [!QUESTION]- Why is search cost `Θ(n + z)` independent of the number of patterns?
> All patterns share one trie, so common prefixes collapse into shared paths and the text drives a single walk through the automaton. Each character makes one forward move plus failure hops that amortize to `O(1)` over the whole scan, and the output walk emits exactly the `z` matches found. Nothing in the loop scales with `k`, the pattern count, so a thousand signatures cost the same per character as one.

> [!QUESTION]- What does a failure link point to, and what invariant holds after reading `i` characters?
> A state's failure link points to the state for the longest proper suffix of its string that is still a prefix of some pattern — KMP's longest-prefix-suffix relation lifted onto the trie. That link maintains the invariant that after `i` characters the automaton sits at the state whose string is the longest suffix of the first `i` characters that is a prefix of some pattern, which is precisely the state from which every match ending at `i` can be read.

> [!QUESTION]- What do output links add, and what fails silently without them?
> A single state can complete several patterns when a shorter one is a suffix of a longer one, such as `he` ending inside `she`. Output links chain each state to the nearest shorter pattern that also ends there, and walking the chain enumerates every simultaneous match. Without them the scan is still correctly positioned but reports only the pattern the current node ends, silently dropping the nested ones — the classic loss of `he` when matching `{ he, she, hers }` in `ushers`.

> [!QUESTION]- Why does adding a pattern after construction force a rebuild?
> Failure and output links encode suffix relationships across the entire pattern set and are resolved together by the single construction BFS. A new pattern can change the longest-suffix target of many existing states, so the links are no longer valid and must be recomputed. That is why the automaton fits a dictionary built once and reused across texts rather than one that changes per query.

# References

- [Efficient String Matching: An Aid to Bibliographic Search](https://dl.acm.org/doi/10.1145/360825.360855) — Aho and Corasick's original 1975 paper (CACM), introducing the goto/failure/output construction and its linear-time search bound.
- [Aho-Corasick algorithm (cp-algorithms)](https://cp-algorithms.com/string/aho_corasick.html) — trie plus suffix (failure) links, the BFS construction, the dictionary-link walk, and a reference implementation with complexity discussion.
- [Aho–Corasick algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Aho%E2%80%93Corasick_algorithm) — worked automaton example, the relationship to KMP, and applications in intrusion detection and `fgrep`.
