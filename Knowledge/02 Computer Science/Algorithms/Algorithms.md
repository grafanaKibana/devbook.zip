---
topic: ["Computer Science"]
subtopic: []
level: ["1"]
priority: medium
status: Not-Started
tags:
  - FolderNote
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

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

if (children.length) {
  dv.header(2, "Children");
  dv.list(children.map(p => p.file.link));
}

const pages = dv.pages()
  .where(p => p.file.folder === curFolder)
  .where(p => p.file.path !== curPath)
  .where(p => !isFolderNote(p))
  .sort(p => p.file.name, "asc");

if (pages.length) {
  dv.header(2, "Pages");
  dv.list(pages.map(p => p.file.link));
}
```
---
## Intro

## Deeper Explanation

[](https://metanit.com/sharp/algoritm/)

[8 Common Data Structures every Programmer must know](https://towardsdatascience.com/8-common-data-structures-every-programmer-must-know-171acf6a1a42)

[Algorithms Complexity](Knowledge/02 Computer Science/Algorithms/Algorithms Complexity.md)

[Sorting Algorithms](Knowledge/02 Computer Science/Algorithms/Sorting Algorithms/Sorting Algorithms.md)

[Dijkstra](Knowledge/02 Computer Science/Algorithms/Dijkstra.md)

[DFS/BFS](Knowledge/02 Computer Science/Algorithms/DFS BFS.md)

[Rabit Karp Search](Knowledge/02 Computer Science/Algorithms/Rabit Karp Search.md)

[KMP (Knuth-Morris-Pratt) Algorithm](Knowledge/02 Computer Science/Algorithms/KMP (Knuth-Morris-Pratt) Algorithm.md)

[Disjoint Set / Union-Find](Knowledge/02 Computer Science/Algorithms/Disjoint Set Union-Find.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
