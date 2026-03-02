---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/asp-net-web-api/cors/"}
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

## Tradeoffs

- **Wildcard origin vs specific origins**: `AllowAnyOrigin()` is simple for public read APIs serving any client but cannot be combined with `AllowCredentials()`. Specifying origins with `WithOrigins()` is required for credentialed requests and reduces attack surface for sensitive endpoints.
- **Global policy vs endpoint-specific**: a single global policy is easier to maintain but may be too permissive for write endpoints. Per-endpoint CORS via `[EnableCors("PolicyName")]` allows tighter control — a public read API can allow any origin while write endpoints restrict to trusted origins.
- **Preflight caching**: browsers cache preflight responses to avoid redundant OPTIONS requests. Setting `SetPreflightMaxAge(TimeSpan.FromMinutes(10))` in the policy reduces round-trip latency in production. Set it to zero during development to always test current configuration.


## Questions

> [!QUESTION]- Does CORS protect your API from unauthorized access?
> No. CORS is a browser enforcement mechanism — it only affects browser-initiated JavaScript requests. Non-browser clients (curl, Postman, server-to-server calls) ignore CORS headers entirely. CORS prevents malicious websites from making cross-origin requests on behalf of a logged-in user (CSRF-style attacks), but it does not replace authentication or authorization. Always secure your API with proper auth regardless of CORS configuration.

> [!QUESTION]- Why must app.UseCors() come before authentication middleware?
> Preflight OPTIONS requests do not carry authentication credentials. If authentication middleware runs first, it rejects the preflight with 401 before CORS headers are added to the response. The browser then sees a failed preflight and blocks the actual request. Placing UseCors() before UseAuthentication() ensures preflight responses include the correct CORS headers and return 200, allowing the browser to proceed with the actual authenticated request.


## References

- [Enable CORS in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/cors) — official guide covering named policies, default policies, endpoint-specific CORS, and preflight handling.
- [Cross-Origin Resource Sharing (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) — browser-side explanation of CORS: simple requests, preflight, credentials, and the headers involved.
- [CORS security considerations (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/CORS_Security_Cheat_Sheet.html) — OWASP cheat sheet covering common CORS misconfigurations and how to avoid them.
- [Fetch standard CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol) — WHATWG fetch specification defining the exact CORS protocol browsers must follow.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET\|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authentication\|Authentication]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authorization\|Authorization]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Dependency Injection\|Dependency Injection]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Filters\|Filters]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Middlewares\|Middlewares]]
<!-- whats-next:end -->
