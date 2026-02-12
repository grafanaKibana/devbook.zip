---
topic: ["Programming"]
subtopic: ["NET", "C#"]
level: ["1"]
priority: Medium
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

## Questions

> [!QUESTION]- Which access modifiers do you know?
> `public`, `private`, `protected`, `internal`, `protected internal`, `private protected`.

> [!QUESTION]- What is an attribute and why do we need it?
> It's metadata attached to code that can be discovered (usually via reflection) and used by tools/frameworks to drive behavior.

> [!QUESTION]- What are the default access modifiers for fields, methods, structs, and classes?
> Fields and methods default to `private`. Top-level classes and structs default to `internal`.

> [!QUESTION]- What is an immutable type?
> It's a type whose state cannot be modified after the instance is created.

> [!QUESTION]- What is implicit typing in C#?
> It's using `var` so the compiler infers the variable's static type from the initializer.
> `var`.

> [!QUESTION]- What is a namespace? Why do we need it?
> It is a logical grouping of types that helps organize code and avoid type name collisions.
> A namespace is a logical scope for grouping related types; it helps organize code and avoid type name collisions.

> [!QUESTION]- What are optional parameters in methods?
> Parameters with a default value that can be omitted by the caller; the default is substituted at compile time.
> Parameters with default values that callers can omit; the default value is substituted at compile time.

> [!QUESTION]- What is reflection?
> It's the runtime API (`System.Reflection`) for reading type metadata (types, methods, properties, attributes) and optionally invoking members dynamically.
> Reflection is runtime inspection of assemblies, types, members, and attributes (via `System.Reflection`), and it can also be used to invoke members dynamically.

> [!QUESTION]- What is a variable?
> A variable is a named, typed storage location that holds a value (or a reference) so your program can read and update that value while it runs.

> [!QUESTION]- What is abc?
> Answer

## Further Reading
