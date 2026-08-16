---
topic:
  - Security
subtopic:
  - Authentication
summary: "How credentials, authentication ceremonies, sessions, and delegated authorization fit together."
tags: [FolderNote]
publish: true
priority: High
level:
  - "4"
status: Ready to Repeat
---

Authentication establishes a principal from evidence supplied during a protocol exchange. Authorization decides what that principal may do. A complete design also defines credential enrollment, proof, session continuity, revocation, and recovery. Collapsing those responsibilities into one "authentication method" hides the boundary that failed.

For a server-rendered browser application, one sound design is OIDC Authorization Code with PKCE followed by an opaque application session. The callback validates `state`, redeems the code with the PKCE verifier, and validates the ID token's signature, issuer, audience, expiry, and applicable nonce. A `Secure; HttpOnly; SameSite=Lax` cookie carries only the session identifier. Authorization still runs for every protected operation.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

# Authentication Factors, Credentials, and Protocols

Factors describe what the claimant proves. Credentials are the concrete secrets or keys used to prove it. Protocols define the messages and the verifier. Tokens normally carry a result or delegated authority. Possession of a bearer token authenticates the caller only as "whoever has this token."

| Category | Concrete credential and ceremony | Trust boundary | Main failure |
| --- | --- | --- | --- |
| Memorized secret | Password verified against a salted password hash | User, login UI, verifier, password store | Phishing, reuse, stuffing, weak recovery |
| Possession factor | TOTP seed, security key, or passkey unlocked on a device | Authenticator, device or sync provider, verifier | Seed theft, device recovery, fallback downgrade |
| Public-key challenge | SSH/WebAuthn private key signs a fresh challenge | Private-key holder, verifier, challenge store | Stolen key, weak key enrollment, replay if challenges are reused |
| Certificate or workload identity | A CA binds a public key to a service. TLS proves private-key possession | Issuer, certificate chain, workload, verifier clock | Mis-issuance, leaked private key, stale trust roots |
| Federated login | OIDC or SAML transfers an assertion from an identity provider to an application | Identity provider, browser, relying party | Issuer/audience confusion, redirect abuse, IdP outage |
| Delegated authorization | OAuth access token grants a client bounded access to a resource server | Authorization server, client, API | Excessive scopes, wrong audience, bearer-token theft |

MFA needs independent factor types: two passwords remain one knowledge factor. A passkey ceremony can combine local user verification with public-key proof. Enrollment, device sync, and account recovery may still provide an easier takeover path than the primary ceremony.

# Separate the Layers

These components combine. They are not alternatives on one ladder:

1. The **credential and ceremony** prove control of a password, key, certificate, or external identity.
2. **Browser transport and storage** carry state between requests, commonly with a cookie.
3. A **server session** maps an opaque handle to mutable server-side state, while a **bearer token** carries authority to whoever presents it.
4. **JWT** and **PASETO** are token formats, not login protocols. A JWT can be stored in a cookie, and an opaque session can coexist with OAuth access tokens.
5. **Federation/SSO** lets an application rely on an identity provider for authentication.
6. **OAuth** delegates authorization to a client. **OIDC** adds an interoperable authentication result.

The distinction changes incident response. Deleting an opaque session record can stop later uses of that handle as soon as every verifier observes the deletion. A self-contained bearer token normally remains usable until expiry unless the resource server consults an online control or validates sender binding.

# Cookies and Browser Sessions

The server creates state with a response header such as:

```http
Set-Cookie: __Host-session=J4p...; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1800
```

The browser stores the cookie and later sends it only when domain, path, expiry, and security rules match. `Secure` restricts transmission to HTTPS, `HttpOnly` blocks JavaScript reads, and `SameSite` limits cross-site sending. None of them encrypt the value or make a stolen session harmless. The `__Host-` prefix additionally requires `Secure`, `Path=/`, and no `Domain`, preventing a subdomain from setting a wider cookie.

An opaque random identifier should point to server-side state. Profile data and authorization decisions do not belong in an unsigned cookie. Identifier rotation after login and privilege changes stops session fixation. Expiry must exist in both the browser and session store. `SameSite=Lax` adds defense in depth, while state-changing requests still need CSRF protection wherever cross-site cookie delivery remains possible.

