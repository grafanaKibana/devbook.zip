---
topic:
  - "Computer Science"
subtopic:
  - "Algorithms"
tags:
  - FolderNote
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

> [!QUESTION]- What is abc?
> Answer

## Links

## Deeper Explanation


## Questions


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
