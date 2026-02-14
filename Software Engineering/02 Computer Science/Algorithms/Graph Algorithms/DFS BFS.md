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
graph LR
  subgraph BFS[Breadth First Search BFS]
    B0[Start s] --> B1[Mark visited s]
    B1 --> B2[Push s into queue]
    B2 --> B3{Queue empty}
    B3 -->|No| B4[Pop front v]
    B4 --> B5[For each neighbor u of v]
    B5 --> B6{visited u}
    B6 -->|No| B7[Mark visited u and push u]
    B6 -->|Yes| B5
    B7 --> B5
    B3 -->|Yes| B8[Done]
  end

  subgraph DFS[Depth First Search DFS]
    D0[Start s] --> D1[Call dfs s]
    D1 --> D2[Mark visited v]
    D2 --> D3[For each neighbor u of v]
    D3 --> D4{visited u}
    D4 -->|No| D5[dfs u]
    D4 -->|Yes| D3
    D5 --> D3
  end
```

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
