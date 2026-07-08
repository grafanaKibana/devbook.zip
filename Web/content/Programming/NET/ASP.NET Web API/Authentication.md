---
publish: true
created: 2026-07-08T16:14:17.317+03:00
modified: 2026-07-08T16:14:17.317+03:00
published: 2026-07-08T16:14:17.317+03:00
topic:
  - Programming
subtopic:
  - NET
level:
  - "1"
priority: Medium
status: Ready to Repeat
---

# Authentication in ASP.NET Core

Authentication is the process of verifying _who_ a caller is. In ASP.NET Core, authentication is handled by the authentication middleware, which runs early in the pipeline, reads credentials from the request, and populates `HttpContext.User` with a `ClaimsPrincipal` if the credentials are valid. Authorization (what the caller can do) runs after authentication — see [[Authorization]].

ASP.NET Core supports multiple authentication schemes simultaneously. The most common for APIs are **JWT Bearer** tokens and **API Keys**. Cookie authentication is standard for web applications.

## JWT Bearer Authentication

JWT (JSON Web Token) is the standard for stateless API authentication. The client sends a signed token in the `Authorization: Bearer <token>` header. The server validates the signature and expiry without a database lookup.

```csharp
// Program.cs — register JWT Bearer authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

// Add middleware to the pipeline (order matters)
app.UseAuthentication();  // must come before UseAuthorization
app.UseAuthorization();
```

Generating a token (e.g., in a login endpoint):

```csharp
public string GenerateToken(string userId, string email)
{
    var claims = new[]
    {
        new Claim(ClaimTypes.NameIdentifier, userId),
        new Claim(ClaimTypes.Email, email),
        new Claim(ClaimTypes.Role, "User")
    };

    var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var token = new JwtSecurityToken(
        issuer:   _config["Jwt:Issuer"],
        audience: _config["Jwt:Audience"],
        claims:   claims,
        expires:  DateTime.UtcNow.AddHours(1),
        signingCredentials: creds);

    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

## Cookie Authentication

For web applications (Razor Pages, MVC), cookie authentication stores the identity in an encrypted cookie:

```csharp
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath  = "/account/login";
        options.LogoutPath = "/account/logout";
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
    });

// Sign in after validating credentials
await HttpContext.SignInAsync(
    CookieAuthenticationDefaults.AuthenticationScheme,
    new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)));
```

## Multiple Schemes

APIs that serve both browser clients and machine-to-machine callers can register multiple schemes:

```csharp
builder.Services.AddAuthentication()
    .AddJwtBearer("Bearer", options => { /* ... */ })
    .AddCookie("Cookie", options => { /* ... */ });

// On a specific endpoint, specify which scheme to use
[Authorize(AuthenticationSchemes = "Bearer")]
public IActionResult ApiEndpoint() => Ok();
```

## Claims, Events, and External Providers

- **`IClaimsTransformation`** runs after a principal is authenticated and lets you add claims (e.g. look up roles/permissions from a store) without touching the token: implement `TransformAsync(ClaimsPrincipal)` and register it. (It can run more than once per request, so make it idempotent.)
- **`JwtBearerEvents`** hooks let you customize the flow: `OnTokenValidated` (post-validation enrichment/extra checks), `OnAuthenticationFailed` (logging), `OnMessageReceived` (pull the token from a non-standard place, e.g. a SignalR query string).
- **External / enterprise identity** — beyond hand-rolled JWT and cookies, use `AddOpenIdConnect` for OIDC providers (Auth0, Okta, social logins) and **`Microsoft.Identity.Web`** for Microsoft Entra ID. These handle discovery, key rotation (JWKS), and token validation for you — prefer them over manually configuring `TokenValidationParameters` against an external IdP.

> [!WARNING]
> **Claim-type mapping gotcha.** The legacy `JwtSecurityTokenHandler` silently rewrites short JWT claim names (`sub`, `email`) into long XML URIs (`http://schemas.xmlsoap.org/...nameidentifier`), so `User.FindFirst("sub")` returns `null`. Set `options.MapInboundClaims = false` to keep the original names, or use the modern `JsonWebTokenHandler` (default in newer stacks) which doesn't remap.

