---
topic:
  - Data Persistence
subtopic:
  - ORMs
summary: "Microsoft's .NET ORM: maps C# classes to tables, translates LINQ, and manages migrations."
level:
  - "4"
priority: High
status: Ready to Repeat
publish: true
---

# Entity Framework Core

Entity Framework Core (EF Core) is Microsoft's official ORM for .NET. It maps C# classes to database tables, translates LINQ queries to SQL, tracks changes to loaded entities, and manages schema migrations. EF Core supports SQL Server, PostgreSQL, SQLite, MySQL, and Cosmos DB through provider packages.

EF Core is the default data access layer for most .NET applications. Understanding its change tracking, query translation, and migration system is essential for building correct and performant data layers.

## Core Concepts

### DbContext and DbSet

`DbContext` is the unit of work and the entry point for all database operations. `DbSet<T>` represents a table and is the starting point for queries.

```csharp
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Order>    Orders    => Set<Order>();
    public DbSet<Customer> Customers => Set<Customer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(b =>
        {
            b.HasKey(o => o.Id);
            b.Property(o => o.Total).HasPrecision(18, 2);
            b.HasMany(o => o.LineItems).WithOne().HasForeignKey(li => li.OrderId);
        });
    }
}
```

### Change Tracking

EF Core tracks all entities loaded through a `DbContext`. When you call `SaveChangesAsync()`, it generates INSERT/UPDATE/DELETE SQL for all tracked changes.

```csharp
// Load → modify → save: EF Core detects the change automatically
var order = await db.Orders.FindAsync(orderId);
order.Status = OrderStatus.Confirmed;  // EF Core marks this as Modified
await db.SaveChangesAsync();           // generates: UPDATE Orders SET Status = 'Confirmed' WHERE Id = @id
```

For read-only queries where you don't need change tracking, use `.AsNoTracking()` to reduce memory and CPU overhead:

```csharp
var orders = await db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == customerId)
    .ToListAsync();
```

> [!WARNING]
> **`DbContext` is a unit of work, not a singleton.** It is **not thread-safe** and is designed to be short-lived — one per request/operation. In ASP.NET Core it's registered **scoped**; injecting it into a singleton (or sharing one instance across concurrent tasks) corrupts the change tracker and throws "a second operation was started on this context." For long-lived or parallel work, create a fresh context per unit via `IDbContextFactory<T>` (see the captive-dependency note in [[Home/Programming/NET/ASP.NET Web API/Dependency Injection|Dependency Injection]]). For high-throughput apps, `AddDbContextPool` reuses context instances to cut allocation.

### Transactions and Concurrency

A single `SaveChangesAsync()` is **atomic** — EF Core wraps all of its INSERT/UPDATE/DELETE statements in one transaction automatically, so they all commit or all roll back. To make **multiple** `SaveChanges` calls (or raw SQL plus EF) atomic, open an explicit transaction:

```csharp
await using var tx = await db.Database.BeginTransactionAsync(ct);
try
{
    db.Orders.Add(order);
    await db.SaveChangesAsync(ct);
    await db.Database.ExecuteSqlAsync($"UPDATE Inventory SET Qty = Qty - 1 WHERE Id = {sku}", ct);
    await tx.CommitAsync(ct);
}
catch { await tx.RollbackAsync(ct); throw; }
```

**Optimistic concurrency** prevents lost updates without locking. Mark a column as a concurrency token (a `[Timestamp]`/`rowversion`, or `IsConcurrencyToken()`); EF Core then appends it to the `WHERE` clause of every UPDATE. If another transaction changed the row since you read it, zero rows match and EF throws **`DbUpdateConcurrencyException`** — catch it to retry or surface a conflict to the user (this is the lighter alternative to Serializable from [[ACID]]). For providers with transient faults (Azure SQL), enable a **retrying execution strategy** with `EnableRetryOnFailure()` — note it then requires manual transactions to be wrapped in `strategy.ExecuteAsync(...)`.

### Migrations

EF Core migrations track schema changes as C# code, enabling version-controlled, repeatable schema evolution.

```bash
# Create a migration after changing the model
dotnet ef migrations add AddOrderStatus

# Apply pending migrations to the database
dotnet ef database update
```

Generated migration:

```csharp
public partial class AddOrderStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Status",
            table: "Orders",
            nullable: false,
            defaultValue: "Draft");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Status", table: "Orders");
    }
}
```

## Performance Patterns

### Projection Instead of Full Entity Load

Loading full entities when you only need a few columns wastes bandwidth and memory. Project to a DTO:

```csharp
// BAD: loads all columns including large blobs
var orders = await db.Orders.Where(o => o.CustomerId == id).ToListAsync();

// GOOD: project to only needed columns
var summaries = await db.Orders
    .Where(o => o.CustomerId == id)
    .Select(o => new OrderSummary(o.Id, o.Total, o.Status))
    .ToListAsync();
```

### Avoiding N+1 Queries

Loading a list of orders and then accessing `order.Customer` for each one triggers N additional queries.

