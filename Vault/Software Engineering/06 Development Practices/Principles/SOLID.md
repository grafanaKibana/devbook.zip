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

# SOLID Principles

SOLID is a mnemonic for five object-oriented design principles that help keep code modular, testable, and easy to change. They are not rules to follow blindly — they are heuristics for managing complexity. In a 300-class e-commerce platform, applying DIP (Dependency Inversion) to the payment module reduced the time to add a new payment provider from 2 weeks of cross-cutting changes to 3 days of implementing a single `IPaymentGateway` interface — because no existing code needed modification. Violating them is sometimes the right call; the cost is usually increased coupling and harder testing.

## S — Single Responsibility Principle

A class should have one reason to change. "Reason to change" means one actor or stakeholder whose requirements drive changes to that class.

**Violation**: A `UserService` that handles authentication, sends emails, and writes audit logs. Changes to email templates require touching the same class as changes to auth logic.

```csharp
// Violation: one class, three responsibilities
public class UserService
{
    public void Register(User user) { /* save to DB */ }
    public void SendWelcomeEmail(User user) { /* send email */ }
    public void LogAudit(User user) { /* write audit log */ }
}

// Fix: separate classes
public class UserRepository { public void Save(User user) { } }
public class EmailService { public void SendWelcome(User user) { } }
public class AuditLogger { public void Log(User user) { } }
```

## O — Open/Closed Principle

Classes should be open for extension but closed for modification. Add new behavior by adding new code, not by changing existing code.

**Violation**: A `DiscountCalculator` with a switch statement that must be modified every time a new discount type is added.

```csharp
// Fix: use polymorphism
public interface IDiscountStrategy { decimal Calculate(Order order); }
public class PercentageDiscount : IDiscountStrategy { /* ... */ }
public class FlatDiscount : IDiscountStrategy { /* ... */ }
// New discount type = new class, no changes to existing code
```

## L — Liskov Substitution Principle

Derived types must be substitutable for their base types without breaking the program. If you have to check the runtime type of an object to decide how to use it, LSP is violated.

**Classic violation**: `Square` inherits from `Rectangle` but overrides `Width` and `Height` setters to keep them equal. Code that sets `Width` and `Height` independently breaks when given a `Square`.

```csharp
// Fix: don't inherit when the subtype changes the contract
// Use composition or separate interfaces instead
public interface IShape { double Area(); }
public class Rectangle : IShape { /* ... */ }
public class Square : IShape { /* ... */ }
```

## I — Interface Segregation Principle

Prefer small, focused interfaces over large "fat" interfaces. Clients should not be forced to depend on methods they do not use.

```csharp
// Violation: fat interface
public interface IWorker { void Work(); void Eat(); void Sleep(); }

// Fix: split by client need
public interface IWorkable { void Work(); }
public interface IFeedable { void Eat(); }
// A robot implements IWorkable but not IFeedable
```

## D — Dependency Inversion Principle

High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details.

```csharp
// Violation: high-level class depends on concrete low-level class
public class OrderService
{
    private readonly SqlOrderRepository _repo = new SqlOrderRepository();
}

// Fix: depend on abstraction, inject the implementation
public class OrderService
{
    private readonly IOrderRepository _repo;
    public OrderService(IOrderRepository repo) => _repo = repo;
}
```

## Tradeoffs

**SOLID purity vs pragmatism**
Strict SOLID application creates more files, more interfaces, and more indirection. For a 50-line script or a prototype, this overhead exceeds the benefit. Apply SOLID where complexity is real: large codebases, multiple developers, long-lived systems. The cost of over-engineering (unnecessary abstractions, premature interfaces) is as real as the cost of under-engineering (tight coupling, untestable code).

**Per-principle cost**

| Principle | Benefit | Cost | When to relax |
|-----------|---------|------|---------------|
| SRP | Focused classes, easier testing | More files, more navigation | Small utilities with one actor |
| OCP | Add features without modifying existing code | Requires upfront abstraction | When the extension point is not yet clear |
| LSP | Substitutable types, no runtime type checks | Constrains inheritance hierarchy | Rarely — LSP violations are usually design errors |
| ISP | Clients depend only on what they use | More interfaces to maintain | When one client uses all methods |
| DIP | Testable, swappable implementations | DI container overhead, more indirection | Performance-critical paths with measurable overhead |

Decision rule: apply SOLID where you have evidence of coupling pain (hard to test, hard to change, hard to understand). Don't apply it speculatively to code that hasn't caused problems.

## Pitfalls

**Over-engineering**: Applying SOLID to every class in a small codebase creates unnecessary abstractions. A 50-line script does not need interfaces and dependency injection. A team applied ISP so aggressively to a 20-endpoint internal tool that they ended up with 47 single-method interfaces — navigating the codebase required tracing through 3-4 layers of indirection for every feature, and new developers took 2 weeks to onboard on what should have been a simple CRUD application. Apply SOLID where complexity is real, not anticipated.

**SRP misapplied**: "One reason to change" is not "one method per class". A class can have multiple methods as long as they all serve the same actor/concern.

## Questions

> [!QUESTION]- Which SOLID principles does a typical Singleton violate?
> - DIP: code depends on a concrete global instance instead of an abstraction injected via DI.
> - SRP: the singleton often mixes business logic with lifecycle and global access concerns.
> - OCP: replacing/extending behavior usually requires changing call sites or the singleton itself.
> - Fix: expose an interface and let a DI container manage a singleton lifetime.
> - Tradeoff: DI adds indirection; singletons are simpler but harder to test and extend.

> [!QUESTION]- When is it acceptable to violate SOLID principles?
> - Small scripts and prototypes where the overhead of abstractions exceeds the benefit.
> - Performance-critical paths where virtual dispatch or interface overhead is measurable.
> - When the "correct" abstraction is not yet clear — premature abstraction is worse than duplication.
> - Tradeoff: SOLID reduces coupling and improves testability at the cost of more files, more indirection, and more cognitive overhead.

## References

- [SOLID (Wikipedia)](https://en.wikipedia.org/wiki/SOLID) — overview of all five principles with history and examples
- [Microsoft — Design principles](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles) — SOLID and related principles in the context of .NET architecture
- [SOLID principles in C# (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#solid) — SOLID applied to ASP.NET Core architecture with .NET-specific examples.
- [Clean Architecture (Robert C. Martin)](https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/) — the book that extends SOLID into architectural principles; covers component cohesion, coupling, and the dependency rule.
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/IoC (Holywood Principle)|IoC (Holywood Principle)]]
> - [[Software Engineering/06 Development Practices/Principles/KISS|KISS]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI|YAGNI]]
<!-- whats-next:end -->
