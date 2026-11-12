---
publish: true
created: 2026-02-19T23:08:30.000Z
modified: 2026-11-12T10:29:34.513Z
published: 2026-07-08T13:14:17.319Z
topic:
  - Programming
subtopic:
  - NET
summary: Filters around ASP.NET Core Web API controller actions and endpoint-handler invocations.
level:
  - "2"
priority: Medium
status: In Progress
qard-deck: Programming
qard-topic: NET/ASP NET Web API/Filters
flashcard_uid: ef27222b
---

Controller filters in ASP.NET Core Web APIs wrap defined stages of controller execution. They fit cross-cutting behavior that needs action arguments, model state, controller metadata, or the action result. A correlation-ID rule tied only to selected controllers is one example. An application-wide correlation ID usually belongs in middleware.

The filter APIs live in `Microsoft.AspNetCore.Mvc`, but they also apply to [Web API controllers derived from `ControllerBase`](https://learn.microsoft.com/en-us/aspnet/core/web-api/?view=aspnetcore-10.0); rendering views is not required. Minimal API handlers use endpoint filters, which have a different invocation context. Endpoint filters can also be [explicitly attached to mapped controller actions](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/min-api-filters?view=aspnetcore-10.0#register-a-filter-on-controller-actions).

The boundary matters. Middleware can cover every request type but lacks controller action context. Endpoint code has full local context but duplicates a rule when many actions need it. Filters occupy the space between those two.

Controller filters run after routing has selected a controller action.

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

An exception filter can translate an unhandled exception from action execution into an API error result:

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

Global registration applies it to every controller action: `builder.Services.AddControllers(opts => opts.Filters.Add<ApiExceptionFilter>());`. Middleware remains the broader choice when errors from routing or Minimal API handlers need the same response contract.

# Applying Filters: `[ServiceFilter]` Vs `[TypeFilter]` Vs `IFilterFactory`

Attributes cannot receive runtime services through their own constructors, so attachment determines how the real filter instance is created.

- **`[ServiceFilter(typeof(MyFilter))]`** resolves the filter itself from DI, so `MyFilter` must be registered with the intended lifetime.
- **`[TypeFilter(typeof(MyFilter))]`** uses `ActivatorUtilities`. Constructor services come from DI, while `Arguments` can supply literal values. The filter type itself does not need registration.
- **`IFilterFactory`** gives an attribute explicit control over creation of the executable filter and whether the result can be reused.
- A plain filter attribute can carry literal metadata but cannot accept runtime services in its attribute constructor.

`[Authorize]` contributes authorization metadata. Under default endpoint routing, authorization middleware enforces that metadata before the controller endpoint runs. Duplicating policy checks in an action filter creates two access-control paths. Within a filter type, the usual nesting is global, controller, then action on the way in and the reverse on the way out. If a filter implements both sync and async forms of the same stage, the runtime invokes only the async interface. The filter's synchronous methods then run only when that async implementation calls them, as the default async methods of `ActionFilterAttribute` do, so custom filter logic belongs in one form per stage.

# Pitfalls

- **Blocking I/O:** `.Result` or synchronous remote calls hold request threads while no CPU work is happening. I/O-bound filters should implement the async interface and await the operation.
- **Authorization in action filters:** a second permission system drifts away from registered policies. Access decisions belong in authentication handlers and authorization policies.
- **Treating exception filters as global error handling:** exception filters cover unhandled exceptions from controller creation, model binding, action filters, and action methods. They do not cover middleware, routing, resource filters, result filters, or action-result execution. Exception-handling middleware is the safer outer boundary for a uniform API error contract.

# Tradeoffs

| Option | Best for | Weakness |
|---|---|---|
| Middleware | App-wide cross-cutting concerns (logging, auth, exception handling) | No direct controller action context |
| Controller filters | Concerns tied to Web API controllers/actions and model/action context | Their stages do not apply to Minimal API handlers |
| Endpoint filters | Minimal API handler behavior, or explicit attachment to mapped controller actions | Invocation context differs from controller model-state and action-result context |

# Questions

<!-- qard-id: b5d3f2ba-51a2-4fd2-9508-aa0de30ad608 -->

> [!qard]- In an ASP.NET Core controller-based Web API, what is the normal order of filter stages?
> After routing selects a controller action, the filter stages run in this order: authorization, resource, action, then result. Exception filters are not a sequential stage; they run only when an unhandled exception occurs.
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
> These are controller-filter stages. Minimal API handlers use endpoint filters rather than this staged controller pipeline.
>
> [Microsoft: Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)

<!-- qard-id: ec8874e5-0ca6-4d53-a3dd-6594e0a512e3 -->

> [!qard]- Which part of the controller pipeline do ASP.NET Core exception filters cover?
> Only the core that runs the action: controller creation, model binding, action filters and the action method. Exception filters run only when that core throws an unhandled exception.
>
> Everything else is outside them: authorization filters run earlier, resource filters wrap the core on both sides, result filters and result execution run later, and middleware, routing and Minimal API handlers sit outside the controller-filter pipeline. A uniform API error contract therefore belongs in exception-handling middleware.
>
> [Microsoft: Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)

# References

- [Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)
