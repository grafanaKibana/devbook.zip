---
topic:
  - Programming
subtopic:
  - NET
level:
  - "1"
priority: Medium
status: Creation
dg-publish: true
---

# Dependency Injection in ASP.NET Core

ASP.NET Core has a built-in IoC container that manages service lifetimes and resolves dependencies automatically. You register services in `Program.cs` and the container injects them via constructor injection throughout the application — controllers, middleware, filters, background services, and hosted services all participate.

This page covers the ASP.NET Core DI container specifically. For the general Dependency Injection pattern and its design benefits, see [[Software Engineering/05 Architecture/Patterns/Dependency Injection|Dependency Injection]].

## Service Lifetimes

The three lifetimes control how long a service instance lives:

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

## Constructor Injection

The container resolves constructor parameters automatically:

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

No `new` keyword — the container creates and injects `IOrderRepository` and `IEmailSender` with the correct lifetimes.

## Registering Multiple Implementations

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

## Pitfalls

### Captive Dependency (Singleton Consuming Scoped)

**What goes wrong**: a Singleton service injects a Scoped service. The Scoped service is captured at the Singleton's creation time and reused across all requests — effectively becoming a Singleton itself. For `DbContext`, this means a single context is shared across concurrent requests, causing data corruption.

**Why it happens**: the container doesn't prevent this by default (though it validates in development mode with `ValidateScopes = true`).

**Mitigation**: never inject Scoped or Transient services into Singletons. If a Singleton needs a Scoped service, inject `IServiceScopeFactory` and create a scope explicitly.

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

### Registering `DbContext` as Singleton

**What goes wrong**: `DbContext` is not thread-safe. Registering it as Singleton causes concurrent requests to share the same context, leading to race conditions and incorrect query results.

**Why it happens**: `AddDbContext<T>()` defaults to Scoped, but developers sometimes override this.

**Mitigation**: always use `AddDbContext<T>()` without overriding the lifetime. If you need a `DbContext` in a Singleton, use `IDbContextFactory<T>` (registered with `AddDbContextFactory<T>()`).

## References

- [Dependency injection in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection) — official guide covering service registration, lifetimes, constructor injection, and scope validation.
- [Service lifetimes (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#service-lifetimes) — detailed explanation of Singleton, Scoped, and Transient with examples of when each is appropriate.
- [[Software Engineering/05 Architecture/Patterns/Dependency Injection|Dependency Injection]] — the general DI pattern: why it improves testability and decoupling, independent of ASP.NET Core.
- [[Software Engineering/06 Development Practices/Principles/IoC (Holywood Principle)|IoC (Hollywood Principle)]] — the underlying principle: "don't call us, we'll call you" — the framework provides dependencies rather than your code creating them.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authentication|Authentication]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authorization|Authorization]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/CORS|CORS]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Filters|Filters]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Middlewares|Middlewares]]
<!-- whats-next:end -->
