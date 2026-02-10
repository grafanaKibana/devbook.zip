---
topic: []
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

[OOP](Knowledge/Patterns & Practices/OOP.md)

[GRASP](Knowledge/Patterns & Practices/GRASP.md)

[SOLID](Knowledge/Patterns & Practices/SOLID.md)

[Functional Programming](Knowledge/Patterns & Practices/Functional Programming.md)

[Dependency Injection](Knowledge/Patterns & Practices/Dependency Injection.md)

[CQS](Knowledge/Patterns & Practices/CQS.md)

[Repository & UoW](Knowledge/Patterns & Practices/Repository & UoW.md)

[Design Patterns](Knowledge/Patterns & Practices/Design Patterns.md)

[Event-Driven Development](Knowledge/Patterns & Practices/Event-Driven Development.md)

[DRY](Knowledge/Patterns & Practices/DRY.md)

[IoC (Holywood Principle)](Knowledge/Patterns & Practices/IoC (Holywood Principle).md)

[KISS](Knowledge/Patterns & Practices/KISS.md)

[YAGNI](Knowledge/Patterns & Practices/YAGNI.md)

[Integration Testing](Knowledge/Patterns & Practices/Integration Testing.md)

[Unit Testing](Knowledge/Patterns & Practices/Unit Testing.md)

## Questions

> [!QUESTION]- What is abc?
> Answer

## Further Reading
