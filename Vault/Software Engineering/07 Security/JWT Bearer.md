---
topic:
  - "Security"
subtopic: []
level:
  - "4"
priority: High
status: Ready To Repeat

dg-publish: true
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

## Links

- [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)

<!-- whats-next:start -->

---

> [!note] Whats next
> **Parent**
>  [[Software Engineering/Software Engineering|Software Engineering]]
>
> **Topics**
> - [[Software Engineering/07 Security/Authentication/Authentication|Authentication]]
>
> **Pages**
> - [[Software Engineering/07 Security/Block-chain|Block-chain]]
> - [[Software Engineering/07 Security/Digital Signature|Digital Signature]]
> - [[Software Engineering/07 Security/Encryption|Encryption]]
> - [[Software Engineering/07 Security/OWASP|OWASP]]
<!-- whats-next:end -->
