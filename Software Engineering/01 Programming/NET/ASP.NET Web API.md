---
topic:
  - Programming
subtopic:
  - NET
level:
  - "3"
priority:
  - High
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

ASP.NET Web API runs requests through a configurable middleware pipeline, then dispatches to an endpoint (often an MVC controller action).

## Deeper Explanation

## Questions

> [!QUESTION]- What is middleware in ASP.NET Core?
> Middleware is a component in the HTTP request pipeline. It can inspect/modify the request and response, call the next component, or short-circuit the pipeline (for example, return a cached response without calling the next middleware). Order matters.

> [!QUESTION]- Action filter vs middleware: what is the difference?
> Middleware is pipeline-level and can apply to all requests (before routing/MVC, around endpoint execution). Action filters are MVC-level and run only for MVC actions, with access to action context, model binding, and results; they are a better fit for cross-cutting concerns that are specific to controller actions.

> [!QUESTION]- How can you log execution time for all requests?
> Use a middleware that measures elapsed time around `next()` and logs it (or an action filter if you only care about MVC actions).
>
> ```csharp
> app.Use(async (ctx, next) =>
> {
>     var sw = System.Diagnostics.Stopwatch.StartNew();
>     try
>     {
>         await next();
>     }
>     finally
>     {
>         sw.Stop();
>         app.Logger.LogInformation("{Method} {Path} -> {StatusCode} in {ElapsedMs} ms",
>             ctx.Request.Method,
>             ctx.Request.Path,
>             ctx.Response.StatusCode,
>             sw.ElapsedMilliseconds);
>     }
> });
> ```

> [!QUESTION]- How can you centrally catch errors for all requests?
> Add a global exception-handling middleware. In ASP.NET Core this is commonly done with `app.UseExceptionHandler(...)` (and `app.UseDeveloperExceptionPage()` in development). The handler can log the exception and return a consistent error response (for example, RFC 7807 Problem Details).

> [!QUESTION]- What is the ASP.NET request processing pipeline?
> A request is received by the host (for example, Kestrel) and then flows through an ordered chain of middleware. Middleware can add features (routing, authN/authZ, CORS, compression, etc.), select an endpoint, and finally execute the endpoint (MVC action, Minimal API handler, etc.). On the way back out, the middleware chain unwinds, allowing post-processing of the response.

> [!QUESTION]- What is an action filter?
> An MVC filter (for example, implementing `IActionFilter`/`IAsyncActionFilter`) that runs before and/or after a controller action executes. It can validate inputs, modify the action arguments, short-circuit by setting a result, or wrap execution to implement cross-cutting concerns such as logging, caching, and metrics.

> [!QUESTION]- What is mapping, why is it needed, and how can it be implemented?
> Mapping is the transformation of data from one shape/type to another (for example, Domain Entity -> DTO -> API response model).
> It is used to decouple layers, hide internal details, enforce API contracts, prevent over-posting, and shape data for clients.
> Typical implementation options:
> - manual mapping (constructors, factory methods, extension methods)
> - mapping libraries (AutoMapper, Mapster)
> - code generation / source generators for mappings

> [!QUESTION]- What are serialization and deserialization?
> Serialization converts an in-memory object graph into a format that can be stored or transmitted (for example, JSON text or a binary payload).
> Deserialization is the reverse process: converting that stored/transmitted representation back into objects.
> Common uses: API payloads, persistence, caching, messaging.

> [!QUESTION]- What is JSON and why is it used?
> JSON (JavaScript Object Notation) is a lightweight text data format based on objects (name/value pairs) and arrays.
> It is widely used for data interchange, especially in HTTP APIs, because it is human-readable, language-agnostic, and easy to parse.
> In .NET, JSON is commonly handled with `System.Text.Json` (built-in) or Newtonsoft.Json.

## Further Reading

- [Middleware in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware/)
- [Handle errors in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling)
- [Filters in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/mvc/controllers/filters)
