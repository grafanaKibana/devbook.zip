---
{"dg-publish":true,"permalink":"/software-engineering/02-computer-science/algorithms/disjoint-set/disjoint-set-union-find/","noteIcon":""}
---


# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  A[find x] --> B{parent of x is x}
  B -->|Yes| C[return x]
  B -->|No| D[find parent of x]
  D --> E[Set parent of x to root]
  E --> F[return root]

  G[union a b] --> H[Compute ra from find a]
  H --> I[Compute rb from find b]
  I --> J{ra equals rb}
  J -->|Yes| K[already merged]
  J -->|No| L{rank or size compare}
  L -->|ra smaller| M[Set parent ra to rb]
  L -->|rb smaller| N[Set parent rb to ra]
  L -->|equal| O[Set parent rb to ra and increase rank]
```

## Questions

> [!QUESTION]- What is path compression?
> During find(x), path compression rewires nodes on the path from x to the root to point directly to the root. This flattens the tree over time and makes future operations faster.

## Links

- [Disjoint-set data structure (Wikipedia)](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
- [DSU / Union-Find (cp-algorithms)](https://cp-algorithms.com/data_structures/disjoint_set_union.html)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/02 Computer Science/Algorithms/Algorithms\|Algorithms]]
>
<!-- whats-next:end -->
