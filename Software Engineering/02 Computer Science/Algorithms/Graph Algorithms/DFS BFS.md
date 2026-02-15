---
topic:
  - "Computer Science"
subtopic:
  - "Algorithms"
level:
  - "4"
priority: Medium
status: Ready To Repeat

dg-publish: true
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

> [!QUESTION]- When should I use BFS vs DFS?
> Use BFS when you need shortest paths in an unweighted graph or level-order exploration. Use DFS for reachability, cycle detection, topological sorting, and when you want to explore one path deeply (often with recursion/stack).

## Links

- [Depth-first search (Wikipedia)](https://en.wikipedia.org/wiki/Depth-first_search)
- [Breadth-first search (Wikipedia)](https://en.wikipedia.org/wiki/Breadth-first_search)
- [BFS (cp-algorithms)](https://cp-algorithms.com/graph/breadth-first-search.html)
- [DFS (cp-algorithms)](https://cp-algorithms.com/graph/depth-first-search.html)

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
