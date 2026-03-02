---
topic:
  - Security
subtopic:
  - Authentication
level:
  - "4"
priority: High
status: Creation

dg-publish: true
---

# Basic Authentication

Basic Authentication is the simplest HTTP authentication scheme. The client sends credentials (username:password) encoded as Base64 in the `Authorization` header on every request. It is defined in RFC 7617.

## Mechanism

1. Client sends: `Authorization: Basic base64(username:password)`
2. Server decodes the Base64 string, splits on `:`, and validates the credentials
3. If valid, the request proceeds; if not, the server returns `401 Unauthorized` with `WWW-Authenticate: Basic realm="My API"`

**Important**: Base64 is encoding, not encryption. The credentials are trivially decodable. Basic Auth MUST be used over HTTPS only — over HTTP, credentials are sent in plaintext.

## ASP.NET Core Example

```csharp
// Middleware to validate Basic Auth credentials
app.Use(async (context, next) =>
{
    var authHeader = context.Request.Headers.Authorization.ToString();
    if (!authHeader.StartsWith("Basic "))
    {
        context.Response.StatusCode = 401;
        context.Response.Headers.WWWAuthenticate = "Basic realm=\"My API\"";
        return;
    }
    var credentials = System.Text.Encoding.UTF8.GetString(
        Convert.FromBase64String(authHeader["Basic ".Length..]));
    var parts = credentials.Split(':', 2);
    if (parts[0] != "admin" || parts[1] != "secret")
    {
        context.Response.StatusCode = 401;
        return;
    }
    await next();
});
```

## When to Use

- Internal APIs between trusted services where simplicity matters more than security sophistication
- Development and testing environments
- Legacy system integration where the client cannot support OAuth/JWT

**Avoid** for user-facing authentication. Use OAuth 2.0 / JWT Bearer for APIs and ASP.NET Core Identity for user login.

## References

- [RFC 7617 — HTTP Basic Authentication](https://datatracker.ietf.org/doc/html/rfc7617) — the authoritative specification for Basic Auth
- [Microsoft — ASP.NET Core Authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/) — overview of ASP.NET Core authentication schemes
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/07 Security/07 Security|07 Security]]
>
> **Pages**
> - [[Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect)|Oauth OIDC (OpenId Connect)]]
> - [[Software Engineering/07 Security/Authentication/Resource-based Auth|Resource-based Auth]]
> - [[Software Engineering/07 Security/Authentication/SSO (Single Sign-On)|SSO (Single Sign-On)]]
> - [[Software Engineering/07 Security/Authentication/Two-Factor Auth|Two-Factor Auth]]
<!-- whats-next:end -->
