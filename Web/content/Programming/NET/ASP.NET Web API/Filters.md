---
publish: true
created: 2026-07-11T21:44:36.607Z
modified: 2026-07-17T19:00:22.058Z
published: 2026-07-17T19:00:22.058Z
topic:
  - Programming
subtopic:
  - NET
summary: Logic running around controller action stages for cross-cutting MVC concerns.
level:
  - "2"
priority: Medium
status: Ready to Repeat
---

# Intro

Filters in ASP.NET Core let you run logic before and after specific stages of controller action execution.
They are useful for cross-cutting concerns that are tightly coupled to MVC actions, such as action-level validation, response shaping, and controller-scoped auditing — for example, an action filter that validates an `X-Correlation-Id` header on every inbound request and returns a 400 if missing, saving you from duplicating that check across 80+ controller actions.
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

Exception filter to catch and shape unhandled action exceptions:

```csharp
public sealed class ApiExceptionFilter(ILogger<ApiExceptionFilter> logger) : IAsyncExceptionFilter
{
    public Task OnExceptionAsync(ExceptionContext context)
    {
        logger.LogError(context.Exception, "Unhandled exception in {Action}",
            context.ActionDescriptor.DisplayName);

        context.Result = context.Exception is NotFoundException
            ? new NotFoundObjectResult(new { error = context.Exception.Message })
            : new ObjectResult(new { error = "An unexpected error occurred." }) { StatusCode = 500 };

        context.ExceptionHandled = true;
        return Task.CompletedTask;
    }
}
```

Register globally: `builder.Services.AddControllers(opts => opts.Filters.Add<ApiExceptionFilter>());`

## Applying Filters: `[ServiceFilter]` vs `[TypeFilter]` vs `IFilterFactory`

How you attach a filter that has constructor dependencies matters:

- **`[ServiceFilter(typeof(MyFilter))]`** — the filter is resolved from DI, so you **must register it** (`AddScoped<MyFilter>()`). Use this for filters with injected services.
- **`[TypeFilter(typeof(MyFilter))]`** — the filter is instantiated via `ActivatorUtilities` (DI-resolved constructor args **plus** explicit `Arguments`), and does **not** need to be registered. Use this to pass literal arguments to the filter.
- **`IFilterFactory`** — implement it on an attribute to build the real filter yourself (this is how attribute-with-dependencies patterns work under the hood).
- A plain `[MyFilter]` attribute can't receive DI services — it's constructed by the runtime with only literal attribute args.

Note that **`[Authorize]` is itself an authorization filter** — which is why authorization runs first in the filter order (Authorization → Resource → Action → Exception → Result), and why duplicating auth logic in an action filter is redundant. Within a stage, execution order is global → controller → action, refined by `IOrderedFilter.Order`. Also: implement either the sync (`IActionFilter`) **or** async (`IAsyncActionFilter`) interface of a pair, never both — if you implement both, the async one wins and the sync one is ignored.

## Pitfalls

- Running blocking I/O inside sync filters can hurt throughput because request threads are blocked; use async filters for I/O work. A sync `IActionFilter` that calls a remote validation API with `.Result` instead of using `IAsyncActionFilter` with `await` blocked thread-pool threads under load — at 200 concurrent requests, thread starvation caused p99 latency to spike from 50ms to 12 seconds and triggered 503 responses.
- Putting authentication or authorization checks into custom action filters often duplicates policy logic and causes drift; prefer built-in `AddAuthentication`, `AddAuthorization`, and `[Authorize]` policies.
- Expecting exception filters to handle everything is risky; they only catch exceptions thrown during action execution (action method, action filters, and result execution). Exceptions in middleware, model binding before action selection, or authorization filters bypass exception filters entirely — a `JsonException` during `[FromBody]` deserialization returned a raw 500 instead of the structured error the team expected because the exception filter never fired.

## Tradeoffs

| Option | Best for | Weakness |
|---|---|---|
| Middleware | App-wide cross-cutting concerns (logging, auth, exception handling) | No direct MVC action context |
| MVC filters | Concerns tied to controllers/actions and model/action context | Only applies to MVC pipeline |
| Endpoint filters | Minimal API endpoint-scoped behavior | Not used by MVC controllers |

## Questions

> [!QUESTION]- Explain when to choose middleware over an MVC action filter.
> Expected answer:
>
> - Middleware when concern is app-wide and independent of controller/action internals.
> - Action filter when concern needs `ActionExecutingContext`, action arguments, or action result wrapping.
> - Middleware runs earlier in pipeline and can affect all endpoints.
> - Filters are more granular for controller/action scope.
>   Why this matters: this is a common architecture tradeoff in API design interviews.

> [!QUESTION]- What is the execution order of ASP.NET Core filter types?
> Expected answer:
>
> - Authorization -> Resource -> Action -> Exception -> Result (with before/after phases where applicable).
> - Scope affects order: global, then controller, then action.
> - `IOrderedFilter` can override default order.
>   Why this matters: ordering mistakes cause hidden bugs in validation, caching, and error handling.

> [!QUESTION]- How do you inject services into a filter safely?
> Expected answer:
>
> - Register filter/service in DI container.
> - Use `ServiceFilter`/`TypeFilter` or `options.Filters.AddService<TFilter>()`.
> - Prefer constructor injection and async interfaces.
> - Avoid `RequestServices.GetService` inside filter bodies unless absolutely necessary.
>   Why this matters: DI misuse in filters causes brittle code and testing pain.

## References

- [Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-8.0) — official reference covering all filter types, execution order, DI registration, and cancellation.
- [Middleware in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware?view=aspnetcore-8.0) — use alongside this page to understand when middleware is the better choice.
- [Minimal API endpoint filters](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/min-api-filters?view=aspnetcore-8.0) — endpoint-scoped filter equivalent for Minimal APIs.
- [Filter pipeline in ASP.NET Core (ABP blog)](https://abp.today/blog/2021/06/08/filter-pipeline-aspnet-core) — practitioner walkthrough of filter ordering and real-world usage patterns.
