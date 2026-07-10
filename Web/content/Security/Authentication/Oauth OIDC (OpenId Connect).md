---
publish: true
created: 2026-07-08T15:01:12.672Z
modified: 2026-07-08T15:01:12.673Z
published: 2026-07-08T15:01:12.673Z
topic:
  - Security
subtopic:
  - Authentication
level:
  - "3"
priority: High
status: Ready to Repeat
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

## The Four Roles

OAuth's vocabulary trips people up; four roles do all the work:

- **Resource Owner** — the user who owns the data.
- **Client** — the app requesting access on the user's behalf.
- **Authorization Server** — issues tokens after authenticating the user (Entra ID, Auth0, Google).
- **Resource Server** — the API that holds the protected data and accepts access tokens.

And three tokens: an **access token** (a bearer credential to call the resource server — treat it like a password), an **ID token** (OIDC only — proves _who_ the user is, for the client to consume), and a **refresh token** (long-lived, used to get new access tokens without re-prompting).

## Choosing a Flow

| Client type | Flow | Why |
|---|---|---|
| Web app, SPA, mobile | **Authorization Code + PKCE** | The default for anything with a user; PKCE is now required even for confidential clients |
| Service-to-service (no user) | **Client Credentials** | App authenticates as itself |
| TV / CLI / input-constrained device | **Device Authorization (Device Code)** | User authorizes on a second device via a short code |
| ~~SPA without a backend~~ | ~~Implicit~~ — **deprecated** | Leaked tokens in URL fragments; use Auth Code + PKCE instead |
| ~~First-party password~~ | ~~Resource Owner Password (ROPC)~~ — **deprecated** | Defeats the point (app handles the password); avoid |

The takeaway: **Authorization Code + PKCE for users, Client Credentials for machines** covers nearly everything; Device Code for constrained devices; never Implicit or ROPC in new systems. **Scopes** (`profile`, `mail.read`) bound what an access token may do; the **consent** screen is where the user grants them.

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

> [!QUESTION]- What's the difference between OAuth 2.0 and OpenID Connect?
> OAuth 2.0 is an **authorization** framework — it issues _access tokens_ that let an app call an API on the user's behalf, but it says nothing standard about _who_ the user is. OpenID Connect is a thin **authentication** layer on top that adds an _ID token_ (a JWT with verified identity claims: `sub`, `email`, `name`). Rule of thumb: "Sign in with…" needs OIDC; "let this app read my calendar" is OAuth. Using a raw OAuth access token as proof of login is a classic mistake.

> [!QUESTION]- Why is PKCE required even for confidential clients now?
> PKCE binds the authorization request to the token exchange via a one-time `code_verifier`/`code_challenge`, so an intercepted authorization code is useless without the verifier. It was designed for public clients (SPAs/mobile that can't keep a secret), but the OAuth 2.1 guidance now recommends it for **all** clients because it also defends confidential clients against code-injection/interception, at essentially no cost.

> [!QUESTION]- Which flow do you use for a CLI tool or a smart TV, and why not Authorization Code?
> The **Device Authorization (Device Code) flow**: the device shows a short code and a URL, the user authorizes on a phone/laptop, and the device polls the token endpoint until approved. Authorization Code assumes a browser redirect back to the app, which input-constrained or browserless devices can't do. (Implicit and ROPC are deprecated and shouldn't be used at all.)

## References

- [RFC 6749 — OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc6749) — the authoritative OAuth 2.0 specification
- [OpenID Connect spec](https://openid.net/specs/openid-connect-core-1_0.html) — OIDC layer on top of OAuth 2.0; defines ID tokens and UserInfo endpoint
- [Microsoft Identity Platform docs](https://learn.microsoft.com/en-us/entra/identity-platform/) — ASP.NET Core integration guide for Microsoft Entra ID (Azure AD)
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636) — Proof Key for Code Exchange; required for public clients
