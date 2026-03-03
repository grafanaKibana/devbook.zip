---
topic:
  - Security
subtopic:
  - Authentication
level:
  - "3"
priority: High
status: Creation

dg-publish: true
---

# OAuth 2.0 and OpenID Connect

OAuth 2.0 is an authorization framework that lets users grant third-party applications limited access to their resources without sharing credentials. OpenID Connect (OIDC) is an identity layer on top of OAuth 2.0 that adds authentication — it tells you who the user is, not just what they can access. Most modern web applications use the Authorization Code flow with PKCE: a user clicking "Sign in with Microsoft" on a SaaS dashboard triggers a redirect to Microsoft Entra ID, which returns an authorization code exchanged for an access token (API calls) and an ID token (user identity) — all without the application ever seeing the user's password.

## OAuth 2.0 Flows

**Authorization Code Flow** (with PKCE): The standard flow for web apps and SPAs. The client redirects the user to the authorization server, receives an authorization code, exchanges it for tokens. PKCE (Proof Key for Code Exchange) prevents code interception attacks.

```text
1. Client redirects user to: /authorize?response_type=code&client_id=...&code_challenge=...&scope=openid profile
2. User authenticates and consents
3. Auth server redirects back with: /callback?code=abc123
4. Client exchanges code for tokens: POST /token {code, code_verifier, client_id, client_secret}
5. Auth server returns: {access_token, id_token, refresh_token}
```

**Client Credentials Flow**: Machine-to-machine authentication. No user involved. The client authenticates with its own credentials to get an access token.

```csharp
// ASP.NET Core: get a token using client credentials
var client = new HttpClient();
var response = await client.PostAsync("https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
    new FormUrlEncodedContent(new Dictionary<string, string>
    {
        ["grant_type"] = "client_credentials",
        ["client_id"] = "my-client-id",
        ["client_secret"] = "my-secret",
        ["scope"] = "https://my-api/.default"
    }));
```

## OIDC: Authentication Layer

OIDC adds an **ID token** (a JWT) to the OAuth 2.0 response. The ID token contains claims about the authenticated user: `sub` (user ID), `email`, `name`, `iat`, `exp`.

The difference: OAuth 2.0 gives you an access token to call APIs. OIDC gives you an ID token that tells you who the user is.

## ASP.NET Core Integration

```csharp
// Program.cs: add OIDC authentication (e.g., with Microsoft Entra ID)
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie()
.AddOpenIdConnect(options =>
{
    options.Authority = "https://login.microsoftonline.com/{tenantId}/v2.0";
    options.ClientId = "my-client-id";
    options.ClientSecret = "my-secret";
    options.ResponseType = "code";
    options.Scope.Add("openid");
    options.Scope.Add("profile");
    options.Scope.Add("email");
    options.UsePkce = true;
});
```

## Pitfalls

**Missing PKCE**: Without PKCE, authorization codes can be intercepted and exchanged by an attacker. A mobile app that used the Authorization Code flow without PKCE was vulnerable to a redirect URI interception attack — a malicious app registered the same custom URI scheme, intercepted the authorization code from the redirect, and exchanged it for tokens, gaining full access to 1,200 user accounts before the issue was detected. Always use PKCE for public clients (SPAs, mobile apps).

**Token leakage in logs**: Access tokens and ID tokens in URL fragments or query parameters get logged by web servers and proxies. Always use the Authorization Code flow (tokens in the response body), never the Implicit flow (tokens in URL fragments).

**Long-lived access tokens**: Access tokens should expire in 15-60 minutes. Use refresh tokens for long-lived sessions. Rotate refresh tokens on use.

## Tradeoffs vs SAML

| | OAuth 2.0 / OIDC | SAML 2.0 |
|---|---|---|
| Token format | JWT (JSON) | XML assertions |
| Mobile/SPA support | Excellent | Poor |
| Enterprise SSO | Good | Excellent (legacy) |
| Complexity | Medium | High |

**Use OIDC** for new applications. **Use SAML** only when integrating with legacy enterprise identity providers that do not support OIDC.

## Questions

> [!QUESTION]- What is the difference between OAuth 2.0 and OpenID Connect?
> - OAuth 2.0 is an authorization framework: it grants access to resources (what you can do).
> - OIDC is an authentication layer on top of OAuth 2.0: it proves who the user is.
> - OAuth 2.0 issues access tokens; OIDC additionally issues ID tokens (JWTs with user claims).
> - Tradeoff: OIDC adds the ID token and UserInfo endpoint; OAuth 2.0 alone cannot tell you who the user is.

## References

- [RFC 6749 — OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749) — the authoritative OAuth 2.0 specification
- [OpenID Connect spec](https://openid.net/specs/openid-connect-core-1_0.html) — OIDC layer on top of OAuth 2.0; defines ID tokens and UserInfo endpoint
- [Microsoft Identity Platform docs](https://learn.microsoft.com/en-us/entra/identity-platform/) — ASP.NET Core integration guide for Microsoft Entra ID (Azure AD)
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636) — Proof Key for Code Exchange; required for public clients
<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/07 Security/07 Security|07 Security]]
>
> **Pages**
> - [[Software Engineering/07 Security/Authentication/Basic Auth|Basic Auth]]
> - [[Software Engineering/07 Security/Authentication/Resource-based Auth|Resource-based Auth]]
> - [[Software Engineering/07 Security/Authentication/SSO (Single Sign-On)|SSO (Single Sign-On)]]
> - [[Software Engineering/07 Security/Authentication/Two-Factor Auth|Two-Factor Auth]]
<!-- whats-next:end -->
