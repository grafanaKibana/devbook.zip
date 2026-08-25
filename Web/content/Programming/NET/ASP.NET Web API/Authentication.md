---
publish: true
title: ASP.NET Core Authentication
created: 2026-08-20T20:41:15.644Z
modified: 2026-08-25T10:26:27.399Z
published: 2026-08-25T10:26:27.399Z
topic:
  - Programming
subtopic:
  - NET
summary: Verifying who a caller is and populating HttpContext.User with a ClaimsPrincipal.
level:
  - "1"
priority: Medium
status: Ready to Repeat
---

Authentication turns request credentials into an identity. In ASP.NET Core, a registered authentication handler validates the credential for its scheme and, on success, supplies the `ClaimsPrincipal` exposed through `HttpContext.User`. Authorization evaluates that principal later in the pipeline. [[Authorization]] covers that separate decision.

Several schemes can coexist in one application. Bearer tokens suit APIs called by mobile apps, SPAs, or other services. Cookies remain the natural fit for browser applications, while API-key authentication is usually implemented as a custom handler or gateway concern.

# JWT Bearer Authentication

A bearer token arrives in the `Authorization: Bearer <token>` header. With a JWT, the handler can validate the signature, issuer, audience, and lifetime from configured key material without looking up an application session. That local validation is useful, but it also means an issued token normally remains valid until expiry unless the system adds revocation state.

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

A local issuer can generate a token after validating the caller's credentials:

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

# Cookie Authentication

Cookie authentication protects a serialized authentication ticket and stores it in a cookie. The browser then returns the cookie automatically on matching requests, which works well for Razor Pages and MVC applications.

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

# Multiple Schemes

An application serving browser sessions and machine callers can register both cookie and bearer schemes. The selected endpoint can name the required scheme when the default is ambiguous.

```csharp
builder.Services.AddAuthentication()
    .AddJwtBearer("Bearer", options => { /* ... */ })
    .AddCookie("Cookie", options => { /* ... */ });

// On a specific endpoint, specify which scheme to use
[Authorize(AuthenticationSchemes = "Bearer")]
public IActionResult ApiEndpoint() => Ok();
```

# Claims, Events, and External Providers

- **`IClaimsTransformation`** enriches an authenticated principal, often with roles or permissions loaded from an application store. `TransformAsync(ClaimsPrincipal)` can run more than once, so the transformation must be idempotent.
- **`JwtBearerEvents`** exposes focused hooks. `OnTokenValidated` can run extra checks, `OnAuthenticationFailed` can record a safe diagnostic, and `OnMessageReceived` can obtain a token from a non-standard location such as a SignalR query string.
- **External identity providers** should own token issuance and key rotation. `AddOpenIdConnect` integrates OIDC sign-in flows, while `Microsoft.Identity.Web` provides Microsoft Entra ID integration. Discovery metadata and JWKS rotation make this safer than copying an external provider's keys into hand-written `TokenValidationParameters`.

> [!WARNING]
> **Claim-type mapping can change lookup names.** Inbound mapping may translate short JWT names such as `sub` into .NET claim-type URIs, so code looking only for `"sub"` can miss the value. Set `options.MapInboundClaims = false` when the application contract uses the original JWT names, and test claim lookup against the configured handler.

# Pitfalls

## Symmetric Key Too Short or Hardcoded

**Failure:** a short signing key is easier to brute-force, while a hardcoded key can leak through source control or build artifacts.

Development placeholders often survive into deployment configuration.

Use key material appropriate for the selected algorithm and keep it in a secret store or protected environment configuration. Rotation also needs an overlap period so tokens signed by the previous key can finish their intended lifetime.

## Missing `UseAuthentication()` Before `UseAuthorization()`

**Failure:** authorization sees an anonymous principal because no authentication handler populated `HttpContext.User` first.

Middleware order is executable behavior. `UseAuthorization()` cannot evaluate the intended identity when authentication has not run.

Place `app.UseAuthentication()` before `app.UseAuthorization()` in `Program.cs`. Endpoint mapping follows both in the conventional pipeline.

## Not Validating Token Expiry

**Failure:** a token remains usable after its intended expiry because lifetime validation was disabled.

Temporary development configuration can escape into a deployed environment.

Keep lifetime validation enabled. Short access-token lifetimes bound exposure. A refresh-token flow can preserve a longer session while keeping revocation state on the server.

# Tradeoffs

- **Bearer token or cookie:** bearer tokens travel explicitly and fit non-browser clients. Cookies integrate naturally with browser navigation, but automatic transmission creates a CSRF boundary that the application must handle. Either format can carry a protected ticket. The real state tradeoff depends on revocation and session storage, not the transport name alone.
- **JWT or API key:** a JWT can carry a subject and claims with a bounded lifetime. An API key usually identifies an application or integration and needs its own storage, rotation, and revocation design. Machine callers can use either, depending on whether delegated identity and claims are required.
- **Local validation or central session state:** local JWT validation removes a per-request session lookup. Central state makes immediate revocation easier. Short-lived access tokens plus server-held refresh tokens split the difference at the cost of a more involved renewal flow.

# Questions

> [!QUESTION]- What does `ValidateIssuerSigningKey = true` control during JWT validation?
> For a signed token, the handler uses a resolved key to verify the signature. This flag tells the default validation path to also validate that signing key itself. It does not enable issuer, audience, lifetime, or algorithm validation, and a custom `IssuerSigningKeyValidator` runs regardless of the flag. The rest of the JWT validation settings still have to form one coherent trust configuration.

# References

- [Authentication in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/)
