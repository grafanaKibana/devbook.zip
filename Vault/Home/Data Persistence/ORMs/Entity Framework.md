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

Entity Framework Core (EF Core) is a cross-platform .NET ORM. A database provider maps its model and query pipeline to a specific engine. Microsoft ships providers for SQL Server, SQLite, and Azure Cosmos DB. PostgreSQL and MySQL support comes from external provider packages with their own compatibility schedules.

EF Core removes much routine mapping and persistence code. It does not make providers interchangeable or generated SQL harmless. Correct use depends on a short `DbContext` lifetime, deliberate tracking, inspected query shape, and migrations reviewed for the target engine.

# Core Concepts

## DbContext and DbSet

`DbContext` represents one session and unit of work. It owns the model, tracks selected entities, coordinates `SaveChanges`, and exposes provider services. `DbSet<T>` is a query and persistence entry point for an entity type. It is not a literal table abstraction because mappings can span tables, views, owned types, or provider-specific storage.

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

## Change Tracking

Entity queries are tracking by default. Entities also become tracked when they are added or attached. No-tracking queries and keyless entity types do not follow that default. A projection is untracked only when its result contains no entity instances. EF Core still tracks entity instances nested inside an anonymous or custom projection unless the query is explicitly no-tracking. `SaveChangesAsync()` detects changes in tracked entries and asks the provider to execute the required insert, update, or delete commands.

```csharp
// Load → modify → save: EF Core detects the change automatically
var order = await db.Orders.FindAsync(orderId);
order.Status = OrderStatus.Confirmed;  // changes the CLR property; snapshot detection runs before save
await db.SaveChangesAsync();           // generates: UPDATE Orders SET Status = 'Confirmed' WHERE Id = @id
```

With the default snapshot strategy, assigning `Status` does not itself notify EF Core. Automatic change detection compares current and original values before `SaveChanges`, at which point the entry and property are marked as modified. Notification-based tracking can detect changes earlier.

For a read-only query that does not need identity resolution or later updates through the same context, `.AsNoTracking()` avoids change-tracker work:

```csharp
var orders = await db.Orders
    .AsNoTracking()
    .Where(o => o.CustomerId == customerId)
    .ToListAsync();
```

> [!WARNING]
> **`DbContext` is a unit of work, not a singleton.** It is not thread-safe, and EF Core does not support parallel operations on one instance. `AddDbContext` registers it as scoped by default in ASP.NET Core, which often aligns one context with one request. A request can still contain several units of work, and background or parallel work needs a fresh context from `IDbContextFactory<T>`. See the captive-dependency boundary in [[Home/Programming/NET/ASP.NET Web API/Dependency Injection|Dependency Injection]]. `AddDbContextPool` can reuse reset context instances, but mutable per-request state such as a tenant identifier must be re-established safely.

## Transactions and Concurrency

When the provider supports transactions, one `SaveChangesAsync()` call is transactional by default: all generated changes commit or the call rolls them back. Several `SaveChanges` calls or a unit that mixes EF and SQL need an explicit shared transaction when they must have one atomic outcome:

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

**Optimistic concurrency** detects a stale update without holding a lock while application code works. A configured concurrency token, such as SQL Server `rowversion`, is included in the update or delete predicate. If the row no longer has the original token, the command affects zero rows and `SaveChanges` throws `DbUpdateConcurrencyException`. The application must reload, merge, retry from fresh state, or report a conflict. A token protects the rows included in the check. It is not a substitute for Serializable protection of an unvalidated predicate in [[ACID]].

Provider execution strategies can retry transient database failures. When an application opens a transaction manually, the complete transactional unit must run through the configured execution strategy so a retry can recreate it safely. Business operations also need protection against an ambiguous commit result.

## Migrations

EF Core migrations record model changes as C# operations and maintain a history table of applied migrations. Generated code is a starting point. Deployment still needs reviewed SQL, backups or a rollback path, and provider-specific handling for long-running or destructive changes.

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

# Performance Patterns

## Projection Instead of Full Entity Load

Loading a tracked entity is unnecessary when the result only needs a few columns. A projection keeps the SQL result narrow and avoids creating a larger object graph:

```csharp
// BAD: loads all columns including large blobs
var orders = await db.Orders.Where(o => o.CustomerId == id).ToListAsync();

// GOOD: project to only needed columns
var summaries = await db.Orders
    .Where(o => o.CustomerId == id)
    .Select(o => new OrderSummary(o.Id, o.Total, o.Status))
    .ToListAsync();
```

