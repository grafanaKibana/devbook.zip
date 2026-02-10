---
topic: ["Computer Science"]
subtopic: ["Algorithms"]
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

[Big-O Algorithm Complexity Cheat Sheet (Know Thy Complexities!) @ericdrowell](https://www.bigocheatsheet.com/)

[Знай сложности алгоритмов](https://habr.com/ru/post/188010/)

## Diagram

```mermaid
graph TD
  A[Start: analyze code] --> B{Loops}
  B -->|No| C{Recursion}
  B -->|Yes| D[Count iterations]
  D --> E{Nested loops}
  E -->|No| F[Add cost for one loop]
  E -->|Yes| G[Multiply costs for nested loops]
  C -->|No| H[Check dominant operations]
  C -->|Yes| I[Write recurrence]
  I --> J[Use Master theorem or expansion]
  F --> K[Simplify and keep dominant term]
  G --> K
  H --> K
  J --> K
  K --> L[Report big O time and space]
```

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
