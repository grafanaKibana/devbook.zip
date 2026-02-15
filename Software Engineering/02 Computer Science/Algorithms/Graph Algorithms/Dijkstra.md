---
topic:
  - "Computer Science"
subtopic:
  - "Algorithms"
level:
  - "1"
priority: Medium
status: Not-Started
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

# Whats next

:LiArrowUpLeft: `dv: link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

```dataviewjs
const cur = dv.current();
const curFolder = cur.file.folder;
const curPath = cur.file.path;

const isFolderNote = (p) => (p.file.tags ?? []).includes("#FolderNote");

const children = dv.pages()
  .where(p => p.file.folder.startsWith(curFolder + "/"))
  .where(p => p.file.folder.split("/").length === curFolder.split("/").length + 1)
  .where(p => p.file.name === p.file.folder.split("/").slice(-1)[0])
  .where(p => isFolderNote(p))
  .sort(p => p.file.folder, "asc");

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");
  
  if (children.length) {
	dv.header(2, "Topics");
	dv.list(children.map(p => p.file.link));
  }
  if (pages.length) {
	dv.header(2, "Pages");
	dv.list(pages.map(p => p.file.link));
  }
  
```
