---
publish: true
created: 2026-08-20T20:41:15.666Z
modified: 2026-08-20T20:41:15.666Z
published: 2026-08-20T20:41:15.666Z
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

Single Sign-On (SSO) lets several applications trust one identity provider (IdP) for authentication. An existing IdP session can remove the next credential prompt. Each application still validates a new assertion or ID token, applies local authorization, and creates its own session.

This centralizes sign-in policy and account lifecycle. It also concentrates risk. An IdP outage blocks new logins, while an IdP compromise can reach every relying application.

See [[Security/Authentication/Oauth OIDC (OpenId Connect)|OAuth/OIDC]] for the underlying OAuth roles and token rules.

# Federated Browser Flow

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

The trace abbreviates the authorization request. A secure PKCE request also sends `code_challenge_method=S256`. Under RFC 7636, omitting that parameter means `plain`, not an implied `S256` default.

The flow crosses separate IdP, federation, and application-session boundaries. Reusing the IdP session can make the next login silent, but the relying party still validates a fresh result and controls its own session. The diagram omits token-endpoint client authentication. A confidential client normally authenticates there in addition to proving the PKCE verifier.

Cookie delivery follows the host-only or `Domain` match and the `Path` attribute, with controls such as `Secure` and `SameSite`. `Path` scopes sending but is not a confidentiality boundary, and cookies are not isolated by port or full origin. Distinct, narrowly scoped session cookies keep sibling applications from sharing authority accidentally.

# Trust Configuration

The application pins an expected issuer, then obtains endpoints and signing keys from that issuer's trusted discovery metadata. It registers exact redirect URIs and a `client_id`. Callback processing must:

1. Match `state` to the browser session that initiated the flow.
2. Validate the ID token signature using a current key for the configured issuer.
3. Require the exact issuer and an audience containing this application's `client_id`.
4. Check expiry, issued-at constraints, and `nonce`. Apply `azp` rules when multiple audiences are present.
5. Map the stable issuer-plus-`sub` pair to a local principal. Email is mutable and is not a globally stable identifier.
6. Create a fresh local session and apply local authorization. Do not forward the ID token as an API credential.

SAML follows the same trust shape. The service provider starts from configured IdP metadata and validates signature, issuer, audience, recipient, time bounds, and request correlation before creating a local session.

# Sessions and Logout

| Event | IdP session | Application A | Application B |
| --- | --- | --- | --- |
| User signs in to A | Created or reused | New local session | Unchanged |
| User opens B | Reused for silent authentication | Unchanged | New local session after token validation |
| User logs out of A locally | Usually remains | Deleted | Unchanged |
| IdP session is revoked | Deleted | May remain until local expiry/back-channel event | May remain until local expiry/back-channel event |

"Log out everywhere" needs its own protocol and failure policy. Local logout deletes one application session. Provider logout ends the IdP browser session, but relying-party sessions can survive. Front-channel logout depends on browser navigation and cookie behavior. Back-channel logout sends a signed server-to-server event, so delivery, retries, and endpoint availability become operational concerns. High-risk applications also need bounded local sessions and a response to account-disable or revocation events.

# OIDC versus SAML

| Concern | OIDC | SAML 2.0 |
| --- | --- | --- |
| Artifact | JSON/JWT ID token through an OAuth-based flow | XML assertion through browser bindings |
| Trust setup | Issuer discovery, client registration, redirect URIs, JWKS | IdP/SP metadata, entity IDs, endpoints, certificates |
| Client fit | Web, native, and modern cloud applications | Browser-centric enterprise federation |
| Validation risk | Token type/audience confusion and redirect mistakes | XML signature, canonicalization, audience, and recipient mistakes |
| Operational cost | Key rotation and client metadata | Certificate and metadata rotation, larger XML payloads |

OIDC is the default for new applications. SAML remains appropriate when an enterprise IdP or SaaS product exposes only SAML. XML signature processing belongs in a maintained federation library.

# Failure Modes

- **Login CSRF:** an attacker starts a login for their own account and tricks the victim into completing the callback. Bind callback to the initiating browser with `state` and correlate the transaction server-side.
- **Token replay:** validate `nonce`, one-time authorization codes, expiry, issuer, and audience. A token valid for Application A must not create a session at B.
- **Open redirect:** register exact callback URIs and validate any post-login return path as a local relative destination.
- **Claim drift:** groups, roles, and email can change. Treat federation claims as input to local policy and define how removals propagate.
- **IdP outage:** existing local sessions may continue under policy, but new logins and token renewal fail. Design explicit degraded behavior. Do not bypass authentication.
- **Account recovery downgrade:** central recovery now unlocks every relying application. Require stronger checks and notify/revoke sessions after sensitive recovery.

# References

- [OpenID Connect Discovery 1.0](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [OpenID Connect Back-Channel Logout 1.0](https://openid.net/specs/openid-connect-backchannel-1_0.html)
- [Secure an ASP.NET Core Blazor Web App with OpenID Connect](https://learn.microsoft.com/aspnet/core/blazor/security/blazor-web-app-with-oidc)
- [SAML 2.0 Technical Overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
