---
topic:
  - "Patterns & Practices"
subtopic:
  - "Principles"
level:
  - "4"
priority: Medium
status: Ready To Repeat

---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is Inversion of Control (IoC)?
> IoC is a principle where the flow of control is inverted: instead of your code creating and managing its dependencies directly, an external mechanism (framework/container) coordinates object creation and composition.
> A common IoC technique is [[Dependency Injection]]: dependencies are provided to a class (constructor/setter/parameter) rather than created inside it.

> [!QUESTION]- What is the Dependency Inversion Principle (DIP)?
> DIP (the "D" in SOLID) says:
> - High-level modules should not depend on low-level modules. Both should depend on abstractions.
> - Abstractions should not depend on details. Details should depend on abstractions.
>
> Practically: depend on interfaces/contracts, keep implementation details behind them, and wire concrete implementations via DI.

## Links

- [Inversion of Control and Dependency Injection (Fowler)](https://martinfowler.com/articles/injection.html)


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
