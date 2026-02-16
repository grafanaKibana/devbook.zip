---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/graph-algorithms/dijkstra/","noteIcon":""}
---


# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  A[Input graph with nonnegative weights and source s] --> B[Initialize dist to INF]
  B --> C[Set dist of s to 0]
  C --> D[Push pair 0 and s into priority queue]
  D --> E{PQ empty}
  E -->|No| F[Extract min pair d and v]
  F --> G{d differs from dist of v}
  G -->|Yes| E
  G -->|No| H[For each edge from v to u with weight w]
  H --> I{dist of v plus w less than dist of u}
  I -->|Yes| J[Update dist of u]
  J --> K[Push updated pair into priority queue]
  K --> H
  I -->|No| H
  E -->|Yes| L[Output dist and optionally parent]
```

## Questions

> [!QUESTION]- Why does Dijkstra require non-negative weights?
> The algorithm is greedy: once a vertex is extracted as the current minimum, its distance is assumed final. Negative edges can later produce a shorter path to an already-finalized vertex, so the greedy step becomes incorrect (use Bellman-Ford for graphs with negative edges).

## Links

- [Dijkstra's algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)
- [Dijkstra (cp-algorithms)](https://cp-algorithms.com/graph/dijkstra.html)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]
>
> **Pages**
> - [[Software Engineering/02 Computer Science/Algorithms/Graph Algorithms/DFS BFS\|DFS BFS]]
<!-- whats-next:end -->
