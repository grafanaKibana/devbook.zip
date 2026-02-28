---
{"dg-publish":true,"permalink":"/software-engineering/06-development-practices/principles/dry/","noteIcon":"3"}
---

# Intro

DRY means one place should own a single piece of knowledge, so you do not have to change the same rule in multiple places.
It is not "never repeat code." It is "avoid duplicated business rules and duplicated decision logic."
You reach for DRY when duplication causes bugs, inconsistent behavior, or high change cost.

## Deeper Explanation

### Example

Instead of duplicating the same validation rule in multiple endpoints, centralize the rule.

```csharp
public static class EmailRules
{
    public static bool IsValid(string value) =>
        !string.IsNullOrWhiteSpace(value) && value.Contains('@');
}
```

### Pitfalls

- Premature abstraction: you unify code that looks similar but has different intent
- Shared helper that becomes a dumping ground (high coupling)
- Over-reuse across bounded contexts, causing cascading changes

### Tradeoffs

- Local duplication can be cheaper than shared abstractions when future divergence is likely
- DRY often increases coupling; balance with readability and independent change

## Questions

> [!QUESTION]- What is DRY actually trying to prevent?
> Duplicated knowledge and duplicated rules.
> If a change requires edits in multiple places, DRY is a signal.

> [!QUESTION]- When is it OK to repeat code?
> When the repetition is small, the meaning is different, or the logic is expected to diverge.
> Local duplication is sometimes safer than a shared abstraction.

## Links

- [The Pragmatic Programmer](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [DRY principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [Be careful with abstractions](https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/)

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
