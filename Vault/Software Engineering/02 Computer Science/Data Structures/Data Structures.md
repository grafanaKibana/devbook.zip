---
topic:
  - Computer Science
subtopic:
  - Data Structures
tags:
  - FolderNote
dg-publish: true
status: Creation
priority: Medium
level:
  - '4'
---

# Intro

A data structure is a way to organize related data so it can be stored, accessed, and updated efficiently. Choosing the right data structure is often the biggest factor in making an algorithm fast and maintainable.

## Deeper Explanation


## Questions

> [!QUESTION]- What is a data structure? Which ones do you know? Which of them exist in .NET?
> A data structure is a way to organize related data into a collection-like object. Examples include arrays, lists, queues, stacks, linked lists, dictionaries/hash tables, hash sets, graphs, and trees. .NET provides built-in implementations for many of these (for example `Array`, `List<T>`, `Queue<T>`, `Stack<T>`, `LinkedList<T>`, `Dictionary<TKey, TValue>`, `HashSet<T>`).

> [!QUESTION]- What is a data structure? Which ones do you know? Which exist in .NET?
> A data structure is an organization of data that enables efficient operations (access, insert, delete, search). Examples include arrays, lists, stacks, queues, linked lists, hash tables, sets, trees, and graphs. In .NET you commonly use `T[]`, `List<T>`, `Stack<T>`, `Queue<T>`, `LinkedList<T>`, `Dictionary<TKey, TValue>`, `Hashtable`, and `HashSet<T>`.

## Links

- [System.Collections.Generic namespace](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic)
- [Popular types of linked list](https://www.simplilearn.com/tutorials/data-structure-tutorial/types-of-linked-list)
- [Graphs in data structure](https://www.simplilearn.com/tutorials/data-structure-tutorial/graphs-in-data-structure)
- [Types of trees in data structures](https://www.knowledgehut.com/blog/programming/types-of-trees-in-data-structure)
- [8 Common Data Structures every Programmer must know](https://towardsdatascience.com/8-common-data-structures-every-programmer-must-know-171acf6a1a42)

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
