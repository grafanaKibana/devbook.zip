---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finding a pattern inside text, chosen by how many patterns you match and what you preprocess."
tags: [FolderNote]
publish: true
priority: Medium
level:
  - "4"
status: Creation
---

String matching finds occurrences of a pattern inside a text. A naive scan costs `O(n·m)` because it may restart the comparison after every mismatch. Faster methods keep the useful part of that failed comparison and avoid checking characters whose relationship is already known.

Pattern count is the first dividing line. [[KMP (Knuth-Morris-Pratt) Algorithm|KMP]], [[Z-Algorithm]], and [[Boyer-Moore]] handle one pattern, while [[Aho-Corasick]] scans for a whole set. Preprocessing is the other distinction. Most methods turn the pattern into a failure function or shift table. [[Rabin Karp Search|Rabin–Karp]] instead fingerprints consecutive text windows, which also works for many equal-length patterns and two-dimensional matching.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Diagram

```mermaid
flowchart TD
  A[Match pattern in text] --> B{How many patterns}
  B -->|Many at once| C{Pattern set shape}
  C -->|General dictionary| C1[Aho-Corasick]
  C -->|Equal-length, 2-D, or rolling fingerprints| I[Rabin-Karp]
  B -->|One| D{Large alphabet, long pattern}
  D -->|Yes, want sublinear scans| E[Boyer-Moore]
  D -->|No| F{Need guaranteed linear worst case}
  F -->|Prefix-structure problems| G[Z-Algorithm]
  F -->|Streaming or classic linear scan| H[KMP]
```

# The Family

| Algorithm | Patterns | Preprocesses | Time | Worst case | Aux space | Weaker case | Reach for it when |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [[KMP (Knuth-Morris-Pratt) Algorithm\|KMP]] | one | pattern → prefix (failure) function | O(n + m) | O(n + m) | Θ(m) | Large alphabets, where longer skips may help | A guaranteed linear scan that never backs up in the text |
| [[Z-Algorithm]] | one | pattern → Z-array | O(n + m) | O(n + m) | Θ(n + m) | Large text under tight memory | Prefix-overlap problems and a direct linear scan |
| [[Boyer-Moore]] | one | pattern → bad-character + good-suffix tables | O(m + \|Σ\| + n/m) best | O(m + \|Σ\| + n) with Galil rule | O(m + \|Σ\|) | Small alphabets or adversarial repeats | Long patterns over large alphabets, where large shifts are common |
| [[Rabin Karp Search\|Rabin–Karp]] | one or `k` equal-length patterns | text → rolling hash | Expected: O(n + m + V) for one. O(n + k·m + V) for `k` | Verification worst case: O(n·m) for one. O(n·k·m) for `k` | Θ(1) for one pattern. Θ(k) for `k` pattern hashes | Collisions or genuine matches at many windows trigger repeated verification | Many equal-length patterns, fingerprints, or 2-D matching |
| [[Aho-Corasick]] | many | pattern set → trie + failure links | O(n + Σmᵢ + matches) | same | Θ(M·σ) dense / Θ(M) sparse | A single pattern or a memory-tight dense alphabet | One scan for a dictionary of patterns |

[[KMP (Knuth-Morris-Pratt) Algorithm|KMP]] and [[Z-Algorithm]] encode the same prefix-overlap information in different arrays. Both preprocess the pattern in `O(m)` and then scan in `O(n)`. [[Boyer-Moore]] takes another route: it uses mismatch information to jump forward, often by several characters when the pattern is long and the alphabet is large. Its table reports total cost, including `O(m + |Σ|)` preprocessing. The scan contributes `O(n/m)` in the best case or `O(n)` with the Galil rule.

[[Aho-Corasick]] extends the failure-link idea from one pattern to a trie of patterns. [[Rabin Karp Search|Rabin–Karp]] builds no automaton at all. Its rolling hash filters candidate windows, followed by direct comparison of only the patterns in the matching hash bucket. A one-pattern scan keeps only a fixed number of hash values, so its auxiliary space is `Θ(1)`. Matching `k` equal-length patterns with hash buckets takes `Θ(k)`. Let `V` be the actual character work spent verifying hash-matched candidates. Including pattern hashing, expected time is `O(n + m + V)` for one pattern and `O(n + k·m + V)` for `k`. These reduce to `O(n + m)` and `O(n + k·m)` only when `V` is bounded by those terms. If all `k` patterns share the candidate hash and every window enters that bucket, verification reaches `O(n·k·m)`; ordinary windows do not compare against every pattern.

# References

- [Algorithms on Strings, Trees, and Sequences](https://doi.org/10.1017/CBO9780511574931)
