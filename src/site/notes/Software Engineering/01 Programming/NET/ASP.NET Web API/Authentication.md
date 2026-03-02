---
{"dg-publish":true,"permalink":"/software-engineering/01-programming/net/asp-net-web-api/authentication/"}
---


# Authentication in ASP.NET Core

Authentication is the process of verifying *who* a caller is. In ASP.NET Core, authentication is handled by the authentication middleware, which runs early in the pipeline, reads credentials from the request, and populates `HttpContext.User` with a `ClaimsPrincipal` if the credentials are valid. Authorization (what the caller can do) runs after authentication — see [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authorization\|Authorization]].

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

## References

- [Authentication in ASP.NET Core (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/) — official overview of the authentication middleware, scheme registration, and `ClaimsPrincipal` population.
- [JWT Bearer authentication (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/jwt-authn) — step-by-step guide to configuring JWT Bearer in ASP.NET Core with token generation and validation.
- [Cookie authentication (Microsoft Learn)](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/cookie) — cookie-based authentication for web applications: sign-in, sign-out, sliding expiration, and claims transformation.
- [[Software Engineering/07 Security/JWT Bearer\|JWT Bearer]] — how JWTs work: structure, signing algorithms, claims, and security considerations.
- [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authorization\|Authorization]] — what happens after authentication: policy-based, role-based, and resource-based authorization in ASP.NET Core.

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/01 Programming/NET/NET\|NET]]
>
> **Pages**
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Authorization\|Authorization]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/CORS\|CORS]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Dependency Injection\|Dependency Injection]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Filters\|Filters]]
> - [[Software Engineering/01 Programming/NET/ASP.NET Web API/Middlewares\|Middlewares]]
<!-- whats-next:end -->
