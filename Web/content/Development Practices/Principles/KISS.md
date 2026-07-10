---
publish: true
created: 2026-07-08T15:01:12.538Z
modified: 2026-07-08T15:01:12.538Z
published: 2026-07-08T15:01:12.538Z
topic:
  - Development Practices
subtopic:
  - Principles
level:
  - "4"
priority: High
status: Ready to Repeat
---

# Intro

KISS (Keep It Simple, Stupid) means prefer the simplest solution that meets the actual requirements. Simple is not the same as "quick hack" — simple means fewer moving parts, fewer hidden assumptions, and clear failure modes. You reach for KISS when complexity is added "just in case" or when abstractions obscure the real behavior. A startup built a full event-sourced CQRS system with a Kafka message bus for what was a 3-table CRUD application serving 50 users — the team spent 60% of engineering time maintaining infrastructure instead of shipping features, and eventually rewrote it as a simple ASP.NET Core API with EF Core in two weeks.

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

## KISS in Distributed Systems

Distributed systems are where KISS violations are most costly. Each added component (message broker, cache, service mesh, saga orchestrator) multiplies operational complexity: more failure modes, more observability requirements, more deployment dependencies.

**Common over-engineering patterns:**

- Adding a message broker between two services that could communicate directly via HTTP, because 'we might need async later.'
- Implementing event sourcing for a domain that has no audit or temporal query requirements.
- Building a microservices architecture for a team of 3 engineers where a modular monolith would suffice.

**The KISS test for distributed systems**: can you explain why each network hop, each data store, and each async boundary exists? If the answer is 'for future scalability' without a current bottleneck, it is a KISS violation.

The simplest distributed system that meets current requirements is almost always the right starting point. Add complexity when you hit a proven constraint, not before.

## Pitfalls

**Confusing simple with no structure**
A 2,000-line `Program.cs` with no separation of concerns is not simple — it is unstructured. A production outage at a fintech company was traced to a 3,400-line `Startup.cs` where middleware ordering, DI registration, and configuration validation were interleaved — a developer reordered two middleware registrations during a refactor and broke authentication for all endpoints, and the bug passed code review because no one could reason about the file's structure. KISS means simple design, not absence of design.

**Avoiding necessary abstractions**
Refusing to extract a shared abstraction to "keep it simple" leads to duplication everywhere. When the same logic appears in three places, the simple solution is to extract it.

**Premature simplification**
Removing a safety mechanism (retry logic, circuit breaker, idempotency key) because it "adds complexity" creates a system that fails in production in non-obvious ways.

## Questions

> [!QUESTION]- How do you distinguish 'simple' from 'simplistic' in a design review?
> Simple: the design has the minimum number of moving parts needed to meet the current requirements, with clear failure modes and no hidden assumptions. Simplistic: the design ignores real requirements (edge cases, error handling, security) to appear simple. The test: can you explain every component's purpose? If a component exists 'just in case' or 'for future flexibility,' it is probably over-engineering. If a component is missing and the system fails in production, it was simplistic.

> [!QUESTION]- When is complexity justified despite KISS?
> When the complexity solves a proven, current problem: security controls (rate limiting, input validation, authentication) are mandatory for public APIs; retry logic and circuit breakers are mandatory for distributed systems; idempotency keys are mandatory for payment processing. The principle is: add complexity only to solve a proven problem, not a hypothetical one. Complexity that prevents production failures is not over-engineering.

> [!QUESTION]- How does KISS interact with YAGNI and DRY?
> They are complementary: YAGNI says don't build features you don't need yet; DRY says don't duplicate knowledge; KISS says keep the implementation simple. Tension arises when DRY requires an abstraction that adds complexity (KISS violation) for a single use case (YAGNI violation). Resolution: apply the Rule of Three — abstract when you have two concrete use cases, not one. One use case is speculation; two give you enough information to design a simple abstraction.

## References

- [KISS principle (Wikipedia)](https://en.wikipedia.org/wiki/KISS_principle) — origin of the term, examples from engineering and software design.
- [The Pragmatic Programmer (Hunt & Thomas)](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — Chapter on "Good Enough Software" and avoiding over-engineering.
- [The law of leaky abstractions (Joel Spolsky)](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/) — why abstractions always leak and why understanding the underlying mechanism matters.
- [Simple Made Easy (Rich Hickey)](https://www.infoq.com/presentations/Simple-Made-Easy/) — the definitive talk distinguishing 'simple' (few interleaved concerns) from 'easy' (familiar); explains why simplicity is a design goal, not a feeling.