## Avoiding N+1 Queries

With lazy loading enabled, loading orders and then accessing each `Customer` navigation can issue one additional query per order.

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

## Bulk Updates and Raw SQL

The usual load-modify-save path materializes and tracks each affected entity. `ExecuteUpdateAsync` and `ExecuteDeleteAsync` perform a set-based command without loading those entities:

```csharp
// One UPDATE statement; nothing loaded or tracked
await db.Orders
    .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < cutoff)
    .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Expired), ct);
```

These methods bypass the change tracker, so matching entities already tracked by the context can become stale. Raw SQL is available when LINQ cannot express the required operation, but only parameterized APIs or correctly supplied parameters keep values out of SQL syntax. Raw fragments such as column names require validation because database parameters cannot represent identifiers.

## Global Query Filters

A global query filter adds a model-level predicate to queries for an entity type. It can centralize soft-delete or tenant filtering, while explicit filter disabling remains a privileged escape hatch:

```csharp
modelBuilder.Entity<Order>().HasQueryFilter(o => !o.IsDeleted && o.TenantId == _tenant.Id);
// Opt out per-query with .IgnoreQueryFilters()
```

The filter is part of the security and correctness boundary when it carries tenant scope. `IgnoreQueryFilters()`, pooled-context tenant state, and filters on required navigations deserve tests because each can change which rows are returned.

# Pitfalls

## Lazy Loading in Production

**What goes wrong**: lazy loading is enabled and navigation properties are accessed in loops, causing N+1 queries. A page that loads 100 orders and accesses `order.Customer` for each fires 101 queries.

**Why it happens**: lazy loading is convenient in development but hides query patterns.

**Mitigation**: lazy loading is off unless it is configured. Prefer a projection when the response has a fixed shape, or load the required navigation explicitly. Inspect command counts in tests and telemetry instead of assuming an object traversal stays in memory.

## Cartesian Explosion from Multiple Includes

Two sibling collection includes can produce a relational cross product. An order with 50 line items and 20 history rows can yield 1,000 rows before EF materializes the graph. Nested includes do not create the same sibling cross product, though they can still duplicate principal columns. `AsSplitQuery()` issues the root query plus separate commands for included collections, trading row multiplication for more commands and a possible consistency gap if data changes between them. A transaction with suitable isolation can close that gap when the graph must represent one database view.

## Code First Vs Database First

- **Model and migrations**: the EF model owns intended schema evolution, and reviewed migrations carry it forward.
- **Reverse engineering**: `dotnet ef dbcontext scaffold` generates a model from an existing schema. Re-scaffolding and custom code need an ownership policy because generated files can change.

Choose the owner first. Application-owned schemas fit model-driven migrations. An externally governed or existing schema fits reverse engineering, often with partial classes or separate configuration to keep custom behavior out of regenerated code.

## Zero-Downtime Migrations

Schema changes take provider-specific locks and may scan or rewrite a large table. Adding a required column, changing a type, building an index, or validating a constraint can exceed the deployment window even when the migration looks small. A generated migration does not establish that an operation is online.

**Mitigation**: use an expand-contract rollout when old and new application versions must overlap:
1. Add a backward-compatible schema shape using the target engine's online-safe procedure where one exists.
2. Deploy code that can read the old and new shapes and writes the new value.
3. Backfill in bounded batches while monitoring locks, log growth, and replica lag.
4. Validate the new invariant, make the column required when the engine can do so within the window, then remove obsolete compatibility code in a later release.

# Questions

> [!QUESTION]- How does EF Core change tracking work, and when is a no-tracking query appropriate?
> A tracking query attaches its entity instances to the context and reuses the same instance when the same entity key appears again. With the default snapshot strategy, EF Core compares current values with the tracked original values when change detection runs, normally before `SaveChanges()`. `.AsNoTracking()` fits a read-only result that will not be updated through that context. If a disconnected entity is attached later, the application must state which properties changed and how concurrency will be checked.

> [!QUESTION]- What is the N+1 query problem, and how can it be detected?
> N+1 means one query loads parent rows and later navigation access issues another query for each parent. Detect it by counting database commands per operation and inspecting generated SQL in logs or tracing. Fix the query shape with a projection, an explicit include, or a deliberate second query. The choice depends on result size and consistency needs. There is no universal collection-size threshold for split queries.

# References

- [Entity Framework Core documentation](https://learn.microsoft.com/en-us/ef/core/)
