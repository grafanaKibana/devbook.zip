---
topic:
  - Software Architecture
subtopic:
  - Patterns
summary: "Repository gives a collection-like interface over domain objects. Unit of Work tracks changes and commits them as one atomic transaction."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

A **Repository** presents aggregate persistence as a domain-oriented collection. A **Unit of Work** tracks changes made during one business operation and commits them through one transaction boundary. The patterns solve different problems: Repository shapes access, while Unit of Work coordinates the commit.

EF Core already supplies most of the machinery. `DbSet<T>` is collection-like, and `DbContext` tracks changes until `SaveChangesAsync()` commits them. Extra interfaces are useful only when they protect a domain boundary or define access in domain terms. Wrapping every `DbSet<T>` with matching CRUD methods merely renames EF Core.

# Repository Pattern

A Repository exposes operations that make sense for an aggregate, such as loading an order with the state required to enforce its rules. The domain-facing interface does not expose SQL, EF includes, or an open-ended `IQueryable<T>`. Infrastructure owns those choices.

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

    public async Task<IReadOnlyList<Order>> FindByCustomerAsync(
        CustomerId customerId,
        CancellationToken ct) =>
        await db.Orders
            .Where(o => o.CustomerId == customerId)
            .ToListAsync(ct);

    public void Add(Order order)    => db.Orders.Add(order);
    public void Remove(Order order) => db.Orders.Remove(order);
}
```

`Add` and `Remove` only change the tracked set. The Unit of Work owns the commit, so several repository operations can share one transaction boundary.

# Unit of Work Pattern

The Unit of Work gathers pending changes for one business operation. In EF Core, a scoped `DbContext` usually fills that role:

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

Explicit interfaces earn their keep in a few cases:

- **Domain isolation**: application and domain code should speak in aggregate operations rather than EF queries.
- **Controlled access**: callers must load aggregates through known shapes that preserve invariants and ownership.
- **Multiple implementations**: the same domain contract genuinely has more than one persistence implementation.

Testability alone is a weak reason to mirror EF Core behind a fake. Database behavior such as translation and constraints is best checked against the real provider. For a small CRUD service, injecting `DbContext` directly is the clearer design.

# The Specification Pattern

Repository design has a recurring tension. Returning `IQueryable<T>` leaks persistence concerns, while one method per query can bloat an interface. A **Specification** packages query criteria for infrastructure to translate. The fragment below is pseudocode: `Specification<T>` and `ISpecification<T>` are placeholders for application- or library-defined abstractions, not .NET or EF Core types.

```csharp
// Pseudocode: Specification<T> and ISpecification<T> are placeholder abstractions.
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

The repository keeps a small surface and EF Core stays in infrastructure. This indirection is worthwhile when many queries reuse or compose the same criteria. A handful of fixed queries is simpler as named methods.

# Pitfalls

## Repository That Returns `IQueryable<T>`

Returning `IQueryable<T>` avoids writing explicit operations, but it lets application code add `.Where()` and `.Include()` outside the repository. Query translation and loading policy have crossed the boundary.

Return materialized results through named query operations. Introduce a Specification only after those operations become repetitive.

## Generic Repository Anti-Pattern

A generic interface removes repeated method declarations by giving every entity the same CRUD surface. That surface can expose operations that violate an aggregate's access rules.

Use aggregate-specific interfaces with domain-meaningful operations. Infrastructure may reuse a generic base internally without making it the domain contract.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Direct `DbContext` | Simple, no extra abstraction, full EF Core power | Couples application layer to EF Core, harder to unit-test | Simple CRUD, small teams, no domain isolation requirement |
| Repository + UoW interfaces | Domain-oriented access and an explicit commit boundary | Extra indirection and risk of mirroring EF Core | Aggregate persistence needs a protected boundary |

Start with `DbContext` unless the domain needs a narrower persistence language. Add Repository and Unit of Work interfaces when they hide a real infrastructure concern or protect aggregate access, not as default ceremony.

# Questions

> [!QUESTION]- Why does EF Core's DbContext already implement the Unit of Work pattern?
> `DbContext` tracks entity changes and sends the pending work through `SaveChangesAsync()`, which uses a transaction when the provider supports it. Several repositories participate in one unit only when they share the same context instance. A singleton context is unsafe, while separate transient contexts split the commit boundary.

> [!QUESTION]- When is a generic `IRepository<T>` an anti-pattern?
> It becomes an anti-pattern when the generic CRUD surface replaces aggregate-specific access rules. `GetAll()` may be meaningless for a large aggregate, and unrestricted updates can bypass invariants. A generic implementation can remain inside infrastructure. The domain-facing interface should describe the operations the aggregate actually supports.

# References

- [Repository pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Repository and Unit of Work patterns in ASP.NET MVC](https://learn.microsoft.com/en-us/aspnet/mvc/overview/older-versions/getting-started-with-ef-5-using-mvc-4/implementing-the-repository-and-unit-of-work-patterns-in-an-asp-net-mvc-application)
