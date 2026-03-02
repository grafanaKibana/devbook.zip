---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/kiss/"}
---

# Intro

KISS (Keep It Simple, Stupid) means prefer the simplest solution that meets the actual requirements. Simple is not the same as "quick hack" — simple means fewer moving parts, fewer hidden assumptions, and clear failure modes. You reach for KISS when complexity is added "just in case" or when abstractions obscure the real behavior.

Complexity has ongoing cost: bugs, onboarding time, testing, and operations. Every abstraction layer you add must earn its keep by solving a proven problem.

## Violation vs Fix

**Over-engineered:**

```csharp
// A generic event-sourced, CQRS-based, plugin-extensible system
// for storing a user's display name preference
public class UserPreferenceCommandHandler<TCommand, TResult>
    where TCommand : ICommand<TResult>
{
    // 200 lines of infrastructure for: user.DisplayName = name
}
```

**KISS:**

```csharp
public class UserService
{
    public async Task SetDisplayNameAsync(int userId, string name, CancellationToken ct)
    {
        var user = await _db.Users.FindAsync(userId, ct);
        user!.DisplayName = name;
        await _db.SaveChangesAsync(ct);
    }
}
```

The second version is boring, obvious, and correct. Add the event sourcing when you have a proven need for audit history or temporal queries — not before.

## When KISS Is the Wrong Choice

KISS does not mean "ignore requirements." Some complexity is mandatory:

- **Security:** skipping input validation, rate limiting, or authentication in a public API is not "simple" — it is negligent.
- **Correctness:** a naive implementation that ignores edge cases (integer overflow, null handling, race conditions) is not simple — it is broken.
- **Compliance:** regulatory requirements (GDPR, PCI-DSS) add complexity that cannot be avoided.

The principle is: add complexity only to solve a proven problem, not a hypothetical one.

## Pitfalls

**Confusing simple with no structure**
A 2,000-line `Program.cs` with no separation of concerns is not simple — it is unstructured. KISS means simple design, not absence of design.

**Avoiding necessary abstractions**
Refusing to extract a shared abstraction to "keep it simple" leads to duplication everywhere. When the same logic appears in three places, the simple solution is to extract it.

**Premature simplification**
Removing a safety mechanism (retry logic, circuit breaker, idempotency key) because it "adds complexity" creates a system that fails in production in non-obvious ways.

## References

- [KISS principle (Wikipedia)](https://en.wikipedia.org/wiki/KISS_principle) — origin of the term, examples from engineering and software design.
- [The Pragmatic Programmer (Hunt & Thomas)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Chapter on "Good Enough Software" and avoiding over-engineering.
- [The law of leaky abstractions (Joel Spolsky)](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/) — why abstractions always leak and why understanding the underlying mechanism matters.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/DRY\|DRY]]
> - [[Software Engineering/06 Development Practices/Principles/IoC (Holywood Principle)\|IoC (Holywood Principle)]]
> - [[Software Engineering/06 Development Practices/Principles/SOLID\|SOLID]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI\|YAGNI]]
<!-- whats-next:end -->
