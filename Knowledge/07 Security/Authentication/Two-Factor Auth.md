---
topic:
  - Security
subtopic:
  - Authentication
level:
  - "1"
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
## Intro

## Deeper Explanation

## Questions

> [!QUESTION]- Basic authentication vs two-factor authentication vs resource-based authentication
> Basic authentication: single-factor credentials (username and password) sent on every request (often as base64). It must be used only over HTTPS.
> Two-factor authentication: authentication that requires a second factor in addition to a password (for example, TOTP, push approval, hardware key).
> Resource-based authentication is often used to mean resource-scoped credentials (for example, an API key or token scoped to a specific service or audience);
> in many systems, the "resource-based" part is really authorization (policy attached to a resource) rather than authentication.

## Further Reading
