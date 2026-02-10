---
topic: ["Computer Science"]
subtopic: []
level: ["1"]
priority: medium
status: Not-Started
tags:
  - FolderNote
---
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`
## Children
```dataview
LIST WITHOUT ID link(file.path, regexreplace(file.folder, "^.*/", ""))
WHERE regexmatch("^" + this.file.folder + "/[^/]+$", file.folder)
  AND file.name = regexreplace(file.folder, "^.*/", "")
  AND contains(file.tags, "#FolderNote")
SORT file.folder ASC
```

## Pages
```dataview
LIST
WHERE file.folder = this.file.folder
  AND file.path != this.file.path
  AND !contains(file.tags, "#FolderNote")
SORT file.name ASC
```

## Intro

## Deeper Explanation

[](https://metanit.com/sharp/algoritm/)

[8 Common Data Structures every Programmer must know](https://towardsdatascience.com/8-common-data-structures-every-programmer-must-know-171acf6a1a42)

[Algorithms Complexity](Knowledge/Computer Science/Algorithms/Algorithms Complexity.md)

[Sorting Algorithms](Knowledge/Computer Science/Algorithms/Sorting Algorithms/Sorting Algorithms.md)

[Dijkstra](Knowledge/Computer Science/Algorithms/Dijkstra.md)

[DFS/BFS](Knowledge/Computer Science/Algorithms/DFS BFS.md)

[Rabit Karp Search](Knowledge/Computer Science/Algorithms/Rabit Karp Search.md)

[KMP (Knuth-Morris-Pratt) Algorithm](Knowledge/Computer Science/Algorithms/KMP (Knuth-Morris-Pratt) Algorithm.md)

[Disjoint Set / Union-Find](Knowledge/Computer Science/Algorithms/Disjoint Set Union-Find.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
