---
publish: true
created: 2026-07-16T07:36:21.597Z
modified: 2026-07-17T05:46:25.660Z
published: 2026-07-17T05:46:25.660Z
topic:
  - Security
subtopic:
  - Authentication
summary: Federated login through an identity provider, with separate sessions and trust at every application.
level:
  - "3"
priority: High
status: Ready to Repeat
---

# Intro

Single Sign-On (SSO) lets several applications rely on one identity provider (IdP) for authentication. The user authenticates to the IdP once; each application still validates its own assertion or ID token, applies its own authorization policy, and creates its own local session. SSO removes repeated login ceremonies, not application-level security boundaries.

The main operational benefit is centralized authentication policy and account lifecycle. The matching cost is concentration: an IdP outage blocks new logins, and an IdP compromise can reach every relying application.

See [[Security/Authentication/Oauth OIDC (OpenId Connect)|OAuth/OIDC]] for the underlying OAuth roles and token rules.

## Federated browser flow

```text
Browser -> Application: GET /reports
Application -> Browser: redirect to the trusted IdP /authorize endpoint
  client_id=reports-app
  redirect_uri=https://reports.example/callback
  response_type=code
  scope=openid profile
  state=<browser-session binding>
  nonce=<ID-token replay binding>
  code_challenge=<PKCE challenge>

Browser -> IdP: authenticate, or reuse the existing IdP session
IdP -> Browser -> Application: callback with authorization code + state
Application -> IdP: exchange code + PKCE verifier
IdP -> Application: signed ID token + optional access token
Application: validate issuer, signature, audience, expiry, nonce, and policy claims
Application -> Browser: set a new application-session cookie
```

The browser crosses three distinct trust boundaries: the application's session, the IdP's session, and the signed federation result. A valid IdP session can make the second application login silent, but each relying party still creates and controls its own local session. Cookie delivery is scoped by a host-only or `Domain` match and `Path`, then constrained by attributes such as `Secure` and `SameSite`; the port and full origin are not cookie isolation boundaries. Relying parties should use narrowly scoped, distinct session cookies so sibling applications do not share them accidentally.

## Trust configuration

The application pins an expected issuer and obtains its authorization/token endpoints and signing-key set from trusted discovery metadata. It registers exact redirect URIs and a `client_id`. On callback it must:

1. Match `state` to the browser session that initiated the flow.
2. Validate the ID token signature using a current key for the configured issuer.
3. Require the exact issuer and an audience containing this application's `client_id`.
4. Check expiry, issued-at constraints, and `nonce`; apply `azp` rules when multiple audiences are present.
5. Map the stable issuer-plus-`sub` pair to a local principal. Email is mutable and is not a globally stable identifier.
6. Create a fresh local session and apply local authorization; do not forward the ID token as an API credential.

The same model applies to SAML: the service provider trusts configured IdP metadata and validates the assertion's signature, issuer, audience, recipient, time bounds, and correlation with the request before creating a local session.

## Sessions and logout

| Event | IdP session | Application A | Application B |
| --- | --- | --- | --- |
| User signs in to A | Created or reused | New local session | Unchanged |
| User opens B | Reused for silent authentication | Unchanged | New local session after token validation |
| User logs out of A locally | Usually remains | Deleted | Unchanged |
| IdP session is revoked | Deleted | May remain until local expiry/back-channel event | May remain until local expiry/back-channel event |

"Log out everywhere" therefore needs an explicit design. Local logout deletes one application session. Provider logout ends the IdP browser session but cannot assume every relying party session disappeared. Front-channel logout depends on browser navigation and cookie behavior; back-channel logout delivers a signed server-to-server event but requires reliable endpoint handling. High-risk applications should also keep local sessions short and respond to account-disable or session-revocation events.

## OIDC versus SAML

| Concern | OIDC | SAML 2.0 |
| --- | --- | --- |
| Artifact | JSON/JWT ID token through an OAuth-based flow | XML assertion through browser bindings |
| Trust setup | Issuer discovery, client registration, redirect URIs, JWKS | IdP/SP metadata, entity IDs, endpoints, certificates |
| Client fit | Web, native, and modern cloud applications | Browser-centric enterprise federation |
| Validation risk | Token type/audience confusion and redirect mistakes | XML signature, canonicalization, audience, and recipient mistakes |
| Operational cost | Key rotation and client metadata | Certificate and metadata rotation, larger XML payloads |

Use OIDC for new applications. Use SAML when the required enterprise IdP or SaaS product exposes only SAML, and use a mature library rather than parsing or validating XML signatures yourself.

## Failure modes

- **Login CSRF:** an attacker starts a login for their own account and tricks the victim into completing the callback. Bind callback to the initiating browser with `state` and correlate the transaction server-side.
- **Token replay:** validate `nonce`, one-time authorization codes, expiry, issuer, and audience. A token valid for Application A must not create a session at B.
- **Open redirect:** register exact callback URIs and validate any post-login return path as a local relative destination.
- **Claim drift:** groups, roles, and email can change. Treat federation claims as input to local policy and define how removals propagate.
- **IdP outage:** existing local sessions may continue under policy, but new logins and token renewal fail. Design explicit degraded behavior; do not bypass authentication.
- **Account recovery downgrade:** central recovery now unlocks every relying application. Require stronger checks and notify/revoke sessions after sensitive recovery.

## Questions

> [!QUESTION]- Why does SSO not mean one shared session?
> The IdP and each relying application remain distinct session and security boundaries. The IdP session can make authentication at another application silent, but that application must validate a new federation result and issue its own session.

> [!QUESTION]- Which identity should a relying party store?
> Store the pair of configured issuer and stable `sub` claim. Email and display names can change or be reassigned; they are attributes, not durable federation keys.

## References

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) — relying-party flow, ID-token claims, nonce, and validation rules.
- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html) — issuer metadata, endpoints, and signing-key discovery.
- [OpenID Connect Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html) — server-to-server logout token semantics.
- [Microsoft — Secure an ASP.NET Core Blazor Web App with OIDC](https://learn.microsoft.com/en-us/aspnet/core/blazor/security/blazor-web-app-with-oidc) — official server-side OIDC and cookie boundary guidance.
- [OASIS SAML 2.0 Technical Overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) — authoritative SAML roles, assertions, and browser SSO profiles.
- [ByteByteGo — What Is SSO?](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/v1what-is-sso-single-sign-on.md) — source flow rebuilt around IdP, relying-party, session, token, and logout boundaries.
