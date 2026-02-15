---
topic:
  - Architecture
subtopic:
  - Architecture Styles
level:
  - "1"
priority: Medium
status: Not-Started
---
# Intro

Microservices are an architecture style where a system is split into small, independently deployable services aligned around business capabilities.

## Deeper Explanation

## Links

[Microservices Pattern: Microservice Architecture pattern](https://microservices.io/patterns/microservices.html)

## Questions

> [!QUESTION]- Microservices vs monolith: what is the difference and when should you choose which?
> A monolith is a single deployable unit (often with one codebase and one process). Microservices split the system into multiple deployable services with their own boundaries and often their own data.
>
> Typical trade-offs:
> - Microservices: independent deployments and scaling, but higher operational complexity (service discovery, observability, [[Distributed Transactions|distributed transactions]], versioning, testing).
> - Monolith: simpler operations and consistency, but can become hard to evolve if it is not modular.
>
> A common path is to start with a modular monolith and extract services when there is a clear boundary and a real need.

## Links

- [[Monolith Architecture]]

# Whats next

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

