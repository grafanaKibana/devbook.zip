---
topic:
  - Programming
subtopic:
  - NET
level:
  - "2"
priority: Medium
status: Creation
dg-publish: true
---

# Intro

Filters in ASP.NET Core let you run logic before and after specific stages of controller action execution.
They are useful for cross-cutting concerns that are tightly coupled to MVC actions, such as action-level validation, response shaping, and controller-scoped auditing.
This matters because putting all of that logic inside actions quickly creates duplication and inconsistent behavior.
Reach for filters when middleware is too broad and endpoint code is too local.

Filters run inside the MVC pipeline after routing selects an action.

- Authorization filters run first and can short-circuit unauthorized requests.
- Resource filters run around most of the rest of the pipeline and can short-circuit early.
- Action filters run before and after the action method.
- Exception filters observe unhandled exceptions from action execution.
- Result filters run before and after the action result is executed.

Execution order is determined by scope (global, controller, action) and optionally by `IOrderedFilter`.

## Example

Use an async action filter to require a custom header for selected endpoints:

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public sealed class RequireCorrelationIdFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(
        ActionExecutingContext context,
        ActionExecutionDelegate next)
    {
        if (!context.HttpContext.Request.Headers.ContainsKey("X-Correlation-Id"))
        {
            context.Result = new BadRequestObjectResult(new
            {
                error = "X-Correlation-Id header is required"
            });
            return;
        }

        await next();
    }
}

// Program.cs
builder.Services.AddScoped<RequireCorrelationIdFilter>();

builder.Services.AddControllers(options =>
{
    // Global registration
    options.Filters.AddService<RequireCorrelationIdFilter>();
});
```

If this rule should apply only to one endpoint, apply it with `[ServiceFilter(typeof(RequireCorrelationIdFilter))]` instead of registering globally.

## Pitfalls

- Running blocking I/O inside sync filters can hurt throughput because request threads are blocked; use async filters for I/O work.
- Putting authentication or authorization checks into custom action filters often duplicates policy logic and causes drift; prefer built-in `AddAuthentication`, `AddAuthorization`, and `[Authorize]` policies.
- Expecting exception filters to handle everything is risky; they do not replace global exception middleware for non-MVC failures.

## Tradeoffs

| Option | Best for | Weakness |
|---|---|---|
| Middleware | App-wide cross-cutting concerns (logging, auth, exception handling) | No direct MVC action context |
| MVC filters | Concerns tied to controllers/actions and model/action context | Only applies to MVC pipeline |
| Endpoint filters | Minimal API endpoint-scoped behavior | Not used by MVC controllers |

## Questions

> [!QUESTION]- Explain when to choose middleware over an MVC action filter.
> Expected answer:
> - Middleware when concern is app-wide and independent of controller/action internals.
> - Action filter when concern needs `ActionExecutingContext`, action arguments, or action result wrapping.
> - Middleware runs earlier in pipeline and can affect all endpoints.
> - Filters are more granular for controller/action scope.
> Why this matters: this is a common architecture tradeoff in API design interviews.

> [!QUESTION]- What is the execution order of ASP.NET Core filter types?
> Expected answer:
> - Authorization -> Resource -> Action -> Exception -> Result (with before/after phases where applicable).
> - Scope affects order: global, then controller, then action.
> - `IOrderedFilter` can override default order.
> Why this matters: ordering mistakes cause hidden bugs in validation, caching, and error handling.

> [!QUESTION]- How do you inject services into a filter safely?
> Expected answer:
> - Register filter/service in DI container.
> - Use `ServiceFilter`/`TypeFilter` or `options.Filters.AddService<TFilter>()`.
> - Prefer constructor injection and async interfaces.
> - Avoid `RequestServices.GetService` inside filter bodies unless absolutely necessary.
> Why this matters: DI misuse in filters causes brittle code and testing pain.

## Links

- [Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-8.0) — official reference covering all filter types, execution order, DI registration, and cancellation.
- [Middleware in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware?view=aspnetcore-8.0) — use alongside this page to understand when middleware is the better choice.
- [Minimal API endpoint filters](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/min-api-filters?view=aspnetcore-8.0) — endpoint-scoped filter equivalent for Minimal APIs.
- [Filter pipeline in ASP.NET Core (ABP blog)](https://abp.today/blog/2021/06/08/filter-pipeline-aspnet-core) — practitioner walkthrough of filter ordering and real-world usage patterns.

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
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Dependency Injection|Dependency Injection]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Middlewares|Middlewares]]
<!-- whats-next:end -->
