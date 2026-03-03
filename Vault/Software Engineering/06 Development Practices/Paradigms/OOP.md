---
topic:
  - Development Practices
subtopic:
  - Paradigms
level:
  - "4"
priority: Medium
status: Creation
dg-publish: true
---

# Object-Oriented Programming (OOP)

OOP is a programming paradigm where a system is modeled as interacting objects that combine state (fields) and behavior (methods). The four pillars — encapsulation, abstraction, inheritance, and polymorphism — are tools for managing complexity, not goals in themselves.

## The Four Pillars

### Encapsulation
Hide internal state and expose a stable API. Enforce invariants inside the object so callers cannot put it into an invalid state.

```csharp
public class BankAccount
{
    private decimal _balance;
    public decimal Balance => _balance; // read-only

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentException("Amount must be positive");
        _balance += amount;
    }
    // Callers cannot set _balance directly — invariant enforced
}
```

### Abstraction
Model only the essential aspects of a concept and hide irrelevant details. Interfaces and abstract classes are the primary tools.

```csharp
public interface IPaymentGateway
{
    Task<PaymentResult> ChargeAsync(decimal amount, string currency);
}
// Callers depend on the abstraction, not on Stripe or PayPal specifics
```

### Inheritance
Reuse and extend behavior by deriving from a base type. The mechanism: the CLR's virtual method table (vtable) maps method slots to implementations, and derived classes can replace entries via `override`. The risk: deep hierarchies create tight coupling — a change to a base class method signature or default behavior can silently break all derived classes (fragile base class problem). Rule: use inheritance for genuine "is-a" relationships with shared invariants (e.g., `HttpMessageHandler` pipeline), use composition for everything else.

```csharp
// Prefer composition:
public class EmailNotifier
{
    private readonly ISmtpClient _smtp;
    public EmailNotifier(ISmtpClient smtp) => _smtp = smtp;
}
// Over inheritance:
// public class EmailNotifier : SmtpClient { } // tight coupling to implementation
```

### Polymorphism
Treat different implementations through a common contract and get behavior based on the runtime type.

```csharp
IEnumerable<IPaymentGateway> gateways = [new StripeGateway(), new PayPalGateway()];
foreach (var gateway in gateways)
    await gateway.ChargeAsync(100m, "USD"); // each handles it differently
```

## Pitfalls

**Deep inheritance hierarchies** — each level of inheritance adds coupling. A production example: a payment processing system had `PaymentBase` → `CardPayment` → `AuthorizedCardPayment` → `RefundableAuthorizedCardPayment`. Adding retry logic to `PaymentBase.Process()` broke `RefundableAuthorizedCardPayment` because it overrode `Process()` and assumed a specific call order. Flattening to `IPayment` interface + composition cut the bug rate in that module by 60% over two quarters. Prefer interfaces and composition; limit inheritance to 2 levels maximum.

**Anemic domain model** — objects with only getters/setters and no behavior. All logic lives in service classes. This is procedural programming with OOP syntax — invariants are enforced in service code (scattered, easy to miss), and objects can be put into invalid states. A real example: an `Order` class with public `Status` setter allowed any service to set `Status = Shipped` without checking whether payment was confirmed. Moving the transition to `Order.Ship()` with a guard (`if (Status != PaymentConfirmed) throw`) eliminated an entire category of invalid-state bugs.

**Overusing inheritance for code reuse** — inheriting from a class just to reuse a method creates an "is-a" relationship that may not be semantically correct. Example: `EmailNotifier : SmtpClient` just to get `Send()` — now `EmailNotifier` IS an SMTP client and exposes 40+ public methods from `SmtpClient` that callers shouldn't use. Use composition (`EmailNotifier` has an `ISmtpClient` field) or extension methods instead.
## Tradeoffs