![[Security/Security-Authentication-18120000-1.png]]

![[Security/Security-Authentication-18120000.png]]

> [!WARNING] Diagram caveat
> Cookies use the browser's cookie store, not Web Storage. Omitting `Domain` creates a host-only cookie. A valid `Domain` can widen scope only to the current host's parent domain, never to an unrelated site or public suffix. `Path`, `Secure`, `HttpOnly`, and `SameSite` constrain delivery and access but do not encrypt the value.

# Opaque Sessions versus Bearer Tokens

Compare complete architectures, not cookies against JWTs:

| Concern | Opaque server session | Self-contained bearer access token |
| --- | --- | --- |
| State | Mutable record in a session store. Browser usually carries a random cookie | Signed claims travel with each request. Resource server verifies signature and claims |
| Revocation | Delete or disable the record for immediate effect | Short expiry, revocation/introspection, key rollover, or sender constraint |
| Theft impact | Attacker acts until server revokes or session expires | Attacker acts until token expires or an online control rejects it |
| Rotation | Rotate handle after login/privilege change. Renew server record | Rotate refresh token on use. Issue short-lived access tokens with fixed audience |
| Browser boundary | Cookie can be `HttpOnly`, but ambient sending creates CSRF risk | JavaScript storage exposes tokens to XSS. A token in a cookie still has cookie/CSRF behavior |
| Backend cost | Shared lookup and availability boundary | Larger requests and distributed key/claim validation. Stale authorization until renewal |

Opaque sessions fit first-party browser applications that need mutable server-side state and prompt revocation. Short-lived OAuth access tokens fit API boundaries where resource servers need delegated authority issued by an authorization server. Both designs need expiry, audience restriction, rotation policy, and a response to replay after theft.

# Token and HMAC API Authentication

A bearer token is sufficient evidence for whoever possesses it. It must travel over TLS, be restricted to its intended resource audience, carry the smallest useful scope, expire quickly, and remain out of URLs and logs.

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

The client computes `HMAC-SHA-256(secret, canonical-request)` and sends the key ID, timestamp, nonce, and MAC. The server resolves the secret by key ID, rebuilds the canonical request from received bytes, compares the MAC in constant time, rejects timestamps outside a short window, and records accepted nonces until that window closes. Without the nonce/timestamp checks, a captured valid request can be replayed. The canonical target must bind the HTTP method, authority, path, and normalized query—or one normalized absolute target URI—so an attacker cannot replay a valid MAC against another host or change a query argument. The signing profile must define URI normalization, query ordering and encoding, header selection, whitespace, and body hashing exactly. A reverse proxy must preserve or supply the original target components used by both parties.

The key ID is public metadata, not a public cryptographic key. Both HMAC parties share the same secret. Each key belongs to one API and environment even when another system accidentally holds the same bytes. Rotation can overlap old and new key IDs while clients move. New designs should use a standard signing profile where possible. RFC 9421 defines HTTP Message Signatures. RFC 6151 rules out HMAC-MD5 for new protocols.

# Choosing an Auth Approach

| Surface | Recommended design | Cost and condition that changes it |
| --- | --- | --- |
| First-party browser app | OIDC login, opaque server session, hardened cookie | Needs a session store. Choose access tokens at a separately operated API boundary |
| Native or SPA client | Authorization Code with PKCE and short-lived access tokens | Token handling is exposed to the client runtime. A backend-for-frontend can reduce browser exposure |
| Service workload | Managed workload identity or certificate | Requires issuer and rotation infrastructure. HMAC is simpler for a small fixed partner set |
| Partner webhook/API | HMAC-signed requests with timestamp and nonce | Shared-secret lifecycle grows poorly. Use asymmetric client authentication at larger trust scale |

[[Home/Security/Authentication/SSO (Single Sign-On)|SSO]] federates login, [[Home/Security/Authentication/Two-Factor Auth|two-factor authentication]] strengthens the ceremony, and [[Home/Security/Authentication/Resource-based Auth|resource-based authorization]] applies authorization after the caller is known. None replaces the others.

# References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [HTTP State Management Mechanism](https://www.rfc-editor.org/rfc/rfc6265)
- [HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421.html)
