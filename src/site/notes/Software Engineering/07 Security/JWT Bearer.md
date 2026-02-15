---
{"dg-publish":true,"permalink":"/software-engineering/07-security/jwt-bearer/","noteIcon":""}
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

# Whats next

:LiArrowUpLeft: [[Software Engineering/Software Engineering\|Software Engineering]]

<h2><span>Topics</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Authentication/Authentication.md" data-href="Software Engineering/07 Security/Authentication/Authentication.md" href="Software Engineering/07 Security/Authentication/Authentication.md" class="internal-link" target="_blank" rel="noopener nofollow">Authentication</a></span></li></ul></div><h2><span>Pages</span></h2><div><ul class="dataview list-view-ul"><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Block-chain.md" data-href="Software Engineering/07 Security/Block-chain.md" href="Software Engineering/07 Security/Block-chain.md" class="internal-link" target="_blank" rel="noopener nofollow">Block-chain</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Digital Signature.md" data-href="Software Engineering/07 Security/Digital Signature.md" href="Software Engineering/07 Security/Digital Signature.md" class="internal-link" target="_blank" rel="noopener nofollow">Digital Signature</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/Encryption.md" data-href="Software Engineering/07 Security/Encryption.md" href="Software Engineering/07 Security/Encryption.md" class="internal-link" target="_blank" rel="noopener nofollow">Encryption</a></span></li><li><span><a data-tooltip-position="top" aria-label="Software Engineering/07 Security/OWASP.md" data-href="Software Engineering/07 Security/OWASP.md" href="Software Engineering/07 Security/OWASP.md" class="internal-link" target="_blank" rel="noopener nofollow">OWASP</a></span></li></ul></div>
