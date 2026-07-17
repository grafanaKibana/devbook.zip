---
publish: true
created: 2026-07-16T17:40:52.151Z
modified: 2026-07-16T17:40:52.151Z
published: 2026-07-16T17:40:52.151Z
topic:
  - Software Architecture
subtopic:
  - System Architecture
summary: A concrete .NET modular-monolith layout with module-owned registration, persistence, contracts, and transaction boundaries.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

A .NET modular monolith is one deployment whose modules expose contracts and keep domain and infrastructure internals private. Separate projects make forbidden references visible to the compiler and architecture tests. Separate `DbContext` types and schemas establish table ownership, but they do not automatically create distributed transaction boundaries: contexts using the same relational database, connection, and transaction can still commit atomically.

Use one local transaction only when the business invariant genuinely belongs to one consistency boundary. If modules use separate databases, brokers, or resources that cannot enlist in the same supported transaction, use local commits with outbox/inbox messaging and observable process state.

## Project shape

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

`Orders.Core` may reference `Inventory.Contracts`; it must not reference `Inventory.Core` or `Inventory.Infrastructure`.

## Contract and handler

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

```csharp
public sealed class PlaceOrderHandler(
    IInventoryGateway inventory,
    IOrderRepository orders)
{
    public async Task<Result> HandleAsync(
        PlaceOrderCommand command,
        CancellationToken cancellationToken)
    {
        if (command.Quantity <= 0)
        {
            return Result.Failure("orders.invalid_quantity");
        }

        var reservation = await inventory.ReserveAsync(
            new ReserveStockRequest(
                command.ProductId,
                command.Quantity,
                command.OrderId),
            cancellationToken);

        if (!reservation.Success)
        {
            return Result.Failure(
                reservation.FailureCode ?? "inventory.unavailable");
        }

        await orders.AddAsync(
            Order.Create(command.OrderId, command.CustomerId),
            cancellationToken);

        return Result.Success();
    }
}
```

## Module-owned registration

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

The host knows how to compose modules but does not reach into their persistence or domain types. Each infrastructure assembly owns its registrations and migrations history.

## Shared transaction when the resource is shared

Two `DbContext` instances can share one local relational transaction when they use the same open connection and provider transaction.

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

Different schemas do not prevent this transaction because PostgreSQL is still one transactional resource. The boundary changes when a module moves to another database, uses a provider that cannot share the transaction, or publishes to a broker. At that point, do not hide partial completion behind a repository abstraction: persist an outbox record with the local change and model the cross-module workflow as asynchronous.

## Extraction path

1. Keep callers targeting `IInventoryGateway` from `Inventory.Contracts`.
2. Enforce project-reference and table-ownership rules in architecture tests.
3. Replace the in-process gateway with an HTTP, gRPC, or messaging adapter.
4. Move Inventory persistence and runtime to its own deployment.
5. Add timeout, retry, idempotency, tracing, and reconciliation at the new remote boundary.

The transport swap is mechanical only when the contract and data ownership were already real. It does not preserve local latency or transaction semantics; callers must adopt the new distributed failure model.

## References

- [Sharing transactions across DbContext instances](https://learn.microsoft.com/ef/core/saving/transactions#share-connection-and-transaction) - Official EF Core requirements for sharing a connection and `DbTransaction`.
- [Modular Monolith with DDD](https://github.com/kgrzybek/modular-monolith-with-ddd) - .NET reference implementation with module boundaries, integration events, and architecture tests.
- [Modular Monolith: A Primer](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer) - Module ownership and communication principles.
- [Transactional Outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html) - Local transaction plus reliable asynchronous publication when resources cannot share one transaction.
