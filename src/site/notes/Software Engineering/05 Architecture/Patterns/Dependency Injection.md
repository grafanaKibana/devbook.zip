---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/dependency-injection/","noteIcon":""}
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

:LiArrowUpLeft: [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" data-href="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" href="Software Engineering/05 Architecture/Patterns/Circut Breaker.md" class="internal-link" target="_blank" rel="noopener nofollow">Circut Breaker</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/CQRS.md" data-href="Software Engineering/05 Architecture/Patterns/CQRS.md" href="Software Engineering/05 Architecture/Patterns/CQRS.md" class="internal-link" target="_blank" rel="noopener nofollow">CQRS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/CQS.md" data-href="Software Engineering/05 Architecture/Patterns/CQS.md" href="Software Engineering/05 Architecture/Patterns/CQS.md" class="internal-link" target="_blank" rel="noopener nofollow">CQS</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Design Patterns.md" data-href="Software Engineering/05 Architecture/Patterns/Design Patterns.md" href="Software Engineering/05 Architecture/Patterns/Design Patterns.md" class="internal-link" target="_blank" rel="noopener nofollow">Design Patterns</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" data-href="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" href="Software Engineering/05 Architecture/Patterns/Domain-Driven Development.md" class="internal-link" target="_blank" rel="noopener nofollow">Domain-Driven Development</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" data-href="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" href="Software Engineering/05 Architecture/Patterns/Event Sourcing.md" class="internal-link" target="_blank" rel="noopener nofollow">Event Sourcing</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" data-href="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" href="Software Engineering/05 Architecture/Patterns/Event-Driven Architecture.md" class="internal-link" target="_blank" rel="noopener nofollow">Event-Driven Architecture</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/GRASP.md" data-href="Software Engineering/05 Architecture/Patterns/GRASP.md" href="Software Engineering/05 Architecture/Patterns/GRASP.md" class="internal-link" target="_blank" rel="noopener nofollow">GRASP</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/05 Architecture/Patterns/Repository &amp; UoW.md" data-href="Software Engineering/05 Architecture/Patterns/Repository &amp; UoW.md" href="Software Engineering/05 Architecture/Patterns/Repository &amp; UoW.md" class="internal-link" target="_blank" rel="noopener nofollow">Repository &amp; UoW</a></span></li></ul></div>

