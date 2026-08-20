---
publish: true
created: 2026-08-20T20:41:15.686Z
modified: 2026-08-20T20:41:15.686Z
published: 2026-08-20T20:41:15.686Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: A principle where a method either changes state (command) or returns data (query), never both.
level:
  - "4"
priority: High
status: Ready to Repeat
---

Command-Query Separation (CQS) divides operations by contract. A command changes state and traditionally returns no result. A query returns data without observable side effects. Bertrand Meyer introduced the rule so a call's shape reveals whether it can mutate the system.

CQS applies to individual operations. [[Software Architecture/Patterns/Architectural Patterns/CQRS]] uses a related split at system level, where command and query paths may have different models. Separate databases are optional.

# The Principle in Practice

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

The caller issues the state change and performs a separate read only when current state is needed. The extra call is worthwhile when it makes mutation and retry behavior easier to see.

# When CQS Is Pragmatically Relaxed

Strict CQS sometimes produces a worse contract:

- **`Stack.Pop()`** expresses removal and return as one coherent operation. Concurrent code needs a thread-safe contract such as `ConcurrentStack<T>.TryPop()` to make that combined transition atomic.
- A create operation may return a database-generated identifier because a second round trip adds no clarity.
- Many .NET APIs use `Task<T>` for an operation that performs I/O and reports its outcome. The return type alone no longer proves purity.

Keep queries safe to observe and make command mutation and retry behavior explicit. Do not split an atomic operation merely to satisfy the surface rule.

# CQS Vs CQRS

| | CQS | CQRS |
|---|---|---|
| Scope | Method level | Architecture level |
| Separation | Commands and queries in the same class | Separate command and query models/handlers |
| Data store | Single shared store | Often separate read/write stores |
| Complexity | Low | High |

[[Software Architecture/Patterns/Architectural Patterns/CQRS]] applies the command/query distinction to separate write and read models, but it does not prove that every method follows strict CQS.

# CQS in a Repository

A repository can expose the distinction directly:

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

The interface makes mutation paths visible. Query implementations must still avoid hidden writes such as updating last-accessed timestamps. A method name alone cannot guarantee the contract.

# Pitfalls

## Violating CQS in Repository Methods

When `repository.Add(entity)` returns the saved entity, mutation and observation share one contract. That exception may be reasonable, but the returned object does not prove that retrying the command is safe.

Return only the outcome the caller needs, often an identifier or version, and state retry behavior separately. Fetch the full current representation through a query.

# Questions

> [!QUESTION]- Why does CQS make code easier to reason about?
> The contract separates observation from mutation. Queries can be repeated or cached only when their no-side-effect promise holds. Commands expose the paths that need authorization, transaction boundaries, and retry analysis. The distinction reduces the amount of implementation detail required to judge a call site.

> [!QUESTION]- When is it pragmatic to violate CQS?
> A combined operation is justified when separation breaks a coherent transition or adds a wasteful round trip. `Stack.Pop()` is the classic single-threaded shape; `ConcurrentStack<T>.TryPop()` supplies the atomic concurrent form. A create command returning its generated identifier is another. The exception should keep mutation, retry safety, and returned data explicit.

# References

- [Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html)
