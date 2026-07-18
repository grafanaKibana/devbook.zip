---
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: "A single deployable application intentionally split into strict modules with explicit boundaries, gaining microservices benefits without the distributed systems tax."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

# Intro
A modular monolith is a single deployable application that is intentionally split into strict modules with explicit boundaries. It matters because you get most of the practical benefits people want from [[Microservices]] - clear ownership, clean contracts, and safer parallel development - without paying the full distributed systems tax on day one. Reach for it when your product is growing, domain boundaries are becoming clear, and your team does not want the operational overhead of many services yet. For most product teams, it is the pragmatic default: improve boundaries first, then distribute only where pressure proves it is worth it.

## Mechanism
Each module owns its own domain model, use cases, persistence rules, and public contract.

- **Boundary shape**: a module exposes only contracts such as interfaces, commands, events, and DTOs from its contracts assembly.
- **Allowed communication**: modules call each other only through those contracts, never by referencing another module internal classes.
- **Data isolation**: each module should have its own `DbContext` and ideally its own schema or database; at minimum, table ownership is explicit and cross module direct reads are prohibited.
- **In process now, distributed later**: module communication can be in process via mediator or integration events. Stable contracts reduce extraction churn, but replacing a local call with HTTP, gRPC, or messaging changes latency, failure, and transaction semantics even when the application-facing interface survives.

```mermaid
flowchart LR
    Host[Single deployment] --> Orders[Orders module]
    Host --> Inventory[Inventory module]
    Host --> Billing[Billing module]

    Orders --> OrdersData[Orders schema]
    Inventory --> InventoryData[Inventory schema]
    Billing --> BillingData[Billing schema]

    Orders -- contract api --> Inventory
    Orders -- order placed event --> Billing
    Inventory -- stock reserved event --> Orders
```

> [!IMPORTANT]
> **Data isolation makes the transaction boundary explicit.** Separate `DbContext` types or schemas can still share one local ACID transaction when they use the same relational database, connection, and provider transaction. The boundary becomes asynchronous when modules use separate databases, brokers, or resources that cannot participate in the same supported transaction. Then keep each local change atomic and publish reliably through an outbox instead of assuming all modules committed together.

## .NET implementation

Separate projects make forbidden references visible to the compiler and architecture tests:

```text
src/
  Modules/
    Orders/
      Orders.Contracts/
      Orders.Core/
      Orders.Infrastructure/
    Inventory/
      Inventory.Contracts/
      Inventory.Core/
      Inventory.Infrastructure/
  Host/
  Shared.Kernel/
```

`Orders.Core` may reference `Inventory.Contracts`; it must not reference `Inventory.Core` or `Inventory.Infrastructure`. The contracts assembly exposes the narrow cross-module boundary:

```csharp
namespace Inventory.Contracts;

public sealed record ReserveStockRequest(
    Guid ProductId,
    int Quantity,
    Guid OrderId);

public sealed record ReserveStockResult(bool Success, string? FailureCode);

public interface IInventoryGateway
{
    Task<ReserveStockResult> ReserveAsync(
        ReserveStockRequest request,
        CancellationToken cancellationToken);
}
```

An Orders handler depends on that contract rather than Inventory internals:

```csharp
public interface IUnitOfWork
{
    Task<T> ExecuteAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken);
}

public sealed class PlaceOrderHandler(
    IInventoryGateway inventory,
    IOrderRepository orders,
    IUnitOfWork unitOfWork)
{
    public Task<Result> HandleAsync(
        PlaceOrderCommand command,
        CancellationToken cancellationToken)
    {
        if (command.Quantity <= 0)
        {
            return Result.Failure("orders.invalid_quantity");
        }

        return unitOfWork.ExecuteAsync(async transactionToken =>
        {
            var reservation = await inventory.ReserveAsync(
                new ReserveStockRequest(
                    command.ProductId,
                    command.Quantity,
                    command.OrderId),
                transactionToken);

            if (!reservation.Success)
            {
                return Result.Failure(
                    reservation.FailureCode ?? "inventory.unavailable");
            }

            await orders.AddAsync(
                Order.Create(command.OrderId, command.CustomerId),
                transactionToken);

            return Result.Success();
        }, cancellationToken);
    }
}
```

