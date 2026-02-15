---
{"dg-publish":true,"permalink":"/software-engineering/07-security/authentication/basic-auth/","noteIcon":""}
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


# Whats next

:LiArrowUpLeft: [[Software Engineering/07 Security/07 Security\|07 Security]]

<h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect).md" data-href="Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect).md" href="Software Engineering/07 Security/Authentication/Oauth OIDC (OpenId Connect).md" class="internal-link" target="_blank" rel="noopener nofollow">Oauth OIDC (OpenId Connect)</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Authentication/Resource-based Auth.md" data-href="Software Engineering/07 Security/Authentication/Resource-based Auth.md" href="Software Engineering/07 Security/Authentication/Resource-based Auth.md" class="internal-link" target="_blank" rel="noopener nofollow">Resource-based Auth</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Authentication/SSO (Single Sign-On).md" data-href="Software Engineering/07 Security/Authentication/SSO (Single Sign-On).md" href="Software Engineering/07 Security/Authentication/SSO (Single Sign-On).md" class="internal-link" target="_blank" rel="noopener nofollow">SSO (Single Sign-On)</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Authentication/Two-Factor Auth.md" data-href="Software Engineering/07 Security/Authentication/Two-Factor Auth.md" href="Software Engineering/07 Security/Authentication/Two-Factor Auth.md" class="internal-link" target="_blank" rel="noopener nofollow">Two-Factor Auth</a></span></li></ul></div>
