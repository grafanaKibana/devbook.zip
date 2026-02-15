---
topic:
  - "Architecture"
subtopic:
  - "Application Architecture"
level:
  - "4"
priority: Medium
status: Ready To Repeat

dg-publish: true
---

# Intro

MVC and MVVM are UI/application architecture patterns that split responsibilities to improve maintainability, testability, and separation of concerns.

## Deeper Explanation

## Questions

> [!QUESTION]- What is MVC and why is it used?
> MVC stands for Model-View-Controller. The Model represents the domain/data and business rules, the View is the UI (rendering), and the Controller handles incoming input/requests, coordinates work, and selects the response/view. The separation helps keep UI concerns out of business logic and makes the system easier to test and evolve.

## Links

- [Wikipedia - Model-view-controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)
- [Microsoft Learn - Overview of ASP.NET Core MVC](https://learn.microsoft.com/en-us/aspnet/core/mvc/overview)

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
