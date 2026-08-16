---
topic:
  - Programming
subtopic:
  - NET
summary: "Logic running around controller action stages for cross-cutting MVC concerns."
level:
  - "2"
priority: Medium
status: Ready to Repeat
publish: true
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

`[Authorize]` contributes authorization metadata that MVC handles at its authorization stage, so duplicating policy checks in an action filter creates two access-control paths. Within a filter type, the usual nesting is global, controller, then action on the way in and the reverse on the way out. If a filter implements both sync and async forms of the same stage, the runtime invokes only the async interface. Implement one form.

# Pitfalls

- **Blocking I/O:** `.Result` or synchronous remote calls hold request threads while no CPU work is happening. I/O-bound filters should implement the async interface and await the operation.
- **Authorization in action filters:** a second permission system drifts away from registered policies. Use authentication handlers and authorization policies for access decisions.
- **Treating exception filters as global error handling:** exception filters cover unhandled exceptions from controller creation, model binding, action filters, and action methods. They do not cover middleware, routing, resource filters, result filters, or MVC result execution. Exception-handling middleware is the safer outer boundary for a uniform API error contract.

# Tradeoffs

| Option | Best for | Weakness |
|---|---|---|
| Middleware | App-wide cross-cutting concerns (logging, auth, exception handling) | No direct MVC action context |
| MVC filters | Concerns tied to controllers/actions and model/action context | Only applies to MVC pipeline |
| Endpoint filters | Minimal API endpoint-scoped behavior | Not used by MVC controllers |

# Questions

> [!QUESTION]- What is the execution order of ASP.NET Core filter types?
> The type order is authorization, resource, action, exception, then result, with wrapping stages unwinding in reverse after the inner stage completes. Scope normally nests global, controller, then action. `IOrderedFilter.Order` takes precedence over scope when explicitly set.

# References

- [Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters?view=aspnetcore-10.0)
