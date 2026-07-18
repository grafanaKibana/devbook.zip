---
topic:
  - Security
subtopic:
  - Authentication
summary: "OAuth delegates API access; OpenID Connect adds an interoperable authentication result."
level:
  - "3"
priority: High
status: Ready to Repeat
publish: true
---

OAuth 2.0 lets a client obtain bounded authority to call a resource server. It is an authorization framework, not a login protocol. OpenID Connect (OIDC) adds authentication by defining an ID token, issuer discovery, a UserInfo endpoint, and validation rules. "Sign in with Microsoft" uses OIDC to establish the user's identity; an access token authorizes a call to an API.

The distinction prevents a common failure: an API access token may be intended for another audience and does not, by itself, prove a login to the client. The client validates an ID token for its own `client_id`; the resource server validates an access token whose audience identifies that API.

# Roles and artifacts

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

Scopes bound what the client asks to do, such as `calendar.read`. Consent records a user's approval where the authorization server requires it; it does not replace API-side authorization. The API must still check audience, scope, subject/tenant, and the requested resource.

# Authorization Code with PKCE

This is the default user-facing flow for web, native, and browser-based clients. PKCE binds the front-channel authorization code to a secret generated for this one request.

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

The client rejects a callback whose `state` does not match the initiating browser session. It validates the ID token's signature, exact issuer, audience (and `azp` when required), expiry, and `nonce`. PKCE stops an intercepted code from being redeemed without the `code_verifier`; it does not replace `state`, redirect URI validation, or client authentication.

For a server-rendered browser application, keep tokens server-side and issue a hardened opaque session cookie to the browser. A SPA or native app cannot safely rely on a static client secret. It should use PKCE, short-lived tokens, platform-protected storage where available, refresh-token rotation, and a narrowly registered redirect URI.

# Current flow selector

| Situation | Flow | Why | Cost / failure boundary |
| --- | --- | --- | --- |
| Human uses web, SPA, or native app | Authorization Code with PKCE | Keeps tokens out of the authorization response and binds the code to the initiating client | Requires redirects, state/nonce storage, and a token exchange |
| Service acts as itself | Client Credentials | No resource owner is involved; client receives its own bounded authority | Client credential or workload identity must be protected and rotated |
| TV, CLI, or input-constrained device | Device Authorization | User completes authorization on a separate browser-capable device | Device must poll at the specified interval and expire/stop on denial |

Do not use the Implicit grant: it returns tokens through the browser front channel, where leakage and injection are harder to contain. Do not use the Resource Owner Password Credentials grant: it teaches the client to collect the user's password and cannot support modern authentication ceremonies safely. OAuth 2.0 Security Best Current Practice deprecates both. Client Credentials is for confidential machine clients, not SPAs.

# Device Authorization message flow

```text
Device -> Authorization server: client_id + requested scope
Authorization server -> Device: device_code + user_code + verification_uri + expires_in + interval
Device -> User: show URI and short code
User -> Browser -> Authorization server: authenticate and approve code
Device -> Token endpoint: poll with device_code, respecting interval
Token endpoint -> Device: access token, or authorization_pending / slow_down / denied / expired
```

The `user_code` is designed for typing and is not the bearer credential. The device keeps `device_code` secret, stops when it expires, and slows polling when instructed.

# Client Credentials example

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

# Failure modes

- **Authorization response injection:** bind each code to the client's request with PKCE and reject mismatched `state`.
- **Redirect abuse:** register exact redirect URIs and do not use an attacker-controlled continuation URL after callback.
- **Token substitution:** an ID token is for the client; an access token is for the resource server. Validate each token's intended audience.
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

# Questions

> [!QUESTION]- Why can an access token not be used as an ID token?
> The access token is issued for a resource server and carries delegated authority. Its format and claims are controlled by that API contract. The ID token is issued for the OIDC client and has explicit authentication claims and validation rules, including audience and nonce.

> [!QUESTION]- What do `state`, `nonce`, and PKCE each bind?
> `state` binds the callback to the initiating browser session, `nonce` binds the ID token to the OIDC request, and PKCE binds the authorization code to the client instance that created the verifier. One does not substitute for the others.

# References

- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700) — current flow security, PKCE, redirect, replay, and deprecated-grant guidance.
- [RFC 7636 — Proof Key for Code Exchange](https://www.rfc-editor.org/rfc/rfc7636) — PKCE verifier and challenge protocol.
- [RFC 8628 — OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628) — input-constrained device flow and polling behavior.
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) — ID tokens, nonce, authentication flows, and validation rules.
- [Microsoft identity platform OAuth 2.0 and OIDC protocols](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols) — official Entra protocol endpoints and application guidance.
- [ByteByteGo — OAuth 2.0 Flows](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/oauth-20-flows.md) — source grant list corrected against current security guidance.
- [ByteByteGo — OAuth 2.0 Explained with Simple Terms](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/oauth-2-explained-with-siple-terms.md) — source roles separated into authorization and authentication boundaries.
