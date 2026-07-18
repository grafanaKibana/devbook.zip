---
publish: true
created: 2026-07-16T07:34:20.894Z
modified: 2026-07-18T11:59:15.665Z
published: 2026-07-18T11:59:15.665Z
tags:
  - FolderNote
topic:
  - Security
subtopic:
  - Authentication
summary: How credentials, authentication ceremonies, sessions, and delegated authorization fit together.
priority: High
level:
  - "4"
status: Ready to Repeat
---

Authentication proves which user or workload is making a request. It does not decide what that principal may do; that is authorization. A production design also needs a credential, a ceremony that proves possession of it, a way to carry the result between requests, and a recovery path. Calling all of those pieces "authentication methods" hides the trust boundaries that fail in practice.

For a browser application, one concrete design is OIDC Authorization Code with PKCE. The callback validates the authorization response and `state`, exchanges the code with the PKCE verifier, then validates the ID token signature, issuer, audience, expiry, and applicable nonce before creating an opaque server-side session. A `Secure; HttpOnly; SameSite=Lax` cookie carries only the session identifier, and the API still evaluates authorization on every request.

<nav style="--card-accent: 14, 165, 233;" class="folder-structure-map" aria-label="Authentication section map"><div class="folder-map-children"><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Basic Auth">Basic Auth</span></span></div><p class="db-card-summary">The simplest HTTP scheme: Base64-encoded credentials in the Authorization header (RFC 7617).</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Security/Authentication/Basic Auth.md" data-tooltip-position="top" aria-label="Basic Auth">Basic Auth</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Oauth OIDC (OpenId Connect)">Oauth OIDC (OpenId Connect)</span></span></div><p class="db-card-summary">OAuth delegates API access; OpenID Connect adds an interoperable authentication result.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Security/Authentication/Oauth OIDC (OpenId Connect).md" data-tooltip-position="top" aria-label="Oauth OIDC (OpenId Connect)">Oauth OIDC (OpenId Connect)</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Resource-based Auth">Resource-based Auth</span></span></div><p class="db-card-summary">Checks whether a user may act on a specific resource instance, not just a type.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Security/Authentication/Resource-based Auth.md" data-tooltip-position="top" aria-label="Resource-based Auth">Resource-based Auth</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="SSO (Single Sign-On)">SSO (Single Sign-On)</span></span></div><p class="db-card-summary">Federated login through an identity provider, with separate sessions and trust at every application.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Security/Authentication/SSO (Single Sign-On).md" data-tooltip-position="top" aria-label="SSO (Single Sign-On)">SSO (Single Sign-On)</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="TOTP">TOTP</span></span></div><p class="db-card-summary">How time-based one-time passwords are provisioned, generated, validated, and recovered.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Security/Authentication/TOTP.md" data-tooltip-position="top" aria-label="TOTP">TOTP</a></span></article><article class="db-card folder-map-node"><div class="db-card-body"><div class="folder-map-node-heading"><span class="folder-map-node-title-group"><span class="db-card-icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round" stroke-width="2" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line y2="13" y1="13" x2="8" x1="16"/><line y2="17" y1="17" x2="8" x1="16"/><line y2="9" y1="9" x2="8" x1="10"/></svg></span><span class="db-card-title" title="Two-Factor Auth">Two-Factor Auth</span></span></div><p class="db-card-summary">How independent factors, TOTP, WebAuthn, and recovery change account-takeover risk.</p></div><span class="db-card-hit"><a class="internal-link" href="Home/Security/Authentication/Two-Factor Auth.md" data-tooltip-position="top" aria-label="Two-Factor Auth">Two-Factor Auth</a></span></article></div><style>.db-card { position: relative; box-sizing: border-box; border: 1px solid var(--background-modifier-border, var(--lightgray, #d8dee9)); border-radius: var(--radius-m, 0.55rem); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease, transform 150ms ease; } .db-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; background: radial-gradient( ellipse 150% 175% at -22% -38%, rgba(var(--card-accent, 125, 125, 125), 0.09) 0%, rgba(var(--card-accent, 125, 125, 125), 0.04) 38%, rgba(var(--card-accent, 125, 125, 125), 0.014) 66%, transparent 90% ); opacity: 0.78; transition: opacity 150ms ease; } .db-card:hover, .db-card:focus-within { border-color: rgba(var(--card-accent, 125, 125, 125), 0.55); background-color: color-mix(in srgb, rgb(var(--card-accent, 125, 125, 125)) 2.5%, var(--background-primary, var(--light, #ffffff))); box-shadow: 0 0.45rem 1.1rem rgba(0, 0, 0, 0.08); transform: translateY(-0.125rem); } .db-card:hover::before, .db-card:focus-within::before { opacity: 1; } .db-card-body { position: relative; z-index: 0; box-sizing: border-box; display: flex; flex-direction: column; padding: var(--db-card-pad, 0.85rem 0.9rem); } .db-card-icon { display: flex; width: 1.1rem; height: 1.1rem; flex: 0 0 auto; color: rgb(var(--card-accent, 125, 125, 125)); } .db-card-icon svg { display: block; width: 100%; height: 100%; } .db-card-title { display: block; margin: 0; color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 700; line-height: 1.25; } p.db-card-summary { margin: 0.45rem 0 0; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; line-height: 1.45; } .db-card-hit { position: absolute; inset: 0; z-index: 1; } .db-card-hit a { position: absolute; inset: 0; min-width: 2.75rem; min-height: 2.75rem; border-radius: var(--radius-m, 0.55rem); background: transparent !important; font-size: 0; } .db-card-hit a:focus-visible { outline: 2px solid rgb(var(--card-accent, 125, 125, 125)); outline-offset: -0.3rem; } @media (prefers-reduced-motion: reduce) { .db-card { transition: none; } .db-card::before { transition: none; } .db-card:hover, .db-card:focus-within { transform: none; } } .folder-structure-map { --card-accent: 16, 185, 129; --map-gap: 0.75rem; width: 100%; box-sizing: border-box; margin: 0.5rem 0 0.75rem; container-name: folder-map; container-type: inline-size; } .folder-map-children { display: flex; flex-wrap: wrap; gap: var(--map-gap); } .folder-map-node { flex: 1 1 12rem; min-height: 2.75rem; --db-card-pad: 0.5rem 0.75rem; } .folder-map-node .db-card-body { min-height: 2.75rem; justify-content: center; } .folder-map-node-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; } .folder-map-node-title-group { display: flex; align-items: center; gap: 0.5rem; } .folder-map-node .db-card-title { white-space: nowrap; } .folder-map-node-count { display: block; flex: 0 0 auto; color: var(--text-muted, var(--darkgray, #5f6b7a)); font-size: 0.875rem; white-space: nowrap; } .folder-map-node .db-card-summary { display: none; } .folder-map-node-empty { cursor: default; } .folder-map-node-empty:hover, .folder-map-node-empty:focus-within { border-color: var(--background-modifier-border, var(--lightgray, #d8dee9)); background-color: var(--background-primary, var(--light, #ffffff)); box-shadow: 0 0 0 rgba(0, 0, 0, 0); transform: none; } .folder-map-node-empty:hover::before, .folder-map-node-empty:focus-within::before { opacity: 0.78; } .folder-structure-map .folder-map-node-empty .db-card-body { justify-content: center; align-items: center; text-align: center; } .folder-map-empty-text { color: var(--text-normal, var(--dark, #1f2937)); font-size: 1rem; font-weight: 400; font-style: normal; line-height: 1.25; } @container folder-map (min-width: 40rem) { .folder-map-node { min-height: 6rem; --db-card-pad: 0.85rem 0.9rem; } .folder-map-node .db-card-body { min-height: 6rem; justify-content: flex-start; } .folder-map-node .db-card-summary { display: block; } } @container folder-map (min-width: 64rem) { .folder-map-node, .folder-map-node .db-card-body { min-height: 6.75rem; } }</style></nav>

# Authentication factors, credentials, and protocols

Factors describe what the claimant proves. Credentials are the concrete secrets or keys used to prove it. Protocols define the messages and the verifier. Tokens normally carry a result or delegated authority; possession of a bearer token authenticates the caller only as "whoever has this token."

| Category | Concrete credential and ceremony | Trust boundary | Main failure |
| --- | --- | --- | --- |
| Memorized secret | Password verified against a salted password hash | User, login UI, verifier, password store | Phishing, reuse, stuffing, weak recovery |
| Possession factor | TOTP seed, security key, or passkey unlocked on a device | Authenticator, device or sync provider, verifier | Seed theft, device recovery, fallback downgrade |
| Public-key challenge | SSH/WebAuthn private key signs a fresh challenge | Private-key holder, verifier, challenge store | Stolen key, weak key enrollment, replay if challenges are reused |
| Certificate or workload identity | A CA binds a public key to a service; TLS proves private-key possession | Issuer, certificate chain, workload, verifier clock | Mis-issuance, leaked private key, stale trust roots |
| Federated login | OIDC or SAML transfers an assertion from an identity provider to an application | Identity provider, browser, relying party | Issuer/audience confusion, redirect abuse, IdP outage |
| Delegated authorization | OAuth access token grants a client bounded access to a resource server | Authorization server, client, API | Excessive scopes, wrong audience, bearer-token theft |

Use independent factors for MFA: two passwords are still one knowledge factor. A passkey may provide user verification and device-bound public-key proof in one ceremony, but account recovery can still become the weaker path.

# Separate the layers

These components combine; they are not alternatives on one ladder:

1. The **credential and ceremony** prove control of a password, key, certificate, or external identity.
2. **Browser transport and storage** carry state between requests, commonly with a cookie.
3. A **server session** maps an opaque handle to mutable server-side state, while a **bearer token** carries authority to whoever presents it.
4. **JWT** and **PASETO** are token formats, not login protocols. A JWT can be stored in a cookie, and an opaque session can coexist with OAuth access tokens.
5. **Federation/SSO** lets an application rely on an identity provider for authentication.
6. **OAuth** delegates authorization to a client; **OIDC** adds an interoperable authentication result.

This distinction matters during incident response. Deleting a session revokes an opaque handle immediately. A signed self-contained token remains valid until expiry unless the resource server checks revocation or sender-constrains it.

# Cookies and browser sessions

The server creates state with a response header such as:

```http
Set-Cookie: __Host-session=J4p...; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1800
```

The browser stores the cookie and later sends it only when domain, path, expiry, and security rules match. `Secure` restricts transmission to HTTPS, `HttpOnly` blocks JavaScript reads, and `SameSite` limits cross-site sending. None of them encrypt the value or make a stolen session harmless. The `__Host-` prefix additionally requires `Secure`, `Path=/`, and no `Domain`, preventing a subdomain from setting a wider cookie.

An opaque random identifier should point to server-side state; do not put profile or authorization decisions in an unsigned cookie. Rotate the identifier after login and privilege changes to stop session fixation. Expire it both in the browser and in the session store. `SameSite=Lax` is useful defense in depth, but state-changing requests still need CSRF protection where cross-site cookie delivery remains possible.

![[Assets/Security/Security-Authentication-18120000-1.png]]

![[Assets/Security/Security-Authentication-18120000.png]]

> [!WARNING] Non-normative source visual
> Cookies use the browser's cookie store, not Web Storage. Omitting `Domain` creates a host-only cookie; a valid `Domain` can widen scope only to the current host's parent domain, never to an unrelated site or public suffix. `Path`, `Secure`, `HttpOnly`, and `SameSite` constrain delivery and access but do not encrypt the value.

# Opaque sessions versus bearer tokens

Compare complete architectures, not cookies against JWTs:

| Concern | Opaque server session | Self-contained bearer access token |
| --- | --- | --- |
| State | Mutable record in a session store; browser usually carries a random cookie | Signed claims travel with each request; resource server verifies signature and claims |
| Revocation | Delete or disable the record for immediate effect | Short expiry, revocation/introspection, key rollover, or sender constraint |
| Theft impact | Attacker acts until server revokes or session expires | Attacker acts until token expires or an online control rejects it |
| Rotation | Rotate handle after login/privilege change; renew server record | Rotate refresh token on use; issue short-lived access tokens with fixed audience |
| Browser boundary | Cookie can be `HttpOnly`, but ambient sending creates CSRF risk | JavaScript storage exposes tokens to XSS; a token in a cookie still has cookie/CSRF behavior |
| Backend cost | Shared lookup and availability boundary | Larger requests and distributed key/claim validation; stale authorization until renewal |

Use an opaque session for a first-party browser application when immediate revocation and server control matter. Use short-lived OAuth access tokens across API/service boundaries when independent resource servers need verifiable delegated authority. In both cases validate expiry, bind the credential to the intended audience, rotate it, and assume replay after theft unless a sender-constrained mechanism is used.

# Token and HMAC API authentication

A bearer token is sufficient evidence for whoever possesses it. It must travel over TLS, target one audience, carry the smallest useful scope, expire quickly, and never appear in a URL or log.

Keyed request authentication instead proves possession of a shared secret for each request. The client and server must produce the same canonical byte string, for example:

```text
POST
https://api.example.com/payments/42?currency=USD&expand=receipt
content-type:application/json
x-key-id:merchant-7
x-nonce:e1d0...
x-timestamp:2026-07-16T08:30:00Z
SHA-256(request-body)
```

The client computes `HMAC-SHA-256(secret, canonical-request)` and sends the key ID, timestamp, nonce, and MAC. The server resolves the secret by key ID, rebuilds the canonical request from received bytes, compares the MAC in constant time, rejects timestamps outside a short window, and records accepted nonces until that window closes. Without the nonce/timestamp checks, a captured valid request can be replayed. The canonical target must bind the HTTP method, authority, path, and normalized query—or one normalized absolute target URI—so an attacker cannot replay a valid MAC against another host or change a query argument. The signing profile must define URI normalization, query ordering and encoding, header selection, whitespace, and body hashing exactly; a reverse proxy must preserve or supply the original target components used by both parties.

The key ID is public metadata, not a public cryptographic key; both HMAC parties share the same secret. Resolve each key only within its intended API and environment, and reject a key ID presented to another API even if the underlying secret happens to match. Rotate secrets with overlapping key IDs, revoke compromised clients, and use SHA-256 or stronger. Do not use MD5 or HMAC-MD5 for a new request-authentication design: RFC 6151 specifically withdraws MD5 where collision resistance is required and says new protocol designs should not employ HMAC-MD5.

# Choosing an Auth Approach

Visualization pending

| Surface | Recommended design | Cost and condition that changes it |
| --- | --- | --- |
| First-party browser app | OIDC login, opaque server session, hardened cookie | Needs a session store; choose access tokens at a separately operated API boundary |
| Native or SPA client | Authorization Code with PKCE and short-lived access tokens | Token handling is exposed to the client runtime; a backend-for-frontend can reduce browser exposure |
| Service workload | Managed workload identity or certificate | Requires issuer and rotation infrastructure; HMAC is simpler for a small fixed partner set |
| Partner webhook/API | HMAC-signed requests with timestamp and nonce | Shared-secret lifecycle grows poorly; use asymmetric client authentication at larger trust scale |

[[Security/Authentication/SSO (Single Sign-On)|SSO]] federates login, [[Security/Authentication/Two-Factor Auth|two-factor authentication]] strengthens the ceremony, and [[Security/Authentication/Resource-based Auth|resource-based authorization]] applies authorization after the caller is known. None replaces the others.

# References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — credential, session, and reauthentication controls.
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) — session identifiers, cookie attributes, renewal, and expiration.
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0-final.html) — authorization response, code flow, nonce, and ID-token validation requirements.
- [RFC 7636 — Proof Key for Code Exchange](https://www.rfc-editor.org/rfc/rfc7636) — PKCE verifier and challenge binding for authorization-code exchange.
- [RFC 6265 — HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265) — normative cookie storage and matching behavior.
- [RFC 2104 — HMAC](https://www.rfc-editor.org/rfc/rfc2104) — historical construction and security requirements for keyed message authentication.
- [RFC 9421 — HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html) — standard covered-component model for binding method, authority, target URI or query components, content, and signature metadata to an HTTP request.
- [RFC 6151 — Updated Security Considerations for MD5 and HMAC-MD5](https://www.rfc-editor.org/rfc/rfc6151) — deprecates MD5 where collision resistance is required and rules out HMAC-MD5 for new protocol designs.
- [ByteByteGo — Top 4 Authentication Mechanisms](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/top-4-forms-of-authentication-mechanisms.md) — source taxonomy corrected into factors, credentials, protocols, and delegation.
- [ByteByteGo — Session, Cookie, JWT, Token, SSO, and OAuth 2.0](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/session-cookie-jwt-token-sso-and-oauth-2.md) — source comparison separated into orthogonal layers.
- [ByteByteGo — Secure Web API Access](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-to-design-secure-web-api-access-for-your-website.md) — source HMAC flow reviewed against current cryptographic practice.
- [ByteByteGo — What Is a Cookie?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what-is-a-cookie.md) — source cookie analogy grounded in browser behavior.
- [ByteByteGo — Session-Based Authentication vs JWT](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/what%27s-the-difference-between-session-based-authentication-and-jwts.md) — source architectures expanded with revocation, replay, and browser boundaries.
- [ByteByteGo — Sessions, Tokens, JWT, SSO, and OAuth](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/explaining-sessions-tokens-jwt-sso-and-oauth-in-one-diagram.md) — reviewed visual slot retained as a placeholder because the source visual is not safe to adopt.
- [ByteByteGo — HTTP Cookies](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/http-cookies-explained-with-a-simple-diagram.md) — source flow corrected for cookie storage and server-side sessions.
- [ByteByteGo — Cookies vs Sessions vs JWT vs PASETO](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/cookies-vs-sessions-vs-jwt-vs-paseto.md) — source categories corrected into transport, state, and token formats.
