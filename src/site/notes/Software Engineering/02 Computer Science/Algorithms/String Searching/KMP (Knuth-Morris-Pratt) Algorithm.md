---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/string-searching/kmp-knuth-morris-pratt-algorithm/","noteIcon":""}
---


# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  S[Input pattern P and text T] --> P0[Precompute pi array for P]
  P0 --> A[Set i to 0 and set j to 0]
  A --> B{i less than len T}
  B -->|No| Z[Done]
  B -->|Yes| C{T at i equals P at j}
  C -->|Yes| D[Increment i and increment j]
  D --> E{j equals len P}
  E -->|Yes| F[Match at i minus j and set j to pi at j minus 1]
  E -->|No| B
  F --> B
  C -->|No| G{j greater than 0}
  G -->|Yes| H[Set j to pi at j minus 1]
  H --> C
  G -->|No| I[Increment i]
  I --> B
```

## Questions

> [!QUESTION]- What does the prefix function (LPS) represent?
> For each position in the pattern, it stores the length of the longest proper prefix that is also a suffix ending at that position. This lets KMP shift the pattern without losing valid partial matches.

## Links

- [Knuth-Morris-Pratt algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Knuth%E2%80%93Morris%E2%80%93Pratt_algorithm)
- [Prefix function / KMP (cp-algorithms)](https://cp-algorithms.com/string/prefix-function.html)

# Whats next

:LiArrowUpLeft: [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/String Searching/Rabit Karp Search.md" data-href="Software Engineering/02 Computer Science/Algorithms/String Searching/Rabit Karp Search.md" href="Software Engineering/02 Computer Science/Algorithms/String Searching/Rabit Karp Search.md" class="internal-link" target="_blank" rel="noopener nofollow">Rabit Karp Search</a></span></li></ul></div>