`IUnitOfWork` is valid here only because both module adapters enlist in the same local database transaction. If Inventory moves behind a network boundary, this handler must become a durable workflow with idempotent reservation and compensation rather than pretending a local transaction still spans both modules.

### Module-owned registration

Each infrastructure assembly owns its persistence registration and migrations history. The host composes modules without reaching into their domain or persistence types.

```csharp
public static class InventoryModuleExtensions
{
    public static IServiceCollection AddInventoryModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Application")
            ?? throw new InvalidOperationException(
                "Connection string 'Application' is required.");

        services.AddDbContext<InventoryDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                postgres => postgres.MigrationsHistoryTable(
                    "__EFMigrationsHistory",
                    "inventory")));

        services.AddScoped<IInventoryGateway, InventoryGateway>();
        services.AddScoped<IInventoryRepository, InventoryRepository>();

        return services;
    }
}
```

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOrdersModule(builder.Configuration);
builder.Services.AddInventoryModule(builder.Configuration);

var app = builder.Build();
app.MapOrdersEndpoints();
app.Run();
```

### Shared transaction when the resource is shared

Two `DbContext` instances can commit atomically when they use the same open relational connection and provider transaction:

```csharp
await using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync(cancellationToken);

var ordersOptions = new DbContextOptionsBuilder<OrdersDbContext>()
    .UseNpgsql(connection)
    .Options;

var inventoryOptions = new DbContextOptionsBuilder<InventoryDbContext>()
    .UseNpgsql(connection)
    .Options;

await using var orders = new OrdersDbContext(ordersOptions);
await using var inventory = new InventoryDbContext(inventoryOptions);
await using var transaction = await orders.Database.BeginTransactionAsync(
    cancellationToken);

await inventory.Database.UseTransactionAsync(
    transaction.GetDbTransaction(),
    cancellationToken);

orders.Orders.Add(order);
inventory.Reservations.Add(reservation);

