---
topic:
  - Programming
subtopic:
  - NET
summary: "Browser protocol controlling whether cross-origin JavaScript may access an API response."
level:
  - "1"
priority: Medium
status: Ready to Repeat
publish: true
---

Cross-Origin Resource Sharing (CORS) is the browser protocol for deciding whether JavaScript from one origin may read a response from another. An origin is the tuple of scheme, host, and port. The server publishes its decision through `Access-Control-*` response headers. The browser enforces it.

This is not an API authorization boundary. `curl`, Postman, compromised backends, and other non-browser clients can send the same HTTP request without applying CORS rules.

# How CORS Works

For a CORS-safelisted request, the browser sends the request immediately and decides whether to expose the response to JavaScript. Other requests first trigger an `OPTIONS` preflight describing the intended method and headers. Only an acceptable preflight response allows the actual request to follow.

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

# Configuring CORS in ASP.NET Core

A named policy keeps allowed origins and request features together. The policy should list the narrowest origins, methods, and headers that the browser client actually needs.

```csharp
// Program.cs — define a named policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("https://myapp.com", "https://staging.myapp.com")
              .WithMethods("GET", "POST", "PUT", "DELETE")
              .WithHeaders("Content-Type", "Authorization")
              .AllowCredentials());  // required for cookies or other browser-managed credentials

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

# Exposed Headers, Simple Vs Preflighted, and Caching

- **Custom response headers need exposure.** Browser JavaScript can read CORS-safelisted response headers by default. A header such as `X-Total-Count` needs `policy.WithExposedHeaders("X-Total-Count")`. Seeing it in DevTools does not mean `response.headers.get()` may access it.
- **Safelisted requests skip preflight.** The method must be `GET`, `HEAD`, or `POST`. Headers must be safelisted, and `Content-Type`, when present, is limited to the three safelisted media types. `PUT`, `Authorization`, or `application/json` normally triggers `OPTIONS` first.
- **Preflight caching changes rollout speed.** `SetPreflightMaxAge` lets the browser reuse a successful preflight. Responses that vary by request origin need the corresponding cache behavior, and shared caches must not mix authorized responses across origins.

`AllowCredentials()` is needed when the cross-origin request includes credentials such as cookies or TLS client certificates. Merely allowing an `Authorization` request header is controlled by the allowed-header policy and does not, by itself, require credential mode.

> [!IMPORTANT]
> CORS constrains browser JavaScript. It does not grant or deny server-side access. Authentication and authorization still enforce the API's actual security policy.

# Pitfalls

## `AllowAnyOrigin()` With `AllowCredentials()`

ASP.NET Core rejects a policy that combines `AllowAnyOrigin()` with `AllowCredentials()`.

The CORS protocol forbids wildcard origin with credential support because a credentialed response must name the permitted origin explicitly.

Credentialed policies should list trusted origins or validate them against a controlled rule. A predicate that accepts every origin recreates the dangerous wildcard in a less obvious form.

## CORS Middleware Order

The browser reports a CORS failure when the response or preflight lacks the expected headers, even if a policy was registered in DI.

Registration alone does not run the middleware. In an explicit middleware pipeline, CORS belongs after routing and before authorization so it can use endpoint metadata and handle preflights before access control short-circuits them.

Place `app.UseCors()` between routing and authorization, then verify both the preflight and actual response. Authentication normally does not reject a request by itself, but authorization can challenge an unauthenticated preflight if ordering is wrong.

# Tradeoffs

- **Wildcard or named origins:** wildcard origin is reasonable for a genuinely public, non-credentialed response. Credentialed browser access requires explicit origin handling.
- **One policy or endpoint metadata:** a global policy is easier to reason about when every endpoint serves the same browser clients. Different exposure rules justify named endpoint policies, but mixing middleware and attributes carelessly can make the effective rule hard to see.
- **Cached or fresh preflights:** a longer preflight lifetime removes network round trips. It also delays browser uptake of a tightened policy, so the value should match how quickly CORS changes must take effect.

# References

- [Enable CORS in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/cors)
- [Fetch Standard: CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol)
