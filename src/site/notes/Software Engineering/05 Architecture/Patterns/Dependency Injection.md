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

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Circut Breaker\|Circut Breaker]]
> - [[Software Engineering/05 Architecture/Patterns/CQRS\|CQRS]]
> - [[Software Engineering/05 Architecture/Patterns/CQS\|CQS]]
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns\|Design Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Domain-Driven Development\|Domain-Driven Development]]
> - [[Software Engineering/05 Architecture/Patterns/Event Sourcing\|Event Sourcing]]
> - [[Software Engineering/05 Architecture/Patterns/Event-Driven Architecture\|Event-Driven Architecture]]
> - [[Software Engineering/05 Architecture/Patterns/GRASP\|GRASP]]
> - [[Software Engineering/05 Architecture/Patterns/Repository & UoW\|Repository & UoW]]
<!-- whats-next:end -->
