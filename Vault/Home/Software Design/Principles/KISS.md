---
topic:
  - Software Design
subtopic:
  - Principles
summary: "Prefer the simplest solution that meets the actual requirements."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

KISS (Keep It Simple, Stupid) favors the least complicated design that satisfies the actual requirements. Simple does not mean improvised or incomplete. It means that the essential state changes, dependencies, and failure modes remain visible without machinery that serves only a hypothetical future.

Complexity continues to charge rent through testing, deployment, diagnosis, and change. An abstraction or infrastructure component earns that cost when it contains a known variation, failure mode, or operational constraint.

# A Direct Implementation

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
        var user = await _db.Users.FindAsync(new object?[] { userId }, ct);
        user!.DisplayName = name;
        await _db.SaveChangesAsync(ct);
    }
}
```

The second version exposes the required state change directly. A production implementation still needs the validation, authorization, concurrency handling, and error behavior required by its contract. Event sourcing becomes defensible when durable history, temporal reconstruction, or another concrete requirement needs it.

# When KISS Is the Wrong Choice

KISS does not erase requirements. Some constraints make a more elaborate design necessary:

- **Security:** authentication, authorization, validation, abuse controls, and auditability belong where the threat model requires them.
- **Correctness:** overflow, null handling, retries, ordering, and races matter when they can violate the operation's contract.
- **Compliance:** privacy, retention, payment, and audit obligations can require controls that a purely local design would not need.

The simpler design is the one that meets these constraints with the fewest independent concepts, not the one with the fewest lines.

# KISS in Distributed Systems

Distributed systems make unnecessary complexity especially expensive. A message broker, cache, service mesh, or saga coordinator introduces another failure domain, consistency boundary, deployment dependency, and source of operational state.

**Common over-engineering patterns:**
- Adding a message broker between two services solely because asynchronous work may be needed later.
- Implementing event sourcing for a domain that has no audit or temporal query requirements.
- Splitting a system into independently deployed services before independent scaling, ownership, or failure isolation requires it.

**The KISS test for distributed systems:** every network hop, data store, and asynchronous boundary needs a present reason. “Future scalability” without a known constraint is not enough because the operational cost begins immediately.

A direct call and one durable store may be sufficient at first. A queue, cache, replica, or additional service belongs when measurements or requirements identify the constraint it resolves.

# Pitfalls

**Confusing simple with unstructured**

A single large composition file can hide ordering, lifetime, and configuration relationships even though it uses no formal abstractions. Structure is useful when it separates concerns that change or fail independently.

**Avoiding necessary abstractions**

Repeated syntax does not determine whether an abstraction is needed. Extraction is simpler when several callers depend on the same rule and must change together. Duplication is safer when similar code represents independent knowledge.

**Premature simplification**

Removing a safety mechanism because it adds moving parts can merely hide the failure it handled. Retries, circuit breakers, and idempotency each belong only where the operation's failure and delivery semantics require them.

# References

- [Simple Made Easy](https://www.infoq.com/presentations/Simple-Made-Easy/)
