---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "1"
priority: Medium
status: Not-Started
---
# Intro

Dependency Injection (DI) is a technique where objects receive their dependencies from an external container instead of constructing them directly.

## Deeper Explanation

## Questions

> [!QUESTION]- What is the difference between `services.AddTransient`, `services.AddScoped`, and `services.AddSingleton` in ASP.NET Core DI?
> These methods define the service lifetime:
> - `Transient`: a new instance is created every time the service is requested.
> - `Scoped`: one instance is created per scope (in web apps, typically per HTTP request).
> - `Singleton`: one instance is created for the entire application lifetime (the root container).
>
> Common pitfalls: singletons must be thread-safe; do not inject scoped services into singletons (it effectively becomes a captive dependency); `DbContext` is typically registered as scoped.
>
> ```csharp
> services.AddTransient<IMailer, SmtpMailer>();
> services.AddScoped<AppDbContext>();
> services.AddSingleton<IClock, SystemClock>();
> ```

## Links

- [Dependency injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)

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

