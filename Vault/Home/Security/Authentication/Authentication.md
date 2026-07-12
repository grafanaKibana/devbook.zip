---
topic:
  - Security
subtopic:
  - Authentication
summary: "How a system proves who a user or service is, from passwords to OAuth/OIDC."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Creation
---

# Intro

Authentication is how a system proves who a user or service is, and it is a core control for production security. The details matter: password storage, MFA, session management, OAuth/OIDC, and secure failure handling. Example: a login flow is not done until you handle brute-force protection, account recovery, and session revocation.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## Choosing an Auth Approach

These notes cover two different axes, so treat them separately. The rows below are the *mechanisms* — pick one per entry point to establish who the caller is (and, for resource-based auth, what they may touch). [[SSO (Single Sign-On)]] and [[Two-Factor Auth]] are cross-cutting layers, not options in this table (see below).

| Method | What it proves / how | Credential | State | Use when |
| --- | --- | --- | --- | --- |
| [[Basic Auth]] | Identity — client sends `username:password` (Base64) in the `Authorization` header on every request; the server decodes and validates it | Username + password (ideally a service account, not a user password) | Stateless; credentials re-sent each request, no expiry or revocation | Internal service-to-service calls over HTTPS, or legacy integration where simplicity outweighs security sophistication |
| [[Oauth OIDC (OpenId Connect)\|OAuth 2.0 / OIDC]] | Delegated access via an OAuth *access token*, plus verified identity via the OIDC *ID token* (JWT) — the app redirects to an IdP and never sees the password | Short-lived tokens (access / ID / refresh) issued by an authorization server | Stateless tokens with 15–60 min expiry + refresh-token rotation | User-facing login and third-party/delegated API access; the default for new systems |
| [[Resource-based Auth]] | *Authorization, not authentication* — whether an already-identified caller may act on a **specific resource instance** (ownership or relationship), beyond coarse roles | Identity from a mechanism above + the concrete resource being accessed | Per-request policy evaluation against the fetched resource | Per-instance checks ("can this user edit *this* document?") that role-based gates can't express |

**Guidance.** Choose exactly one authentication mechanism per surface — Basic Auth for trusted internal machine-to-machine traffic over HTTPS, OAuth 2.0 / OIDC for anything user-facing or externally exposed — then apply [[Resource-based Auth]] on top to enforce per-instance permissions once the caller is identified. Crucially, [[SSO (Single Sign-On)]] and [[Two-Factor Auth]] *compose* with a chosen mechanism rather than replacing it: SSO is just OIDC run across many applications against a shared Identity Provider (so it presupposes OAuth/OIDC), and 2FA/MFA adds a second independent factor to whatever login flow you already run. You never "pick SSO instead of OAuth" — you run OAuth/OIDC and switch on SSO and 2FA to strengthen it.

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
