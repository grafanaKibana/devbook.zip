---
publish: true
created: 2026-02-10T01:40:47.000Z
modified: 2026-10-28T12:33:42.000Z
published: 2026-10-31T08:53:28.563Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: A principle where a method either changes state (command) or returns data (query), never both.
level:
  - "4"
priority: High
status: Ready to Repeat
qard-deck: Software Architecture
qard-topic: Patterns/CQS
flashcard_uid: 1bbc667f
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

Queries should remain safe to observe, and command mutation and retry behavior should be explicit. An atomic operation should not be split merely to satisfy the surface rule.

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
// This exception needs explicit documentation:
// Task<OrderId> AddAsync(Order order);  // returns generated ID only, not the full entity
```

The interface makes mutation paths visible. Query implementations must still avoid hidden writes such as updating last-accessed timestamps. A method name alone cannot guarantee the contract.

# Pitfalls

## Violating CQS in Repository Methods

When `repository.Add(entity)` returns the saved entity, mutation and observation share one contract. That exception may be reasonable, but the returned object does not prove that retrying the command is safe.

The command should return only the outcome the caller needs, often an identifier or version, and its retry behavior should be stated separately. The full current representation should be fetched through a query.

# Questions

<!-- qard-id: ee1d4f87-1ac1-440e-aa72-b31354d7308a -->

> [!qard]- Why does Command-Query Separation (CQS) make code easier to reason about?
> CQS makes each operation's contract show whether it can change state. A query returns information without observable side effects; a command changes state and traditionally returns no result. Finding where the code changes state therefore only requires following command calls.
>
> - **Queries:** calling one causes no state change, so a query call can be added, repeated or moved, for example while debugging, without introducing a mutation.
> - **Commands:** every intended mutation goes through a command, so the paths that change state are easy to find, and retry and transaction decisions attach to those calls.
>
> CQS rules out state changes caused by queries, not changes in what queries observe. A side-effect-free query can return a different result when it reads the current time or data that a command or another process has changed. Its position relative to commands therefore still matters, and caching its result still needs a freshness decision.
>
> Repeating or caching a query avoids unintended state changes only when the query actually honors the contract. A query that secretly writes, such as one that updates a last-accessed timestamp, changes state on every call, and a method name alone cannot guarantee the contract.
>
> [Martin Fowler: Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html)

<!-- qard-id: 6343f47f-4ceb-4b9e-a1ba-7af48b818bba -->

> [!qard]- When is it pragmatic to violate Command-Query Separation (CQS)?
> Violating CQS is pragmatic when reading and changing state form one coherent or atomic operation, or when a separate query would only add a round trip without adding clarity.
>
> - **Atomic read-and-remove:** `Stack<T>.Pop()` removes the top item and returns it in one call, a long-accepted exception to strict CQS. In concurrent code, separate check and remove calls would let another thread take the item in between, so `ConcurrentStack<T>.TryPop(out item)` does both as one atomic operation.
> - **Create that returns its identifier:** an insert can return the database-generated ID, because the caller needs it and a follow-up query would only cost another round trip.
>
> The combined operation should still make its state change obvious and return only what the caller needs, such as an identifier or version rather than the full entity. A returned result does not show whether retrying the command is safe, so retry behavior needs its own explicit contract.
>
> [.NET: ConcurrentStack<T>.TryPop](https://learn.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentstack-1.trypop?view=net-10.0) · [Martin Fowler: Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html)

> [!qard]- What is the difference between Command-Query Separation (CQS) and CQRS?
> CQS is a rule for individual operations: each method either changes state (a command) or returns data without side effects (a query). CQRS, Command Query Responsibility Segregation, applies the same distinction at the architecture level by giving the write path and the read path separate models and handlers.
>
> | Aspect | CQS | CQRS |
> |---|---|---|
> | Scope | One method or operation at a time, usually within a single class. | A subsystem's whole write path and read path. |
> | What is separated | Command and query signatures; both kinds of method can work on one shared model. | The models themselves: a write model for changes and a read model shaped for queries. |
> | Data storage | Not addressed; a single shared store is normal. | One store can serve both sides; separate read and write stores are common but optional. |
> | Cost | Low; mainly a discipline for method contracts. | High; two models and their handlers must be built and kept consistent. |
>
> The two are independent: a CQRS system does not guarantee that every method follows strict CQS, and following CQS does not require CQRS.
>
> [Martin Fowler: Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html) · [[Software Architecture/Patterns/CQS#CQS Vs CQRS|CQS vs CQRS]]

# References

- [Command Query Separation](https://martinfowler.com/bliki/CommandQuerySeparation.html)
