---
topic:
  - "Computer Science"
subtopic:
  - "Algorithms"
level:
  - "3"
priority: Medium
status: Ready To Repeat

dg-publish: true
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
