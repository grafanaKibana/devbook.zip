---
topic:
  - Computer Science
subtopic:
  - Algorithms
summary: "Finding a pattern inside text, chosen by how many patterns you match and what you preprocess."
tags:
  - FolderNote
publish: true
priority: Medium
level:
  - "4"
status: Creation
---

# Intro

String matching finds occurrences of a pattern inside a text without the naive `O(n·m)` rescan that re-examines characters after every mismatch. The whole family exists to reuse the work a mismatch reveals: once you know a suffix of what you scanned equals a prefix of the pattern, you can shift by more than one character and never look back.

Two axes separate the members. The first is **how many patterns** you search for at once — one pattern ([[KMP (Knuth-Morris-Pratt) Algorithm|KMP]], [[Z-Algorithm]], [[Boyer-Moore]]) versus a whole set in a single pass ([[Aho-Corasick]]). The second is **what you preprocess**: most methods preprocess the *pattern* into a failure function or shift table, while [[Rabin Karp Search|Rabin–Karp]] preprocesses nothing structural and instead fingerprints the *text* with a rolling hash. That hashing angle is what lets Rabin–Karp scale to many equal-length patterns or extend to 2-D matching where the automaton methods do not.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Diagram

```mermaid
flowchart TD
  A[Match pattern in text] --> B{How many patterns}
  B -->|Many at once| C[Aho-Corasick]
  B -->|One| D{Large alphabet, long pattern}
  D -->|Yes, want sublinear scans| E[Boyer-Moore]
  D -->|No| F{Need guaranteed linear worst case}
  F -->|Prefix-structure problems| G[Z-Algorithm]
  F -->|Streaming or classic linear scan| H[KMP]
  B -->|Many equal-length, or 2-D, or rolling| I[Rabin-Karp]
```

## The family

| Algorithm | Patterns | Preprocesses | Time | Worst case | Reach for it when |
| --- | --- | --- | --- | --- | --- |
| [[KMP (Knuth-Morris-Pratt) Algorithm\|KMP]] | one | pattern → prefix (failure) function | O(n + m) | O(n + m) | Guaranteed linear scan; never backs up in the text (streaming) |
| [[Z-Algorithm]] | one | pattern → Z-array | O(n + m) | O(n + m) | Prefix-structure problems; often the simpler linear method to reason about |
| [[Boyer-Moore]] | one | pattern → bad-character + good-suffix tables | O(n / m) best | O(n) with Galil rule | Long patterns over large alphabets — sublinear in practice; powers `grep` |
| [[Rabin Karp Search\|Rabin–Karp]] | one or many | text → rolling hash | O(n + m) avg | O(n·m) on hash collisions | Many equal-length patterns, plagiarism/fingerprinting, 2-D matching |
| [[Aho-Corasick]] | many | pattern set → trie + failure links | O(n + Σmᵢ + matches) | same | Scanning once for a whole dictionary of patterns |

The two linear single-pattern methods, [[KMP (Knuth-Morris-Pratt) Algorithm|KMP]] and [[Z-Algorithm]], are two views of the same prefix structure: both preprocess the pattern in `O(m)`, guarantee `O(n)` scans, and are interconvertible. [[Boyer-Moore]] gives up the worst-case simplicity to win the *average* case by skipping ahead — the longer the pattern and the larger the alphabet, the bigger its shifts. [[Aho-Corasick]] is KMP generalised from one pattern to a set: the trie holds every pattern and the failure links are the multi-pattern equivalent of KMP's failure function. [[Rabin Karp Search|Rabin–Karp]] stands apart — it never builds an automaton, so it stays correct only up to hash collisions, which is exactly why it generalises to problems the automaton methods can't reach cheaply.

## Questions

> [!QUESTION]- Why does KMP never re-examine a text character after a mismatch?
> Its prefix (failure) function records, for every pattern position, the length of the longest proper prefix that is also a suffix. On a mismatch the pattern shifts so that this already-matched prefix aligns, so the text pointer only ever advances. That is what turns the naive `O(n·m)` scan into `O(n + m)`.

> [!QUESTION]- When is Boyer-Moore's `O(n/m)` best case actually realised, and when does it degrade?
> Sublinear scanning appears with long patterns over large alphabets, where a mismatched character usually isn't in the pattern at all and the bad-character rule shifts by nearly the full pattern length. It degrades toward `O(n·m)` on small alphabets or highly repetitive text; the Galil rule caps the worst case at `O(n)`.

> [!QUESTION]- Why choose Rabin–Karp over a linear automaton method?
> Because it fingerprints windows of the text with a rolling hash rather than building an automaton, it extends naturally where the automaton methods don't: matching many equal-length patterns at once (compare each window's hash against a set), plagiarism detection, and 2-D pattern matching. The price is that a hash collision forces a character-by-character verification, so its worst case is `O(n·m)`.

> [!QUESTION]- How is Aho-Corasick related to KMP?
> It is KMP lifted from a single pattern to a set. The patterns are stored in a trie, and each node's failure link points to the longest proper suffix that is a prefix of some pattern — the multi-pattern analogue of KMP's failure function. One pass over the text then reports every occurrence of every pattern in `O(n + Σmᵢ + matches)`.

## References

- [String-searching algorithm (Wikipedia)](https://en.wikipedia.org/wiki/String-searching_algorithm) — taxonomy of single- and multi-pattern methods and their complexity.
- [Prefix function (CP-Algorithms)](https://cp-algorithms.com/string/prefix-function.html) — KMP's prefix function and its matching applications with implementations.
- [Aho–Corasick algorithm (CP-Algorithms)](https://cp-algorithms.com/string/aho_corasick.html) — trie plus failure links for multi-pattern search.
- [Boyer–Moore string-search algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_string-search_algorithm) — bad-character and good-suffix heuristics behind sublinear scanning.
