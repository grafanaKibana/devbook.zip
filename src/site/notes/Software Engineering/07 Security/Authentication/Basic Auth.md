---
{"dg-publish":true,"permalink":"/software-engineering/07-security/authentication/basic-auth/","noteIcon":"1"}
---


# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- Basic authentication vs two-factor authentication vs resource-based authentication
> Basic authentication: single-factor credentials (username and password) sent on every request (often as base64). It must be used only over HTTPS.
> Two-factor authentication: authentication that requires a second factor in addition to a password (for example, TOTP, push approval, hardware key).
> Resource-based authentication is often used to mean resource-scoped credentials (for example, an API key or token scoped to a specific service or audience);
> in many systems, the "resource-based" part is really authorization (policy attached to a resource) rather than authentication.

## Links

- [RFC 7617 HTTP Basic Authentication](https://datatracker.ietf.org/doc/html/rfc7617)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/07 Security/07 Security\|07 Security]]
>
> **Pages**
> - [[Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect)\|Oauth OIDC (OpenId Connect)]]
> - [[Software Engineering/07 Security/Authentication/Resource-based Auth\|Resource-based Auth]]
> - [[Software Engineering/07 Security/Authentication/SSO (Single Sign-On)\|SSO (Single Sign-On)]]
> - [[Software Engineering/07 Security/Authentication/Two-Factor Auth\|Two-Factor Auth]]
<!-- whats-next:end -->
