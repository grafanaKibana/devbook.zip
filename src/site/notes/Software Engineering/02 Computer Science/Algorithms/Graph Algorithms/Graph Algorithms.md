---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/graph-algorithms/graph-algorithms/","tags":["FolderNote"],"noteIcon":""}
---


# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  A[Graph G with V and E] --> B{Goal}
  B -->|Visit all reachable nodes| C[Traversal]
  B -->|Shortest path nonnegative weights| D[Dijkstra]
  C --> E{Which frontier policy}
  E -->|Queue| F[BFS]
  E -->|Stack or recursion| G[DFS]
  F --> H[Level-order distances in unweighted graphs]
  G --> I[Topological and connected components patterns]
  D --> J[Priority queue and relax edges]
```

## Questions

## Links

## Deeper Explanation


## Questions


## Links


# Whats next

:LiArrowUpLeft: [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/DFS BFS.md" data-href="Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/DFS BFS.md" href="Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/DFS BFS.md" class="internal-link" target="_blank" rel="noopener nofollow">DFS BFS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/Dijkstra.md" data-href="Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/Dijkstra.md" href="Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/Dijkstra.md" class="internal-link" target="_blank" rel="noopener nofollow">Dijkstra</a></span></li></ul></div>
