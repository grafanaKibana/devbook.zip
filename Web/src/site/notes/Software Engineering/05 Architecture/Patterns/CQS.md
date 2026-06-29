---
{"dg-publish":true,"permalink":"/software-engineering/05-architecture/patterns/cqs/","dg-note-properties":{"topic":["Architecture"],"subtopic":["Patterns"],"level":["4"],"priority":"High","status":"Ready to Repeat"}}
---


# CQS — Command-Query Separation

Command-Query Separation (CQS) is a design principle that says every method should be either a **command** (changes state, returns void) or a **query** (returns data, has no side effects) — never both. Coined by Bertrand Meyer, it makes code easier to reason about: if a method returns a value, you can call it freely without worrying about side effects; if it changes state, you know it won't return data you depend on. In a 200-endpoint e-commerce API, applying CQS to the repository layer made it immediately clear which methods could be safely retried, cached, or called in parallel (queries) and which required idempotency guards and transaction boundaries (commands) — cutting the time to diagnose a double-charge bug from hours of tracing to minutes of checking command call sites.

CQS is a method-level principle. [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS\|CQRS]] (Command-Query Responsibility Segregation) applies the same idea at the architectural level — separate read and write models, separate data stores, separate code paths.

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

CQS is a prerequisite mindset for CQRS. If you're applying CQRS, you're already following CQS at the method level. See [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS\|CQRS]] for the architectural pattern.

## CQS in a Repository

A CQS-compliant repository separates read and write methods with explicit contracts:

```csharp
public interface IOrderRepository
{
    // Queries: return data, no side effects
    Task<Order?> GetByIdAsync(OrderId id);
    Task<IReadOnlyList<Order>> GetByCustomerAsync(CustomerId customerId);

    // Commands: change state, return void (or Task)
    Task AddAsync(Order order);
    Task UpdateAsync(Order order);
    Task DeleteAsync(OrderId id);
}

// The generated ID exception: returning the ID from Add is a pragmatic CQS violation.
// Document it explicitly:
// Task<OrderId> AddAsync(Order order);  // returns generated ID only, not the full entity
```

The query methods can be called freely in any order without side effects. The command methods are the only paths that change state — making it easy to audit what can mutate the system.


## Pitfalls

### Violating CQS in Repository Methods

**What goes wrong**: `repository.Add(entity)` returns the saved entity with its generated ID. This is a command (changes state) that also returns data — a CQS violation. In one codebase, a `CreateOrderAsync` method that returned the full `Order` entity was called by two API consumers: one retried on timeout, creating duplicate orders because the caller treated the returned entity as idempotent confirmation. Separating into a void command + separate query would have made the retry-safety question obvious.

**Why it matters**: the violation is pragmatic and widely accepted (see 'When CQS Is Pragmatically Relaxed' above), but it should be a conscious decision. Undisciplined mixing of commands and queries makes code harder to reason about and test.

**Mitigation**: document the exception explicitly. For new code, prefer returning only the generated ID from commands (not the full entity), then let the caller query if they need the full state.


## Questions

> [!QUESTION]- Why does CQS make code easier to reason about?
> When a method returns a value, you know it has no side effects — you can call it freely, cache its result, or call it multiple times without changing state. When a method returns void, you know it changes state but produces no data you depend on. This separation eliminates the need to read the implementation to understand whether a call is safe to repeat or reorder. It also makes testing easier: queries can be tested without checking state changes; commands can be tested without checking return values.

> [!QUESTION]- When is it pragmatic to violate CQS?
> Three common justified exceptions: (1) Stack.Pop() — splitting into Peek() + Remove() introduces a race condition in concurrent code. (2) Repository.Add() returning the generated ID — the ID is produced by the database; returning it avoids an extra round-trip. (3) Async I/O methods — `Task<T>` methods that perform I/O and return a result are idiomatic in .NET even when they have side effects. The principle is a guideline: apply it where it improves clarity, relax it where strict adherence creates awkward APIs.


## References

- [CommandQuerySeparation (Martin Fowler)](https://martinfowler.com/bliki/CommandQuerySeparation.html) — concise explanation of CQS with the Stack.Pop() exception and the relationship to CQRS.
- [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/CQRS\|CQRS]] — the architectural extension of CQS: separate read and write models, often with separate data stores and optimized query paths.
- [Object-Oriented Software Construction (Bertrand Meyer)](https://www.eiffel.com/values/design-by-contract/introduction/) — the original source of CQS; Meyer coined the principle in the context of Design by Contract and the Eiffel language.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/05 Architecture/05 Architecture\|05 Architecture]]
>
> **Topics**
> - [[Software Engineering/05 Architecture/Patterns/Architectural Patterns/Architectural Patterns\|Architectural Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Design Patterns/Design Patterns\|Design Patterns]]
> - [[Software Engineering/05 Architecture/Patterns/Resilience Patterns/Resilience Patterns\|Resilience Patterns]]
>
> **Pages**
> - [[Software Engineering/05 Architecture/Patterns/Dependency Injection\|Dependency Injection]]
> - [[Software Engineering/05 Architecture/Patterns/Event Bus\|Event Bus]]
> - [[Software Engineering/05 Architecture/Patterns/Repository & UoW\|Repository & UoW]]
<!-- whats-next:end -->
