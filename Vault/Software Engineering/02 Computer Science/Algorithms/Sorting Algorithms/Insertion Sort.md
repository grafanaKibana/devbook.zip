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

Insertion sort grows a sorted prefix by inserting each next element into its correct position. It is fast for small inputs and nearly-sorted data, and it is a common building block inside hybrid sorts.

## Deeper Explanation

- Mechanism: iterate left-to-right; for each key, shift larger elements right until the insertion spot is found.
- Complexity: average/worst O(n^2); best O(n) when already sorted.
- Properties: stable, in-place (aside from the key temp), good constant factors.
- Rule of thumb: use for n <= ~20-50 or as the base case inside merge/quick/introsort.

## Diagram

```mermaid
graph TD
  A[Start array A] --> B[Set j to 1]
  B --> C{j less than n}
  C -->|No| Z[Done]
  C -->|Yes| D[Set key to A at j and set i]
  D --> E{i nonnegative and A at i greater than key}
  E -->|Yes| F[Shift right and decrement i]
  F --> E
  E -->|No| G[Insert key]
  G --> H[Increment j]
  H --> C
```

## Questions

> [!QUESTION]- What is Insertion Sort?
> Insertion sort grows a sorted prefix by inserting each next element into its correct position. It is fast for small inputs and nearly-sorted data, and it is a common building block inside hybrid sorts.


## Links

- https://en.wikipedia.org/wiki/Insertion_sort - Algorithm and complexity
- https://cp-algorithms.com/sorting/insertion_sort.html - Competitive programming perspective

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
