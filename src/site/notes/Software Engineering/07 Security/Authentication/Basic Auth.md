---
{"dg-publish":true,"permalink":"/software-engineering/07-security/authentication/basic-auth/"}
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

## Pitfalls

### Credentials on Every Request

**What goes wrong**: Basic Auth sends credentials with every HTTP request. If any request is intercepted (misconfigured proxy, logging middleware that logs headers), credentials are exposed.

**Mitigation**: always use HTTPS. Never log the `Authorization` header. Rotate service account credentials regularly.

### No Token Revocation

**What goes wrong**: Basic Auth has no concept of token expiry or revocation. If credentials are compromised, the only remediation is changing the password, which requires updating all clients.

**Mitigation**: for user-facing authentication, use OAuth 2.0 / JWT Bearer with short-lived tokens and refresh token rotation. For service-to-service, use client credentials flow or API keys with rotation support.

## Tradeoffs

| Scheme | Complexity | Revocation | User-facing | Use when |
|---|---|---|---|---|
| Basic Auth | Minimal | Password change only | No | Internal M2M over HTTPS, legacy integration |
| API Key | Low | Key rotation | No | Public APIs, third-party integrations |
| JWT Bearer | Medium | Token expiry + refresh | Yes | User-facing APIs, stateless auth |
| OAuth 2.0 | High | Token revocation, refresh | Yes | Delegated access, third-party clients |

**Decision rule**: use Basic Auth only for internal service-to-service calls over HTTPS where simplicity is the priority. For user-facing authentication or any external-facing API, use JWT Bearer or OAuth 2.0.


## Questions

> [!QUESTION]- Why is Basic Auth unsafe over HTTP?
> Base64 is encoding, not encryption — it is trivially reversible. Over HTTP, the `Authorization` header is sent in plaintext and visible to any network observer. Over HTTPS, the header is encrypted by TLS, making Basic Auth safe to use.

> [!QUESTION]- When is Basic Auth acceptable in production?
> For machine-to-machine calls between trusted services on an internal network over HTTPS, Basic Auth is acceptable when simplicity matters and the credential is a service account (not a user password). For user-facing authentication, use OAuth 2.0 / JWT Bearer — Basic Auth requires sending credentials on every request, which increases exposure.


## References

- [RFC 7617 — HTTP Basic Authentication](https://datatracker.ietf.org/doc/html/rfc7617) — the authoritative specification for Basic Auth
- [Microsoft — ASP.NET Core Authentication](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/) — overview of ASP.NET Core authentication schemes
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/07 Security/07 Security\|07 Security]]
>
> **Pages**
> - [[Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect)\|Oauth OIDC (OpenId Connect)]]
> - [[Software Engineering/07 Security/Authentication/Resource-based Auth\|Resource-based Auth]]
> - [[Software Engineering/07 Security/Authentication/SSO (Single Sign-On)\|SSO (Single Sign-On)]]
> - [[Software Engineering/07 Security/Authentication/Two-Factor Auth\|Two-Factor Auth]]
<!-- whats-next:end -->
