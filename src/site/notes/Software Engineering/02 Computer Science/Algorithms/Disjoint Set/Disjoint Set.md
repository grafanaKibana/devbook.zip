---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/disjoint-set/disjoint-set/","tags":["FolderNote"],"noteIcon":""}
---


# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  A[Elements 0 to n minus 1] --> B[Each element starts in its own set]
  B --> C{Operation}
  C -->|Union a b| D[Merge two sets]
  C -->|Find x| E[Return representative of set]
  C -->|Connected| F[Compare Find a and Find b]
  D --> G[Union by size or rank]
  E --> H[Path compression]
  G --> I[Near O 1 amortized]
  H --> I
```

## Questions

## Links

## Deeper Explanation


## Questions


## Links


# Whats next

:LiArrowUpLeft: [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/Disjoint Set/Disjoint Set Union-Find.md" data-href="Software Engineering/02 Computer Science/Algorithms/Disjoint Set/Disjoint Set Union-Find.md" href="Software Engineering/02 Computer Science/Algorithms/Disjoint Set/Disjoint Set Union-Find.md" class="internal-link" target="_blank" rel="noopener nofollow">Disjoint Set Union-Find</a></span></li></ul></div>
