---
topic:
  - "Programming"
subtopic:
  - "NET"
level:
  - "4"
priority: Medium
status: Ready To Repeat

dg-publish: true
---

# Intro

ASP.NET Web API runs requests through a configurable middleware pipeline, then dispatches to an endpoint (often an MVC controller action).

## Deeper Explanation

## Questions

> [!QUESTION]- What is mapping, why is it needed, and how can it be implemented?
> Mapping is the transformation of data from one shape/type to another (for example, Domain Entity -> DTO -> API response model).
> It is used to decouple layers, hide internal details, enforce API contracts, prevent over-posting, and shape data for clients.
> Typical implementation options:
> - manual mapping (constructors, factory methods, extension methods)
> - mapping libraries (AutoMapper, Mapster)
> - code generation / source generators for mappings

> [!QUESTION]- What are serialization and deserialization?
> Serialization converts an in-memory object graph into a format that can be stored or transmitted (for example, JSON text or a binary payload).
> Deserialization is the reverse process: converting that stored/transmitted representation back into objects.
> Common uses: API payloads, persistence, caching, messaging.

> [!QUESTION]- What is JSON and why is it used?
> JSON (JavaScript Object Notation) is a lightweight text data format based on objects (name/value pairs) and arrays.
> It is widely used for data interchange, especially in HTTP APIs, because it is human-readable, language-agnostic, and easy to parse.
> In .NET, JSON is commonly handled with `System.Text.Json` (built-in) or Newtonsoft.Json.

## Links

- [ASP.NET Core web API docs](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-8.0)
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
