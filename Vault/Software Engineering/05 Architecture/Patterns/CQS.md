---
topic:
  - Architecture
subtopic:
  - Patterns
level:
  - "4"
priority: High
status: Creation
dg-publish: true
---

# CQS — Command-Query Separation

Command-Query Separation (CQS) is a design principle that says every method should be either a **command** (changes state, returns void) or a **query** (returns data, has no side effects) — never both. Coined by Bertrand Meyer, it makes code easier to reason about: if a method returns a value, you can call it freely without worrying about side effects; if it changes state, you know it won't return data you depend on.

CQS is a method-level principle. [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]] (Command-Query Responsibility Segregation) applies the same idea at the architectural level — separate read and write models, separate data stores, separate code paths.

## The Principle in Practice

```csharp
// VIOLATES CQS: changes state AND returns data
public Order PlaceOrder(Cart cart)
{
    var order = new Order(cart);
    _db.Orders.Add(order);
    _db.SaveChanges();
    return order;  // side effect + return value
}

// CQS-compliant: separate command and query
public void PlaceOrder(Cart cart)          // command: changes state, returns void
{
    var order = new Order(cart);
    _db.Orders.Add(order);
    _db.SaveChanges();
}

public Order GetOrder(OrderId id)          // query: returns data, no side effects
    => _db.Orders.Find(id) ?? throw new NotFoundException(id);
```

The caller places the order, then queries for it separately if needed. This is slightly more verbose but makes each method's contract explicit.

## When CQS Is Pragmatically Relaxed

Strict CQS is sometimes impractical. Common exceptions:

- **Stack.Pop()** — removes and returns the top element. Splitting into `Peek()` + `Remove()` introduces a race condition in concurrent code.
- **Repository.Add()** returning the generated ID — the ID is produced by the database; returning it avoids an extra round-trip.
- **Async patterns** — `Task<T>` methods that perform I/O and return a result are idiomatic in .NET even when they have side effects.

The principle is a guideline, not a law. Apply it where it improves clarity; relax it where strict adherence creates awkward APIs.

## CQS vs CQRS

| | CQS | CQRS |
|---|---|---|
| Scope | Method level | Architecture level |
| Separation | Commands and queries in the same class | Separate command and query models/handlers |
| Data store | Single shared store | Often separate read/write stores |
| Complexity | Low | High |

CQS is a prerequisite mindset for CQRS. If you're applying CQRS, you're already following CQS at the method level. See [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]] for the architectural pattern.

## References

- [CommandQuerySeparation (Martin Fowler)](https://martinfowler.com/bliki/CommandQuerySeparation.html) — concise explanation of CQS with the Stack.Pop() exception and the relationship to CQRS.
- [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS|CQRS]] — the architectural extension of CQS: separate read and write models, often with separate data stores and optimized query paths.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture|05 Architecture]]
>
> **Topics**
> - [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/Architectural Patterns|Architectural Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns/Design Patterns|Design Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Resilience Patterns/Resilience Patterns|Resilience Patterns]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection|Dependency Injection]]
> - [[Software Engineering/05 Architecture/Patterns/Repository & UoW|Repository & UoW]]
<!-- whats-next:end -->
