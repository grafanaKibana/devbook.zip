---
topic:
  - "Programming"
subtopic:
  - "NET"
tags:
  - FolderNote
---

# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- Which access modifiers do you know?
> `public`, `private`, `protected`, `internal`, `protected internal`, `private protected`.

> [!QUESTION]- What are the default access modifiers for fields, methods, structs, and classes?
> Fields and methods default to `private`. Top-level classes and structs default to `internal`.

> [!QUESTION]- What is implicit typing in C#?
> It's using `var` so the compiler infers the variable's static type from the initializer.
> `var`.


> [!QUESTION]- What is a variable?
> A variable is a named, typed storage location that holds a value (or a reference) so your program can read and update that value while it runs.


## Links

## Deeper Explanation


## Questions


## Links


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
