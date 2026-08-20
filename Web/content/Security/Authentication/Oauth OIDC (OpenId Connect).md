---
publish: true
created: 2026-08-20T20:41:15.665Z
modified: 2026-08-20T20:41:15.665Z
published: 2026-08-20T20:41:15.665Z
topic:
  - Security
subtopic:
  - Authentication
summary: OAuth delegates API access. OpenID Connect adds an interoperable authentication result.
level:
  - "3"
priority: High
status: Ready to Repeat
---

OAuth 2.0 lets a client obtain bounded authority to call a resource server. It is an authorization framework, not a login protocol. OpenID Connect adds an interoperable authentication result through ID tokens and defines discovery, UserInfo, and validation behavior. An OIDC client consumes the ID token. An API consumes an access token issued for that resource.

The distinction prevents a common failure: an API access token may be intended for another audience and does not, by itself, prove a login to the client. The client validates an ID token for its own `client_id`. The resource server validates an access token whose audience identifies that API.

# Roles and Artifacts

| Item | Consumed by | What it means | Boundary to validate |
| --- | --- | --- | --- |
| Resource owner | Authorization server | The user who can approve access | Authentication and consent policy |
| Client | Authorization server and resource server | The application requesting access | Registered redirect URIs and client identity |
| Authorization server | Client and resource server | Issues tokens after policy evaluation | Exact issuer, signing keys, endpoints |
| Resource server | Client | API holding protected resources | Access-token audience and scopes |
| Authorization code | Token endpoint | Short-lived, one-time intermediate result | Client, redirect URI, PKCE verifier |
| Access token | Resource server | Delegated authority for an audience and scope | Signature/introspection, issuer, audience, expiry |
| ID token | OIDC client | Authentication result about a subject | Signature, issuer, audience, expiry, nonce |
| Refresh token | Token endpoint | Authority to request replacement tokens | Client binding, rotation, replay detection |

Scopes bound what the client asks to do, such as `calendar.read`. Consent records a user's approval where the authorization server requires it. It does not replace API-side authorization. The API must still check audience, scope, subject/tenant, and the requested resource.

# Authorization Code with PKCE

Authorization Code is the current user-facing flow for web, native, and browser-based clients. PKCE binds the front-channel authorization code to a verifier generated for that authorization request.

```text
Client -> Browser: redirect to /authorize
  response_type=code
  client_id=app-7
  redirect_uri=https://app.example/callback
  scope=openid profile calendar.read
  state=<unpredictable browser-session binding>
  nonce=<unpredictable OIDC replay binding>
  code_challenge=BASE64URL(SHA-256(code_verifier))
  code_challenge_method=S256

Browser -> Authorization server: authenticate user and approve requested access
Authorization server -> Browser -> Client: /callback?code=...&state=...
Client -> Token endpoint: code + exact redirect_uri + code_verifier + client authentication when applicable
Token endpoint -> Client: ID token + access token + optional refresh token
Client: validate ID token, then create its own application session
Client -> Resource server: Authorization: Bearer <access token>
Resource server: validate issuer, audience, expiry, scope, and authorization policy
```

The client rejects a callback whose `state` does not match the initiating browser session. It validates the ID token's signature, exact issuer, audience (and `azp` when required), expiry, and `nonce`. PKCE stops an intercepted code from being redeemed without the `code_verifier`. It does not replace `state`, redirect URI validation, or client authentication.

For a server-rendered browser application, tokens can remain server-side behind a hardened opaque session cookie. A SPA or native app is a public client and cannot prove identity with a distributed static secret. PKCE and strict redirect URI validation are required controls. A backend-for-frontend can keep tokens out of browser JavaScript. Native applications can use platform-protected storage where available.

# Current Flow Selector

