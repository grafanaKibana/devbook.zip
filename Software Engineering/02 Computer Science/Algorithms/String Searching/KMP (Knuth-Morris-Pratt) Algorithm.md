---
topic:
  - "Computer Science"
subtopic:
  - "Algorithms"
level:
  - "4"
priority: Medium
status: Ready To Repeat

---

# Intro

## Deeper Explanation

## Diagram

```mermaid
graph TD
  S[Input pattern P and text T] --> P0[Precompute pi array for P]
  P0 --> A[Set i to 0 and set j to 0]
  A --> B{i less than len T}
  B -->|No| Z[Done]
  B -->|Yes| C{T at i equals P at j}
  C -->|Yes| D[Increment i and increment j]
  D --> E{j equals len P}
  E -->|Yes| F[Match at i minus j and set j to pi at j minus 1]
  E -->|No| B
  F --> B
  C -->|No| G{j greater than 0}
  G -->|Yes| H[Set j to pi at j minus 1]
  H --> C
  G -->|No| I[Increment i]
  I --> B
```

## Questions

> [!QUESTION]- What does the prefix function (LPS) represent?
> For each position in the pattern, it stores the length of the longest proper prefix that is also a suffix ending at that position. This lets KMP shift the pattern without losing valid partial matches.

## Links

- [Knuth-Morris-Pratt algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Knuth%E2%80%93Morris%E2%80%93Pratt_algorithm)
- [Prefix function / KMP (cp-algorithms)](https://cp-algorithms.com/string/prefix-function.html)

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
