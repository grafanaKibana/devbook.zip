---
topic:
  - Data Persistance
subtopic: []
level:
  - "1"
priority: Medium
status: Not-Started
aliases:
  - Data Persistance
tags:
  - FolderNote
---
## Questions

> [!QUESTION]- What is a database?
> A database is an organized collection of data stored in a structured way so it can be efficiently created, read, updated, and deleted. In practice you interact with it through a DBMS (Database Management System), which provides storage, indexing, querying, transactions, security, backups, etc.

> [!QUESTION]- What are the main types of databases?
> Common categories are: relational (SQL tables), key-value, document, wide-column, graph, time-series, and search engines. They differ in data model, query capabilities, consistency guarantees, and scaling approach.

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