| Situation | Flow | Why | Cost / failure boundary |
| --- | --- | --- | --- |
| Human uses web, SPA, or native app | Authorization Code with PKCE | Keeps tokens out of the authorization response and binds the code to the initiating client | Requires redirects, state/nonce storage, and a token exchange |
| Service acts as itself | Client Credentials | No resource owner is involved. Client receives its own bounded authority | Client credential or workload identity must be protected and rotated |
| TV, CLI, or input-constrained device | Device Authorization | User completes authorization on a separate browser-capable device | Device must poll at the specified interval and expire/stop on denial |

The Implicit grant returns tokens through the authorization response and should not be used. The Resource Owner Password Credentials grant requires the client to collect the user's password and must not be used. RFC 9700 records those current security requirements. Client Credentials is for a confidential machine client acting as itself, not a SPA.

OAuth 2.1 consolidates these restrictions and requires PKCE, but it remains an IETF Internet-Draft rather than a published RFC. The current Datatracker entry is draft 15, published in March 2026 and explicitly marked work in progress. Production guidance should therefore cite the published OAuth 2.0 RFCs and RFC 9700 while tracking the draft's evolution.

# Device Authorization Message Flow

```text
Device -> Authorization server: client_id + requested scope
Authorization server -> Device: device_code + user_code + verification_uri + expires_in + interval
Device -> User: show URI and short code
User -> Browser -> Authorization server: authenticate and approve code
Device -> Token endpoint: poll with device_code, respecting interval
Token endpoint -> Device: access token, or authorization_pending / slow_down / denied / expired
```

The token endpoint's exact RFC 8628 wire errors are `authorization_pending`, `slow_down`, `access_denied`, and `expired_token`. The sketch abbreviates the last two as `denied` and `expired`. An implementation must match the full protocol values.

The `user_code` is designed for typing and is not the bearer credential. The device keeps `device_code` secret, stops when it expires, and slows polling when instructed.

# Client Credentials Example

```csharp
using var client = new HttpClient();
var response = await client.PostAsync(
    "https://issuer.example/oauth2/token",
    new FormUrlEncodedContent(new Dictionary<string, string>
    {
        ["grant_type"] = "client_credentials",
        ["client_id"] = "invoice-worker",
        ["client_secret"] = configuration["OAuth:ClientSecret"]!,
        ["scope"] = "invoices.write"
    }));

response.EnsureSuccessStatusCode();
```

Prefer a managed workload identity or asymmetric client authentication over a long-lived shared secret when the authorization server supports it. Never place the secret in source control or a public client.

# Failure Modes

- **Authorization response injection:** bind each code to the client's request with PKCE and reject mismatched `state`.
- **Redirect abuse:** register exact redirect URIs and do not use an attacker-controlled continuation URL after callback.
- **Token substitution:** an ID token is for the client. An access token is for the resource server. Validate each token's intended audience.
- **Replay:** validate `nonce` for OIDC, rotate refresh tokens, reject reuse, keep access tokens short-lived, and sender-constrain high-value tokens where supported.
- **Session confusion:** federated login ends when the client creates its local session. Rotate that session at login and define local, provider, and global logout separately.
- **Token leakage:** do not put tokens in query strings, logs, browser history, or analytics. TLS protects transit, not storage or logs.

# Tradeoffs versus SAML

| Concern | OIDC | SAML 2.0 |
| --- | --- | --- |
| Authentication artifact | JSON/JWT ID token | XML assertion |
| Typical client | Web, native, SPA, API-adjacent application | Browser-based enterprise application |
| Trust configuration | Issuer discovery, client registration, redirect URIs, signing keys | IdP/SP metadata, entity IDs, endpoints, signing/encryption certificates |
| Main implementation risk | OAuth/OIDC role or token confusion | XML signature/namespace handling and metadata drift |
| Choose it when | Building a new application or mobile-capable federation | A required enterprise IdP or SaaS integration exposes only SAML |

# References

- [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700)
- [OAuth 2.1 Authorization Framework draft](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- [OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [Microsoft identity platform OAuth 2.0 and OpenID Connect protocols](https://learn.microsoft.com/entra/identity-platform/v2-protocols)
