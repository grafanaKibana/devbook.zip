---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "4"
priority: Medium
status: Ready To Repeat

dg-publish: true
---
# Intro

Design patterns are reusable, named solutions to recurring design problems. They provide a shared vocabulary and help keep code flexible and maintainable.

## Deeper Explanation

## Questions

> [!QUESTION]- What are design patterns and why do we need them?
> Design patterns are proven, repeatable approaches to common design problems (not copy-paste code). They help you communicate intent, reduce accidental complexity, and improve maintainability by encouraging good separation of concerns and loose coupling.

> [!QUESTION]- What categories of patterns exist?
> For GoF design patterns, the classic categories are:
> - Creational: object creation (how instances are constructed)
> - Structural: object composition (how classes/objects are arranged)
> - Behavioral: object interaction (how responsibilities and communication are organized)

> [!QUESTION]- What is an anti-pattern?
> An anti-pattern is a common, recurring solution to a problem that looks reasonable at first but leads to negative consequences (for example, high coupling, poor testability, or performance issues).

> [!QUESTION]- Name a few patterns from each category and the basic idea behind them.
> Creational:
> - Factory Method: delegate creation to subclasses / factories to decouple callers from concrete types.
> - Builder: construct complex objects step-by-step, separating construction from representation.
>
> Structural:
> - Adapter: make incompatible interfaces work together.
> - Decorator: add behavior by wrapping objects instead of subclassing.
>
> Behavioral:
> - Strategy: swap algorithms behind a common interface.
> - Observer: publish/subscribe notifications to keep components loosely coupled.

## Links

- [Refactoring.Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Wikipedia - Design pattern](https://en.wikipedia.org/wiki/Design_pattern)
- [C# Bridge Design Pattern](https://www.dofactory.com/net/bridge-design-pattern)

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