| Decision | OOP Approach | Alternative | When OOP Wins | When Alternative Wins |
| --- | --- | --- | --- | --- |
| **State management** | Mutable state encapsulated in objects | Immutable data + pure functions (FP) | Complex domain invariants that must be enforced at every mutation (banking, inventory, workflow engines) | Data transformation pipelines, ETL, event processing where immutability prevents race conditions |
| **Code reuse** | Inheritance (shared base implementation) | Composition + interfaces | Genuine type hierarchies with shared invariants (ASP.NET `Controller` → `ControllerBase`) — limit to 2 levels | Everything else — composition is more flexible, testable, and doesn't create fragile base class coupling |
| **Extensibility** | Virtual methods + override | Strategy/delegate injection | Stable extension points with well-defined contracts (middleware pipelines, template method) | High-variance behavior that changes at runtime or per-request (feature flags, A/B routing) |
| **Testability** | Interface-based DI + mocking | Pure functions (no mocking needed) | Services with external dependencies (DB, HTTP, queues) where mocking isolates the unit under test | Pure computation where input → output is deterministic and mocking adds ceremony for no benefit |

**Decision rule**: use OOP for domain modeling with complex invariants and state transitions (DDD aggregates, workflow engines). Use functional patterns (LINQ, records, pure functions) for data transformation and stateless computation. Most production C# codebases use both — OOP for the domain layer, functional style for the application/infrastructure layers.

## Questions

> [!QUESTION]- When should you prefer composition over inheritance?
> Prefer composition when the relationship is 'has-a' rather than 'is-a', when you need to combine behaviors from multiple sources (C# has no multiple inheritance), or when the base class is not designed for extension (sealed or has complex invariants). Inheritance creates tight coupling: a change to the base class can break all derived classes. Composition lets you swap implementations at runtime and test components in isolation. Rule of thumb: if you find yourself overriding methods to change or suppress base behavior, composition is the better fit.

> [!QUESTION]- What is the Anemic Domain Model and why is it considered an anti-pattern?
> An Anemic Domain Model has objects with only getters/setters and no behavior — all logic lives in service classes. It violates encapsulation: the service must reach into the object to get data, then compute and set results back. This is procedural programming with OOP syntax. The cost: invariants are enforced in service code (scattered, easy to miss), objects can be put into invalid states, and the domain model provides no design guidance. Fix: move behavior that depends on an object's data into the object itself (Information Expert principle).

> [!QUESTION]- How does polymorphism reduce conditional complexity?
> Without polymorphism, behavior that varies by type requires if/switch chains: 'if type == PDF, do X; if type == CSV, do Y.' Each new type requires modifying existing code (Open/Closed violation). With polymorphism, each type implements a shared interface and handles its own behavior. Adding a new type means adding a new class, not modifying existing code. The caller iterates over `IEnumerable<IReportGenerator>` and calls `Generate()` — the runtime dispatches to the correct implementation.


## References

- [Microsoft — Object-oriented programming in C#](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/oop) — official C# OOP guide with examples
- [Microsoft — Composition over inheritance](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles#prefer-composition-over-inheritance) — .NET architecture guidance on when to prefer composition
- [Composition over inheritance (Wikipedia)](https://en.wikipedia.org/wiki/Composition_over_inheritance) — the principle with examples of when inheritance creates fragile hierarchies and how composition avoids them.
- [Anemic Domain Model (Martin Fowler)](https://martinfowler.com/bliki/AnemicDomainModel.html) — Fowler's critique of the anti-pattern: why separating data from behavior loses the benefits of OOP.
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Paradigms/Event-driven|Event-driven]]
> - [[Software Engineering/06 Development Practices/Paradigms/Functional Programming|Functional Programming]]
> - [[Software Engineering/06 Development Practices/Paradigms/Integration Testing|Integration Testing]]
> - [[Software Engineering/06 Development Practices/Paradigms/Test-Driven Development|Test-Driven Development]]
> - [[Software Engineering/06 Development Practices/Paradigms/Unit Testing|Unit Testing]]
<!-- whats-next:end -->