```csharp
// BAD: N+1 — one query for orders, one per order for customer
var orders = await db.Orders.ToListAsync();
foreach (var order in orders)
    Console.WriteLine(order.Customer.Name);  // lazy load per order

// GOOD: eager load with Include
var orders = await db.Orders
    .Include(o => o.Customer)
    .ToListAsync();
```

### Bulk Updates and Raw SQL

The classic "load → modify → SaveChanges" round-trips every row through the change tracker. For set-based updates/deletes, **`ExecuteUpdateAsync` / `ExecuteDeleteAsync` (EF Core 7+)** issue a single SQL statement and touch **no** entities in memory:

```csharp
// One UPDATE statement; nothing loaded or tracked
await db.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Expired), ct);
```

(Caveat: these bypass the change tracker, so already-tracked entities in the same context go stale.) When LINQ can't express a query, drop to **`FromSql`/`SqlQuery`** — parameterized to stay injection-safe.

### Global Query Filters

Define a predicate once on the model and EF Core appends it to **every** query for that entity — the standard way to implement **soft delete** and **multi-tenancy** without repeating `Where` everywhere:

```csharp
modelBuilder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted && o.TenantId == _tenant.Id);
// Opt out per-query with .IgnoreQueryFilters()
```

The risk to know: a forgotten filter on a related type, or `IgnoreQueryFilters()` in the wrong place, silently leaks soft-deleted or cross-tenant rows.

## Pitfalls

### Lazy Loading in Production

**What goes wrong**: lazy loading is enabled and navigation properties are accessed in loops, causing N+1 queries. A page that loads 100 orders and accesses `order.Customer` for each fires 101 queries.

**Why it happens**: lazy loading is convenient in development but hides query patterns.

**Mitigation**: disable lazy loading in production (it's off by default in EF Core). Use explicit `Include()` for eager loading or split queries for large result sets.

### Cartesian Explosion from Multiple Includes

`Include`-ing two or more **collection** navigations in one query makes EF Core emit a single JOIN whose row count is the *product* of the collections — an order with 50 line items and 20 history rows returns 1,000 duplicated rows, which EF then de-duplicates client-side. Fix with **`AsSplitQuery()`**, which runs one SQL query per collection and stitches them in memory (trading a JOIN for extra round-trips). Use single (joined) queries for one-to-one/small includes; split queries when you `Include` multiple or large collections.

### Code First vs Database First

- **Code First**: C# model is the source of truth. Migrations generate and evolve the schema. Best for new projects with a strong domain model.
- **Database First**: scaffold the model from an existing schema with `dotnet ef dbcontext scaffold`. Best for legacy databases or DBA-controlled schemas.

**Decision rule**: use Code First for new projects. Use Database First when integrating with an existing database you don't own.

### Zero-Downtime Migrations

Adding a non-nullable column without a default value locks the table during migration. For large tables, this causes downtime.

**Mitigation**: use the expand-contract pattern:
1. Add the column as nullable (no lock).
2. Backfill existing rows in batches.
3. Add a NOT NULL constraint after backfill completes.
4. Remove the old column in a later migration.

## Questions

> [!QUESTION]- How does EF Core's change tracker work, and when should you disable it?
> - EF Core takes a snapshot of each loaded entity's property values. On `SaveChangesAsync()`, it compares current values to the snapshot and generates SQL for changed properties.
> - Overhead: change tracking adds memory (snapshot storage) and CPU (comparison on save) per tracked entity.
> - Disable with `.AsNoTracking()` for read-only queries (reports, API responses that don't modify data). This is the single most impactful EF Core performance optimization for read-heavy workloads.
> - Tradeoff: `.AsNoTracking()` entities cannot be modified and saved — you must re-attach them or use `ExecuteUpdateAsync()` for bulk updates.

> [!QUESTION]- What is the N+1 query problem and how do you detect it?
> - N+1 occurs when loading N entities and then accessing a navigation property on each, triggering N additional queries.
> - Detection: enable EF Core query logging (`LogTo(Console.WriteLine)`) or use MiniProfiler/Application Insights to see query counts per request.
> - Fix: use `Include()` for eager loading, or split into two queries and join in memory for large result sets.
> - Tradeoff: `Include()` generates a JOIN, which can produce a large result set if the included collection is large. For collections with >100 items per parent, consider `AsSplitQuery()` to use separate queries instead of a JOIN.

## References

- [EF Core documentation (Microsoft Learn)](https://learn.microsoft.com/en-us/ef/core/) — official reference covering DbContext, migrations, querying, change tracking, and all supported database providers.
- [EF Core performance (Microsoft Learn)](https://learn.microsoft.com/en-us/ef/core/performance/) — official performance guide: AsNoTracking, projections, compiled queries, bulk operations, and connection pooling.
- [EF Core migrations (Microsoft Learn)](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/) — complete migrations guide: creating, applying, reverting, and customizing migrations for production deployments.
- [Using lazy loading in EF Core 8](https://toreaurstad.blogspot.com/2024/09/using-lazy-loading-in-entity-framework.html) — practitioner post on EF Core 8 lazy loading configuration, pitfalls, and when to use it vs eager loading.
