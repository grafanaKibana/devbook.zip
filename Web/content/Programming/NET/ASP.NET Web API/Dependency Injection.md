---
publish: true
created: 2026-08-20T20:41:15.646Z
modified: 2026-08-20T20:41:15.646Z
published: 2026-08-20T20:41:15.646Z
topic:
  - Programming
subtopic:
  - NET
summary: ASP.NET Core's built-in IoC container managing service lifetimes and constructor injection.
level:
  - "1"
priority: Medium
status: Ready to Repeat
---

ASP.NET Core's built-in container maps service types to creation rules. Registrations in `Program.cs` define the implementation and lifetime. Framework activation then supplies those services to controllers, middleware, filters, and hosted services.

This page covers container behavior in ASP.NET Core. [[Software Architecture/Patterns/Dependency Injection|Dependency Injection]] covers the underlying design pattern.

# Service Lifetimes

Lifetime determines where the container reuses an instance and when it disposes that instance.

| Lifetime | Instance per | Use for |
|---|---|---|
| **Singleton** | Application lifetime | Stateless services, caches, configuration wrappers |
| **Scoped** | HTTP request | `DbContext`, unit-of-work, per-request state |
| **Transient** | Each injection | Lightweight stateless services, factories |

```csharp
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IOrderRepository, EfOrderRepository>();
builder.Services.AddTransient<IReportGenerator, PdfReportGenerator>();

// Shorthand for common patterns
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseSqlServer(connectionString));  // Scoped by default
```

# Constructor Injection

The container resolves constructor parameters from the active request scope:

```csharp
public sealed class OrdersController(IOrderRepository orders, IEmailSender email)
    : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Place(PlaceOrderRequest req, CancellationToken ct)
    {
        var order = Order.Create(req.CustomerId, req.Items);
        await orders.SaveAsync(order, ct);
        await email.SendAsync(req.Email, "Order confirmed", $"Order {order.Id} placed.", ct);
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order);
    }
}
```

The controller declares what it needs. The container constructs both dependencies according to their registrations, which keeps object creation out of the action.

# Registering Multiple Implementations

Repeated registrations of the same service type are all available through `IEnumerable<T>`. Resolving a single `T` returns the last registration, so code that needs every implementation should say so explicitly.

```csharp
// Register multiple implementations of the same interface
builder.Services.AddScoped<INotificationSender, EmailNotificationSender>();
builder.Services.AddScoped<INotificationSender, SmsNotificationSender>();

// Inject all implementations as IEnumerable<T>
public sealed class NotificationService(IEnumerable<INotificationSender> senders)
{
    public async Task NotifyAllAsync(string message, CancellationToken ct)
    {
        foreach (var sender in senders)
            await sender.SendAsync(message, ct);
    }
}
```

# Keyed Services (.NET 8)

Keyed services select one implementation without adding marker interfaces or a hand-written switch.

```csharp
builder.Services.AddKeyedScoped<INotificationSender, EmailNotificationSender>("email");
builder.Services.AddKeyedScoped<INotificationSender, SmsNotificationSender>("sms");

public sealed class OrderConfirmation(
    [FromKeyedServices("email")] INotificationSender sender) { /* ... */ }
```

Keys are useful when the choice is part of configuration or endpoint behavior. If the caller constantly branches on keys, the design may be hiding a missing domain abstraction.

# Advanced Registration

- **Open generics** register a family once: `services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));`. A request for `IRepository<Order>` then constructs `EfRepository<Order>`.
- **`TryAdd*` and `TryAddEnumerable`** avoid replacing an existing registration. Libraries use them so the host application retains the final choice.
- **Decorators** are not a built-in registration feature. Scrutor adds `Decorate<TService, TDecorator>()` when wrapping services is common enough to justify the dependency.
- **`ActivatorUtilities.CreateInstance<T>(provider, args)`** mixes container-resolved dependencies with explicit constructor arguments for an otherwise unregistered type.

# Pitfalls

## Captive Dependency (Singleton Consuming Scoped)

A singleton cannot safely capture a scoped dependency from the root provider. The shorter-lived object then remains attached to the singleton instead of following a request scope. A captured `DbContext` is especially dangerous because concurrent requests would share a non-thread-safe unit of work.

Scope validation catches the direct mismatch when enabled. Some indirect lifetime mistakes still require design review because the container only sees the registrations it resolves.

Do not inject scoped services into singletons. A transient captured by a singleton also lives with that singleton, which may be intended only when the transient is stateless and safe for concurrent use. Background services that need request-like scoped work should create an explicit scope per operation.

```csharp
public sealed class BackgroundWorker(IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
        // Use repo within this scope
    }
}
```

## Registering `DbContext` as Singleton

`DbContext` is a short unit of work and is not thread-safe. A singleton registration lets concurrent requests operate on the same change tracker and database connection state.

`AddDbContext<T>()` already registers a scoped context. Overriding that lifetime discards the safe default.

Keep the scoped default for request work. A singleton or parallel worker should use `IDbContextFactory<T>` to create and dispose an independent context for each operation.

## Disposal and the Transient `IDisposable` Trap

The container owns disposal for instances it creates. Scoped disposables are released with their scope. Container-created singletons remain until the root provider shuts down.

- A **transient `IDisposable` resolved from the root provider lives until shutdown** because the provider retains it for later disposal. Hot-path disposables belong in a bounded scope or an explicit factory.
- An instance supplied to `AddSingleton(myInstance)` remains caller-owned and is not disposed by the container. The caller must dispose it exactly once. A singleton created by an implementation-type or factory registration is container-owned and disposed with the root provider.

# Tradeoffs

- **Constructor or property injection:** constructor parameters make required dependencies visible and prevent creation of an invalid object. The built-in container does not provide property injection. Optional dependencies are usually better modeled by an explicit default implementation.
- **Scoped or transient:** scoped services share state within one request or explicit scope. Transients produce a new instance at each resolution, although that instance can still be captured by a longer-lived consumer. The choice follows the required sharing boundary, not merely whether the type is stateful.
- **Built-in or third-party container:** the default container covers lifetimes, constructor activation, keyed services, and open generics. A replacement earns its cost only when a missing registration feature is used broadly enough to simplify the application.

# Questions

> [!QUESTION]- What is a captive dependency and why is it dangerous?
> A captive dependency appears when a long-lived service holds a dependency that was meant to live for less time. For example, a singleton that captures a scoped `DbContext` keeps it beyond one request and may share that non-thread-safe object across concurrent operations. A transient captured by a singleton also lives as long as the singleton, which is safe only if it can handle that lifetime and concurrency.

> [!QUESTION]- How can a scoped service be used safely from a singleton?
> The singleton should not keep the scoped service. Inject `IServiceScopeFactory`, create a new scope for each operation, resolve and use the service inside that scope, then dispose the scope. A background worker normally repeats this for every iteration instead of keeping one scope for the worker's lifetime.

> [!QUESTION]- What is the difference between `GetService<T>` and `GetRequiredService<T>`?
> `GetService<T>` returns `null` when no registration exists. `GetRequiredService<T>` throws `InvalidOperationException` at the point of resolution. Startup validation can move some failures earlier, but calling `GetRequiredService` alone does not guarantee startup-time failure.

# References

- [Dependency injection in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection)
- [Scrutor](https://github.com/khellang/Scrutor)
