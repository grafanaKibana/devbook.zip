---
publish: true
created: 2026-10-21T13:29:32.439Z
modified: 2026-10-21T13:29:32.439Z
published: 2026-10-21T13:29:32.439Z
topic:
  - Programming
subtopic:
  - NET
summary: Logic running around controller action stages for cross-cutting MVC concerns.
level:
  - "2"
priority: Medium
status: Ready to Repeat
qard-deck: Programming
qard-topic: NET/ASP NET Web API/Filters
flashcard_uid: ef27222b
---

MVC filters wrap defined stages of controller execution. They fit cross-cutting behavior that needs action arguments, model state, controller metadata, or the action result. A correlation-ID rule tied only to selected controllers is one example. An application-wide correlation ID usually belongs in middleware.

The boundary matters. Middleware can cover every request type but lacks MVC action context. Endpoint code has full local context but duplicates a rule when many actions need it. Filters occupy the space between those two.

Filters run after routing has selected an MVC action.

- Authorization filters run first and can short-circuit unauthorized requests.
- Resource filters run around most of the rest of the pipeline and can short-circuit early.
- Action filters run before and after the action method.
- Exception filters observe unhandled exceptions from action execution.
- Result filters run before and after the action result is executed.

Scope and filter type both affect nesting. `IOrderedFilter.Order` can override the default scope order, so a custom order should be treated as part of the endpoint's behavior.

# Example

This async action filter rejects selected requests without a correlation header:

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

For one action or controller, `[ServiceFilter(typeof(RequireCorrelationIdFilter))]` applies the registered filter without making it global.

An exception filter can translate an unhandled exception from action execution into an MVC result:

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

Global registration applies it to every MVC action: `builder.Services.AddControllers(opts => opts.Filters.Add<ApiExceptionFilter>());`. Middleware remains the broader choice when errors from routing or non-MVC endpoints need the same response contract.

# Applying Filters: `[ServiceFilter]` Vs `[TypeFilter]` Vs `IFilterFactory`

Attributes cannot receive runtime services through their own constructors, so attachment determines how the real filter instance is created.

- **`[ServiceFilter(typeof(MyFilter))]`** resolves the filter itself from DI, so `MyFilter` must be registered with the intended lifetime.
- **`[TypeFilter(typeof(MyFilter))]`** uses `ActivatorUtilities`. Constructor services come from DI, while `Arguments` can supply literal values. The filter type itself does not need registration.
- **`IFilterFactory`** gives an attribute explicit control over creation of the executable filter and whether the result can be reused.
- A plain filter attribute can carry literal metadata but cannot accept runtime services in its attribute constructor.

`[Authorize]` contributes authorization metadata. Under endpoint routing, which is the default, authorization middleware enforces that metadata before the MVC endpoint runs; the .NET 10 MVC implementation does not convert the attribute into an authorization filter in that mode. Only when endpoint routing is disabled does MVC convert it into a filter that runs at the authorization stage. In both modes, duplicating policy checks in an action filter creates two access-control paths. Within a filter type, the usual nesting is global, controller, then action on the way in and the reverse on the way out. If a filter implements both sync and async forms of the same stage, the runtime invokes only the async interface. The filter's synchronous methods then run only when that async implementation calls them, as the default async methods of `ActionFilterAttribute` do, so custom filter logic belongs in one form per stage.

# Pitfalls

- **Blocking I/O:** `.Result` or synchronous remote calls hold request threads while no CPU work is happening. I/O-bound filters should implement the async interface and await the operation.
- **Authorization in action filters:** a second permission system drifts away from registered policies. Access decisions belong in authentication handlers and authorization policies.
- **Treating exception filters as global error handling:** exception filters cover unhandled exceptions from controller creation, model binding, action filters, and action methods. They do not cover middleware, routing, resource filters, result filters, or MVC result execution. Exception-handling middleware is the safer outer boundary for a uniform API error contract.

# Tradeoffs

| Option | Best for | Weakness |
|---|---|---|
| Middleware | App-wide cross-cutting concerns (logging, auth, exception handling) | No direct MVC action context |
| MVC filters | Concerns tied to controllers/actions and model/action context | Only applies to MVC pipeline |
| Endpoint filters | Minimal API endpoint-scoped behavior | Reach controller actions only through endpoint registration, without MVC filter context |

# Questions

<!-- qard-id: b5d3f2ba-51a2-4fd2-9508-aa0de30ad608 -->

> [!qard]- What is the normal execution order of ASP.NET Core MVC filter types?
> After routing selects an MVC action, the filter stages run in this order: authorization, resource, action, then result. Exception filters are not a sequential stage; they run only when an unhandled exception occurs.
>
> 1. **Authorization filters** run first and can short-circuit an unauthorized request.
> 2. **Resource filters** run their before logic next, ahead of model binding, and their after logic last, once the rest of the pipeline has completed.
> 3. **Action filters** run immediately before and after the action method.
> 4. **Result filters** run immediately before and after the action result executes.
>
> Full flow: authorization → resource (before) → action (before) → action method → action (after) → result (before) → result execution → result (after) → resource (after).
>
> Action filters finish before result filters start, so an action filter's after logic can still replace the result. Only resource filters wrap both the action and the result stages.
>
> [Microsoft: Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)

<!-- qard-id: ec8874e5-0ca6-4d53-a3dd-6594e0a512e3 -->

> [!qard]- Which exceptions can ASP.NET Core MVC exception filters handle, and what happens after they run?
> MVC exception filters handle only unhandled exceptions raised while MVC creates the controller, binds the model, runs action filters or runs the action method. They are not a before-and-after stage; they run only when such an exception occurs.
>
> **Not covered:**
>
> - Exceptions from authorization filters and resource filters, which run outside that part of the pipeline.
> - Exceptions from result filters or from executing the action result.
> - Exceptions from middleware, routing or non-MVC endpoints, which run outside MVC.
>
> **After an exception filter runs:**
>
> - **Handled:** the filter sets `ExceptionHandled` to `true` or assigns a `Result`, and the exception stops propagating. A supplied `Result` is executed as the response. Ordinary result filters do not run around it; only always-run result filters, such as `IAlwaysRunResultFilter` implementations, do.
> - **Not handled:** the exception leaves the MVC pipeline and continues to outer middleware, such as exception-handling middleware.
>
> Because of these gaps, exception-handling middleware is the broader boundary for a uniform API error response.
>
> [Microsoft: Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)

<!-- qard-id: b115f4c1-4ffb-413c-917b-d5fcdb62cb05 -->

> [!qard]- Within one ASP.NET Core MVC filter type, how do scope and the `Order` property determine execution order?
> By default, scope decides the order among filters of one type: global filters wrap controller filters, which wrap action filters. An explicit `Order` value, exposed through `IOrderedFilter`, takes precedence over scope.
>
> - **Equal `Order` values:** before logic runs global → controller → action, and after logic runs action → controller → global.
> - **Different `Order` values:** filters are sorted by `Order` first and by scope second. A lower value runs its before logic earlier and its after logic later, so it wraps filters with higher values regardless of their scope.
>
> For example, an action-level action filter with `Order` 0 runs its before logic ahead of a global action filter with `Order` 1.
>
> This ordering only arranges filters of the same type. It cannot move an action filter ahead of an authorization filter, because each filter type runs at its own stage of the MVC pipeline.
>
> [Microsoft: Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)

# References

- [Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)
