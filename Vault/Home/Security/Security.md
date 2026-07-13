---
icon: lock
order: 80
color: "#0ea5e9"
topic:
  - Security
subtopic: []
summary: "Protecting users, data, and systems: authentication, authorization, and cryptography."
tags:
  - FolderNote
publish: true
priority: High
level:
  - '4'
status: Done
---

# Intro

Security is a production feature: protecting users, data, and systems against realistic threats and mistakes. These notes focus on practical engineering security: authn/authz, cryptography basics, and common vulnerability classes. Example: most incidents start with a small gap like weak password handling, missing rate limits, or overly-permissive access checks.

```datacorejsx
const { FolderStructureMap } = await dc.require("Assets/components/devbook-folder-map.jsx");
return FolderStructureMap;
```

## The Shape of the Problem

Most security work reduces to a few recurring goals defended in layers. The classic frame is the **CIA triad** — Confidentiality (only the right people see data), Integrity (data isn't tampered with), Availability (the system stays up) — pursued through **defense in depth**: no single control is trusted, so a failure at one layer is caught by the next.

Two distinctions run through everything below:

- **Authentication vs authorization** — authn proves *who* you are (passwords, tokens, MFA); authz decides *what* you may do (roles, scopes, ownership checks). Conflating them is a common source of access bugs.
- **Encoding vs hashing vs encryption** — encoding is reversible and not secret; hashing is one-way (passwords, integrity); encryption is reversible *with a key* (confidentiality). Using the wrong one — "encrypting" a password, say — is itself a vulnerability class.

Most incidents start small: a missing authorization check, a secret in a log, weak password handling, or a missing rate limit. The specifics live in the notes above.

## Questions

> [!QUESTION]- What is the practical difference between authentication and authorization, and why do bugs cluster at the boundary?
> - Authentication establishes identity (who); authorization enforces permission (what) — a system can authenticate perfectly and still leak data through a missing authz check
> - The classic failure is the insecure direct object reference: a valid, logged-in user changes an ID in a URL and reads someone else's record because the code checked authn but not ownership
> - Authorization must be enforced server-side on every request, close to the data — never in the UI, never assumed from a prior step
> - Tokens (JWTs, sessions) carry both concerns, so validating a token is necessary but not sufficient; you still authorize the specific action

> [!QUESTION]- How should secrets and cryptography be handled so they don't become the incident?
> - Never hand-roll crypto: use vetted libraries and standard algorithms — the failures are almost always in usage (nonce reuse, ECB mode, weak KDFs), not the primitives
> - Hash passwords with a slow, salted password hash (bcrypt/argon2/PBKDF2), never a plain hash; encrypt data in transit and at rest with managed keys
> - Keep secrets out of source, logs, and config: use a secrets manager, rotate them, and scope them narrowly
> - Assume any secret that reaches a log or an error message is compromised — design so it never does

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the standard reference for the most critical web application security risks.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) — practical, task-focused guidance on authentication, authorization, cryptographic storage, and input handling.
- [NIST Digital Identity Guidelines (SP 800-63)](https://pages.nist.gov/800-63-3/) — authoritative guidance on authentication, password, and identity-proofing practices.
