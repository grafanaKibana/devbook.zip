---
publish: true
created: 2026-07-15T11:47:54.987Z
modified: 2026-07-18T11:38:38.701Z
published: 2026-07-18T11:38:38.701Z
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: Repository gives a collection-like interface over domain objects; Unit of Work tracks changes and commits them as one atomic transaction.
level:
  - "4"
priority: High
status: Ready to Repeat
---

The **Repository** pattern provides a collection-like interface for accessing domain objects, hiding the persistence mechanism from the domain layer. The **Unit of Work** pattern tracks all changes made during a business operation and commits them as a single atomic transaction. Together they decouple domain logic from data access technology and make persistence testable.

In EF Core, `DbContext` already implements both patterns: it acts as a repository-like gateway (you query through `DbSet<T>`) and as a Unit of Work (change tracking + `SaveChangesAsync()`). Wrapping EF Core in additional Repository/UoW abstractions is optional — justified when you need to swap persistence technology or enforce strict domain boundaries.

# Repository Pattern

A Repository exposes domain-oriented methods (`FindById`, `FindByCustomer`, `Save`) rather than raw SQL or LINQ. The domain layer depends on the interface; the infrastructure layer provides the implementation.

```csharp
// Domain layer: depends on abstraction
public interface IOrderRepository
{
    Task<Order?> FindAsync(OrderId id, CancellationToken ct);
    Task<IReadOnlyList<Order>> FindByCustomerAsync(CustomerId customerId, CancellationToken ct);
    void Add(Order order);
    void Remove(Order order);
}

// Infrastructure layer: EF Core implementation
public sealed class EfOrderRepository(AppDbContext db) : IOrderRepository
{
    public Task<Order?> FindAsync(OrderId id, CancellationToken ct) =>
        db.Orders
          .Include(o => o.LineItems)
          .FirstOrDefaultAsync(o => o.Id == id, ct);

    public Task<IReadOnlyList<Order>> FindByCustomerAsync(CustomerId customerId, CancellationToken ct) =>
        db.Orders
          .Where(o => o.CustomerId == customerId)
          .ToListAsync(ct)
          .ContinueWith(t => (IReadOnlyList<Order>)t.Result, ct);

    public void Add(Order order)    => db.Orders.Add(order);
    public void Remove(Order order) => db.Orders.Remove(order);
}
```

Note: `Add` and `Remove` don't call `SaveChanges` — that's the Unit of Work's responsibility.

# Unit of Work Pattern

The Unit of Work tracks all changes within a business operation and commits them atomically. In EF Core, `DbContext` is the Unit of Work:

```csharp
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct);
}

// AppDbContext implements both IUnitOfWork and exposes repositories
public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : DbContext(options), IUnitOfWork
{
    public DbSet<Order> Orders => Set<Order>();
}

// Application service: uses repository + unit of work
public sealed class PlaceOrderHandler(IOrderRepository orders, IUnitOfWork uow)
{
    public async Task HandleAsync(PlaceOrderCommand cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.LineItems);
        orders.Add(order);
        await uow.SaveChangesAsync(ct);  // single transaction for all changes
    }
}
```

# When to Add the Abstraction

EF Core's `DbContext` already gives you Repository + UoW behavior. Adding explicit interfaces is justified when:

- **Testing**: you want to swap the real DB with an in-memory fake in unit tests without spinning up EF Core.
- **Domain isolation**: you want the domain layer to have zero dependency on EF Core (no `using Microsoft.EntityFrameworkCore` in domain projects).
- **Multiple persistence backends**: you need to support both SQL and a document store for different aggregate types.

When NOT to add the abstraction: if you're building a simple CRUD service and the only consumer is EF Core, the extra interfaces add indirection without benefit. Inject `DbContext` directly.

# The Specification Pattern

There's a real tension in repository design: exposing `IQueryable<T>` leaks EF Core (bad), but adding a method per query (`FindByCustomer`, `FindPendingOlderThan`, `FindByStatusAndDateRange`…) explodes the interface. The **Specification pattern** resolves it by encapsulating query criteria as a first-class object that the repository translates:

