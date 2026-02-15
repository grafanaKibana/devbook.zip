---
topic:
  - "Architecture"
subtopic:
  - "Distributed Systems"
level:
  - "3"
priority: Medium
status: Not-Started
---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What does REST mean?
> REST (Representational State Transfer) is an architectural style for [[Distributed Systems|distributed systems]].
> Key ideas: resources identified by URIs, stateless requests, cacheable responses, a uniform interface, layered system, and optional code-on-demand.
> In practice, RESTful APIs model domain objects as resources and use HTTP methods with consistent semantics.

## Links

- [What is a REST API? (IBM)](https://www.ibm.com/ru-ru/cloud/learn/rest-apis)
- [REST dissertation (Fielding)](https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm)

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
