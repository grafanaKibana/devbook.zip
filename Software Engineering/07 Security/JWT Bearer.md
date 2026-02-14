---
topic:
  - Security
subtopic: []
level: ["1"]
priority: Medium
status: Not-Started
---
## Parent
:LiArrowUpLeft: `= link(regexreplace(this.file.folder, "/[^/]+$", "") + "/" + regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""), regexreplace(regexreplace(this.file.folder, "/[^/]+$", ""), "^.*/", ""))`

---
# Intro

## Deeper Explanation

## Questions

> [!QUESTION]- What is a JWT token?
> JWT (JSON Web Token) is a compact token format for passing claims between parties.
> A typical JWT is `header.payload.signature` (base64url encoded) and is usually signed (JWS) so the receiver can verify integrity and issuer.
> Important: a signed JWT is not encrypted; anyone who has it can read the payload unless you use encryption (JWE).

> [!QUESTION]- Cookie vs JWT: what is the difference?
> Cookie is a browser transport mechanism: the browser automatically sends cookies to matching origins.
> JWT is a token format: it can be stored and transported in cookies, or sent as `Authorization: Bearer <token>`.
> Common tradeoffs: cookies require CSRF protections (for example, `SameSite`, anti-CSRF tokens); JWTs stored in JS-accessible storage increase XSS impact.

## Further Reading
- [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
