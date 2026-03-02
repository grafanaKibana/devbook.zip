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

# CORS in ASP.NET Core

Cross-Origin Resource Sharing (CORS) is a browser security mechanism that controls which origins (domain + scheme + port) can make HTTP requests to your API. By default, browsers block cross-origin requests from JavaScript. CORS allows the server to explicitly permit specific origins, methods, and headers via response headers.

CORS is a browser enforcement mechanism — it does not protect your API from non-browser clients (curl, Postman, server-to-server calls). It only affects browser-initiated requests.

## How CORS Works

When a browser makes a cross-origin request, it either sends the request directly (simple requests: GET/POST with standard headers) or first sends a **preflight** OPTIONS request to check if the server allows the actual request.

```text
Browser → OPTIONS /api/orders (preflight)
          Origin: https://myapp.com
          Access-Control-Request-Method: POST

Server  → 200 OK
          Access-Control-Allow-Origin: https://myapp.com
          Access-Control-Allow-Methods: GET, POST
          Access-Control-Allow-Headers: Content-Type, Authorization

Browser → POST /api/orders (actual request)
```

## Configuring CORS in ASP.NET Core

```csharp
// Program.cs — define a named policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("https://myapp.com", "https://staging.myapp.com")
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Content-Type", "Authorization")
              .AllowCredentials());  // required for cookies/auth headers

    // Development: allow any origin (NEVER in production)
    options.AddPolicy("AllowAll", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader());
});

// Apply the policy globally
app.UseCors("AllowFrontend");  // must come before UseAuthentication/UseAuthorization
```

Apply per-endpoint with `[EnableCors]` or disable for specific endpoints with `[DisableCors]`:

```csharp
[EnableCors("AllowFrontend")]
[HttpGet("public")]
public IActionResult PublicEndpoint() => Ok();

[DisableCors]
[HttpGet("internal")]
public IActionResult InternalEndpoint() => Ok();
```

## Pitfalls

### `AllowAnyOrigin()` with `AllowCredentials()`

**What goes wrong**: combining `AllowAnyOrigin()` with `AllowCredentials()` throws a runtime exception in ASP.NET Core.

**Why it happens**: the CORS spec prohibits `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` — it would allow any site to make authenticated requests on behalf of the user.

**Mitigation**: always specify explicit origins when using `AllowCredentials()`. Use `SetIsOriginAllowed(origin => true)` only if you genuinely need dynamic origin validation with credentials (rare).

### CORS Middleware Order

**What goes wrong**: CORS headers are missing from responses, causing browser errors even though CORS is configured.

**Why it happens**: `app.UseCors()` must be called before `app.UseAuthentication()`, `app.UseAuthorization()`, and `app.MapControllers()`. If it's placed after, preflight responses don't include CORS headers.

**Mitigation**: place `app.UseCors()` immediately after `app.UseRouting()` and before any authentication/authorization middleware.

## References

- [Enable CORS in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/cors) — official guide covering named policies, default policies, endpoint-specific CORS, and preflight handling.
- [Cross-Origin Resource Sharing (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) — browser-side explanation of CORS: simple requests, preflight, credentials, and the headers involved.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authentication|Authentication]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authorization|Authorization]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Dependency Injection|Dependency Injection]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Filters|Filters]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Middlewares|Middlewares]]
<!-- whats-next:end -->
