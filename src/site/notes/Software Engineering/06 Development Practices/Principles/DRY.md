---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/dry/"}
---

# Intro

DRY means one place should own a single piece of knowledge, so you do not have to change the same rule in multiple places.
It is not "never repeat code." It is "avoid duplicated business rules and duplicated decision logic."
You reach for DRY when duplication causes bugs, inconsistent behavior, or high change cost. In a payments codebase, the tax calculation formula was duplicated in the checkout API and the invoicing batch job — when tax rates changed, only the API was updated, causing a $43,000 discrepancy over two months before the invoicing path was discovered.

## Deeper Explanation

DRY is about knowledge, not code. Two pieces of code that look identical but represent different business rules are NOT a DRY violation — they should stay separate because they will evolve independently. Two pieces of code that encode the same business rule ARE a DRY violation — when the rule changes, you must update both, and you will miss one.

The classic failure mode is **accidental duplication**: code that looks the same today but has different intent. Unifying it creates a shared abstraction that breaks when one side needs to change.

```csharp
// Accidental duplication: looks the same, different intent
// User validation: name must be non-empty
bool IsValidUserName(string name) => !string.IsNullOrWhiteSpace(name);

// Product validation: name must be non-empty
bool IsValidProductName(string name) => !string.IsNullOrWhiteSpace(name);

// DO NOT unify these. User names and product names will diverge:
// User names: max 50 chars, no special characters
// Product names: max 200 chars, allow Unicode
// Unifying them creates a shared rule that doesn't fit either.
```

```csharp
// Real DRY violation: the same business rule in two places
// Both endpoints validate email the same way for the same reason
// POST /users: if (!email.Contains('@')) return BadRequest();
// POST /invites: if (!email.Contains('@')) return BadRequest();

// Fix: centralize the rule
public static class EmailRules
{
    public static bool IsValid(string value) =>
        !string.IsNullOrWhiteSpace(value) && value.Contains('@');
}
// Now when the rule changes (add TLD check, use regex), one place to update.
```

### Pitfalls

- **Premature abstraction**: you unify code that looks similar but has different intent. When one side needs to change, you must either break the abstraction or add a parameter to handle the divergence — making the shared code more complex than the duplication it replaced. A team extracted a shared `ValidateName()` helper for both user and product name validation; six months later, the function had 4 boolean parameters (`allowUnicode`, `maxLength`, `allowSpaces`, `requireCapitalization`) and 12 call sites passing different flag combinations — a textbook case of premature abstraction costing more than the original duplication.
- **Shared helper that becomes a dumping ground**: a `StringUtils` or `Helpers` class that accumulates unrelated methods. High coupling, low cohesion.
- **Over-reuse across bounded contexts**: sharing a domain model between two bounded contexts (e.g., `Order` used by both the billing and shipping contexts) causes cascading changes when one context's requirements evolve.

### Tradeoffs

- Local duplication can be cheaper than a shared abstraction when future divergence is likely. The cost of duplication is paid once (when the rule changes and you miss a copy). The cost of a wrong abstraction is paid continuously (every time you touch the shared code).
- DRY often increases coupling. A shared abstraction means two callers depend on the same code. Balance DRY with the ability to change each caller independently.
- The Rule of Three: tolerate duplication once, consider abstracting on the second occurrence, abstract on the third. One occurrence is not enough information to design the right abstraction.
## Questions

> [!QUESTION]- What is DRY actually trying to prevent?
> Duplicated knowledge and duplicated rules.
> If a change requires edits in multiple places, DRY is a signal.

> [!QUESTION]- When is it OK to repeat code?
> When the repetition is small, the meaning is different, or the logic is expected to diverge.
> Local duplication is sometimes safer than a shared abstraction.

## Links

- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/) — the book that coined DRY; Chapter 7 explains the principle with examples of knowledge duplication vs code duplication.
- [DRY principle (Wikipedia)](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) — concise definition and common misapplications.
- [The Law of Leaky Abstractions (Joel Spolsky)](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/) — practitioner essay on why premature abstraction (the DRY failure mode) creates more problems than it solves.
- [AHA Programming (Kent C. Dodds)](https://kentcdodds.com/blog/aha-programming) — 'Avoid Hasty Abstractions': prefer duplication over the wrong abstraction; abstract only when the pattern is clear from multiple concrete use cases.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/06 Development Practices/06 Development Practices\|06 Development Practices]]
>
> **Pages**
> - [[Software Engineering/06 Development Practices/Principles/IoC (Holywood Principle)\|IoC (Holywood Principle)]]
> - [[Software Engineering/06 Development Practices/Principles/KISS\|KISS]]
> - [[Software Engineering/06 Development Practices/Principles/SOLID\|SOLID]]
> - [[Software Engineering/06 Development Practices/Principles/YAGNI\|YAGNI]]
<!-- whats-next:end -->
