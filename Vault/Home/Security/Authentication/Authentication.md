---
topic:
  - Security
subtopic:
  - Authentication
summary: "How credentials, authentication ceremonies, sessions, and delegated authorization fit together."
tags:
  - FolderNote
publish: true
priority: High
level:
  - "4"
status: Ready to Repeat
---

Authentication proves which user or workload is making a request. It does not decide what that principal may do; that is authorization. A production design also needs a credential, a ceremony that proves possession of it, a way to carry the result between requests, and a recovery path. Calling all of those pieces "authentication methods" hides the trust boundaries that fail in practice.

For a browser application, one concrete design is OIDC Authorization Code with PKCE. The callback validates the authorization response and `state`, exchanges the code with the PKCE verifier, then validates the ID token signature, issuer, audience, expiry, and applicable nonce before creating an opaque server-side session. A `Secure; HttpOnly; SameSite=Lax` cookie carries only the session identifier, and the API still evaluates authorization on every request.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

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

![[System Design 101/c580728270ac4d4335284a4fd3177cd812d1017f7a4aec2faa79691900c38a0e.png]]

![[System Design 101/7878570c158346c721ac2e1d90ee65a4ab4f62c73047f71e5e432d41ac43e9c9.png]]

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

[[Home/Security/Authentication/SSO (Single Sign-On)|SSO]] federates login, [[Home/Security/Authentication/Two-Factor Auth|two-factor authentication]] strengthens the ceremony, and [[Home/Security/Authentication/Resource-based Auth|resource-based authorization]] applies authorization after the caller is known. None replaces the others.

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
