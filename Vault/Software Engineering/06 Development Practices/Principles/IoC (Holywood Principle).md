---
topic:
  - Development Practices
subtopic:
  - Principles
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---

# Inversion of Control (Hollywood Principle)

Inversion of Control (IoC) is a design principle where the flow of control is inverted: instead of your code creating and managing its dependencies, an external mechanism (a framework or container) coordinates object creation and composition. The name "Hollywood Principle" comes from the phrase *"Don't call us, we'll call you"* — your code defines what it needs, and the framework provides it.

IoC is the principle; **Dependency Injection (DI)** is the most common technique for implementing it. See [[Software Engineering/05 Architecture/Patterns/Dependency Injection|Dependency Injection]] for the full treatment of DI patterns, service lifetimes, and ASP.NET Core's DI container.

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

## Questions

> [!QUESTION]- What is the difference between IoC and Dependency Injection?
> IoC is the principle: the framework controls object creation and wiring instead of your code. Dependency Injection is the most common technique for implementing IoC: dependencies are passed in (injected) rather than created internally. You can implement IoC without DI (e.g., using a service locator or factory), but constructor injection via a DI container is the idiomatic .NET approach. IoC is the what; DI is the how.

> [!QUESTION]- What is the difference between IoC and the Dependency Inversion Principle (DIP)?
> DIP (SOLID 'D') is a design rule: high-level modules should depend on abstractions, not concrete implementations. IoC is a runtime mechanism: the framework wires concrete implementations to those abstractions. DIP is the why (depend on interfaces); IoC/DI is the how (let the container provide the concrete class). You can follow DIP without a DI container by manually wiring dependencies in Main, but a container makes it practical at scale.


## References

- [Inversion of Control Containers and the Dependency Injection pattern (Martin Fowler)](https://martinfowler.com/articles/injection.html) — the canonical article that named and defined IoC containers and DI; explains the Hollywood Principle and compares constructor, setter, and interface injection.
- [[Software Engineering/05 Architecture/Patterns/Dependency Injection|Dependency Injection]] — full treatment of DI patterns, ASP.NET Core service lifetimes (Singleton/Scoped/Transient), and common pitfalls like captive dependencies.
- [[Software Engineering/06 Development Practices/Principles/SOLID|SOLID]] — covers the Dependency Inversion Principle (DIP) in context with the other SOLID principles.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/KISS|KISS]]
> - [[Software Engineering/06 Development Practices/Principles/SOLID|SOLID]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI|YAGNI]]
<!-- whats-next:end -->
