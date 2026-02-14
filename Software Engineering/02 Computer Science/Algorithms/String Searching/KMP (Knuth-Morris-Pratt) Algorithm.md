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
## Intro

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

> [!QUESTION]- What is abc?
> Answer

## Further Reading
