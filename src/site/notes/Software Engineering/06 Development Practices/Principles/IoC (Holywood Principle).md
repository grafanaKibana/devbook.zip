---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/io-c-holywood-principle/","dg-note-properties":{"topic":["Development Practices"],"subtopic":["Principles"],"level":["4"],"priority":"High","status":"Creation"}}
---


# Inversion of Control (Hollywood Principle)

Inversion of Control (IoC) is a design principle where the flow of control is inverted: instead of your code creating and managing its dependencies, an external mechanism (a framework or container) coordinates object creation and composition. The name comes from the phrase *Don't call us, we'll call you* — your code defines what it needs, and the framework provides it. In practice, IoC is what makes ASP.NET Core's `builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>()` work: the framework reads the registrations, inspects constructor signatures, and wires everything together at request time. Without IoC, every class would `new` its own dependencies, creating a tightly coupled object graph that cannot be tested or reconfigured without editing source code.

IoC is the principle; **Dependency Injection (DI)** is the most common technique for implementing it. See [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]] for the full treatment of DI patterns, service lifetimes, and ASP.NET Core's DI container.

## How It Works

Without IoC, a class creates its own dependencies:

```csharp
// Tightly coupled — OrderService controls its own dependencies
public class OrderService
{
    private readonly SqlOrderRepository _repo = new SqlOrderRepository("conn-string");
    private readonly SmtpEmailSender _email   = new SmtpEmailSender("smtp.example.com");
}
```

With IoC (via constructor injection), the container provides dependencies:

```csharp
// Loosely coupled — dependencies are injected, not created
public class OrderService(IOrderRepository repo, IEmailSender email)
{
    // repo and email are provided by the DI container
}

// Registration in Program.cs
builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
```

The container calls `OrderService` with the right implementations — "don't call us, we'll call you."

## IoC vs Dependency Inversion Principle (DIP)

These are related but distinct:

- **IoC** (Hollywood Principle): a runtime mechanism — the framework controls object creation and wiring.
- **DIP** (SOLID "D"): a design rule — high-level modules should depend on abstractions, not concrete implementations.

DIP is the *why* (depend on interfaces); IoC/DI is the *how* (let the container wire the concrete implementations). You can follow DIP without a DI container (manual wiring in `Main`), but a container makes it practical at scale.

## Pitfalls

### Service Locator Anti-Pattern

**What goes wrong**: instead of injecting dependencies, a class calls a global `ServiceLocator.Get<IOrderRepository>()` to resolve them. This is IoC in name only — the class still controls its own dependency resolution.

**Why it matters**: dependencies are hidden (not visible in the constructor), making the class hard to test (you must configure the global locator in tests) and hard to reason about (you can't tell what a class needs without reading its implementation).

**Mitigation**: always use constructor injection. The constructor signature is the contract — it makes dependencies explicit and testable.

### Over-Injection (Constructor Bloat)

**What goes wrong**: a class has 8+ constructor parameters. Every new feature adds another dependency. The constructor becomes a sign that the class has too many responsibilities.

**Why it happens**: DI makes adding dependencies easy — too easy. Each dependency feels justified in isolation.

**Mitigation**: treat a constructor with more than 4-5 parameters as a design smell. Extract a new service or aggregate related dependencies into a parameter object. The root cause is usually an SRP violation.

### Circular Dependencies

**What goes wrong**: `ServiceA` depends on `ServiceB`, which depends on `ServiceA`. The DI container throws at startup.

**Why it happens**: two services that should be decoupled have grown to depend on each other.

**Mitigation**: introduce an interface or event to break the cycle. If `A` needs to notify `B`, have `A` publish an event that `B` subscribes to — no direct dependency.

## Tradeoffs

| Decision | Option A | Option B | When A | When B |
| --- | --- | --- | --- | --- |
| **Constructor injection vs property injection** | Constructor injection: dependencies required at creation | Property injection: dependencies set after creation | Almost always — makes dependencies explicit, enforced at compile time, immutable | Legacy code where constructors cannot be changed, or optional cross-cutting concerns like logging that have safe defaults |
| **DI container vs manual wiring** | Framework DI container (`IServiceCollection`) | Manual `new` in `Main` or composition root | Any non-trivial application — container handles lifetime, scoping, and graph resolution | Small CLI tools, scripts, or when the dependency graph is 3-5 objects and a container adds ceremony |
| **Single container vs multiple containers** | One root `IServiceProvider` for the app | Multiple containers or child scopes for modules | Standard ASP.NET Core apps — one DI root with request scopes | Plugin architectures, multi-tenant isolation, or test scenarios needing independent service graphs |

**Decision rule**: use constructor injection via the built-in ASP.NET Core DI container as the default. Question the pattern only when constructors have more than 5 parameters (SRP violation signal) or when you are writing infrastructure that genuinely needs property injection.


## Questions

> [!QUESTION]- What is the difference between IoC and Dependency Injection?
> IoC is the principle: the framework controls object creation and wiring instead of your code. Dependency Injection is the most common technique for implementing IoC: dependencies are passed in (injected) rather than created internally. You can implement IoC without DI (e.g., using a service locator or factory), but constructor injection via a DI container is the idiomatic .NET approach. IoC is the what; DI is the how.

> [!QUESTION]- What is the difference between IoC and the Dependency Inversion Principle (DIP)?
> DIP (SOLID 'D') is a design rule: high-level modules should depend on abstractions, not concrete implementations. IoC is a runtime mechanism: the framework wires concrete implementations to those abstractions. DIP is the why (depend on interfaces); IoC/DI is the how (let the container provide the concrete class). You can follow DIP without a DI container by manually wiring dependencies in Main, but a container makes it practical at scale.


## References

- [Inversion of Control Containers and the Dependency Injection pattern (Martin Fowler)](https://martinfowler.com/articles/injection.html) — the canonical article that named and defined IoC containers and DI; explains the Hollywood Principle and compares constructor, setter, and interface injection.
- [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]] — full treatment of DI patterns, ASP.NET Core service lifetimes (Singleton/Scoped/Transient), and common pitfalls like captive dependencies.
- [[Software Engineering/06 Development Practices/Principles/SOLID\|SOLID]] — covers the Dependency Inversion Principle (DIP) in context with the other SOLID principles.
- [Dependency injection in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection) — official guide to ASP.NET Core's built-in DI container: service registration, lifetimes, and constructor injection patterns.
- [Service Locator is an Anti-Pattern (Mark Seemann)](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/) — practitioner post explaining why Service Locator violates the explicit dependency principle and how to replace it with constructor injection.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY\|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/KISS\|KISS]]
> - [[Software Engineering/06 Development Practices/Principles/SOLID\|SOLID]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI\|YAGNI]]
<!-- whats-next:end -->
