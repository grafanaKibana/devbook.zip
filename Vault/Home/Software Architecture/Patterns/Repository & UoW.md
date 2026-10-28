---
topic: [Software Architecture]
subtopic: [Patterns]
summary: "Repository gives a collection-like interface over domain objects. Unit of Work tracks changes and commits them as one atomic transaction."
level: ["4"]
priority: High
status: Ready to Repeat
publish: true
qard-deck: "Software Architecture"
qard-topic: "Patterns/Repository & UoW"
flashcard_uid: "54e299f5"
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

A repository returns materialized results through named query operations. A Specification becomes worthwhile only after those operations become repetitive.

## Generic Repository Anti-Pattern

A generic interface removes repeated method declarations by giving every entity the same CRUD surface. That surface can expose operations that violate an aggregate's access rules.

The domain-facing contract consists of aggregate-specific interfaces with domain-meaningful operations. Infrastructure may reuse a generic base internally without making it the domain contract.

# Tradeoffs

| Approach | Strengths | Weaknesses | When to use |
|---|---|---|---|
| Direct `DbContext` | Simple, no extra abstraction, full EF Core power | Couples application layer to EF Core, harder to unit-test | Simple CRUD, small teams, no domain isolation requirement |
| Repository + UoW interfaces | Domain-oriented access and an explicit commit boundary | Extra indirection and risk of mirroring EF Core | Aggregate persistence needs a protected boundary |

`DbContext` is the starting point unless the domain needs a narrower persistence language. Repository and Unit of Work interfaces belong where they hide a real infrastructure concern or protect aggregate access, not as default ceremony.

# Questions

> [!qard]- How do the Repository and Unit of Work patterns differ?
> Repository shapes how domain code reaches persisted aggregates, and Unit of Work controls when the changes from one business operation are committed. They solve different problems and usually work together.
>
> | Aspect | Repository | Unit of Work |
> |---|---|---|
> | Responsibility | Presents stored aggregates as a domain-oriented, collection-like interface, such as `IOrderRepository` with `FindAsync`, `Add` and `Remove`. | Tracks the changes made during one business operation and commits them through one transaction boundary. |
> | What it keeps out of domain code | Query details such as SQL, EF includes and open-ended `IQueryable<T>` stay in infrastructure. | Individual inserts, updates and deletes are gathered and written together instead of one by one. |
> | Effect of a call | `Add` or `Remove` only changes the set of pending objects; nothing is written yet. | One save writes the pending changes from every repository that shares the unit of work. |
> | EF Core counterpart | `DbSet<T>` already provides collection-like access. | `DbContext` already tracks changes until `SaveChangesAsync` commits them. |
>
> **Flow:** a handler creates an `Order`, adds it through `IOrderRepository`, and then calls `SaveChangesAsync` on the unit of work. Several repository operations in the same handler therefore commit through one save, inside one transaction when the provider supports it.
>
> [EF Core: DbContext lifetime, configuration, and initialization](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/) · [EF Core: Using transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions)

