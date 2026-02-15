---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "4"
priority: Medium
status: Not-Started
---
# Intro

Repository and Unit of Work are patterns for structuring data access and coordinating changes to persistent storage.

## Deeper Explanation

## Questions

> [!QUESTION]- What are the Unit of Work and Repository patterns, and when are they needed?
> A Repository provides a collection-like interface for working with aggregates/entities (querying and saving) while hiding persistence details. A Unit of Work (UoW) tracks changes and commits them as a single atomic operation (transaction).
>
> They are most useful when you need to coordinate multiple changes that must succeed or fail together, or when you want to decouple the domain/application layers from a specific data access technology.
>
> Note: in EF Core, `DbContext` already acts as both a repository-like gateway and a unit of work (change tracking + `SaveChanges`).

## Links

- [Martin Fowler - Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- [Martin Fowler - Repository](https://martinfowler.com/eaaCatalog/repository.html)

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

