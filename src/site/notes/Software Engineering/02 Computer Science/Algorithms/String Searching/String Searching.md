---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/string-searching/string-searching/","tags":["FolderNote"],"noteIcon":""}
---


# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  A[Need to find pattern P in text T] --> B{What do you need}
  B -->|Exact matching linear time| C[KMP]
  B -->|Fast average hashing OK| D[Rabin Karp]
  B -->|Many queries or automata| E[Other Trie Aho Corasick]
  C --> F[Compute pi array for P]
  F --> G[Scan T with fallback using pi array]
  D --> H[Compute rolling hash for windows]
  H --> I[Verify when hashes match]
```

## Questions

## Links

## Deeper Explanation


## Questions


## Links


# Whats next

:LiArrowUpLeft: [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/String Searching/KMP (Knuth-Morris-Pratt) Algorithm.md" data-href="Software Engineering/02 Computer Science/Algorithms/String Searching/KMP (Knuth-Morris-Pratt) Algorithm.md" href="Software Engineering/02 Computer Science/Algorithms/String Searching/KMP (Knuth-Morris-Pratt) Algorithm.md" class="internal-link" target="_blank" rel="noopener nofollow">KMP (Knuth-Morris-Pratt) Algorithm</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/String Searching/Rabit Karp Search.md" data-href="Software Engineering/02 Computer Science/Algorithms/String Searching/Rabit Karp Search.md" href="Software Engineering/02 Computer Science/Algorithms/String Searching/Rabit Karp Search.md" class="internal-link" target="_blank" rel="noopener nofollow">Rabit Karp Search</a></span></li></ul></div>
