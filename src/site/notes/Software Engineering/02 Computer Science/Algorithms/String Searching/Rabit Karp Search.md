---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/string-searching/rabit-karp-search/","noteIcon":""}
---


# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  S[Input pattern P length m and text T] --> A[Choose base and mod]
  A --> B[Compute hash of P]
  B --> C[Compute hash of first window]
  C --> D[Set i to 0]
  D --> E{i at most len T minus m}
  E -->|No| Z[Done]
  E -->|Yes| F{hashW equals hashP}
  F -->|No| G[Roll hashW to next window]
  F -->|Yes| H{window equals P}
  H -->|Yes| I[Report match at i]
  H -->|No| J[Collision ignore]
  I --> G
  J --> G
  G --> K[Increment i]
  K --> E
```

## Questions

> [!QUESTION]- What are hash collisions and how do we handle them?
> A collision is when two different strings produce the same hash. Rabin-Karp handles this by verifying the actual substring when a hash match occurs, and collisions can be made very unlikely with good moduli/base choices (or double hashing).

## Links

- [Rabin-Karp algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Rabin%E2%80%93Karp_algorithm)
- [String hashing (cp-algorithms)](https://cp-algorithms.com/string/string-hashing.html)

# Whats next

:LiArrowUpLeft: [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/String Searching/KMP (Knuth-Morris-Pratt) Algorithm.md" data-href="Software Engineering/02 Computer Science/Algorithms/String Searching/KMP (Knuth-Morris-Pratt) Algorithm.md" href="Software Engineering/02 Computer Science/Algorithms/String Searching/KMP (Knuth-Morris-Pratt) Algorithm.md" class="internal-link" target="_blank" rel="noopener nofollow">KMP (Knuth-Morris-Pratt) Algorithm</a></span></li></ul></div>
