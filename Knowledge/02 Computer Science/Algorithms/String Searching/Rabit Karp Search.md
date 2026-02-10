---
topic: ["Computer Science"]
subtopic: ["Algorithms"]
level: ["1"]
priority: medium
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

> [!QUESTION]- What is abc?
> Answer

## Further Reading
