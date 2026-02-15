---
topic:
  - "Architecture"
subtopic:
  - "Patterns"
level:
  - "2"
priority: Medium
status: Ready To Repeat

---

# Intro

Domain-Driven Design (DDD) is an approach to software development that focuses on modeling the business domain and aligning code with a shared language and domain boundaries.

## Deeper Explanation

## Questions

> [!QUESTION]- What is DDD (Domain-Driven Design)?
> DDD is a set of principles and patterns for building software around a rich domain model. It emphasizes:
> - Ubiquitous Language shared by developers and domain experts
> - Bounded Contexts to define clear domain boundaries
> - Tactical patterns like Entities, Value Objects, Aggregates, Repositories, Domain Events
>
> The goal is to reduce the gap between the business and the code, especially in complex domains.

## Links

[CQRS.nu - Domain Driven Design FAQ](https://cqrs.nu/faq/Domain%20Driven%20Design)

- [Martin Fowler - Domain Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)

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
