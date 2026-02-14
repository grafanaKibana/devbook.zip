---
topic:
  - Computer Science
subtopic:
  - Algorithms
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

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

> [!QUESTION]- What is abc?
> Answer

## Links
