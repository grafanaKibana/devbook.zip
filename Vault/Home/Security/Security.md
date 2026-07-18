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
- **Encoding, password hashing, integrity, and encryption** — encoding is reversible and not secret; passwords need a slow, salted password-hashing function; a plain hash can detect accidental change but cannot prove integrity against an attacker who can replace both data and digest; active-attack integrity needs a MAC or digital signature; encryption is reversible *with a key* and protects confidentiality. Using the wrong primitive — encrypting a password, for example — is itself a vulnerability class.

Most incidents start small: a missing authorization check, a secret in a log, weak password handling, or a missing rate limit. The specifics live in the notes above.

## Secure System Design Checklist

Start with one abuse case, not a catalog of controls. For a payroll export, identify the employee records as assets, payroll staff and the export worker as actors, and the browser, API, job queue, object store, and third-party delivery service as separate trust boundaries. Then make each control answer a concrete path through those boundaries.

1. **Assets and actors:** classify the data and operations, name legitimate actors, and describe what an attacker gains. See [[Home/Security/Sensitive Data|Sensitive Data]].
2. **Trust boundaries:** draw where identities, data, and administrative control cross processes, networks, tenants, and vendors.
3. **Identity and access:** authenticate each actor, authorize the exact resource and action, deny by default, and keep privileges narrow. See [[Home/Security/Authentication/Authentication|Authentication]] and [[Home/Security/Authorization Models|Authorization Models]].
4. **Secure defaults:** expose only required endpoints and methods, close unused ports, reject unknown input, and make a missing policy fail closed. See [[Home/Security/Firewall|Firewall]], [[Home/Security/OWASP|OWASP]], and [[Home/Security/Web Vulnerabilities|Web Vulnerabilities]].
5. **Secrets and keys:** keep credentials out of code and telemetry, use managed key storage, separate key and data administration, and test rotation. See [[Home/Security/Secrets Management|Secrets Management]] and [[Home/Security/Encryption|Encryption]].
6. **Dependencies and delivery:** pin and verify build inputs, scan deployed artifacts, protect CI identities, and keep a current inventory of components and public APIs.
7. **Detection:** record authentication, authorization, administrative, and sensitive-data events with safe metadata; alert on an attack pattern rather than one expected denial.
8. **Response and recovery:** assign incident owners, preserve evidence, revoke compromised access, communicate under the applicable obligations, and restore from a tested recovery path.

![[System Design 101/2b9f4fcdd81dd3863dfa544dea92f4acd9eb1f86459d1245e8aa5ce86295f435.png]]

A checklist is complete only when its failure paths have been exercised. Test that the payroll export rejects another tenant, a missing policy, a revoked job identity, a stale signing key, a logging outage, and a restore whose backup predates the incident.

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

- [ByteByteGo — How to Design a Secure System](https://github.com/ByteByteGoHq/system-design-101/blob/b28380a4710c5ec9638ec037d4168e288f334cba/data/guides/how-do-we-design-a-secure-system.md) — the pinned checklist source, reorganized here around threats, boundaries, and testable failure paths.
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — the standard reference for the most critical web application security risks.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) — practical, task-focused guidance on authentication, authorization, cryptographic storage, and input handling.
- [NIST Digital Identity Guidelines (SP 800-63-4)](https://pages.nist.gov/800-63-4/) — current authoritative guidance on authentication, authenticators, federation, and identity proofing.
