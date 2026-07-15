---
publish: true
created: 2026-07-15T11:47:57.336Z
modified: 2026-07-15T11:47:57.336Z
published: 2026-07-15T11:47:57.336Z
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

# Dependency Injection in ASP.NET Core

ASP.NET Core has a built-in IoC container that manages service lifetimes and resolves dependencies automatically. You register services in `Program.cs` and the container injects them via constructor injection throughout the application — controllers, middleware, filters, background services, and hosted services all participate.

This page covers the ASP.NET Core DI container specifically. For the general Dependency Injection pattern and its design benefits, see [[Software Architecture/Patterns/Dependency Injection|Dependency Injection]].

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

## Keyed Services (.NET 8)

When you have multiple implementations and want to pick a _specific_ one (not all of them), register and resolve by key:

```csharp
builder.Services.AddKeyedScoped<INotificationSender, EmailNotificationSender>("email");
builder.Services.AddKeyedScoped<INotificationSender, SmsNotificationSender>("sms");

public sealed class OrderConfirmation(
    [FromKeyedServices("email")] INotificationSender sender) { /* ... */ }
```

This replaces the old workarounds (factory delegates, marker interfaces) for "same interface, choose by name."

## Advanced Registration

- **Open generics** — register a generic interface to a generic implementation once: `services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));`. Resolving `IRepository<Order>` constructs `EfRepository<Order>`.
- **`TryAdd*` / `TryAddEnumerable`** — register only if not already present (libraries use these so apps can override defaults without duplicate registrations).
- **Decorators** — the built-in container has no native decoration; use [Scrutor](https://github.com/khellang/Scrutor)'s `Decorate<TService, TDecorator>()` (or assembly scanning) for cross-cutting wrappers.
- **`ActivatorUtilities.CreateInstance<T>(provider, args)`** — construct a type with a mix of DI-resolved and explicit constructor args without registering it.

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

### Disposal and the Transient `IDisposable` Trap

The container **owns disposal of the instances it creates**: when a scope ends it disposes the `IDisposable`/`IAsyncDisposable` services it resolved in that scope, and singletons are disposed when the root provider is disposed. Two consequences:

- A **transient `IDisposable` resolved from the root provider lives until the app shuts down** — the container holds it to dispose it later, so a "transient" disposable can pile up as a leak. Resolve disposables from a scope, or don't make hot transients disposable.
- **Don't register an instance you also dispose yourself** (`AddSingleton(myInstance)` then `using`) — you'll double-dispose. If _you_ own the lifetime, register a factory that returns it without the container taking ownership, or let the container own it exclusively.

## Tradeoffs

- **Constructor vs property injection**: constructor injection is the standard in ASP.NET Core — all dependencies are explicit, required, and available at construction time. Property injection (not natively supported by the built-in container) is appropriate only for optional dependencies or legacy frameworks. Constructor injection fails loudly at startup if a registration is missing; property injection fails silently at call time.
- **Scoped vs Transient for stateful services**: Scoped creates one instance per request and shares it across the full request graph — appropriate for DbContext (unit-of-work). Transient creates a new instance on every injection — appropriate for lightweight, stateless services. Choosing Scoped when you mean Transient causes unintended state sharing within a request.
- **Built-in container vs Autofac/others**: ASP.NET Core's built-in container covers constructor injection, lifetimes, and open-generic registration with zero extra dependencies. Autofac, StructureMap, and Lamar add named registrations, decorators, and convention-based scanning. Prefer the built-in container unless you specifically need a missing feature.

## Questions

> [!QUESTION]- What is a captive dependency and why is it dangerous?
> A captive dependency occurs when a long-lived service (Singleton) captures a shorter-lived service (Scoped or Transient) at construction time. The shorter-lived service then lives as long as the Singleton, violating its intended lifetime. For DbContext, this causes a single database context to be shared across all requests, leading to data corruption and race conditions.

> [!QUESTION]- How do you use a Scoped service inside a Singleton without a captive dependency?
> Inject `IServiceScopeFactory` into the Singleton and call `scopeFactory.CreateScope()` at the point of use. Resolve the Scoped service from the new scope and dispose the scope when done. This ensures the Scoped service lives within a controlled scope, not captured inside the Singleton.

> [!QUESTION]- What is the difference between `GetService<T>` and `GetRequiredService<T>`?
> `GetService<T>` returns null if the service is not registered; `GetRequiredService<T>` throws `InvalidOperationException`. Use `GetRequiredService<T>` in production code where a missing registration is a programming error that should fail loudly at startup rather than silently return null at call time.

## References

- [Dependency injection in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection) — official guide covering service registration, lifetimes, constructor injection, and scope validation.
- [Service lifetimes (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#service-lifetimes) — detailed explanation of Singleton, Scoped, and Transient with examples of when each is appropriate.
- [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines) — best practices including captive dependency avoidance, scope validation, and testing patterns.
- [IServiceScopeFactory (Microsoft Learn)](https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.iservicescopefactory) — API reference for creating manual service scopes; the correct pattern for Singletons that need Scoped dependencies.
- [[Software Architecture/Patterns/Dependency Injection|Dependency Injection]] — the general DI pattern: why it improves testability and decoupling, independent of ASP.NET Core.
- [[IoC (Holywood Principle)|IoC (Hollywood Principle)]] — the underlying principle: the framework provides dependencies rather than your code creating them.