```csharp
// A reusable, composable, testable query criterion — no IQueryable leaks
public sealed class OrdersPendingOverdueSpec : Specification<Order>
{
    public OrdersPendingOverdueSpec(DateTime cutoff)
    {
        Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff);
        Include(o => o.LineItems);
        OrderByDescending(o => o.CreatedAt);
    }
}

// One repository method serves every query
Task<IReadOnlyList<Order>> ListAsync(ISpecification<Order> spec, CancellationToken ct);
```

The spec is a plain object (unit-testable without a DB), the repository keeps one `ListAsync`, and EF Core leakage stays inside infrastructure. Libraries like **Ardalis.Specification** provide this for .NET. Use it when query variety would otherwise bloat the repository; skip it for a handful of fixed queries.

# Pitfalls

## Repository That Returns `IQueryable<T>`

**What goes wrong**: the repository leaks EF Core's `IQueryable<T>` to the application layer. Callers add `.Where()` and `.Include()` outside the repository, coupling the application layer to EF Core.

**Why it happens**: returning `IQueryable<T>` feels flexible — callers can filter however they want.

**Mitigation**: return `IReadOnlyList<T>` or `IEnumerable<T>`. Add specific query methods to the repository interface (`FindByCustomer`, `FindPendingOlderThan`) rather than exposing raw queryable.

## Generic Repository Anti-Pattern

**What goes wrong**: a single `IRepository<T>` with `GetById`, `GetAll`, `Add`, `Update`, `Delete` is used for every entity. It forces every aggregate to expose the same interface, including operations that don't make sense for that aggregate.

**Why it happens**: it looks like a clean abstraction and reduces boilerplate.

**Mitigation**: use aggregate-specific repositories (`IOrderRepository`, `ICustomerRepository`) with methods that reflect the domain's actual access patterns. Generic repositories are fine as a base implementation, but the interface should be domain-specific.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Direct `DbContext` | Simple, no extra abstraction, full EF Core power | Couples application layer to EF Core, harder to unit-test | Simple CRUD, small teams, no domain isolation requirement |
| Repository + UoW interfaces | Testable, domain-isolated, swappable persistence | Extra boilerplate, risk of leaky abstractions | DDD projects, strict layering, multiple persistence backends |

**Decision rule**: start with direct `DbContext` injection. Add Repository/UoW interfaces when you need to unit-test application services without a real database, or when the domain layer must not reference EF Core. Don't add the abstraction speculatively.

# Questions

> [!QUESTION]- Why does EF Core's DbContext already implement the Unit of Work pattern?
>
> - `DbContext` tracks all changes to loaded entities in its change tracker.
> - `SaveChangesAsync()` wraps all pending inserts, updates, and deletes in a single database transaction.
> - This means multiple repository operations within one request share the same `DbContext` instance and commit atomically — exactly what Unit of Work provides.
> - Tradeoff: this only works if all repositories share the same `DbContext` instance (Scoped lifetime in ASP.NET Core DI). If you accidentally register `DbContext` as Singleton or Transient, the Unit of Work semantics break.

> [!QUESTION]- When is a generic `IRepository<T>` an anti-pattern?
>
> - A generic repository exposes the same interface for every entity, including operations that don't make sense for some aggregates (e.g., `GetAll()` on an `Order` aggregate with millions of rows).
> - It encourages callers to treat all entities the same, bypassing aggregate-specific access patterns and invariants.
> - It often leaks `IQueryable<T>`, coupling callers to EF Core.
> - Better: aggregate-specific interfaces with domain-meaningful methods. Use a generic base class for the implementation, but expose a specific interface.

# References

- [Repository pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html) — original pattern definition from Patterns of Enterprise Application Architecture; explains the collection metaphor and when to use it.
- [Unit of Work pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/unitOfWork.html) — original definition; explains change tracking and the commit boundary.
- [Repository pattern in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/mvc/overview/older-versions/getting-started-with-ef-5-using-mvc-4/implementing-the-repository-and-unit-of-work-patterns-in-an-asp-net-mvc-application) — practical implementation guide with EF Core, including the UoW interface and DI registration.
- [[Software Architecture/Patterns/Architectural Patterns/Domain-Driven Design]] — DDD context for Repositories: they should be defined per Aggregate Root and expose domain-meaningful query methods.