await orders.SaveChangesAsync(cancellationToken);
await inventory.SaveChangesAsync(cancellationToken);
await transaction.CommitAsync(cancellationToken);
```

Different schemas do not prevent this transaction because PostgreSQL is still one transactional resource. When a module moves to another database, uses a provider that cannot share the transaction, or publishes to a broker, persist an outbox record with the local change and expose the cross-module workflow as observable asynchronous state.

## Extraction path to microservices

Clean boundaries make extraction bounded, not transparent. Keeping call sites behind a contract such as `IInventoryGateway` can preserve the use-case shape, but the new network boundary must become visible in the design:

1. Define request deadlines, cancellation, failure responses, and what callers do when Inventory is unavailable or slow.
2. Retry only operations that are idempotent, carry idempotency keys where duplicate execution is possible, and avoid retry storms with backoff and limits.
3. Propagate trace and correlation context; add dependency latency, error-rate, saturation, and retry metrics before cutting traffic over.
4. Replace one-process transactions with local transactions plus an outbox, compensating action, or saga where a workflow crosses services.
5. Move owned data deliberately, including backfill, dual-read or dual-write windows, reconciliation, and rollback.

The interface may remain familiar, but its contract now includes partial failure and eventual consistency. That is still safer than extracting tangled code: module ownership and data isolation narrow the migration surface without pretending a local method call and a remote operation are equivalent.

## Collocation and scale cases

Collocation pays when stages always change together, share one scaling profile, and exchange large intermediate data. Prime Video's monitoring team reported that moving one tightly ordered video-analysis pipeline into one process removed remote orchestration and transfer costs. The result was specific to that workload, not a general comparison between monoliths and services.

Stack Overflow's documented 2016 architecture shows a different mechanism: a stateless application tier scaled horizontally while SQL Server, Redis, and search remained specialized systems. The lesson is not a server-count target. A modular deployment can carry substantial load when request paths, caches, database constraints, and failure headroom are measured.

Use these cases as boundary tests. Collocate modules when their changes, data movement, and scaling remain coupled. Extract a service only when independent deployment, failure isolation, or asymmetric scaling repeatedly pays for the new network and operating boundary.

## Pitfalls

- **Boundary erosion**: direct table reads, internal project references, and cross-module joins turn folders into decoration. Contracts-only references, table ownership, and architecture tests must fail the build when a shortcut crosses the boundary.
- **Shared database coupling**: one database can preserve local ACID transactions, but shared tables and unowned migrations couple modules. Give each module a schema and `DbContext`; exchange data through contracts or events.
- **Premature partitioning**: too many modules around unstable domains create constant boundary churn. Start with a few bounded contexts and split when ownership, change frequency, or scaling evidence makes the boundary durable.

## Tradeoffs
| Criterion | Traditional Monolith | Modular Monolith | Microservices |
|---|---|---|---|
| Deployment | Single unit | Single unit | Independent service deployments |
| Team model | Shared ownership across codebase | Ownership by module with explicit contracts | Ownership by service with strong autonomy |
| Data isolation | Usually shared schema and shared table access | Isolated schema or strict table ownership per module | Database per service with hard isolation |
| Runtime overhead | Lowest in process calls | Low in process calls plus boundary discipline | Highest due to network calls and resilience layers |
| Operational complexity | Low | Low to medium | High observability platform and deployment orchestration needs |
| Extraction cost | High if internals are tangled | Medium: contracts reduce code churn, but remote failure semantics and data migration remain | Not applicable: already extracted |

Decision rule: default to modular monolith for most product teams, choose traditional monolith only for very small or short lived systems, and move to microservices only when independent deployment or scaling constraints are repeatedly blocking delivery.

## Questions
> [!QUESTION]- How do you enforce module boundaries in a modular monolith to prevent it from degrading into a traditional monolith?
> Split each module into contracts, core, and infrastructure assemblies; allow cross-module references only to contracts. Give tables an owner, block cross-module joins, and use architecture tests to fail CI on forbidden project or namespace dependencies. The friction is intentional: a boundary that cannot reject a shortcut is only documentation.

> [!QUESTION]- When would you choose a modular monolith over microservices, and what signals tell you it is time to extract?
> Choose the modular monolith while domains can be owned as modules and one deployment remains reliable. Extract when a module repeatedly needs independent scaling, release cadence, security isolation, or reliability posture. Before cutover, preserve the domain contract but redesign the interaction for remote deadlines, retries, observability, and transaction boundaries.

## References
- [Modular Monolith with DDD repository by Kamil Grzybek](https://github.com/kgrzybek/modular-monolith-with-ddd) - Anchor practitioner codebase showing strict module boundaries, integration events, and architecture tests in a real .NET solution.
- [Kamil Grzybek Modular Monolith Primer](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer) - Conceptual explanation of module boundaries, communication patterns, and why modular monolith is a strategic step before service extraction.
- [Modular Monolith Communication Patterns by Milan Jovanovic](https://www.milanjovanovic.tech/blog/modular-monolith-communication-patterns) - Practitioner guidance on in process communication choices and contract based module interaction in .NET.
- [.NET Microservices Architecture guide](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/) - Microsoft architecture anchor describing service boundaries, independent deployment, and distributed systems tradeoffs.
- [Prime Video monitoring service](https://www.primevideotech.com/video-streaming/scaling-up-the-prime-video-audio-video-monitoring-service-and-reducing-costs-by-90) — primary case describing the transfer and orchestration costs removed by collocation.
- [Stack Overflow architecture, 2016](https://nickcraver.com/blog/2016/02/17/stack-overflow-the-architecture-2016-edition/) — primary historical account of the application tier, data systems, traffic, and capacity headroom.
- [Sharing transactions across DbContext instances](https://learn.microsoft.com/ef/core/saving/transactions#share-connection-and-transaction) - Official EF Core requirements for sharing a connection and `DbTransaction`.
- [Transactional Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html) - Local transaction plus reliable asynchronous publication when resources cannot share one transaction.