## Pitfalls

### Symmetric Key Too Short or Hardcoded

**What goes wrong**: a short or hardcoded JWT signing key is brute-forced or leaked via source control.

**Why it happens**: developers use simple keys in development and forget to change them for production.

**Mitigation**: use a minimum 256-bit (32-byte) key. Store it in Azure Key Vault, AWS Secrets Manager, or environment variables — never in `appsettings.json` committed to source control. Rotate keys periodically.

### Missing `UseAuthentication()` Before `UseAuthorization()`

**What goes wrong**: `[Authorize]` attributes are ignored — all requests are treated as anonymous.

**Why it happens**: middleware order in ASP.NET Core is significant. `UseAuthorization()` without `UseAuthentication()` before it means `HttpContext.User` is never populated.

**Mitigation**: always add `app.UseAuthentication()` immediately before `app.UseAuthorization()` in `Program.cs`.

### Not Validating Token Expiry

**What goes wrong**: expired tokens are accepted because `ValidateLifetime = false`.

**Why it happens**: developers disable expiry validation during development and forget to re-enable it.

**Mitigation**: always set `ValidateLifetime = true` in production. Use short-lived access tokens (15–60 minutes) with refresh tokens for long-lived sessions.

## Tradeoffs

- **JWT Bearer vs Cookie auth**: JWT is stateless — the server stores nothing per session, making it ideal for horizontally scaled APIs and mobile/SPA clients. Cookie auth is simpler for browser-based web apps (browsers handle transmission automatically) and easier to revoke. Downside of JWT: tokens cannot be revoked before expiry without a server-side blacklist or short-lived access tokens with refresh token rotation.
- **JWT vs API keys**: API keys are simpler (no signing algorithm, no expiry rotation) and appropriate for server-to-server authentication where the caller is not an end user. JWT carries identity claims and integrates with ASP.NET Core's claims pipeline. Use API keys for machine clients; JWT for user-facing authentication.
- **Stateless vs stateful sessions**: stateless (JWT) scales without shared session storage but requires refresh token infrastructure. Stateful (session/cookie) is easier to revoke and simpler to implement, but requires sticky sessions or a distributed session store (Redis) in multi-instance deployments.

## Questions

> [!QUESTION]- Why can't you revoke a JWT before its expiry?
> JWTs are self-contained and the server stores no record of issued tokens. Revocation requires a server-side blacklist (typically Redis) or very short expiry (15–60 min) combined with long-lived refresh tokens stored server-side and revocable on logout.

> [!QUESTION]- When would you choose cookie authentication over JWT Bearer in an ASP.NET Core API?
> For browser-based web applications (Razor Pages/MVC) where the browser manages cookie transmission automatically, where session revocation (logout everywhere) is a hard requirement, and where CSRF risk is manageable via ASP.NET Core's built-in anti-forgery tokens.

> [!QUESTION]- What does `ValidateIssuerSigningKey = true` actually enforce?
> It forces the JWT middleware to verify the token's signature against your known signing key. Without it, a token signed by a different (attacker-controlled) key could be accepted — breaking the entire authentication model.

## References

- [Authentication in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/) — official overview of the authentication middleware, scheme registration, and `ClaimsPrincipal` population.
- [JWT Bearer authentication (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/jwt-authn) — step-by-step guide to configuring JWT Bearer in ASP.NET Core with token generation and validation.
- [Cookie authentication (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie) — cookie-based authentication for web applications: sign-in, sign-out, sliding expiration, and claims transformation.
- [[JWT Bearer]] — how JWTs work: structure, signing algorithms, claims, and security considerations.
- [[Authorization]] — what happens after authentication: policy-based, role-based, and resource-based authorization in ASP.NET Core.
