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
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

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

## Further Reading

- [Dependency injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