<!-- qard-id: 156ee647-9c4f-46f1-8876-d290f7b63914 -->
> [!qard]- Why does EF Core's `DbContext` already implement the Unit of Work pattern?
> `DbContext` already performs the two jobs that define a Unit of Work. It records the changes made during one business operation, and it commits them together.
>
> - **Tracking:** the context's change tracker records entities returned by tracking queries and entities added, modified or removed through the context. Results of no-tracking queries do not enter the tracker. Tracked changes stay pending in memory until a save.
> - **Commit:** `SaveChanges` or `SaveChangesAsync` writes all pending changes. When the database provider supports transactions, EF Core applies them in one transaction by default. If any change fails, the whole save is rolled back.
> 
> Repositories that receive the same context instance therefore share one unit of work. Each repository can call `Add` or `Remove`, and one save commits all of their changes. An `IUnitOfWork` interface implemented by the context only exposes that save; the mechanism is still EF Core's.
>
> **Boundaries:**
>
> - Each context instance has its own change tracker. Separate contexts are separate units of work by default, and each one's save commits on its own.
> - With relational providers, separate contexts can join one explicit transaction by sharing the same `DbConnection` and `DbTransaction`. Their tracking stays separate, but their saves commit or roll back together with that transaction.
> - A `DbContext` is designed for one short-lived unit of work and is not thread-safe. A singleton registration would share one long-lived tracker across concurrent requests, which is unsafe. `AddDbContext` registers the context as scoped by default, which gives one instance per request in ASP.NET Core.
> 
> [EF Core: Tracking vs. No-Tracking Queries](https://learn.microsoft.com/en-us/ef/core/querying/tracking) · [EF Core: DbContext lifetime, configuration, and initialization](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/) · [EF Core: Using transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions)

<!-- qard-id: b056c1a5-0827-47b6-a0ce-30fe7c7ef432 -->
> [!qard]- When is a generic `IRepository<T>` an anti-pattern?
> A generic `IRepository<T>` is an anti-pattern when it serves as the domain-facing contract and its operation surface does either of two things: it lets callers bypass aggregate invariants, or it exposes operations that do not fit the aggregate. Generic typing alone is not the defect. The defect is what the contract lets callers do.
>
> The harmful case shows up in two ways:
>
> - **Bypassed invariants:** the contract lets callers add, update or delete objects directly instead of going through the aggregate root, whose methods enforce the rules. For example, suppose `Order` forbids changing line items after confirmation. An `IRepository<OrderLine>` lets code delete a line from a confirmed order without that check.
> - **Unsuitable operations:** the contract gives an aggregate methods such as unrestricted update or delete even when the domain has no such operation.
> 
> When every exposed operation fits and changes still go through the aggregate root, an interface is not harmful merely for being generic. A generic interface constrained to aggregate roots, for example, can be acceptable if each operation it offers is valid for those roots. An aggregate-specific interface such as `IOrderRepository` exposes only operations that make sense for `Order`. Its infrastructure implementation can still reuse a generic base class internally, as long as the generic methods do not widen the domain-facing contract.
>
> [Microsoft: Design a DDD-oriented microservice](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice) · [Microsoft: Design the infrastructure persistence layer](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design)

> [!qard]- When is a repository layer over EF Core worth adding instead of injecting `DbContext` directly?
> A repository and unit-of-work layer over EF Core is worth adding when it protects a real domain boundary. Otherwise injecting `DbContext` directly is usually clearer. EF Core already provides collection-like access through `DbSet<T>`, and `DbContext` change tracking with `SaveChangesAsync` already acts as a unit of work.
>
> Reasons that justify the extra interfaces:
>
> - **Domain isolation:** application and domain code express aggregate operations, such as loading an order with the state its rules need, instead of EF queries.
> - **Controlled access:** aggregates are loaded only through known shapes that preserve their invariants and ownership rules.
> - **Multiple implementations:** the same domain contract genuinely has more than one persistence implementation.
> 
> Reasons that do not justify it on their own:
>
> - **Mirroring EF Core:** interfaces that wrap every `DbSet<T>` with matching CRUD methods only rename EF Core and add indirection.
> - **Testability alone:** a fake repository cannot reproduce database behavior such as query translation and constraints. That behavior is better checked against the real provider.
> 
> Injecting `DbContext` keeps code simple and keeps all EF Core features available, but couples application code to EF Core. Repository interfaces give domain-oriented access and an explicit commit boundary at the cost of extra indirection. For a small CRUD service with no domain rules to isolate, direct `DbContext` is the clearer design.

# References

- [Repository pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Repository and Unit of Work patterns in ASP.NET MVC](https://learn.microsoft.com/en-us/aspnet/mvc/overview/older-versions/getting-started-with-ef-5-using-mvc-4/implementing-the-repository-and-unit-of-work-patterns-in-an-asp-net-mvc-application)
